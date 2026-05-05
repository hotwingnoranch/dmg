import Link from "next/link";
import { Logo } from "./Logo";

const sections = [
  {
    title: "For clients",
    links: [
      { href: "/buyer/request/new", label: "Request a quote" },
      { href: "/services/security-guard", label: "Find a guard" },
      { href: "/services/executive-protection", label: "Executive protection" },
      { href: "/services/cybersecurity", label: "Cyber consulting" },
    ],
  },
  {
    title: "For professionals",
    links: [
      { href: "/pros/join", label: "Join as a pro" },
      { href: "/pros", label: "How leads work" },
      { href: "/pricing", label: "Credit pricing" },
      { href: "/pros/elite", label: "Elite Pro program" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/trust", label: "Vetting & trust" },
      { href: "/press", label: "Press" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/cookies", label: "Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-32 border-t border-ink-700 bg-ink-900">
      <div className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm text-ink-300">
              Vanguard is the vetted directory for private security,
              protection, and risk services. Background-checked,
              license-verified, on call across the United States.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-ink-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400/70 shadow-[0_0_8px] shadow-emerald-400/60" />
              24/7 dispatch
            </div>
          </div>

          {sections.map((s) => (
            <div key={s.title}>
              <h3 className="label mb-4">{s.title}</h3>
              <ul className="space-y-3 text-sm text-ink-200">
                {s.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="hover:text-amber-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-ink-700">
        <div className="container-page flex flex-col-reverse items-start justify-between gap-3 py-6 md:flex-row md:items-center text-xs text-ink-400">
          <p>© {new Date().getFullYear()} Vanguard Security, Inc. All rights reserved.</p>
          <p className="font-mono tracking-tight">
            Built on InsForge · Encrypted in transit
          </p>
        </div>
      </div>
    </footer>
  );
}
