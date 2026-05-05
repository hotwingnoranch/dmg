import "server-only";
import Stripe from "stripe";

const secret = process.env.STRIPE_SECRET_KEY;
if (!secret) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(secret, {
  appInfo: { name: "Vanguard", version: "0.1.0" },
});

// Catalog — all amounts in cents.
export const CREDIT_PACKS = [
  {
    slug: "credits-120",
    label: "About 5 responses",
    credits: 120,
    price_cents: 22560,
    discount_label: "20% OFF",
  },
  {
    slug: "credits-240",
    label: "About 10 responses",
    credits: 240,
    price_cents: 45120,
    discount_label: "20% OFF",
  },
  {
    slug: "credits-480",
    label: "About 20 responses",
    credits: 480,
    price_cents: 90240,
    discount_label: "20% OFF",
    best_value: true,
  },
] as const;

export type CreditPack = (typeof CREDIT_PACKS)[number];

export const SUBSCRIPTION_TIERS = [
  {
    slug: "sub-standard",
    name: "Standard",
    price_cents: 0,
    blurb: "Start receiving leads",
    free: true,
    features: [
      "Up to 3 leads / month",
      "Basic profile + 1 photo",
      "Standard placement",
      "Email support",
    ],
  },
  {
    slug: "sub-pro",
    name: "Pro",
    price_cents: 7900,
    blurb: "Most popular",
    features: [
      "Up to 25 leads / month",
      "Priority placement in search",
      "5 profile photos + media",
      "Verified phone badge",
      "Insights dashboard",
    ],
  },
  {
    slug: "sub-elite",
    name: "Elite Pro",
    price_cents: 24900,
    blurb: "For high-volume teams",
    features: [
      "Unlimited leads",
      "Top placement + featured carousel",
      "20+ profile photos & video",
      "Hired Guarantee on first leads",
      "Dedicated account manager",
      "Elite Pro badge",
    ],
    elite: true,
  },
] as const;

export type SubscriptionTier = (typeof SUBSCRIPTION_TIERS)[number];

export function findCreditPack(slug: string) {
  return CREDIT_PACKS.find((p) => p.slug === slug);
}

export function findSubscriptionTier(slug: string) {
  return SUBSCRIPTION_TIERS.find((t) => t.slug === slug);
}

export function formatPrice(
  cents: number,
  currency = "usd",
  /**
   * Override the label shown when the amount is exactly zero. The default
   * is a numeric `$0` because most surfaces (revenue, MRR, payouts) read
   * better that way. Pass `"Free"` on subscription-tier cards where a
   * Standard plan should render as the word.
   */
  zeroLabel: string = "$0"
) {
  if (cents === 0) return zeroLabel;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
