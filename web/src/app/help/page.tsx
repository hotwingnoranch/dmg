import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Help center — Vanguard",
  description:
    "Answers to common questions about hiring, listing, billing, and credits on Vanguard.",
};

const TOPICS = [
  {
    slug: "buyers",
    icon: Send,
    title: "Buyers",
    body: "How to place a request, what happens next, and how to compare quotes.",
    href: "/buyer/request/new",
    cta: "Place a request",
  },
  {
    slug: "pros",
    icon: ShieldCheck,
    title: "Pros & Elite Pros",
    body: "Onboarding, leads, the Elite Pro program, and Vanguard's vetting standards.",
    href: "/pros/elite",
    cta: "Elite Pro program",
  },
  {
    slug: "billing",
    icon: CreditCard,
    title: "Billing & credits",
    body: "Pricing, credit packs, auto top-up, subscriptions, and refunds.",
    href: "/pros/billing",
    cta: "Open billing",
  },
  {
    slug: "account",
    icon: UserCog,
    title: "Account & settings",
    body: "Profile updates, service area changes, password resets, signing out.",
    href: "/pros/settings",
    cta: "Settings",
  },
];

const FAQ = [
  {
    q: "How fast will I hear back from pros?",
    a: "Most requests get a first response within an hour. Urgent requests (24–48 hour timing) usually get a reply within 18 minutes during business hours.",
  },
  {
    q: "Does Vanguard charge buyers?",
    a: "No. Submitting a request, comparing quotes, and hiring through Vanguard is free for buyers. Pros pay credits per response — no commissions on the contracts they win.",
  },
  {
    q: "How are pros vetted?",
    a: "Every published Pro is reviewed for active licensing per state, liability + workers' comp insurance, background checks on principals, and two reference calls with prior clients. Elite Pros recertify annually.",
  },
  {
    q: "Can I get my credits back?",
    a: "Credit packs are non-refundable but never expire. If you bought a pack by mistake, email team@vanguard.example within 24 hours and we'll work it out.",
  },
  {
    q: "What is auto top-up?",
    a: "When your balance drops below your chosen threshold, we automatically charge your saved card and refill the credit pack you selected. Cancel from /pros/billing anytime.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "From /pros/billing, switch your tier to Standard. Your benefits continue until the end of the paid period.",
  },
  {
    q: "I forgot my password.",
    a: "Reset it from the login screen. We'll email a 6-digit code to your account email — check spam if you don't see it within a minute.",
  },
  {
    q: "Is my data secure?",
    a: "All traffic is encrypted in transit. Card numbers never touch our servers (Stripe handles payment). See /legal/privacy for full detail.",
  },
];

export default async function HelpCenterPage() {
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
        <div className="container-page py-16 lg:py-20">
          <div className="max-w-3xl">
            <p className="eyebrow inline-flex items-center gap-2">
              <LifeBuoy className="h-3.5 w-3.5" />
              Help center
            </p>
            <h1 className="display-h1 mt-4 text-balance">
              Answers, fast.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-ink-300">
              Most questions are answered below. If you can&apos;t find what
              you need, our team responds in under one business day.
            </p>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="container-page -mt-6 pb-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TOPICS.map((t) => (
            <article
              key={t.slug}
              className="card-elev flex flex-col gap-3 p-5 transition hover:border-amber-accent/50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-accent/30 bg-amber-accent/10 text-amber-accent">
                <t.icon className="h-4 w-4" />
              </span>
              <h3 className="font-display text-lg font-bold">{t.title}</h3>
              <p className="text-sm text-ink-300">{t.body}</p>
              <Link
                href={t.href}
                className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-amber-accent hover:text-amber-deep"
              >
                {t.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="container-page py-12">
        <div className="mb-8">
          <p className="eyebrow inline-flex items-center gap-2">
            <HelpCircle className="h-3.5 w-3.5" />
            FAQ
          </p>
          <h2 className="display-h2 mt-3">Common questions.</h2>
        </div>
        <div className="grid gap-3">
          {FAQ.map((item, i) => (
            <details
              key={i}
              className="group rounded-2xl border border-ink-700 bg-white p-5 shadow-card transition open:border-amber-accent/40 open:shadow-card-strong"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 list-none">
                <span className="font-display text-base font-bold pr-6">
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

      {/* Contact band */}
      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Still need help?
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-bold mt-2">
                Real humans, real answers.
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/70">
                Email us and we&apos;ll respond in under one business day.
                Pros on the Elite tier get a dedicated account manager.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <a
                href="mailto:team@vanguard.example"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                <Mail className="h-4 w-4" /> Email support
              </a>
              <Link
                href="/pros/elite"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                <MessageSquare className="h-4 w-4" /> Elite Pro program
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
