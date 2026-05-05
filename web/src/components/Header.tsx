import Link from "next/link";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";
import { MessageSquare, Search, ShieldCheck } from "lucide-react";

type HeaderProps = {
  user?: {
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string | null;
  } | null;
  isAdmin?: boolean;
  unreadMessages?: number;
  variant?: "transparent" | "solid";
  /** Show the search field. Defaults to false; only the landing page enables it. */
  showSearch?: boolean;
  /** Override the avatar URL (defaults to user.avatarUrl). */
  avatarUrl?: string | null;
};

export function Header({
  user,
  isAdmin = false,
  unreadMessages = 0,
  variant = "transparent",
  showSearch = false,
  avatarUrl = null,
}: HeaderProps) {
  const base =
    variant === "solid"
      ? "bg-white/95 border-b border-ink-700"
      : "bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b border-ink-700/60";

  // Search is only useful for unauthenticated discovery — once a user is in,
  // the AI assistant handles "find me a..." and the in-app nav is enough.
  const renderSearch = showSearch && !user;

  return (
    <header className={`sticky top-0 z-40 ${base}`}>
      <div className="container-page flex h-20 items-center justify-between gap-3 sm:gap-6">
        <div className="flex items-center gap-4 lg:gap-6 min-w-0">
          <Logo />
          <nav className="hidden md:flex items-center gap-0.5 text-sm text-ink-300">
            <Link
              href="/services"
              className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50"
            >
              Services
            </Link>
            <Link
              href="/how-it-works"
              className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50"
            >
              How it works
            </Link>
            <Link
              href="/pros"
              className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50"
            >
              For professionals
            </Link>
            <Link
              href="/affiliates"
              className="whitespace-nowrap rounded-full px-3 py-1.5 hover:bg-ink-800 hover:text-ink-50"
            >
              For affiliates
            </Link>
          </nav>
        </div>

        {renderSearch && (
          <div className="hidden lg:flex flex-1 max-w-md items-center">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              <input
                placeholder="Search a service…"
                className="w-full rounded-full border border-ink-700 bg-ink-900 pl-10 pr-4 py-2 text-sm placeholder:text-ink-400 focus:border-navy-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy-700/15"
              />
            </div>
          </div>
        )}

        <div className="flex flex-none items-center gap-1.5 sm:gap-2">
          {user ? (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  title="Admin"
                  className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-amber-accent bg-amber-accent/10 px-2.5 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-amber-accent hover:bg-amber-accent hover:text-white"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">Admin</span>
                </Link>
              )}
              <Link
                href="/messages"
                title="Messages"
                className="relative inline-flex items-center gap-1.5 rounded-full border border-ink-700 px-2.5 py-1.5 text-xs sm:text-sm text-ink-300 hover:border-amber-accent hover:text-amber-accent"
                aria-label={`Messages${unreadMessages > 0 ? `, ${unreadMessages} unread` : ""}`}
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Messages</span>
                {unreadMessages > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-amber-accent px-1 text-[10px] font-bold text-white">
                    {unreadMessages > 99 ? "99+" : unreadMessages}
                  </span>
                )}
              </Link>
              <Link href="/pros/dashboard" className="btn-ghost text-xs sm:text-sm whitespace-nowrap">
                Dashboard
              </Link>
              <UserMenu
                name={user.name ?? user.email}
                avatarUrl={avatarUrl ?? user.avatarUrl ?? null}
                isAdmin={isAdmin}
              />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost text-xs sm:text-sm whitespace-nowrap">
                Log in
              </Link>
              <Link href="/pros/join" className="btn-primary text-xs sm:text-sm whitespace-nowrap">
                <span className="sm:hidden">Join Pro</span>
                <span className="hidden sm:inline">Join as a Pro</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
