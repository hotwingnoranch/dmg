"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, MapPin } from "lucide-react";

const POPULAR = [
  { slug: "security-guard", label: "Security Guard" },
  { slug: "executive-protection", label: "Executive Protection" },
  { slug: "event-security", label: "Event Security" },
  { slug: "cctv-surveillance", label: "CCTV / Surveillance" },
];

export function HeroSearch() {
  const router = useRouter();
  const [service, setService] = useState("security-guard");
  const [zip, setZip] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!zip || zip.length < 5) return;
        setPending(true);
        const params = new URLSearchParams({ category: service, zip });
        router.push(`/buyer/request/new?${params.toString()}`);
      }}
      className="relative mx-auto mt-10 w-full max-w-3xl"
    >
      <div className="card flex flex-col gap-3 p-3 shadow-lift sm:flex-row sm:items-stretch">
        <label className="flex flex-1 items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-transparent transition focus-within:bg-ink-800 focus-within:ring-amber-accent/30">
          <span className="label whitespace-nowrap">Service</span>
          <select
            value={service}
            onChange={(e) => setService(e.target.value)}
            className="w-full bg-transparent text-base font-medium text-ink-50 focus:outline-none"
          >
            {POPULAR.map((p) => (
              <option key={p.slug} value={p.slug} className="bg-ink-900">
                {p.label}
              </option>
            ))}
          </select>
        </label>

        <span className="hidden sm:block w-px self-stretch bg-ink-50/5" />

        <label className="flex items-center gap-3 rounded-xl px-4 py-3 ring-1 ring-transparent transition focus-within:bg-ink-800 focus-within:ring-amber-accent/30 sm:w-[200px]">
          <MapPin className="h-4 w-4 text-amber-accent" />
          <input
            inputMode="numeric"
            maxLength={5}
            placeholder="ZIP"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-transparent text-base font-medium tracking-wide focus:outline-none placeholder:text-ink-300/70"
          />
        </label>

        <button
          type="submit"
          disabled={pending || zip.length < 5}
          className="btn-primary group h-12 px-6 sm:h-auto"
        >
          {pending ? "Matching…" : "Get matches"}
          <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-ink-300">
        <span className="opacity-70">Popular:</span>
        {POPULAR.map((p) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => setService(p.slug)}
            className={`pill transition ${
              service === p.slug
                ? "border-amber-accent/50 text-amber-accent"
                : "hover:border-ink-50/20"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </form>
  );
}
