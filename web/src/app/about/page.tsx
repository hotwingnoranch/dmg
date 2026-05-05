import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Compass, Map, ShieldCheck, Users } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "About — Vanguard",
  description:
    "Vanguard is the vetted directory for private security, protection, and risk professionals.",
};

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: "Vetted by default",
    body: "Every published Pro has been checked for license, insurance, and references. We don't list anyone we wouldn't hire ourselves.",
  },
  {
    icon: Users,
    title: "Marketplace, not middleman",
    body: "The buyer hires the pro directly. We connect, then get out of the way. No commission on the contract.",
  },
  {
    icon: Compass,
    title: "Specialists over generalists",
    body: "Fourteen security categories, each with their own dedicated funnel. We'd rather match a buyer to the right team than the closest team.",
  },
  {
    icon: Map,
    title: "United States, with intent",
    body: "We launched in the US. Geographic depth matters more than breadth — we want every metro to have a pro on call.",
  },
];

export default async function AboutPage() {
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
            <p className="eyebrow justify-center">About</p>
            <h1 className="display-h1 mt-4 text-balance">
              Hire protection with the rigor of a counsel hire.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-ink-300">
              Vanguard is the vetted directory of private security and risk
              professionals. We exist because finding a licensed,
              insured, available team shouldn&apos;t take a week of phone
              calls.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">What we believe</p>
          <h2 className="display-h2 mt-3">Four principles, no asterisks.</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((p) => (
            <article
              key={p.title}
              className="card-elev p-5 transition hover:border-amber-accent/50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-accent/30 bg-amber-accent/10 text-amber-accent">
                <p.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold">{p.title}</h3>
              <p className="mt-1.5 text-sm text-ink-300">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Built in the US
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 leading-[1.1]">
                Want to talk?
              </h2>
              <p className="mt-2 max-w-md text-sm text-white/70">
                We answer every email. Press, partnerships, security
                research — all welcome.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/contact"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Contact us <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/trust"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                Vetting & trust
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
