"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronDown,
  HelpCircle,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
} from "lucide-react";

type Props = {
  /** Display name shown next to the avatar (used for the title tooltip too). */
  name?: string | null;
  /** Cached avatar URL (square image). Falls back to the initial. */
  avatarUrl?: string | null;
  /** Optional badge slot — used by the pro layout to show "Admin" inside the menu. */
  isAdmin?: boolean;
  /** Adds the "Affiliate dashboard" link to the menu. */
  showAffiliate?: boolean;
};

export function UserMenu({
  name,
  avatarUrl,
  isAdmin = false,
  showAffiliate = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (name ?? "U").trim().charAt(0).toUpperCase() || "U";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={name ?? "Account"}
        className="inline-flex items-center gap-1 rounded-full border border-ink-700 bg-white p-0.5 pr-2 text-ink-200 hover:border-amber-accent"
      >
        <span className="relative grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-full bg-amber-accent/15">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt=""
              fill
              sizes="36px"
              className="object-cover"
            />
          ) : (
            <span className="font-display text-amber-accent">{initial}</span>
          )}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-ink-300" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-ink-600 bg-white shadow-card-strong"
        >
          {name && (
            <div className="border-b border-ink-700 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-ink-400">
                Signed in as
              </p>
              <p className="mt-0.5 truncate font-medium">{name}</p>
            </div>
          )}

          <ul className="py-1.5 text-sm">
            <Item href="/pros/settings" icon={<Settings className="h-4 w-4" />}>
              Profile &amp; settings
            </Item>
            {showAffiliate && (
              <Item
                href="/affiliate"
                icon={<ShieldCheck className="h-4 w-4" />}
              >
                Affiliate dashboard
              </Item>
            )}
            {isAdmin && (
              <Item
                href="/admin"
                icon={<ShieldCheck className="h-4 w-4 text-amber-accent" />}
              >
                <span className="font-medium text-amber-accent">
                  Admin console
                </span>
              </Item>
            )}

            <li className="my-1 border-t border-ink-700" />

            <Item href="/help" icon={<HelpCircle className="h-4 w-4" />}>
              Help &amp; FAQ
            </Item>
            <Item href="/how-it-works" icon={<ScrollText className="h-4 w-4" />}>
              How it works
            </Item>
            <Item href="/pricing" icon={<ScrollText className="h-4 w-4" />}>
              Pricing
            </Item>

            <li className="my-1 border-t border-ink-700" />

            <Item href="/legal/terms" icon={<ScrollText className="h-4 w-4" />}>
              Terms of service
            </Item>
            <Item href="/legal/privacy" icon={<ScrollText className="h-4 w-4" />}>
              Privacy policy
            </Item>
            <Item href="/legal/cookies" icon={<ScrollText className="h-4 w-4" />}>
              Cookie policy
            </Item>

            <li className="my-1 border-t border-ink-700" />

            <li>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-red-50 hover:text-red-900"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </form>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

function Item({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-2 px-4 py-2 hover:bg-ink-900"
      >
        {icon}
        {children}
      </Link>
    </li>
  );
}
