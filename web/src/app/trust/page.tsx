import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  Lock,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Trust & vetting — Vanguard",
  description:
    "How Vanguard verifies pros before they go live, and how we keep the directory clean.",
};

const VETTING_STEPS = [
  {
    n: "01",
    icon: FileCheck2,
    title: "License verification",
    body: "Each Pro submits their state-issued security license. We verify it directly with the issuing regulator (e.g., DCA, DPS) before publishing the profile.",
  },
  {
    n: "02",
    icon: Lock,
    title: "Insurance check",
    body: "Liability and workers' comp certificates of insurance, validated with the carrier. Profiles flag automatically when COIs lapse.",
  },
  {
    n: "03",
    icon: BadgeCheck,
    title: "Background check on principals",
    body: "Owners and team leads get a full background check — criminal history, identity verification, address confirmation.",
  },
  {
    n: "04",
    icon: Users,
    title: "Reference calls",
    body: "We talk to two prior clients before publishing. They tell us how the team showed up, communicated, and resolved problems.",
  },
];

const ONGOING = [
  "Annual recertification of license + insurance for all Elite Pros",
  "Quarterly review of complaint reports and refund requests",
  "Buyers can flag a profile from any Pro page; flagged profiles are reviewed within 48 hours",
  "Repeat offenders are removed and banned from rejoining",
];

export default async function TrustPage() {
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
            <p className="eyebrow justify-center">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Trust & vetting
            </p>
            <h1 className="display-h1 mt-4 text-balance">
              The badge means we{" "}
              <em className="not-italic font-display italic text-amber-accent">
                checked
              </em>
              .
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-ink-300">
              Anyone can list themselves on the internet. Vanguard&apos;s
              promise is that we did the diligence before anyone could see a
              Pro&apos;s profile.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow">Pre-publication checks</p>
          <h2 className="display-h2 mt-3">What every Pro completes.</h2>
        </div>
        <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {VETTING_STEPS.map((s) => (
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
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <p className="text-sm text-ink-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-ink-700 bg-ink-900">
        <div className="container-page grid gap-10 py-20 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="eyebrow">After publication</p>
            <h2 className="display-h2 mt-3">
              Vetting that doesn&apos;t expire.
            </h2>
            <p className="mt-4 max-w-md text-sm text-ink-300">
              The directory only stays clean if we keep checking. Here&apos;s
              what we do continuously.
            </p>
          </div>
          <ul className="card-elev grid gap-3 p-6">
            {ONGOING.map((v) => (
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

      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Have a concern?
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 leading-[1.1]">
                Flag a profile in 30 seconds.
              </h2>
              <p className="mt-3 max-w-md text-sm text-white/70">
                Email security@vanguard.example or use the report link on any
                pro profile. We acknowledge within 24 hours.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/contact"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Contact security <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/legal/privacy"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                Privacy policy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
