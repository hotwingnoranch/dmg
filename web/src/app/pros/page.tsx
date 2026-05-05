import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock,
  CreditCard,
  Inbox,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { CREDIT_PACKS, SUBSCRIPTION_TIERS, formatPrice } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "For professionals — Vanguard",
  description:
    "How leads work, how Vanguard vets, and how to win more contracts as a private security professional.",
};

const HOW_LEADS_WORK = [
  {
    n: "01",
    icon: Inbox,
    title: "Leads stream into your dashboard",
    body: "The moment a buyer in your service area submits a matching request, it appears in /pros/leads with verified phone, location, urgency, and the situation in their own words.",
  },
  {
    n: "02",
    icon: CreditCard,
    title: "Spend credits to respond",
    body: "Each lead costs credits to unlock and respond to. Higher-intent leads (urgent, verified phone, frequent client) cost more — but convert ~3× as often.",
  },
  {
    n: "03",
    icon: BadgeCheck,
    title: "Win the contract — keep 100%",
    body: "We don't take a cut of the work you win. The buyer hires you directly. You only ever pay for the moment of connection, never the contract.",
  },
];

const WHY = [
  {
    icon: Sparkles,
    title: "Real-time, hyper-local",
    body: "We only route requests to pros whose service category and area match. No tire-kickers, no out-of-zone leads.",
  },
  {
    icon: ShieldCheck,
    title: "Vetted clients",
    body: "We verify buyer phone numbers and flag suspicious requests before they hit your inbox.",
  },
  {
    icon: Star,
    title: "Reputation that compounds",
    body: "Reviews, response time, hires — all surfaced on your profile. Better numbers, better placement.",
  },
  {
    icon: Users,
    title: "Account managers for Elite",
    body: "Top-tier subscribers get a real human reviewing their profile and helping them respond faster.",
  },
];

const FAQ = [
  {
    q: "Do I have to subscribe to start?",
    a: "No. The Standard plan is free. Add credits as you go and only spend them on leads you actually want to respond to.",
  },
  {
    q: "What does it cost per lead?",
    a: "Most leads cost between 8 and 30 credits, depending on intent signals. At $1.88/credit, that's typically $15–$56 per lead unlocked. Compare to ~$30–$80 industry average for security lead-gen services.",
  },
  {
    q: "Do you take commission on contracts?",
    a: "Never. The buyer pays you directly. Vanguard's revenue is the credits and the optional Pro / Elite Pro subscriptions.",
  },
  {
    q: "How do I get the Elite Pro badge?",
    a: "Subscribe to the Elite tier. We re-verify your license, insurance, and references annually. The badge appears on your profile and every reply you send.",
  },
  {
    q: "What if a lead is a no-show or fake?",
    a: "Report it from /pros/responses. Verified-fake leads get a credit refund automatically. Real-but-cold leads stay on you — they're part of the funnel.",
  },
];

export default async function ProMarketingPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);
  const proTier = SUBSCRIPTION_TIERS.find((t) => t.slug === "sub-pro");
  const eliteTier = SUBSCRIPTION_TIERS.find((t) => t.slug === "sub-elite");
  const smallestPack = CREDIT_PACKS[0];

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-vanguard-wash">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-grid-faint opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]"
        />
        <div className="container-page py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="eyebrow">For professionals</p>
              <h1 className="display-h1 mt-4 text-balance">
                Win quality contracts.{" "}
                <em className="not-italic font-display italic text-amber-accent">
                  Keep 100%
                </em>{" "}
                of the job.
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg text-ink-300">
                Tens of thousands of clients are searching Vanguard every
                week. Set your service area, choose the leads you want, and
                pay only for the moment of connection — never the contract.
              </p>
              <ul className="mt-8 grid max-w-md gap-3 text-sm">
                {[
                  "Real-time leads filtered by your service area",
                  "Background-checked client profile + verified phone",
                  "No commission on jobs you win",
                  "Elite Pro program for top-rated teams",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-amber-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link href="/pros/join" className="btn-primary">
                  Join as a Pro <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/pros/elite" className="btn-outline">
                  Elite Pro program
                </Link>
              </div>
            </div>

            {/* Lead preview card */}
            <aside className="card-elev p-6">
              <div className="flex items-center justify-between">
                <p className="eyebrow">Sample lead</p>
                <span className="rounded-full border border-red-400 bg-red-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-red-900">
                  Urgent
                </span>
              </div>
              <h3 className="mt-3 font-display text-xl font-bold">
                Event Security · Atlanta, 30309
              </h3>
              <p className="mt-2 text-sm text-ink-300">
                Private wedding, ~150 guests. Indoor venue with two access
                points. Need 4 unarmed guards from 5pm to 1am Saturday.
              </p>
              <ul className="mt-4 grid gap-2 text-xs text-ink-400">
                <li className="flex items-center justify-between border-t border-ink-700 pt-2">
                  <span>Verified phone</span>
                  <span className="text-emerald-900">✓</span>
                </li>
                <li className="flex items-center justify-between border-t border-ink-700 pt-2">
                  <span>Frequent client</span>
                  <span className="text-emerald-900">✓</span>
                </li>
                <li className="flex items-center justify-between border-t border-ink-700 pt-2">
                  <span>Estimated cost</span>
                  <span className="font-mono text-ink-200">18 credits</span>
                </li>
              </ul>
              <button
                disabled
                className="btn-primary mt-5 w-full opacity-60"
                aria-label="Sample"
              >
                One-click response · 18 credits
              </button>
              <p className="mt-2 text-center text-[11px] text-ink-400">
                You&apos;ll see leads like this on{" "}
                <Link
                  href="/pros/leads"
                  className="font-medium text-amber-accent hover:text-amber-deep"
                >
                  /pros/leads
                </Link>
              </p>
            </aside>
          </div>
        </div>
      </section>

      {/* HOW LEADS WORK */}
      <section className="container-page py-20">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">How leads work</p>
          <h2 className="display-h2 mt-3">
            Pay-per-response, never per-contract.
          </h2>
          <p className="mt-4 text-sm text-ink-300">
            Vanguard makes money from credits and (optionally) subscriptions —
            never from the work you win. The numbers below are exact.
          </p>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {HOW_LEADS_WORK.map((s) => (
            <li
              key={s.n}
              className="card-elev relative flex flex-col gap-3 p-6 transition hover:border-amber-accent/50"
            >
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs tracking-[0.2em] text-amber-accent">
                  {s.n}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-accent/30 bg-amber-accent/10 text-amber-accent">
                  <s.icon className="h-4 w-4" />
                </span>
              </div>
              <h3 className="font-display text-xl font-bold">{s.title}</h3>
              <p className="text-sm text-ink-300">{s.body}</p>
            </li>
          ))}
        </ol>

        {/* Pricing snapshot */}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <PriceCard
            label="Smallest credit pack"
            value={formatPrice(smallestPack.price_cents)}
            subline={`${smallestPack.credits} credits · ${smallestPack.label.toLowerCase()}`}
            href="/pros/billing?tab=credits"
            cta="Buy credits"
          />
          <PriceCard
            label="Pro plan"
            value={`${formatPrice(proTier?.price_cents ?? 7900)} / mo`}
            subline="Up to 25 leads/mo, priority placement, insights"
            href="/pros/billing?tab=subscription"
            cta="Compare plans"
          />
          <PriceCard
            label="Elite Pro"
            value={`${formatPrice(eliteTier?.price_cents ?? 24900)} / mo`}
            subline="Unlimited leads, top placement, dedicated AM, badge"
            href="/pros/elite"
            cta="Learn more"
            elite
          />
        </div>
      </section>

      {/* WHY VANGUARD */}
      <section className="border-y border-ink-700 bg-ink-900">
        <div className="container-page py-20">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow">Why Vanguard</p>
            <h2 className="display-h2 mt-3">
              Built for the way security teams actually run.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {WHY.map((w) => (
              <article
                key={w.title}
                className="rounded-2xl border-2 border-ink-600 bg-white p-5 shadow-card"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-accent/30 bg-amber-accent/10 text-amber-accent">
                  <w.icon className="h-4 w-4" />
                </span>
                <h3 className="mt-3 font-display text-lg font-bold">
                  {w.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink-300">{w.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="container-page py-20">
        <p className="eyebrow">From the field</p>
        <h2 className="display-h2 mt-3 max-w-2xl">
          Pros who use Vanguard, in their own words.
        </h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {[
            {
              q: "We replaced an entire $40k/year lead-gen contract with credits. ROI was clear by month two.",
              n: "Marisol G.",
              r: "Director, Sentinel Protective",
            },
            {
              q: "The Elite badge moved us from page three of search to the top carousel. Leads doubled inside a week.",
              n: "Daniel K.",
              r: "Owner, Apex Executive Detail",
            },
            {
              q: "What I like: I only pay when I respond. What I love: I keep 100% of every contract I win.",
              n: "Aisha R.",
              r: "Operations Lead, Cipher Cyber",
            },
          ].map((t, i) => (
            <figure
              key={i}
              className="card-elev flex h-full flex-col gap-5 p-6 transition hover:border-amber-accent/40"
            >
              <div className="flex items-center gap-1 text-amber-accent">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-accent" />
                ))}
              </div>
              <blockquote className="font-display text-lg leading-snug text-ink-50">
                &ldquo;{t.q}&rdquo;
              </blockquote>
              <figcaption className="mt-auto flex items-center gap-3 border-t border-ink-700 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-accent/15 font-display text-sm text-amber-accent">
                  {t.n.charAt(0)}
                </span>
                <span className="text-sm">
                  <span className="block font-medium">{t.n}</span>
                  <span className="block text-xs text-ink-400">{t.r}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-12">
        <div className="mb-8">
          <p className="eyebrow inline-flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" /> 60-second answers
          </p>
          <h2 className="display-h2 mt-3">Pro FAQ.</h2>
        </div>
        <div className="grid gap-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-ink-700 bg-white p-5 shadow-card transition open:border-amber-accent/40 open:shadow-card-strong"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="pr-6 font-display text-base font-bold">
                  {item.q}
                </span>
                <span className="grid h-7 w-7 flex-none place-items-center rounded-full border border-ink-600 text-ink-400 transition group-open:rotate-45 group-open:border-amber-accent group-open:text-amber-accent">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-200">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Free to join
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 leading-[1.1]">
                Set up your team profile in 90 seconds.
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/70">
                Add your services, set your area, publish. Lead alerts start
                streaming the moment a matching request comes in.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/pros/join"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Join as a Pro <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pros/elite"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                Elite Pro program
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function PriceCard({
  label,
  value,
  subline,
  href,
  cta,
  elite,
}: {
  label: string;
  value: string;
  subline: string;
  href: string;
  cta: string;
  elite?: boolean;
}) {
  return (
    <article
      className={`card-elev flex flex-col p-6 ${elite ? "ring-2 ring-amber-accent" : ""}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-amber-accent">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tightest">
        {value}
      </p>
      <p className="mt-1 text-xs text-ink-400">{subline}</p>
      <Link
        href={href}
        className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium text-amber-accent hover:text-amber-deep"
      >
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}
