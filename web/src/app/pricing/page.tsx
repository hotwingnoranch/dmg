import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { CREDIT_PACKS, SUBSCRIPTION_TIERS, formatPrice } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Pricing — Vanguard",
  description:
    "Free for buyers. Pay-per-response credits for pros. Optional Pro and Elite Pro subscriptions for top placement and more leads.",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);
  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      <section className="relative overflow-hidden bg-vanguard-wash">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-grid-faint opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]"
        />
        <div className="container-page py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow justify-center">Pricing</p>
            <h1 className="display-h1 mt-4 text-balance">
              Free for buyers. Pay-per-response for pros.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-ink-300">
              Vanguard never takes a commission on the contracts you win.
              Spend credits on the leads you respond to, or subscribe for top
              placement and unlimited leads.
            </p>
          </div>
        </div>
      </section>

      {/* SUBS */}
      <section className="container-page -mt-6 pb-12">
        <div className="grid gap-5 lg:grid-cols-3">
          {SUBSCRIPTION_TIERS.map((t) => {
            const isElite = t.slug === "sub-elite";
            const isFree = t.price_cents === 0;
            return (
              <article
                key={t.slug}
                className={`relative flex flex-col rounded-2xl border-2 p-6 transition ${
                  isElite
                    ? "bg-navy-900 text-white border-navy-900 shadow-lift"
                    : "bg-white border-ink-600 hover:border-ink-500 shadow-card"
                }`}
              >
                <p
                  className={`text-xs uppercase tracking-[0.22em] ${
                    isElite ? "text-amber-glow" : "text-amber-accent"
                  }`}
                >
                  {t.blurb}
                </p>
                <h3
                  className={`mt-3 font-display text-3xl font-bold ${isElite ? "text-white" : ""}`}
                >
                  {t.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tracking-tightest">
                    {formatPrice(t.price_cents, "usd", "Free")}
                  </span>
                  {!isFree && (
                    <span
                      className={`text-sm ${isElite ? "text-white/60" : "text-ink-400"}`}
                    >
                      /mo
                    </span>
                  )}
                </div>
                <ul
                  className={`mt-6 grid gap-2.5 text-sm ${
                    isElite ? "text-white/85" : "text-ink-200"
                  }`}
                >
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 flex-none ${
                          isElite ? "text-amber-glow" : "text-amber-accent"
                        }`}
                      />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={isFree ? "/pros/join" : "/pros/billing?tab=subscription"}
                  className={`mt-auto pt-6 ${
                    isElite
                      ? "btn bg-amber-accent text-white hover:bg-amber-deep"
                      : isFree
                        ? "btn-outline"
                        : "btn-primary"
                  }`}
                >
                  {isFree ? "Start free" : `Choose ${t.name}`}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            );
          })}
        </div>
        <p className="mt-4 inline-flex items-center gap-2 text-xs text-ink-400">
          <ShieldCheck className="h-4 w-4 text-amber-accent" />
          Cancel anytime. Test mode currently active — no real charges.
        </p>
      </section>

      {/* CREDITS */}
      <section className="container-page py-16">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">Pay-as-you-go credits</p>
          <h2 className="display-h2 mt-3">Spend only on the leads you want.</h2>
          <p className="mt-3 text-sm text-ink-300">
            Each lead costs credits to unlock and respond to. Higher-intent
            leads (urgent, verified phone, frequent client) cost more — and
            convert at higher rates. Credits never expire.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {CREDIT_PACKS.map((p) => {
            const featured = p.slug === "credits-480";
            return (
              <article
                key={p.slug}
                className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 transition shadow-card ${
                  featured
                    ? "border-amber-accent shadow-glow-amber"
                    : "border-ink-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-accent/10 px-2.5 py-0.5 text-xs font-bold text-amber-accent">
                    {p.discount_label}
                  </span>
                  {featured && (
                    <span className="rounded-full bg-amber-accent px-2.5 py-0.5 text-xs font-bold text-white">
                      BEST VALUE
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-2xl font-bold">{p.label}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold tracking-tightest">
                    {p.credits}
                  </span>
                  <span className="text-sm text-ink-300">credits</span>
                </div>
                <p className="mt-4 font-mono text-lg">{formatPrice(p.price_cents)}</p>
                <p className="text-xs text-ink-400">(Excl. tax) · $1.88/credit</p>
                <Link
                  href="/pros/billing?tab=credits"
                  className="btn-primary mt-6 w-full"
                >
                  Buy credits
                </Link>
              </article>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Free for buyers
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-2">
                Submitting a request is always free.
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/70">
                Compare quotes, pick the right team, hire directly. No fees on
                the buyer side, no commissions on the contract.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/buyer/request/new"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Place a request <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pros/join"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                Join as a Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
