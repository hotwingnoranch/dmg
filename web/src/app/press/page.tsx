import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Download, Mail, Newspaper } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Press — Vanguard",
  description:
    "Press resources, brand assets, and company background for journalists and partners.",
};

const FACTS = [
  { k: "Company", v: "Vanguard Security, Inc." },
  { k: "Headquarters", v: "United States" },
  { k: "Categories", v: "14 vetted security & risk specialties" },
  { k: "Coverage", v: "47 states" },
  { k: "Plans", v: "Free, Pro, Elite Pro" },
  { k: "Founded", v: "2026" },
];

export default async function PressPage() {
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
          <div className="max-w-3xl">
            <p className="eyebrow inline-flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5" />
              Press
            </p>
            <h1 className="display-h1 mt-4 text-balance">
              For journalists, analysts, and partners.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-ink-300">
              We respond to press inquiries within one business day. Brand
              assets and a one-pager are below.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page -mt-6 pb-12">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <article className="card-elev p-6">
            <p className="eyebrow">Quick facts</p>
            <h2 className="font-display text-2xl font-bold mt-2">
              The one-pager.
            </h2>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              {FACTS.map((f) => (
                <div
                  key={f.k}
                  className="flex flex-col rounded-xl border border-ink-700 bg-ink-900 px-4 py-3"
                >
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-amber-accent">
                    {f.k}
                  </dt>
                  <dd className="mt-1 font-medium text-ink-100">{f.v}</dd>
                </div>
              ))}
            </dl>
          </article>

          <article className="card-elev p-6">
            <p className="eyebrow">Press inquiries</p>
            <h2 className="font-display text-xl font-bold mt-2">
              Reach the comms team.
            </h2>
            <a
              href="mailto:press@vanguard.example"
              className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm font-medium text-amber-accent hover:text-amber-deep"
            >
              <Mail className="h-4 w-4" />
              press@vanguard.example
            </a>
            <p className="mt-3 text-sm text-ink-300">
              Brand assets are on Notion. Email above for the link.
            </p>
            <button
              type="button"
              disabled
              className="btn-outline mt-5 w-full opacity-60"
            >
              <Download className="h-4 w-4" /> Brand kit (coming soon)
            </button>
          </article>
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
                Background
              </p>
              <h2 className="font-display text-3xl md:text-4xl font-bold mt-3 leading-[1.1]">
                Vanguard, in two sentences.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-white/70">
                Vanguard is a vetted directory connecting buyers — individuals,
                families, businesses, event producers — with licensed,
                insured private security professionals across the United
                States. We charge pros a small per-response fee and an
                optional monthly subscription for top placement, never a
                commission on the contracts they win.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/contact"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Contact <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="btn border border-white/30 text-white hover:bg-white/10"
              >
                About Vanguard
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
