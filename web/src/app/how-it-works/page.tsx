import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  CheckCircle2,
  Clock,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "How Vanguard works",
  description:
    "From request to on-site in three steps. The vetted directory of private security and protection professionals.",
};

const BUYER_STEPS = [
  {
    n: "01",
    icon: Send,
    title: "Tell us the situation",
    body: "Pick a service, set a ZIP, add timing. Takes about 60 seconds. You can describe the situation in your own words.",
  },
  {
    n: "02",
    icon: Users,
    title: "Get matched in minutes",
    body: "Up to 5 vetted teams reach out with availability and quotes. We only route to pros who actually serve your area.",
  },
  {
    n: "03",
    icon: BadgeCheck,
    title: "Hire with confidence",
    body: "Compare credentials, response time, and reviews. Hire the right fit. License + insurance verification is on every Pro profile.",
  },
];

const PRO_STEPS = [
  {
    n: "01",
    icon: ShieldCheck,
    title: "Apply and verify",
    body: "Sign up, list your services, and submit your license + insurance. Most teams are reviewed within 48 hours.",
  },
  {
    n: "02",
    icon: Clock,
    title: "Get real-time leads",
    body: "Matching requests stream into your dashboard the moment a buyer hits submit. Email and SMS alerts available.",
  },
  {
    n: "03",
    icon: Briefcase,
    title: "Win the contract",
    body: "Pay only for the leads you respond to. No commission on jobs you win. Elite Pros get top placement and a Hired Guarantee.",
  },
];

const VETTING = [
  "Active license per state",
  "Liability + workers' comp insurance",
  "Background checks on principals",
  "Two reference calls with prior clients",
];

export default async function HowItWorksPage() {
  const user = await getCurrentUser();
  const isAdmin = await isAdminEmail(user?.email);
  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-vanguard-wash">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-grid-faint opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]"
        />
        <div className="container-page py-20 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow justify-center">How Vanguard works</p>
            <h1 className="display-h1 mt-6 text-balance">
              From request to{" "}
              <em className="not-italic font-display italic text-amber-accent">
                on-site
              </em>{" "}
              in three steps.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-ink-300">
              Vanguard is a vetted directory for private security, protection,
              and risk services. We match buyers with the right team —
              licensed, insured, and on call — in minutes, not days.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link href="/buyer/request/new" className="btn-primary">
                Request protection <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pros/join" className="btn-outline">
                Join as a Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Buyer flow */}
      <section className="container-page py-20">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">For buyers</p>
          <h2 className="display-h2 mt-3">Hire protection with the rigor of a counsel hire.</h2>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {BUYER_STEPS.map((s) => (
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
      </section>

      {/* Vetting */}
      <section className="border-y border-ink-700 bg-ink-900">
        <div className="container-page grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">How we vet</p>
            <h2 className="display-h2 mt-3">
              Why buyers trust the{" "}
              <em className="not-italic font-display italic text-amber-accent">
                badge
              </em>
              .
            </h2>
            <p className="mt-4 max-w-md text-sm text-ink-300">
              Every published Pro is reviewed by a Vanguard team member
              before their profile goes live. Recertification happens every
              year so the standard never slips.
            </p>
          </div>
          <ul className="card-elev grid gap-3 p-6">
            {VETTING.map((v) => (
              <li
                key={v}
                className="flex items-start gap-3 border-t border-ink-700 pt-3 text-sm first:border-0 first:pt-0"
              >
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-amber-accent" />
                <span className="text-ink-200">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pro flow */}
      <section className="container-page py-20">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">For professionals</p>
          <h2 className="display-h2 mt-3">
            Win the contracts that move your business.
          </h2>
          <p className="mt-4 text-sm text-ink-300">
            Tens of thousands of clients are searching Vanguard every week.
            Pay only for the leads you respond to. Keep 100% of what you earn.
          </p>
        </div>
        <ol className="grid gap-5 md:grid-cols-3">
          {PRO_STEPS.map((s) => (
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
      </section>

      {/* CTA band */}
      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="eyebrow">Ready when you are</p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 leading-[1.1]">
                Place a request, post a profile, or just see who&apos;s on
                Vanguard.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/buyer/request/new"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Request protection <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/services"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                Browse services
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
