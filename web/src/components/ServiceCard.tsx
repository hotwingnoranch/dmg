import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type ServiceCardProps = {
  slug: string;
  name: string;
  image: string;
  description?: string;
  badge?: string;
  size?: "default" | "tall";
};

export function ServiceCard({
  slug,
  name,
  image,
  description,
  badge,
  size = "default",
}: ServiceCardProps) {
  const heightClass = size === "tall" ? "h-[420px]" : "h-[260px]";
  return (
    <Link
      href={`/services/${slug}`}
      className={`group relative overflow-hidden rounded-2xl border border-ink-700 bg-navy-950 shadow-card ${heightClass}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 bg-cover bg-center transition duration-700 group-hover:scale-105"
        style={{ backgroundImage: `url(${image})` }}
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/0"
      />
      <span
        aria-hidden
        className="absolute inset-0 ring-0 ring-amber-accent/0 transition group-hover:ring-2 group-hover:ring-amber-accent/40"
      />
      {badge && (
        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-3 py-1 text-xs font-medium text-white backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {badge}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
        <div className="min-w-0">
          <h3 className="font-display text-xl md:text-2xl font-bold leading-tight tracking-tight text-white">
            {name}
          </h3>
          {description && (
            <p className="mt-1 line-clamp-2 text-sm text-white/80">
              {description}
            </p>
          )}
        </div>
        <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-white/20 bg-black/40 backdrop-blur transition group-hover:border-amber-accent/60 group-hover:bg-amber-accent/15">
          <ArrowUpRight className="h-4 w-4 text-white transition group-hover:text-amber-accent" />
        </span>
      </div>
    </Link>
  );
}
