import "server-only";
import { Resend } from "resend";

// ---------------------------------------------------------------- client ----

const apiKey = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM ?? "Vanguard <onboarding@resend.dev>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? undefined;

const resend = apiKey ? new Resend(apiKey) : null;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vanguard.insforge.site";

type SendOpts = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
};

/**
 * Fire-and-forget send. Returns a result for the caller but never throws —
 * email delivery should never block a user-facing request from succeeding.
 */
export async function sendEmail(
  opts: SendOpts
): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping send to:", opts.to);
    return { ok: false, error: "RESEND_API_KEY not configured" };
  }
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      replyTo: REPLY_TO,
    });
    if (error) {
      console.error("[email] resend error:", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    console.error("[email] resend threw:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// -------------------------------------------------------------- template ----

/**
 * Branded HTML wrapper. Email clients are awful — we use a table layout
 * with inline styles for max compatibility (Gmail, Outlook, Apple Mail).
 */
function renderEmail(opts: {
  preheader: string;
  heading: string;
  body: string; // HTML string for the main body
  cta?: { label: string; url: string };
  footerNote?: string;
}) {
  const { preheader, heading, body, cta, footerNote } = opts;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f6f5f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0c0a09;">
  <span style="display:none!important;visibility:hidden;mso-hide:all;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f6f5f2;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #d6d3d1;border-radius:16px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background-color:#0b1730;padding:18px 24px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:#ffffff;letter-spacing:-0.01em;">
                  Vanguard <span style="color:#c8973f;">·</span> <span style="font-family:-apple-system,Arial,sans-serif;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:2px;color:#c8c4c0;">Security</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px 32px 24px 32px;">
            <h1 style="margin:0 0 16px 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;font-weight:bold;letter-spacing:-0.02em;color:#0c0a09;">${escapeHtml(heading)}</h1>
            <div style="font-size:15px;line-height:1.6;color:#292524;">
              ${body}
            </div>
            ${
              cta
                ? `<div style="margin-top:28px;">
                    <a href="${escapeAttr(cta.url)}" style="display:inline-block;background-color:#0b1730;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 22px;border-radius:999px;letter-spacing:0.01em;">${escapeHtml(cta.label)}</a>
                  </div>`
                : ""
            }
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #e7e5e4;padding:18px 32px;background-color:#fafaf9;">
            <p style="margin:0;font-size:12px;line-height:1.5;color:#78716c;">
              ${footerNote ? escapeHtml(footerNote) + "<br/>" : ""}
              Vanguard Security · vetted directory of private security professionals.<br/>
              <a href="${escapeAttr(APP_URL)}" style="color:#a87a25;text-decoration:none;">${escapeHtml(APP_URL.replace(/^https?:\/\//, ""))}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s: string) {
  return s.replace(/"/g, "&quot;");
}

// ----------------------------------------------------------- typed sends ----

export async function sendBuyerRequestConfirmation(opts: {
  to: string;
  buyerName?: string | null;
  categoryName: string;
  city?: string | null;
  zip: string;
  requestId: string;
}) {
  const where = `${opts.city ? `${opts.city}, ` : ""}${opts.zip}`;
  const html = renderEmail({
    preheader: `Your ${opts.categoryName} request was received — quotes incoming.`,
    heading: "Your request is in.",
    body: `
      <p>Hi${opts.buyerName ? ` ${escapeHtml(opts.buyerName.split(" ")[0])}` : ""},</p>
      <p>We've notified vetted security teams in <strong>${escapeHtml(where)}</strong> matching your <strong>${escapeHtml(opts.categoryName)}</strong> request. You should start hearing back within an hour.</p>
      <p>You can track responses, message pros, and compare quotes any time from your dashboard.</p>
    `,
    cta: { label: "Open dashboard", url: `${APP_URL}/buyer/dashboard?new=${opts.requestId}` },
    footerNote: "We'll never share your contact info publicly.",
  });
  return sendEmail({
    to: opts.to,
    subject: `Your ${opts.categoryName} request — quotes incoming`,
    html,
    text: `Your ${opts.categoryName} request in ${where} has been sent to vetted security teams. Track responses at ${APP_URL}/buyer/dashboard`,
  });
}

export async function sendNewLeadAlert(opts: {
  to: string;
  proCompany: string;
  categoryName: string;
  city?: string | null;
  zip: string;
  urgency: "flexible" | "soon" | "urgent" | string;
  description?: string | null;
}) {
  const urgencyTag =
    opts.urgency === "urgent"
      ? `<span style="display:inline-block;background-color:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:999px;margin-left:6px;">Urgent</span>`
      : opts.urgency === "soon"
        ? `<span style="display:inline-block;background-color:#fef3c7;color:#92400e;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:999px;margin-left:6px;">Soon</span>`
        : "";
  const where = `${opts.city ? `${opts.city}, ` : ""}${opts.zip}`;
  const html = renderEmail({
    preheader: `New ${opts.categoryName} lead in ${where} for ${opts.proCompany}.`,
    heading: "New lead in your area.",
    body: `
      <p>Hi ${escapeHtml(opts.proCompany)},</p>
      <p>A new <strong>${escapeHtml(opts.categoryName)}</strong>${urgencyTag} request just came in for <strong>${escapeHtml(where)}</strong>.</p>
      ${
        opts.description
          ? `<p style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:12px;padding:14px;font-size:14px;line-height:1.5;color:#292524;">${escapeHtml(opts.description.slice(0, 320))}</p>`
          : ""
      }
      <p>Be the first to respond — early replies win significantly more contracts.</p>
    `,
    cta: { label: "View lead", url: `${APP_URL}/pros/leads` },
    footerNote: "You're receiving this because the lead matches the services and area on your Vanguard pro profile.",
  });
  return sendEmail({
    to: opts.to,
    subject: `${opts.urgency === "urgent" ? "[URGENT] " : ""}New ${opts.categoryName} lead — ${where}`,
    html,
  });
}

export async function sendProWelcome(opts: {
  to: string;
  proCompany: string;
}) {
  const html = renderEmail({
    preheader: "Your Vanguard Pro profile is live.",
    heading: "You're live on Vanguard.",
    body: `
      <p>Welcome, <strong>${escapeHtml(opts.proCompany)}</strong>.</p>
      <p>Your Pro profile is published and we're already routing matching leads to your dashboard. To win more jobs:</p>
      <ul style="padding-left:18px;margin:12px 0;">
        <li>Add a few sentences to your bio about licensing and proudest jobs.</li>
        <li>Buy a credit pack so you can respond instantly when a lead drops.</li>
        <li>Turn on auto top-up so you never miss a high-intent lead due to credits.</li>
      </ul>
    `,
    cta: { label: "Open dashboard", url: `${APP_URL}/pros/dashboard?setup=1` },
  });
  return sendEmail({
    to: opts.to,
    subject: "Welcome to Vanguard — your profile is live",
    html,
  });
}

export async function sendAutoTopupFailed(opts: {
  to: string;
  proCompany: string;
  errorCode?: string | null;
}) {
  const html = renderEmail({
    preheader: "Auto top-up couldn't charge your card.",
    heading: "Action needed: auto top-up failed.",
    body: `
      <p>Hi ${escapeHtml(opts.proCompany)},</p>
      <p>We tried to refill your credits via auto top-up, but Stripe couldn't complete the charge${opts.errorCode ? ` (<code style="background:#fafaf9;border:1px solid #e7e5e4;padding:1px 6px;border-radius:4px;font-size:12px;">${escapeHtml(opts.errorCode)}</code>)` : ""}.</p>
      <p>Most often this means the card needs re-authentication or has expired. Buy any credit pack manually with a fresh card to update the saved payment method.</p>
    `,
    cta: { label: "Update payment method", url: `${APP_URL}/pros/billing` },
    footerNote: "Auto top-up stays enabled — it'll retry against the saved card on the next attempt.",
  });
  return sendEmail({
    to: opts.to,
    subject: "[Action needed] Vanguard auto top-up failed",
    html,
  });
}

export async function sendSubscriptionPastDue(opts: {
  to: string;
  proCompany: string;
}) {
  const html = renderEmail({
    preheader: "Your Vanguard subscription payment failed.",
    heading: "Subscription payment failed.",
    body: `
      <p>Hi ${escapeHtml(opts.proCompany)},</p>
      <p>Your latest subscription invoice didn't go through. Stripe will retry over the next few days, but to keep your benefits active (priority placement, more leads), please update your payment method now.</p>
    `,
    cta: { label: "Update billing", url: `${APP_URL}/pros/billing?tab=subscription` },
  });
  return sendEmail({
    to: opts.to,
    subject: "[Action needed] Vanguard subscription payment failed",
    html,
  });
}

// ----------------------------------------------------------- admin alerts ----

type AdminAlertOpts = {
  to: string[];
  title: string;
  preheader: string;
  body: string;
  cta?: { label: string; url: string };
  subject: string;
};

async function sendAdminAlert(opts: AdminAlertOpts) {
  if (opts.to.length === 0) return { ok: false, error: "no recipients" };
  const html = renderEmail({
    preheader: opts.preheader,
    heading: opts.title,
    body: opts.body,
    cta: opts.cta,
    footerNote: "You're receiving this because you're a Vanguard admin.",
  });
  return sendEmail({ to: opts.to, subject: opts.subject, html });
}

export async function sendAdminEliteSignup(opts: {
  to: string[];
  proCompany: string;
  proId: string;
  contactEmail?: string | null;
}) {
  return sendAdminAlert({
    to: opts.to,
    subject: `[Vanguard] New Elite Pro: ${opts.proCompany}`,
    preheader: `${opts.proCompany} just upgraded to Elite Pro.`,
    title: "New Elite Pro signup.",
    body: `
      <p><strong>${escapeHtml(opts.proCompany)}</strong> just upgraded to the Elite Pro plan.</p>
      ${opts.contactEmail ? `<p>Contact: <code>${escapeHtml(opts.contactEmail)}</code></p>` : ""}
      <p>That's $249/mo of new MRR. Worth a personal welcome.</p>
    `,
    cta: { label: "Open pro detail", url: `${APP_URL}/admin/pros/${opts.proId}` },
  });
}

export async function sendAdminProPaymentFailed(opts: {
  to: string[];
  proCompany: string;
  proId: string;
  reason: string;
  amountCents?: number;
}) {
  const amount =
    typeof opts.amountCents === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "usd",
        }).format(opts.amountCents / 100)
      : null;
  return sendAdminAlert({
    to: opts.to,
    subject: `[Vanguard] Payment failed: ${opts.proCompany}`,
    preheader: `${opts.proCompany} had a failed Stripe charge.`,
    title: "Pro payment failed.",
    body: `
      <p><strong>${escapeHtml(opts.proCompany)}</strong> had a failed Stripe charge${amount ? ` of <strong>${escapeHtml(amount)}</strong>` : ""}.</p>
      <p>Reason: <code>${escapeHtml(opts.reason)}</code></p>
      <p>Stripe will retry per its dunning rules. Reach out if it stays failed for more than a few days.</p>
    `,
    cta: { label: "Open pro detail", url: `${APP_URL}/admin/pros/${opts.proId}` },
  });
}

export async function sendAdminAutoTopupFailed(opts: {
  to: string[];
  proCompany: string;
  proId: string;
  errorCode?: string | null;
}) {
  return sendAdminAlert({
    to: opts.to,
    subject: `[Vanguard] Auto top-up failed: ${opts.proCompany}`,
    preheader: `${opts.proCompany}'s auto top-up couldn't charge.`,
    title: "Auto top-up failed.",
    body: `
      <p><strong>${escapeHtml(opts.proCompany)}</strong>'s saved card couldn't complete an off-session auto top-up${opts.errorCode ? ` (<code>${escapeHtml(opts.errorCode)}</code>)` : ""}.</p>
      <p>The pro has also been notified to update their card.</p>
    `,
    cta: { label: "Open pro detail", url: `${APP_URL}/admin/pros/${opts.proId}` },
  });
}
