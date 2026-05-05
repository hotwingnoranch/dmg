import Link from "next/link";
import { ArrowUpRight, BadgeCheck, MapPin, Star } from "lucide-react";

export type ProCardData = {
  slug: string;
  company_name: string;
  tagline?: string | null;
  bio?: string | null;
  is_elite?: boolean;
  rating_avg?: number | string | null;
  review_count?: number;
  hires_count?: number;
  response_time_minutes?: number | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  services?: string[]; // category names
};

export function ProCard({ pro }: { pro: ProCardData }) {
  const ratingNum =
    pro.rating_avg == null
      ? null
      : typeof pro.rating_avg === "string"
        ? parseFloat(pro.rating_avg)
        : pro.rating_avg;

  return (
    <Link
      href={`/pros/profile/${pro.slug}`}
      className="group card-elev relative flex flex-col gap-3 p-5 transition hover:border-amber-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-navy-900 font-display text-lg font-bold text-amber-glow">
            {pro.company_name.charAt(0).toUpperCase()}
          </span>
          <div>
            <h3 className="flex items-center gap-1.5 font-display text-lg font-bold leading-tight">
              {pro.company_name}
              {pro.is_elite && (
                <BadgeCheck
                  className="h-4 w-4 text-amber-accent"
                  aria-label="Elite Pro"
                />
              )}
            </h3>
            {pro.tagline && (
              <p className="mt-0.5 line-clamp-1 text-sm text-ink-300">
                {pro.tagline}
              </p>
            )}
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 flex-none text-ink-400 transition group-hover:text-amber-accent" />
      </div>

      {pro.bio && (
        <p className="line-clamp-2 text-sm text-ink-300">{pro.bio}</p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-3 text-xs text-ink-400">
        {ratingNum != null && ratingNum > 0 && (
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" />
            <span className="font-medium text-ink-200">
              {ratingNum.toFixed(1)}
            </span>
            <span>({pro.review_count ?? 0})</span>
          </span>
        )}
        {(pro.city || pro.state || pro.zip_code) && (
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {pro.city ? `${pro.city}, ` : ""}
            {pro.state ?? ""} {pro.zip_code ?? ""}
          </span>
        )}
        {typeof pro.hires_count === "number" && pro.hires_count > 0 && (
          <span>{pro.hires_count} hires</span>
        )}
        {typeof pro.response_time_minutes === "number" &&
          pro.response_time_minutes > 0 && (
            <span>~{pro.response_time_minutes}m response</span>
          )}
      </div>

      {pro.services && pro.services.length > 0 && (
        <div className="-mb-1 flex flex-wrap gap-1.5">
          {pro.services.slice(0, 3).map((s) => (
            <span
              key={s}
              className="rounded-full border border-ink-700 bg-ink-900 px-2 py-0.5 text-[11px] text-ink-200"
            >
              {s}
            </span>
          ))}
          {pro.services.length > 3 && (
            <span className="rounded-full border border-ink-700 bg-ink-900 px-2 py-0.5 text-[11px] text-ink-300">
              +{pro.services.length - 3}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
