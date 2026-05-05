"use client";

import { useActionState } from "react";
import Link from "next/link";
import { createRequestAction, type RequestState } from "./actions";
import { ArrowRight, Loader2 } from "lucide-react";

const INITIAL: RequestState = { status: "idle" };

const URGENCY = [
  { v: "flexible", t: "Flexible", d: "Within the next few weeks" },
  { v: "soon", t: "Soon", d: "Within a week" },
  { v: "urgent", t: "Urgent", d: "Within 24–48 hours" },
];

const BUDGETS = [
  "Under $1,000",
  "$1,000 – $5,000",
  "$5,000 – $25,000",
  "$25,000 – $100,000",
  "$100,000+",
  "Not sure yet",
];

type Cat = { id: string; slug: string; name: string };

export function RequestForm({
  categories,
  initialCategory,
  initialZip,
  user,
}: {
  categories: Cat[];
  initialCategory: string;
  initialZip: string;
  user: { id: string } | null;
}) {
  const [state, action, pending] = useActionState(createRequestAction, INITIAL);

  return (
    <form action={action} className="grid gap-8">
      <FieldGroup
        step="01"
        title="Service"
        description="What kind of protection or security work do you need?"
      >
        <select
          name="category"
          defaultValue={initialCategory}
          className="input"
          required
        >
          {categories.map((c) => (
            <option key={c.slug} value={c.slug} className="bg-ink-900">
              {c.name}
            </option>
          ))}
        </select>
      </FieldGroup>

      <FieldGroup
        step="02"
        title="Location"
        description="Where will the service take place?"
      >
        <div className="grid gap-3 sm:grid-cols-[140px_1fr_120px]">
          <input
            name="zip"
            inputMode="numeric"
            maxLength={5}
            placeholder="ZIP"
            defaultValue={initialZip}
            required
            className="input"
          />
          <input name="city" placeholder="City (optional)" className="input" />
          <input
            name="state"
            placeholder="State"
            maxLength={2}
            className="input uppercase"
          />
        </div>
      </FieldGroup>

      <FieldGroup
        step="03"
        title="Timing"
        description="When do you need it, and for how long?"
      >
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {URGENCY.map((u, i) => (
              <label
                key={u.v}
                className="card cursor-pointer p-4 transition has-[input:checked]:border-amber-accent has-[input:checked]:bg-amber-accent/10"
              >
                <input
                  type="radio"
                  name="urgency"
                  value={u.v}
                  defaultChecked={i === 0}
                  className="sr-only"
                />
                <p className="font-display text-lg font-bold">{u.t}</p>
                <p className="text-xs text-ink-300">{u.d}</p>
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="label">Start date</span>
              <input type="date" name="start_date" className="input" />
            </label>
            <label className="grid gap-2">
              <span className="label">Duration</span>
              <input
                name="duration"
                placeholder="e.g. 1 night, 3 months, ongoing"
                className="input"
              />
            </label>
          </div>
        </div>
      </FieldGroup>

      <FieldGroup
        step="04"
        title="Details"
        description="Anything pros should know up front?"
      >
        <textarea
          name="description"
          rows={5}
          className="input resize-none"
          placeholder="e.g. Private wedding, ~150 guests, indoor venue with two access points, need 4 unarmed guards from 5pm to 1am."
        />
        <label className="mt-3 grid gap-2">
          <span className="label">Budget band</span>
          <select name="budget" className="input" defaultValue="">
            <option value="" className="bg-ink-900">
              Select a range
            </option>
            {BUDGETS.map((b) => (
              <option key={b} value={b} className="bg-ink-900">
                {b}
              </option>
            ))}
          </select>
        </label>
      </FieldGroup>

      <FieldGroup
        step="05"
        title="Contact"
        description="How should pros reach you with quotes?"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            name="contact_name"
            placeholder="Full name"
            className="input"
          />
          <input
            name="contact_phone"
            type="tel"
            placeholder="Phone"
            className="input"
          />
        </div>
        <input
          name="contact_email"
          type="email"
          placeholder="Email"
          className="input mt-3"
        />
      </FieldGroup>

      {state.status === "error" && (
        <p className="rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-900">
          {state.message}
        </p>
      )}

      {state.status === "need_auth" && (
        <p className="rounded-lg border border-amber-accent/30 bg-amber-accent/10 px-3 py-2 text-sm text-amber-accent">
          Please log in or create an account to submit your request.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-ink-50/5 pt-6">
        <p className="text-xs text-ink-300">
          By submitting, you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-amber-accent">
            Terms
          </Link>
          .
        </p>
        {user ? (
          <button type="submit" disabled={pending} className="btn-primary h-12">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Submit request <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        ) : (
          <Link href="/signup?next=/buyer/request/new" className="btn-primary h-12">
            Create account to submit <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </form>
  );
}

function FieldGroup({
  step,
  title,
  description,
  children,
}: {
  step: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card grid gap-4 p-6">
      <header className="flex items-center gap-3">
        <span className="font-mono text-xs tracking-[0.2em] text-amber-accent/80">
          {step}
        </span>
        <h2 className="font-display text-2xl font-bold leading-none tracking-tight">
          {title}
        </h2>
      </header>
      {description && <p className="text-sm text-ink-300">{description}</p>}
      <div>{children}</div>
    </fieldset>
  );
}
