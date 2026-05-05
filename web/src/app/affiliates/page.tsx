import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Coins,
  Link2,
  MousePointerClick,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ShareButtons } from "@/components/ShareButtons";
import { getCurrentUser, getAccessToken } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { categoryImage } from "@/lib/images";
import {
  FIRST_CREDIT_COMMISSION_BPS,
  SUBSCRIPTION_COMMISSION_BPS,
  PAYOUT_THRESHOLD_CENTS,
  getOrCreateReferral,
} from "@/lib/referrals";
import { createServerClient } from "@/lib/insforge";

export const metadata: Metadata = {
  title: "For affiliates — Vanguard",
  description:
    "Refer security pros and businesses to Vanguard. Earn 20% on their first credit purchase and 15% on subscriptions for 12 months.",
};

const FIRST = `${(FIRST_CREDIT_COMMISSION_BPS / 100).toFixed(0)}%`;
const RECURRING = `${(SUBSCRIPTION_COMMISSION_BPS / 100).toFixed(0)}%`;
const PAYOUT_DOLLARS = `$${(PAYOUT_THRESHOLD_CENTS / 100).toFixed(0)}`;

const STEPS = [
  {
    n: "01",
    icon: Link2,
    title: "Get your link in 30 seconds",
    body: "Sign up free, head to /affiliate, and grab your unique referral URL. No application, no approval — every Vanguard user gets a code.",
  },
  {
    n: "02",
    icon: MousePointerClick,
    title: "Share with security pros",
    body: "Drop the link into emails, your website, group chats, social — anywhere security operators hang out. Clicks set a 30-day attribution cookie.",
  },
  {
    n: "03",
    icon: Banknote,
    title: "Earn on every payment",
    body: `${FIRST} on their first credit purchase, plus ${RECURRING} on every subscription invoice for 12 months. Once you hit ${PAYOUT_DOLLARS} in pending commission, we reach out to arrange payout.`,
  },
];

const FAQ = [
  {
    q: "Who can I refer?",
    a: "Security pros joining Vanguard. Business owners, agencies, sole operators — anyone who buys leads or subscribes counts. Self-referrals don't earn commission.",
  },
  {
    q: "How long does the cookie last?",
    a: "30 days from the first click on your /r/<code> link. After signup, the attribution is permanent — every subscription invoice they pay for the next 12 months earns you commission.",
  },
  {
    q: "What if they refund or churn?",
    a: "Refunds and chargebacks reverse the related commission entry. Subscription cancellations stop the recurring stream from the next invoice — no clawback on already-earned commission.",
  },
  {
    q: "Is there a cap?",
    a: "No cap on number of referrals, total commission, or payout volume. The 12-month subscription window starts the day they sign up.",
  },
];

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://vanguard.insforge.site"
  ).replace(/\/$/, "");
}

export default async function AffiliatesMarketingPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);

  const dashboardCta = user
    ? { href: "/affiliate", label: "Open my affiliate dashboard" }
    : { href: "/signup?next=/affiliate", label: "Sign up to start earning" };

  // If logged in, materialize the referral row so we can share their
  // unique link directly from this marketing page. Falls back to the
  // page URL itself for unauthenticated visitors.
  let shareUrl = `${appUrl()}/affiliates`;
  let shareLabel: string | undefined;
  if (user) {
    const token = await getAccessToken();
    if (token) {
      const insforge = createServerClient(token);
      const profile = await insforge.database
        .from("profiles")
        .select("is_pro")
        .eq("id", user.id)
        .maybeSingle();
      const isPro =
        (profile.data as { is_pro?: boolean } | null)?.is_pro ?? false;
      const referral = await getOrCreateReferral(token, user.id, isPro);
      if (referral) {
        shareUrl = `${appUrl()}/r/${referral.code}`;
        shareLabel = "Your referral link";
      }
    }
  }

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-vanguard-wash">
        <Image
          aria-hidden
          src={categoryImage("executive-protection")}
          alt=""
          fill
          sizes="100vw"
          priority
          className="-z-20 object-cover opacity-15"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white/85 via-white/90 to-white"
        />
        <div className="container-page py-20 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">For affiliates</p>
              <h1 className="display-h1 mt-4 text-balance">
                Refer security pros.{" "}
                <em className="not-italic font-display italic text-amber-accent">
                  Earn for a year.
                </em>
              </h1>
              <p className="mt-6 max-w-xl text-pretty text-lg text-ink-300">
                Win quality contracts and keep 100% of the job — that&apos;s
                Vanguard&apos;s pitch to pros. Bring them on board and we
                share the upside with you. {FIRST} on their first credit
                purchase, {RECURRING} on every subscription invoice for 12
                months.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href={dashboardCta.href} className="btn-primary">
                  {dashboardCta.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pricing" className="btn-outline">
                  See pro pricing
                </Link>
              </div>

              <ul className="mt-8 grid gap-2 text-sm text-ink-300 sm:grid-cols-2">
                <li className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> 30-day
                  attribution cookie
                </li>
                <li className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> No cap
                  on commissions
                </li>
                <li className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Free to
                  join — no application
                </li>
                <li className="inline-flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" /> Live
                  dashboard with click + earnings tracking
                </li>
              </ul>
            </div>

            {/* Right rail — earnings illustration */}
            <aside className="card-elev relative overflow-hidden p-7">
              <p className="eyebrow">Example earnings</p>
              <p className="mt-2 font-display text-2xl font-bold tracking-tight">
                10 referred pros · Pro plan
              </p>
              <div className="mt-6 grid gap-4 text-sm">
                <Row
                  label="First credit purchase ($226 avg)"
                  value="$45.20 × 10 = $452"
                  rate={FIRST}
                />
                <Row
                  label="Pro subscription · 12 months ($79/mo)"
                  value="$11.85 × 12 × 10 = $1,422"
                  rate={RECURRING}
                />
                <hr className="border-ink-700" />
                <div className="flex items-baseline justify-between">
                  <span className="text-ink-300">Year-one commission</span>
                  <span className="font-display text-3xl font-bold text-amber-accent">
                    $1,874
                  </span>
                </div>
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-ink-400">
                Illustrative · actuals depend on plan mix
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* SHARE STRIP */}
      <section className="border-y border-ink-700 bg-white">
        <div className="container-page py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="eyebrow">{user ? "Share your link" : "Spread the word"}</p>
              <h3 className="mt-2 font-display text-xl font-bold">
                {user
                  ? "Drop your referral link anywhere security pros hang out."
                  : "Tell your network about Vanguard."}
              </h3>
              {!user && (
                <p className="mt-1 text-sm text-ink-300">
                  <Link
                    href="/signup?next=/affiliate"
                    className="font-medium text-amber-accent hover:text-amber-deep"
                  >
                    Sign up
                  </Link>{" "}
                  for a personal /r/&lt;code&gt; link that earns you commission.
                </p>
              )}
            </div>
            <ShareButtons
              url={shareUrl}
              message={
                user
                  ? "Vetted private security pros, fast quotes. Try Vanguard:"
                  : "Vanguard is the vetted directory for private security, protection and risk services."
              }
              label={shareLabel}
            />
          </div>
        </div>
      </section>

      {/* FEE SPLIT */}
      <section className="container-page py-20">
        <div className="text-center">
          <p className="eyebrow">The fee split</p>
          <h2 className="display-h2 mt-3">
            Vanguard makes money on credits and subscriptions.{" "}
            <span className="text-amber-accent">You take a cut of both.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base text-ink-300">
            Every dollar a referred pro spends on Vanguard splits into three
            buckets. Vanguard covers infrastructure, support, and the
            marketplace. The pro pays for the connection. You earn on the
            transaction.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          <SplitCard
            tone="primary"
            icon={<Coins className="h-5 w-5" />}
            title="Credit purchases"
            big={FIRST}
            line="of the first pack"
            body="When a referred pro buys their very first credit pack — Starter, Growth, or Pro — you earn 20% straight to your pending balance. One-time, generous to kickstart your funnel."
            footnote="$226 pack → you earn ~$45"
          />
          <SplitCard
            tone="amber"
            icon={<Users className="h-5 w-5" />}
            title="Subscription invoices"
            big={RECURRING}
            line="for 12 months"
            body="Pros on Pro ($79/mo) or Elite Pro ($249/mo) generate commission on every invoice for a full year from sign-up. Recurring revenue while they grow their security business."
            footnote="$79/mo → ~$11.85 every month, year-one"
          />
          <SplitCard
            tone="ghost"
            icon={<ShieldCheck className="h-5 w-5" />}
            title="The pro keeps the job"
            big="0%"
            line="commission on jobs"
            body="Vanguard never takes a cut of the contracts pros win. That's our promise to them — and the reason they convert. Your referral funnel is clean to pitch."
            footnote="Zero job-percentage clawback"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-ink-900">
        <div className="container-page py-20">
          <div className="text-center">
            <p className="eyebrow">How it works</p>
            <h2 className="display-h2 mt-3">
              Three steps. Zero busywork.
            </h2>
          </div>

          <ol className="mt-12 grid gap-5 lg:grid-cols-3">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="card-elev relative overflow-hidden p-6"
              >
                <span className="font-display text-[3rem] font-bold leading-none tracking-tightest text-amber-accent/30">
                  {s.n}
                </span>
                <s.icon className="mt-2 h-6 w-6 text-amber-accent" />
                <h3 className="mt-3 font-display text-lg font-bold">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-ink-300">
            <span>Once you hit {PAYOUT_DOLLARS} pending,</span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-accent bg-amber-accent/10 px-3 py-1 font-medium text-amber-accent">
              <Banknote className="h-3.5 w-3.5" />
              we reach out to arrange payout
            </span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">FAQ</p>
            <h2 className="display-h2 mt-3">Common questions</h2>
            <p className="mt-3 text-sm text-ink-300">
              Don&apos;t see your answer? Email{" "}
              <a
                href="mailto:partners@vanguardsecurity.com"
                className="font-medium text-amber-accent hover:text-amber-deep"
              >
                partners@vanguardsecurity.com
              </a>
              .
            </p>
          </div>

          <ul className="grid gap-3">
            {FAQ.map((f) => (
              <li
                key={f.q}
                className="rounded-2xl border border-ink-700 bg-white p-5"
              >
                <p className="font-display text-base font-bold">{f.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink-300">
                  {f.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CLOSING CTA */}
      <section className="container-page pb-24">
        <div className="card-elev relative overflow-hidden p-10 text-center">
          <Image
            aria-hidden
            src={categoryImage("event-security")}
            alt=""
            fill
            sizes="100vw"
            className="-z-20 object-cover opacity-10"
          />
          <p className="eyebrow">Start earning today</p>
          <h2 className="display-h2 mt-3">
            Your link goes live the second you sign up.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-300">
            Free to join. No application. No quotas. Refer your first pro
            this afternoon.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={dashboardCta.href} className="btn-primary">
              {dashboardCta.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/affiliates/marketing-docs" className="btn-outline">
              Marketing materials
            </Link>
            {!user && (
              <Link href="/login?next=/affiliate" className="btn-ghost">
                Already a member? Log in
              </Link>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function Row({
  label,
  value,
  rate,
}: {
  label: string;
  value: string;
  rate: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-ink-700 pt-3 first:border-0 first:pt-0">
      <div>
        <p className="text-ink-100">{label}</p>
        <p className="text-[11px] uppercase tracking-[0.18em] text-amber-accent">
          {rate} commission
        </p>
      </div>
      <p className="font-mono text-sm text-ink-300">{value}</p>
    </div>
  );
}

function SplitCard({
  tone,
  icon,
  title,
  big,
  line,
  body,
  footnote,
}: {
  tone: "primary" | "amber" | "ghost";
  icon: React.ReactNode;
  title: string;
  big: string;
  line: string;
  body: string;
  footnote: string;
}) {
  const accent =
    tone === "primary"
      ? "bg-navy-900 text-white border-navy-900"
      : tone === "amber"
        ? "border-amber-accent bg-amber-accent/5"
        : "border-ink-700 bg-white";
  const bigColor =
    tone === "primary" ? "text-amber-glow" : "text-amber-accent";
  const subColor = tone === "primary" ? "text-white/70" : "text-ink-400";
  const bodyColor = tone === "primary" ? "text-white/80" : "text-ink-300";

  return (
    <article
      className={`relative overflow-hidden rounded-2xl border-2 p-6 shadow-card ${accent}`}
    >
      <div className={`flex items-center gap-2 ${bigColor}`}>
        {icon}
        <p className="text-[11px] uppercase tracking-[0.18em] font-semibold">
          {title}
        </p>
      </div>
      <p className={`mt-4 font-display text-5xl font-bold tracking-tightest ${bigColor}`}>
        {big}
      </p>
      <p className={`text-sm ${subColor}`}>{line}</p>
      <p className={`mt-4 text-sm leading-relaxed ${bodyColor}`}>{body}</p>
      <p className={`mt-5 text-[11px] uppercase tracking-[0.18em] ${subColor}`}>
        {footnote}
      </p>
    </article>
  );
}
