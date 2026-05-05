import Link from "next/link";
import { Logo } from "./Logo";
import { ChevronDown, Search } from "lucide-react";

type HeaderProps = {
  user?: { id: string; email?: string } | null;
  variant?: "transparent" | "solid";
};

export function Header({ user, variant = "transparent" }: HeaderProps) {
  const base =
    variant === "solid"
      ? "bg-white/95 border-b border-ink-700"
      : "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-ink-700/60";
  return (
    <header className={`sticky top-0 z-40 ${base}`}>
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden md:flex items-center gap-1 text-sm text-ink-300">
            <button className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50">
              Explore <ChevronDown className="h-4 w-4 opacity-60" />
            </button>
            <Link
              href="/how-it-works"
              className="rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50"
            >
              How it works
            </Link>
            <Link
              href="/pros"
              className="rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50"
            >
              For professionals
            </Link>
          </nav>
        </div>

        <div className="hidden lg:flex flex-1 max-w-md items-center">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            <input
              placeholder="Search a service…"
              className="w-full rounded-full border border-ink-700 bg-ink-900 pl-10 pr-4 py-2 text-sm placeholder:text-ink-400 focus:border-navy-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/15"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/pros/dashboard" className="btn-ghost">
                Dashboard
              </Link>
              <form action="/api/auth/signout" method="post">
                <button className="btn-outline">Sign out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Log in
              </Link>
              <Link href="/pros/join" className="btn-primary">
                Join as a Pro
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
