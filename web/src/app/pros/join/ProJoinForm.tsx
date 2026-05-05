"use client";

import { useActionState, useState } from "react";
import { setupProAction, type ProSetupState } from "./actions";
import { ArrowRight, Loader2 } from "lucide-react";

const INITIAL: ProSetupState = { status: "idle" };

const STAFF_SIZES = ["Just me", "2–10", "11–50", "51–200", "200+"];
const RADIUS_OPTIONS = [10, 25, 50, 100, 150, 250];

export function ProJoinForm({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const [state, action, pending] = useActionState(setupProAction, INITIAL);
  const [picked, setPicked] = useState<string[]>([]);

  function toggle(slug: string) {
    setPicked((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  return (
    <form action={action} className="grid gap-6">
      <div>
        <p className="eyebrow">Step 01</p>
        <h2 className="font-display text-2xl font-bold mt-2">Your team</h2>
      </div>

      <div className="grid gap-4">
        <label className="grid gap-2">
          <span className="label">Company name</span>
          <input
            name="company_name"
            required
            className="input"
            placeholder="Sentinel Protective Services LLC"
          />
        </label>
        <label className="grid gap-2">
          <span className="label">Tagline</span>
          <input
            name="tagline"
            className="input"
            placeholder="Veteran-led private security across the Southeast"
          />
        </label>
        <label className="grid gap-2">
          <span className="label">About</span>
          <textarea
            name="bio"
            rows={4}
            className="input resize-none"
            placeholder="A short description of your team, specialties, and proudest jobs."
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="label">Years in business</span>
            <input
              type="number"
              name="years"
              min={0}
              max={120}
              className="input"
              placeholder="8"
            />
          </label>
          <label className="grid gap-2">
            <span className="label">Team size</span>
            <select name="staff" className="input" defaultValue="">
              <option value="" className="bg-ink-900">
                Select
              </option>
              {STAFF_SIZES.map((s) => (
                <option key={s} value={s} className="bg-ink-900">
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="label">Phone</span>
            <input name="phone" type="tel" className="input" placeholder="(555) 555-0123" />
          </label>
          <label className="grid gap-2">
            <span className="label">Website</span>
            <input
              name="website"
              type="url"
              inputMode="url"
              className="input"
              placeholder="https://your-site.com"
            />
          </label>
        </div>
      </div>

      <hr className="border-ink-50/5" />

      <div>
        <p className="eyebrow">Step 02</p>
        <h2 className="font-display text-2xl font-bold mt-2">Services you offer</h2>
        <p className="mt-1 text-sm text-ink-300">
          Pick all that apply — leads in these categories will route to you.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {categories.map((c) => {
          const active = picked.includes(c.slug);
          return (
            <button
              type="button"
              key={c.slug}
              onClick={() => toggle(c.slug)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                active
                  ? "border-amber-accent bg-amber-accent/15 text-amber-accent"
                  : "border-ink-50/10 hover:border-ink-50/20"
              }`}
            >
              {c.name}
            </button>
          );
        })}
      </div>
      {picked.map((s) => (
        <input key={s} type="hidden" name="services" value={s} />
      ))}

      <hr className="border-ink-50/5" />

      <div>
        <p className="eyebrow">Step 03</p>
        <h2 className="font-display text-2xl font-bold mt-2">Service area</h2>
        <p className="mt-1 text-sm text-ink-300">
          Where you operate. You can add more locations later.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
        <label className="grid gap-2">
          <span className="label">Home ZIP</span>
          <input
            name="zip"
            inputMode="numeric"
            maxLength={5}
            required
            className="input"
            placeholder="30309"
          />
        </label>
        <label className="grid gap-2">
          <span className="label">Travel radius (miles)</span>
          <select name="radius" defaultValue="50" className="input">
            {RADIUS_OPTIONS.map((r) => (
              <option key={r} value={r} className="bg-ink-900">
                {r} miles
              </option>
            ))}
          </select>
        </label>
      </div>

      {state.status === "error" && (
        <p className="rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-900">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || picked.length === 0}
        className="btn-primary mt-2 h-12"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            Publish profile <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </form>
  );
}
