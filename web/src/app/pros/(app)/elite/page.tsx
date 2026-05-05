import Link from "next/link";
import {
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  Crown,
  Headphones,
  TrendingUp,
  Users,
  Camera,
  ArrowRight,
} from "lucide-react";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { SUBSCRIPTION_TIERS, formatPrice } from "@/lib/stripe";

const ELITE = SUBSCRIPTION_TIERS.find((t) => t.slug === "sub-elite");

const BENEFITS = [
  {
    icon: TrendingUp,
    title: "Top placement",
    body: "Featured first in search and category pages, and surfaced in the Elite carousel on the landing page.",
  },
  {
    icon: Sparkles,
    title: "Unlimited leads",
    body: "No monthly cap. Every matching lead in your service area is delivered to your dashboard in real time.",
  },
  {
    icon: BadgeCheck,
    title: "Elite Pro badge",
    body: "A verified amber badge on your profile and every reply you send — buyers consistently hire badged teams first.",
  },
  {
    icon: ShieldCheck,
    title: "Hired Guarantee",
    body: "If you don't win a contract from your first ten Elite leads, we credit your account on the next renewal.",
  },
  {
    icon: Headphones,
    title: "Dedicated account manager",
    body: "A real human who reviews your profile, optimizes your services, and helps you respond faster.",
  },
  {
    icon: Camera,
    title: "Profile media kit",
    body: "Upload 20+ photos and a hero video for your profile. Pros with media see ~3× more outreach.",
  },
];

const VETTING = [
  "Active license verification per state",
  "Liability + workers' comp insurance verification",
  "Background check on team principals",
  "Two reference calls with previous clients",
  "Annual recertification",
];

export default async function ProElitePage() {
  const user = await requireUser("/pros/elite");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const proRes = await insforge.database
    .from("pros")
    .select("is_elite, subscription_tier, subscription_status, subscription_period_end")
    .eq("id", user.id)
    .maybeSingle();

  const pro = (proRes.data ?? null) as
    | {
        is_elite: boolean;
        subscription_tier: string | null;
        subscription_status: string | null;
        subscription_period_end: string | null;
      }
    | null;

  const isCurrentlyElite =
    !!pro && pro.subscription_tier === "sub-elite" && pro.subscription_status === "active";

  return (
    <div className="grid gap-10">
      {/* HERO */}
      <section className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 text-white shadow-lift">
        <div className="grid gap-10 p-8 md:p-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Crown className="h-5 w-5 text-amber-glow" />
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Elite Pro program
              </p>
            </div>
            <h1 className="display-h1 mt-4 max-w-xl text-balance">
              The fastest way to{" "}
              <em className="not-italic font-display italic text-amber-glow">
                win the contracts
              </em>{" "}
              that move your business.
            </h1>
            <p className="mt-5 max-w-lg text-white/80">
              Elite Pro is for vetted security teams that want top placement,
              a Hired Guarantee on first leads, and a real account manager
              working alongside them. Buyers see your badge before anyone
              else.
            </p>

            {isCurrentlyElite ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-glow/40 bg-amber-glow/10 px-4 py-2 text-sm font-medium text-amber-glow">
                  <BadgeCheck className="h-4 w-4" />
                  You&apos;re Elite Pro
                </span>
                <Link
                  href="/pros/billing?tab=subscription"
                  className="btn border border-white/30 text-white hover:bg-white/10"
                >
                  Manage subscription
                </Link>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/pros/billing?tab=subscription"
                  className="btn bg-amber-accent text-white hover:bg-amber-deep shadow-[0_8px_28px_-12px_rgba(168,122,37,0.55)]"
                >
                  Apply for Elite Pro
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pros/billing?tab=subscription"
                  className="btn border border-white/30 text-white hover:bg-white/10"
                >
                  Compare plans
                </Link>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-amber-glow/30 bg-white/5 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-amber-glow">
              Pricing
            </p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-5xl font-bold tracking-tightest">
                {formatPrice(ELITE?.price_cents ?? 24900)}
              </span>
              <span className="text-sm text-white/60">/ month</span>
            </div>
            <ul className="mt-5 grid gap-2.5 text-sm text-white/85">
              <li className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 flex-none text-amber-glow" />
                Cancel anytime, no setup fees
              </li>
              <li className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 flex-none text-amber-glow" />
                Credits, leads, and badge active immediately
              </li>
              <li className="flex items-start gap-2.5">
                <Sparkles className="mt-0.5 h-4 w-4 flex-none text-amber-glow" />
                14-day Hired Guarantee on first ten leads
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section>
        <p className="eyebrow">What you get</p>
        <h2 className="display-h2 mt-3 max-w-2xl">
          Everything that turns a profile into a pipeline.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <article
              key={b.title}
              className="card-elev p-5 transition hover:border-amber-accent/50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-accent/30 bg-amber-accent/10 text-amber-accent">
                <b.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold">{b.title}</h3>
              <p className="mt-1.5 text-sm text-ink-300">{b.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* VETTING */}
      <section className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
        <div>
          <p className="eyebrow">How we vet</p>
          <h2 className="display-h2 mt-3">
            Why buyers trust the{" "}
            <em className="not-italic font-display italic text-amber-accent">
              badge
            </em>
            .
          </h2>
          <p className="mt-4 text-sm text-ink-300">
            Every Elite Pro is verified by a Vanguard reviewer before the
            badge appears on their profile. Recertification happens once a
            year so the standard never slips.
          </p>
        </div>

        <ul className="card-elev grid gap-3 p-6">
          {VETTING.map((v, i) => (
            <li
              key={v}
              className="flex items-start gap-3 border-ink-700 text-sm"
              style={i === 0 ? undefined : { borderTopWidth: 1, paddingTop: 12 }}
            >
              <ShieldCheck className="mt-0.5 h-5 w-5 flex-none text-amber-accent" />
              <span className="text-ink-200">{v}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* SOCIAL PROOF */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { v: "3.1×", l: "More buyer outreach" },
          { v: "47%", l: "Higher hire rate" },
          { v: "< 18 min", l: "Avg first response" },
        ].map((s) => (
          <article
            key={s.l}
            className="card-elev grid place-items-center p-6 text-center"
          >
            <p className="font-display text-4xl font-bold tracking-tightest">
              {s.v}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-ink-400">
              {s.l}
            </p>
          </article>
        ))}
      </section>

      {/* CTA */}
      <section className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 px-8 py-10 text-white md:px-12 md:py-14">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="max-w-md">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-glow" />
              <p className="text-xs uppercase tracking-[0.22em] text-amber-glow">
                Limited cohort
              </p>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold mt-2">
              Ready to wear the badge?
            </h2>
            <p className="mt-2 text-sm text-white/70">
              We onboard a small Elite cohort each month so account managers
              stay attentive. Apply now, get reviewed in 48 hours.
            </p>
          </div>
          {isCurrentlyElite ? (
            <Link
              href="/pros/billing?tab=subscription"
              className="btn border border-white/30 text-white hover:bg-white/10"
            >
              Manage subscription <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href="/pros/billing?tab=subscription"
              className="btn bg-amber-accent text-white hover:bg-amber-deep"
            >
              Apply for Elite Pro <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
