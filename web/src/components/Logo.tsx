import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group inline-flex items-center gap-2.5 select-none text-navy-900",
        className
      )}
      aria-label="Vanguard Security home"
    >
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-md bg-navy-900 ring-1 ring-navy-900/30 transition group-hover:bg-navy-800" />
        <svg
          viewBox="0 0 24 24"
          className="relative h-4 w-4 text-amber-glow"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      </span>
      <span className="font-display text-[1.4rem] font-bold tracking-tight">
        Vanguard
        <span className="ml-1 text-amber-accent">·</span>
        <span className="ml-1 font-sans text-xs font-medium uppercase tracking-[0.22em] text-ink-300">
          Security
        </span>
      </span>
    </Link>
  );
}
