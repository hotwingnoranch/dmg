import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/insforge";
import {
  sendAutoTopupFailed,
  sendSubscriptionPastDue,
  sendAdminEliteSignup,
  sendAdminProPaymentFailed,
  sendAdminAutoTopupFailed,
} from "@/lib/email";
import { listAdminEmails } from "@/lib/admin";
import { recordCommissionForPayment } from "@/lib/referrals";

type CommissionPayment = {
  id: string;
  pro_id: string;
  kind: "credits" | "subscription";
  amount_cents: number;
};

async function commissionFromSession(
  insforge: ReturnType<typeof createAdminClient>,
  sessionId: string
) {
  const row = await insforge.database
    .from("payments")
    .select("id, pro_id, kind, amount_cents")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  const data = row.data as CommissionPayment | null;
  if (!data) return;
  await recordCommissionForPayment(data).catch((e) =>
    console.error("[referrals] record commission failed:", e)
  );
}

// Stripe needs the raw body to verify the signature, so opt out of
// Next.js body parsing and use Edge-compatible APIs.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "missing signature or webhook secret" },
      { status: 400 }
    );
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[stripe webhook] handler failed:", err);
    // Return 500 so Stripe retries; idempotency is enforced via stripe_session_id.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "handler failed" },
      { status: 500 }
    );
  }
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await onSubscriptionChange(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await onSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case "invoice.payment_succeeded":
      await onInvoicePaid(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed":
      await onInvoiceFailed(event.data.object as Stripe.Invoice);
      break;
    case "payment_intent.succeeded":
      await onPaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_intent.payment_failed":
      await onPaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
      break;
    case "payment_method.attached":
      await onPaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
      break;
    default:
      // Acknowledge unknown events so Stripe stops retrying.
      break;
  }
}

// -------------------------------------------------------------- handlers ----

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const proId = session.metadata?.vanguard_pro_id;
  const kind = session.metadata?.vanguard_kind;
  const slug = session.metadata?.vanguard_slug ?? "";
  if (!proId || !kind) return;
  if (session.payment_status !== "paid") return;

  const insforge = createAdminClient();

  // Idempotency: stop if we've already marked this session succeeded.
  const existing = await insforge.database
    .from("payments")
    .select("id, status")
    .eq("stripe_session_id", session.id)
    .maybeSingle();
  if (existing.data?.status === "succeeded") return;

  if (kind === "credits") {
    const credits = Number(session.metadata?.vanguard_credits ?? 0);
    if (credits > 0) {
      const proRow = await insforge.database
        .from("pros")
        .select("credits")
        .eq("id", proId)
        .single();
      const current = (proRow.data?.credits ?? 0) as number;
      await insforge.database
        .from("pros")
        .update({ credits: current + credits })
        .eq("id", proId);
    }
    await insforge.database
      .from("payments")
      .update({
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        credits_granted: Number(session.metadata?.vanguard_credits ?? 0),
        stripe_payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
      })
      .eq("stripe_session_id", session.id);

    // If the user opted into auto top-up, persist the saved card.
    if (session.metadata?.vanguard_save_card === "true") {
      await rememberDefaultCard(proId, session.payment_intent);
    }

    await commissionFromSession(insforge, session.id);
  }

  if (kind === "subscription") {
    const subId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;
    let periodEnd: string | null = null;
    if (subId) {
      const sub = await stripe.subscriptions.retrieve(subId);
      periodEnd =
        sub.items.data[0]?.current_period_end != null
          ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
          : null;
    }
    await insforge.database
      .from("pros")
      .update({
        subscription_tier: slug,
        subscription_status: "active",
        subscription_period_end: periodEnd,
        is_elite: slug === "sub-elite",
      })
      .eq("id", proId);
    await insforge.database
      .from("payments")
      .update({
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        stripe_subscription_id: subId,
      })
      .eq("stripe_session_id", session.id);

    // Operational alert to admins for a new Elite Pro signup — high-value
    // event worth a personal welcome.
    if (slug === "sub-elite") {
      const proRow = await insforge.database
        .from("pros")
        .select("company_name, contact_email")
        .eq("id", proId)
        .maybeSingle();
      const pro = proRow.data as
        | { company_name: string; contact_email: string | null }
        | null;
      const recipients = await listAdminEmails();
      if (pro && recipients.length > 0) {
        await sendAdminEliteSignup({
          to: recipients,
          proCompany: pro.company_name,
          proId,
          contactEmail: pro.contact_email,
        }).catch((e) => console.error("[email] admin elite alert:", e));
      }
    }

    await commissionFromSession(insforge, session.id);
  }
}

async function onSubscriptionChange(sub: Stripe.Subscription) {
  const proId = sub.metadata?.vanguard_pro_id ?? null;
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const insforge = createAdminClient();

  const target = proId
    ? { col: "id", val: proId }
    : { col: "stripe_customer_id", val: customerId };

  const slug = sub.metadata?.vanguard_slug ?? null;
  const periodEnd =
    sub.items.data[0]?.current_period_end != null
      ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
      : null;

  const update: Record<string, unknown> = {
    subscription_status: sub.status,
    subscription_period_end: periodEnd,
  };
  if (slug) {
    update.subscription_tier = slug;
    update.is_elite = slug === "sub-elite";
  }

  await insforge.database.from("pros").update(update).eq(target.col, target.val);
}

async function onSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const insforge = createAdminClient();
  await insforge.database
    .from("pros")
    .update({
      subscription_status: "canceled",
      subscription_tier: null,
      is_elite: false,
    })
    .eq("stripe_customer_id", customerId);
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  // Renewal billing record. Store as a payments row for the history view.
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (!customerId) return;
  const insforge = createAdminClient();
  const pro = await insforge.database
    .from("pros")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!pro.data) return;

  // The session id field doesn't exist on invoices; use invoice.id as the unique key.
  const existing = await insforge.database
    .from("payments")
    .select("id")
    .eq("stripe_session_id", invoice.id ?? "")
    .maybeSingle();
  if (existing.data) return;

  const ins = await insforge.database
    .from("payments")
    .insert([
      {
        pro_id: pro.data.id,
        stripe_session_id: invoice.id ?? `inv_${Date.now()}`,
        stripe_subscription_id:
          typeof invoice.parent?.subscription_details?.subscription === "string"
            ? invoice.parent.subscription_details.subscription
            : null,
        kind: "subscription",
        product_slug: "renewal",
        credits_granted: 0,
        amount_cents: invoice.amount_paid ?? 0,
        currency: invoice.currency ?? "usd",
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        raw_metadata: { invoice_number: invoice.number ?? null } as object,
      },
    ])
    .select("id, pro_id, kind, amount_cents")
    .maybeSingle();

  const row = ins.data as CommissionPayment | null;
  if (row) {
    await recordCommissionForPayment(row).catch((e) =>
      console.error("[referrals] record commission failed:", e)
    );
  }
}

async function onInvoiceFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;
  if (!customerId) return;
  const insforge = createAdminClient();
  const pro = await insforge.database
    .from("pros")
    .select("id, company_name, contact_email")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  await insforge.database
    .from("pros")
    .update({ subscription_status: "past_due" })
    .eq("stripe_customer_id", customerId);

  const proRow = pro.data as
    | { id: string; company_name: string; contact_email: string | null }
    | null;
  if (proRow?.contact_email) {
    await sendSubscriptionPastDue({
      to: proRow.contact_email,
      proCompany: proRow.company_name,
    }).catch((e) => console.error("[email] subscription past_due failed:", e));
  }
  if (proRow) {
    const recipients = await listAdminEmails();
    if (recipients.length > 0) {
      await sendAdminProPaymentFailed({
        to: recipients,
        proCompany: proRow.company_name,
        proId: proRow.id,
        reason: "invoice_payment_failed",
        amountCents: invoice.amount_due ?? 0,
      }).catch((e) => console.error("[email] admin invoice failed alert:", e));
    }
  }
}

async function onPaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  // Off-session auto-top-up payments come through here without a Checkout
  // session. Identify them via metadata.
  if (pi.metadata?.vanguard_kind !== "auto_topup") return;
  const proId = pi.metadata?.vanguard_pro_id;
  const credits = Number(pi.metadata?.vanguard_credits ?? 0);
  if (!proId || !credits) return;

  const insforge = createAdminClient();
  const proRow = await insforge.database
    .from("pros")
    .select("credits")
    .eq("id", proId)
    .single();
  const current = (proRow.data?.credits ?? 0) as number;

  await insforge.database
    .from("pros")
    .update({ credits: current + credits })
    .eq("id", proId);

  const ins = await insforge.database
    .from("payments")
    .insert([
      {
        pro_id: proId,
        stripe_session_id: pi.id,
        stripe_payment_intent_id: pi.id,
        kind: "credits",
        product_slug: pi.metadata?.vanguard_slug ?? "auto_topup",
        credits_granted: credits,
        amount_cents: pi.amount_received,
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        raw_metadata: { auto_topup: true } as object,
      },
    ])
    .select("id, pro_id, kind, amount_cents")
    .maybeSingle();

  const row = ins.data as CommissionPayment | null;
  if (row) {
    await recordCommissionForPayment(row).catch((e) =>
      console.error("[referrals] record commission failed:", e)
    );
  }
}

async function onPaymentIntentFailed(pi: Stripe.PaymentIntent) {
  const insforge = createAdminClient();
  await insforge.database
    .from("payments")
    .update({ status: "failed" })
    .eq("stripe_payment_intent_id", pi.id);

  // Auto-topup specific: alert the pro so they can re-auth or update card.
  if (pi.metadata?.vanguard_kind === "auto_topup") {
    const proId = pi.metadata?.vanguard_pro_id;
    if (!proId) return;
    const pro = await insforge.database
      .from("pros")
      .select("company_name, contact_email")
      .eq("id", proId)
      .maybeSingle();
    const proRow = pro.data as
      | { company_name: string; contact_email: string | null }
      | null;
    if (proRow?.contact_email) {
      await sendAutoTopupFailed({
        to: proRow.contact_email,
        proCompany: proRow.company_name,
        errorCode: pi.last_payment_error?.code ?? null,
      }).catch((e) => console.error("[email] auto-topup failed alert:", e));
    }
    if (proRow) {
      const recipients = await listAdminEmails();
      if (recipients.length > 0) {
        await sendAdminAutoTopupFailed({
          to: recipients,
          proCompany: proRow.company_name,
          proId,
          errorCode: pi.last_payment_error?.code ?? null,
        }).catch((e) => console.error("[email] admin auto-topup alert:", e));
      }
    }
  }

  // Don't disable auto top-up automatically — Stripe will retry per the
  // customer's saved card SCA / 3DS rules.
}

async function onPaymentMethodAttached(pm: Stripe.PaymentMethod) {
  const customerId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (!customerId) return;
  const insforge = createAdminClient();
  // Set this as the default if the pro doesn't have one yet.
  const pro = await insforge.database
    .from("pros")
    .select("id, default_payment_method_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (!pro.data) return;
  if (!pro.data.default_payment_method_id) {
    await insforge.database
      .from("pros")
      .update({ default_payment_method_id: pm.id })
      .eq("id", pro.data.id);
    // Also set on the Stripe customer so off-session charges pick it up.
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: pm.id },
    });
  }
}

async function rememberDefaultCard(
  proId: string,
  paymentIntent: string | Stripe.PaymentIntent | null | undefined
) {
  if (!paymentIntent) return;
  const piId =
    typeof paymentIntent === "string" ? paymentIntent : paymentIntent.id;
  const pi = await stripe.paymentIntents.retrieve(piId);
  const pmId =
    typeof pi.payment_method === "string"
      ? pi.payment_method
      : pi.payment_method?.id;
  if (!pmId) return;

  const customerId =
    typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
  if (!customerId) return;

  const insforge = createAdminClient();
  await insforge.database
    .from("pros")
    .update({ default_payment_method_id: pmId })
    .eq("id", proId);

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: pmId },
  });
}
