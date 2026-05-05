import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  HelpCircle,
  LifeBuoy,
  Mail,
  ShieldAlert,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";

export const metadata: Metadata = {
  title: "Contact — Vanguard",
  description: "Get in touch with the Vanguard team.",
};

const CHANNELS = [
  {
    icon: Mail,
    title: "General",
    body: "Sales, partnerships, billing questions, anything else.",
    addr: "team@vanguard.example",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    body: "Account help, lead questions, refunds. Under 1 business day.",
    addr: "support@vanguard.example",
  },
  {
    icon: ShieldAlert,
    title: "Security & abuse",
    body: "Vulnerability reports, account compromise, abusive behavior.",
    addr: "security@vanguard.example",
  },
  {
    icon: Users,
    title: "Press & partnerships",
    body: "Media, integrations, joint announcements.",
    addr: "press@vanguard.example",
  },
];

export default async function ContactPage() {
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
            <p className="eyebrow">Contact</p>
            <h1 className="display-h1 mt-4 text-balance">
              Real humans, real answers.
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-ink-300">
              We&apos;re a small team. Pick the right inbox and we&apos;ll
              respond within one business day. Elite Pros get a dedicated
              account manager.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page -mt-6 pb-12">
        <div className="grid gap-4 sm:grid-cols-2">
          {CHANNELS.map((c) => (
            <article
              key={c.addr}
              className="card-elev p-5 transition hover:border-amber-accent/50"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-accent/30 bg-amber-accent/10 text-amber-accent">
                <c.icon className="h-4 w-4" />
              </span>
              <h3 className="mt-3 font-display text-lg font-bold">{c.title}</h3>
              <p className="mt-1.5 text-sm text-ink-300">{c.body}</p>
              <a
                href={`mailto:${c.addr}`}
                className="mt-3 inline-flex items-center gap-1.5 font-mono text-sm font-medium text-amber-accent hover:text-amber-deep"
              >
                <Mail className="h-3.5 w-3.5" />
                {c.addr}
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="overflow-hidden rounded-3xl border border-navy-900 bg-navy-900 p-10 text-white md:p-14">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-amber-glow inline-flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5" />
                Quick answers
              </p>
              <h2 className="font-display text-2xl md:text-3xl font-bold mt-2">
                Most questions are answered in the help center.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/help"
                className="btn bg-amber-accent text-white hover:bg-amber-deep"
              >
                Open help center <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
