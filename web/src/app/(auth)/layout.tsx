import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ShieldCheck, Lock, BadgeCheck } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative flex flex-col justify-between overflow-hidden bg-navy-900 px-8 py-10 text-white lg:px-16">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage:
              "radial-gradient(80% 60% at 0% 0%, rgba(200,151,63,0.18) 0%, rgba(11,23,48,0) 60%), radial-gradient(60% 60% at 100% 100%, rgba(168,122,37,0.12) 0%, rgba(11,23,48,0) 70%)",
          }}
        />
        <Logo className="text-white" />
        <div className="max-w-sm">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-glow">
            A vetted directory
          </p>
          <h2 className="display-h2 mt-3 text-white">
            Hire protection with the same rigor you hire counsel.
          </h2>
          <p className="mt-4 text-sm text-white/80">
            Background-checked operators, license-verified teams, and a
            response time you can audit.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            {[
              { icon: ShieldCheck, t: "Verified licensing in every state" },
              { icon: Lock, t: "End-to-end encrypted contact details" },
              { icon: BadgeCheck, t: "Elite Pro badge for top performers" },
            ].map((it) => (
              <li
                key={it.t}
                className="flex items-center gap-3 text-white/90"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber-glow/40 bg-amber-glow/10 text-amber-glow">
                  <it.icon className="h-4 w-4" />
                </span>
                {it.t}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/60">
          © {new Date().getFullYear()} Vanguard · Built on InsForge
        </p>
      </div>

      <div className="relative flex items-center justify-center bg-white px-6 py-16 sm:px-12">
        <Link
          href="/"
          className="absolute right-6 top-6 text-xs uppercase tracking-[0.22em] text-ink-400 hover:text-amber-accent"
        >
          ← Back to site
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
