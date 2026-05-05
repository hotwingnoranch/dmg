import Link from "next/link";
import Image from "next/image";
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
      <span className="relative inline-flex h-12 w-12 sm:h-14 sm:w-14 flex-none items-center justify-center">
        <Image
          src="/logo-shield.webp"
          alt=""
          fill
          sizes="56px"
          className="object-contain"
          priority
        />
      </span>
      <span className="font-display text-[1.5rem] sm:text-[1.65rem] font-bold tracking-tight whitespace-nowrap leading-none">
        Vanguard
        <span className="hidden sm:inline">
          <span className="ml-1.5 text-amber-accent">·</span>
          <span className="ml-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-300">
            Security
          </span>
        </span>
      </span>
    </Link>
  );
}

/** Full lockup variant — for hero placements like the auth screen. */
export function LogoFull({
  className,
  width = 220,
}: {
  className?: string;
  width?: number;
}) {
  return (
    <Link
      href="/"
      className={cn("inline-block", className)}
      aria-label="Vanguard Security home"
    >
      <Image
        src="/logo-full.webp"
        alt="Vanguard Security"
        width={width}
        height={Math.round(width * 0.5625)}
        className="h-auto w-auto"
        priority
      />
    </Link>
  );
}
