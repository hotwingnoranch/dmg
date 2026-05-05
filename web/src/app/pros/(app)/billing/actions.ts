"use server";

import { redirect } from "next/navigation";
import type Stripe from "stripe";
import {
  stripe,
  findCreditPack,
  findSubscriptionTier,
} from "@/lib/stripe";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

async function getOrCreateCustomer(opts: {
  userId: string;
  email?: string | null;
  companyName?: string | null;
}) {
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const pro = await insforge.database
    .from("pros")
    .select("id, stripe_customer_id, company_name, contact_email")
    .eq("id", opts.userId)
    .single();

  if (pro.data?.stripe_customer_id) {
    return pro.data.stripe_customer_id as string;
  }

  const customer = await stripe.customers.create({
    email: opts.email ?? pro.data?.contact_email ?? undefined,
    name: opts.companyName ?? pro.data?.company_name ?? undefined,
    metadata: { vanguard_pro_id: opts.userId },
  });

  await insforge.database
    .from("pros")
    .update({ stripe_customer_id: customer.id })
    .eq("id", opts.userId);

  return customer.id;
}

export async function startCreditCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const saveCard = formData.get("save_card") === "on";
  const pack = findCreditPack(slug);
  if (!pack) throw new Error("Unknown credit pack");

  const user = await requireUser("/pros/billing");
  const customerId = await getOrCreateCustomer({
    userId: user.id,
    email: user.email,
    companyName: user.name ?? null,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${pack.label} · ${pack.credits} credits`,
            description: `Vanguard credits pack — ${pack.credits} credits at $1.88 each.`,
          },
          unit_amount: pack.price_cents,
        },
        quantity: 1,
      },
    ],
    // Save the card for future off_session charges if the user opted in.
    payment_intent_data: saveCard
      ? { setup_future_usage: "off_session" }
      : undefined,
    metadata: {
      vanguard_pro_id: user.id,
      vanguard_kind: "credits",
      vanguard_slug: pack.slug,
      vanguard_credits: String(pack.credits),
      vanguard_save_card: saveCard ? "true" : "false",
    },
    success_url: appUrl(
      `/pros/billing?stripe_session={CHECKOUT_SESSION_ID}&result=success${saveCard ? "&autotopup=enable" : ""}`
    ),
    cancel_url: appUrl("/pros/billing?result=cancel"),
  });

  // Pre-record the pending payment for traceability.
  const token = await getAccessToken();
  const insforge = createServerClient(token);
  await insforge.database.from("payments").insert([
    {
      pro_id: user.id,
      stripe_session_id: session.id,
      kind: "credits",
      product_slug: pack.slug,
      credits_granted: 0,
      amount_cents: pack.price_cents,
      status: "pending",
    },
  ]);

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  redirect(session.url);
}

export async function startSubscriptionCheckout(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const tier = findSubscriptionTier(slug);
  if (!tier) throw new Error("Unknown subscription tier");
  if (tier.price_cents === 0) {
    redirect("/pros/billing?result=switched-to-free");
  }

  const user = await requireUser("/pros/billing");
  const customerId = await getOrCreateCustomer({
    userId: user.id,
    email: user.email,
    companyName: user.name ?? null,
  });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Vanguard ${tier.name}`,
            description: tier.blurb,
          },
          unit_amount: tier.price_cents,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    metadata: {
      vanguard_pro_id: user.id,
      vanguard_kind: "subscription",
      vanguard_slug: tier.slug,
    },
    success_url: appUrl(
      "/pros/billing?stripe_session={CHECKOUT_SESSION_ID}&result=success"
    ),
    cancel_url: appUrl("/pros/billing?result=cancel&tab=subscription"),
  });

  const token = await getAccessToken();
  const insforge = createServerClient(token);
  await insforge.database.from("payments").insert([
    {
      pro_id: user.id,
      stripe_session_id: session.id,
      kind: "subscription",
      product_slug: tier.slug,
      credits_granted: 0,
      amount_cents: tier.price_cents,
      status: "pending",
    },
  ]);

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL");
  }
  redirect(session.url);
}

export async function reconcileCheckoutSession(sessionId: string) {
  const user = await requireUser("/pros/billing");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // Idempotency: if we already marked it succeeded, just return what we have.
  const existing = await insforge.database
    .from("payments")
    .select("*")
    .eq("stripe_session_id", sessionId)
    .eq("pro_id", user.id)
    .maybeSingle();

  if (existing.data?.status === "succeeded") {
    return { kind: existing.data.kind, alreadyApplied: true };
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "payment_intent"],
  });

  if (session.metadata?.vanguard_pro_id !== user.id) {
    throw new Error("Session does not belong to current user");
  }

  if (session.payment_status !== "paid") {
    return { kind: existing.data?.kind ?? "credits", alreadyApplied: false };
  }

  const kind = session.metadata?.vanguard_kind ?? "credits";
  const slug = session.metadata?.vanguard_slug ?? "";

  if (kind === "credits") {
    const credits = Number(session.metadata?.vanguard_credits ?? 0);
    if (credits > 0) {
      const proRow = await insforge.database
        .from("pros")
        .select("credits")
        .eq("id", user.id)
        .single();
      const current = (proRow.data?.credits ?? 0) as number;
      await insforge.database
        .from("pros")
        .update({ credits: current + credits })
        .eq("id", user.id);
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
      .eq("stripe_session_id", sessionId);
  } else if (kind === "subscription") {
    const sub = session.subscription;
    const subId = typeof sub === "string" ? sub : sub?.id ?? null;
    const periodEnd =
      typeof sub === "object" && sub
        ? new Date(
            (sub as Stripe.Subscription).items.data[0]?.current_period_end *
              1000
          ).toISOString()
        : null;
    await insforge.database
      .from("pros")
      .update({
        subscription_tier: slug,
        subscription_status: "active",
        subscription_period_end: periodEnd,
        is_elite: slug === "sub-elite",
      })
      .eq("id", user.id);
    await insforge.database
      .from("payments")
      .update({
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        stripe_subscription_id: subId,
      })
      .eq("stripe_session_id", sessionId);
  }

  return { kind, alreadyApplied: false };
}

// ----------------------------------------------------------- auto top-up ----

export async function setAutoTopUp(formData: FormData) {
  const enabled = formData.get("enabled") === "on";
  const packSlug = String(formData.get("pack_slug") ?? "credits-120");
  const thresholdRaw = Number(String(formData.get("threshold") ?? "10"));
  const threshold = Math.max(1, Math.min(500, isFinite(thresholdRaw) ? thresholdRaw : 10));

  const user = await requireUser("/pros/billing");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  await insforge.database
    .from("pros")
    .update({
      auto_topup_enabled: enabled,
      auto_topup_pack_slug: packSlug,
      auto_topup_threshold: threshold,
    })
    .eq("id", user.id);

  redirect(`/pros/billing?tab=credits&result=autotopup-saved`);
}

/**
 * Manually trigger an auto top-up purchase. In production this would be
 * called from the credit-debit code path (when balance drops below
 * threshold) or from a scheduled job. We expose it here so it can be
 * tested from the billing page.
 */
export async function triggerAutoTopUp() {
  const user = await requireUser("/pros/billing");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const proRes = await insforge.database
    .from("pros")
    .select(
      "id, stripe_customer_id, default_payment_method_id, auto_topup_enabled, auto_topup_pack_slug, auto_topup_threshold, credits"
    )
    .eq("id", user.id)
    .single();
  const pro = proRes.data as
    | {
        stripe_customer_id: string | null;
        default_payment_method_id: string | null;
        auto_topup_enabled: boolean;
        auto_topup_pack_slug: string | null;
        credits: number;
      }
    | null;

  if (!pro) throw new Error("Pro profile not found");
  if (!pro.auto_topup_enabled) {
    redirect("/pros/billing?result=autotopup-disabled");
  }
  if (!pro.stripe_customer_id || !pro.default_payment_method_id) {
    redirect("/pros/billing?result=autotopup-needs-card");
  }
  const pack = findCreditPack(pro.auto_topup_pack_slug ?? "credits-120");
  if (!pack) throw new Error("Auto top-up pack not configured");

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.create({
      amount: pack.price_cents,
      currency: "usd",
      customer: pro.stripe_customer_id,
      payment_method: pro.default_payment_method_id,
      off_session: true,
      confirm: true,
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        vanguard_pro_id: user.id,
        vanguard_kind: "auto_topup",
        vanguard_slug: pack.slug,
        vanguard_credits: String(pack.credits),
      },
    });
  } catch (err) {
    // Card requires authentication or was declined — surface a helpful state.
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: unknown }).code)
        : "unknown";
    redirect(`/pros/billing?result=autotopup-failed&code=${encodeURIComponent(code)}`);
  }

  // Inline-grant credits if the PI succeeded immediately. The webhook will
  // also fire, but it's idempotent on stripe_session_id.
  if (pi.status === "succeeded") {
    const proRow = await insforge.database
      .from("pros")
      .select("credits")
      .eq("id", user.id)
      .single();
    const current = (proRow.data?.credits ?? 0) as number;
    await insforge.database
      .from("pros")
      .update({ credits: current + pack.credits })
      .eq("id", user.id);

    // Pre-record so the webhook idempotency check skips the duplicate.
    await insforge.database.from("payments").insert([
      {
        pro_id: user.id,
        stripe_session_id: pi.id,
        stripe_payment_intent_id: pi.id,
        kind: "credits",
        product_slug: pack.slug,
        credits_granted: pack.credits,
        amount_cents: pi.amount,
        status: "succeeded",
        succeeded_at: new Date().toISOString(),
        raw_metadata: { auto_topup: true },
      },
    ]);
  }

  redirect(`/pros/billing?result=autotopup-charged`);
}
