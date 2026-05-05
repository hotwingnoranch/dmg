import "server-only";
import { randomBytes } from "crypto";
import { createAdminClient, createServerClient } from "./insforge";

export const REF_COOKIE = "vg_ref";
export const REF_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Commission policy (basis points — 10000 = 100%).
export const FIRST_CREDIT_COMMISSION_BPS = 2000; // 20%
export const SUBSCRIPTION_COMMISSION_BPS = 1500; // 15%
// Subscription invoices earn commission for 12 months from attribution.
export const SUBSCRIPTION_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

// Threshold for "ready for payout" status — used by admin/affiliate UI.
export const PAYOUT_THRESHOLD_CENTS = 5000; // $50

// Code generation: ambiguity-free alphabet, 7 chars (~78 billion options).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 7): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

/**
 * Reserved codes that would collide with app routes or look unprofessional
 * on a referral URL. Compared lower-case.
 */
export const RESERVED_CODES = new Set([
  "admin",
  "api",
  "auth",
  "buyer",
  "buyers",
  "login",
  "logout",
  "messages",
  "pros",
  "pro",
  "signup",
  "signin",
  "settings",
  "support",
  "help",
  "about",
  "contact",
  "trust",
  "press",
  "pricing",
  "services",
  "service",
  "elite",
  "vanguard",
  "affiliate",
  "affiliates",
  "marketing-docs",
]);

/**
 * Validate a custom referral code. Lowercase, 3–20 chars, letters /
 * numbers / dash / underscore. Reserved words rejected. Returns the
 * canonicalized code on success or an error message otherwise.
 */
export function validateReferralCode(
  raw: string
): { ok: true; code: string } | { ok: false; message: string } {
  const code = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!code) return { ok: false, message: "Pick a code." };
  if (code.length < 3) return { ok: false, message: "Codes must be at least 3 characters." };
  if (code.length > 20) return { ok: false, message: "Codes must be 20 characters or fewer." };
  if (!/^[a-z0-9_-]+$/.test(code)) {
    return {
      ok: false,
      message: "Use only letters, numbers, underscores, and dashes.",
    };
  }
  if (RESERVED_CODES.has(code)) {
    return { ok: false, message: "That code is reserved — try another." };
  }
  return { ok: true, code };
}

/**
 * Slugify a person's first name into a candidate referral code. Returns
 * the empty string when nothing usable is found.
 */
function firstNameSlug(name: string | null | undefined): string {
  if (!name) return "";
  const first = name.trim().split(/\s+/)[0] ?? "";
  return first.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}

export type ReferralRow = {
  id: string;
  code: string;
  owner_user_id: string;
  kind: "pro" | "buyer";
  total_clicks: number;
  total_signups: number;
  total_commission_cents: number;
  created_at: string;
};

/**
 * Lazy-create the caller's referral row, returning the existing one if
 * present. Uses the user-session client so RLS keeps things tied to the
 * authenticated user.
 */
export async function getOrCreateReferral(
  accessToken: string,
  userId: string,
  isPro: boolean
): Promise<ReferralRow | null> {
  const insforge = createServerClient(accessToken);

  const existing = await insforge.database
    .from("referrals")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (existing.data) return existing.data as ReferralRow;

  // First, try the user's first name (slugified) so the URL reads as
  // /r/travis instead of /r/52G2WPL. On collision, append a numeric
  // suffix; if that all fails, fall back to a random code.
  const candidates: string[] = [];
  try {
    const profileRes = await insforge.database
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .maybeSingle();
    const slug = firstNameSlug(
      (profileRes.data as { full_name?: string | null } | null)?.full_name
    );
    if (slug.length >= 3 && !RESERVED_CODES.has(slug)) {
      candidates.push(slug);
      for (let i = 2; i <= 5; i++) candidates.push(`${slug}${i}`);
    }
  } catch {
    // Fall through to random codes.
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    candidates.push(generateReferralCode());
  }

  for (const code of candidates) {
    const ins = await insforge.database
      .from("referrals")
      .insert([
        {
          owner_user_id: userId,
          code,
          kind: isPro ? "pro" : "buyer",
        },
      ])
      .select("*")
      .maybeSingle();
    if (ins.data) return ins.data as ReferralRow;
    if (ins.error?.message?.toLowerCase().includes("unique")) continue;
    console.error("[referrals] insert failed:", ins.error);
    return null;
  }
  return null;
}

/**
 * Attribute the just-signed-up user to the referrer pointed at by `code`.
 * Idempotent — duplicates are absorbed by the unique constraint.
 */
export async function attributeReferral(
  referredUserId: string,
  code: string
): Promise<void> {
  if (!code) return;
  const admin = createAdminClient();

  const refRow = await admin.database
    .from("referrals")
    .select("id, owner_user_id, total_signups")
    .eq("code", code)
    .maybeSingle();
  const referral = refRow.data as
    | { id: string; owner_user_id: string; total_signups: number }
    | null;
  if (!referral) return;

  // Self-referral is silently ignored.
  if (referral.owner_user_id === referredUserId) return;

  const ins = await admin.database
    .from("referral_attributions")
    .insert([
      {
        referral_id: referral.id,
        referred_user_id: referredUserId,
      },
    ]);
  if (ins.error) {
    if (!ins.error.message?.toLowerCase().includes("unique")) {
      console.error("[referrals] attribute failed:", ins.error);
    }
    return;
  }

  await admin.database
    .from("referrals")
    .update({ total_signups: referral.total_signups + 1 })
    .eq("id", referral.id);
}

/**
 * Log a click event for the given code. Lookup miss is silently ignored
 * so noisy/expired URLs don't break navigation.
 */
export async function logReferralClick(
  code: string,
  meta: { ua?: string | null; path?: string | null }
): Promise<void> {
  const admin = createAdminClient();
  const refRow = await admin.database
    .from("referrals")
    .select("id, total_clicks")
    .eq("code", code)
    .maybeSingle();
  const referral = refRow.data as
    | { id: string; total_clicks: number }
    | null;
  if (!referral) return;

  await admin.database.from("referral_clicks").insert([
    {
      referral_id: referral.id,
      ua: meta.ua ?? null,
      path: meta.path ?? null,
    },
  ]);

  await admin.database
    .from("referrals")
    .update({ total_clicks: referral.total_clicks + 1 })
    .eq("id", referral.id);
}

type PaymentForCommission = {
  id: string;
  pro_id: string;
  kind: "credits" | "subscription";
  amount_cents: number;
};

/**
 * Compute and record commission for a Stripe payment. Idempotent on
 * payment_id — safe to call multiple times for the same payment.
 *
 * Rules:
 *  - First credit purchase by a referred user → 20% commission.
 *  - Each subscription invoice within 12 months of attribution → 15%.
 *  - Anything else → no commission.
 */
export async function recordCommissionForPayment(
  payment: PaymentForCommission
): Promise<void> {
  const admin = createAdminClient();

  const attribRow = await admin.database
    .from("referral_attributions")
    .select("id, referral_id, attributed_at")
    .eq("referred_user_id", payment.pro_id)
    .maybeSingle();
  const attrib = attribRow.data as
    | { id: string; referral_id: string; attributed_at: string }
    | null;
  if (!attrib) return;

  // Idempotency: bail if we already logged a conversion for this payment.
  const dupe = await admin.database
    .from("referral_conversions")
    .select("id")
    .eq("payment_id", payment.id)
    .maybeSingle();
  if (dupe.data) return;

  let rateBps = 0;
  if (payment.kind === "credits") {
    // Only the *first* credit purchase counts. Look for any earlier
    // succeeded credit payments by this user.
    const earlier = await admin.database
      .from("payments")
      .select("id")
      .eq("pro_id", payment.pro_id)
      .eq("kind", "credits")
      .eq("status", "succeeded")
      .neq("id", payment.id)
      .limit(1);
    const hasEarlier = (earlier.data ?? []).length > 0;
    if (!hasEarlier) rateBps = FIRST_CREDIT_COMMISSION_BPS;
  } else if (payment.kind === "subscription") {
    const attributedAt = new Date(attrib.attributed_at).getTime();
    if (Date.now() - attributedAt <= SUBSCRIPTION_WINDOW_MS) {
      rateBps = SUBSCRIPTION_COMMISSION_BPS;
    }
  }

  if (rateBps === 0) return;

  const commission = Math.round((payment.amount_cents * rateBps) / 10000);
  if (commission <= 0) return;

  const ins = await admin.database.from("referral_conversions").insert([
    {
      referral_id: attrib.referral_id,
      referred_user_id: payment.pro_id,
      payment_id: payment.id,
      payment_kind: payment.kind,
      amount_cents: payment.amount_cents,
      commission_cents: commission,
      rate_bps: rateBps,
      status: "pending",
    },
  ]);
  if (ins.error) {
    if (ins.error.message?.toLowerCase().includes("unique")) return;
    console.error("[referrals] conversion insert failed:", ins.error);
    return;
  }

  // Bump the denormalized total on the parent referral row.
  const refRow = await admin.database
    .from("referrals")
    .select("total_commission_cents")
    .eq("id", attrib.referral_id)
    .maybeSingle();
  const current =
    (refRow.data as { total_commission_cents: number } | null)
      ?.total_commission_cents ?? 0;
  await admin.database
    .from("referrals")
    .update({ total_commission_cents: current + commission })
    .eq("id", attrib.referral_id);
}
