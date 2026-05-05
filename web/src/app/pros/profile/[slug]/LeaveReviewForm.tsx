"use client";

import { useState } from "react";
import { Loader2, Star } from "lucide-react";
import { leaveReviewAction } from "./actions";

type Props = {
  slug: string;
  proId: string;
  proCompany: string;
};

export function LeaveReviewForm({ slug, proId, proCompany }: Props) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [pending, setPending] = useState(false);
  const display = hover || rating;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        <Star className="h-4 w-4" />
        Leave a review
      </button>
    );
  }

  return (
    <form
      action={leaveReviewAction}
      onSubmit={() => setPending(true)}
      className="card-elev mt-4 grid gap-4 p-5"
    >
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="pro_id" value={proId} />
      <input type="hidden" name="rating" value={String(rating)} />

      <div>
        <p className="font-display text-lg font-bold">
          Review {proCompany}
        </p>
        <p className="mt-1 text-sm text-ink-300">
          Your name and rating are public. Be specific — useful reviews help
          other buyers hire confidently.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="label">Rating</span>
        <div
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className="rounded-md p-0.5 hover:scale-110 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-accent/60"
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-7 w-7 ${
                  n <= display
                    ? "fill-amber-accent text-amber-accent"
                    : "text-ink-300"
                }`}
              />
            </button>
          ))}
        </div>
        {display > 0 && (
          <span className="text-sm text-ink-300">
            {display}/5
          </span>
        )}
      </div>

      <label className="grid gap-2">
        <span className="label">Your review (optional)</span>
        <textarea
          name="body"
          rows={4}
          maxLength={2000}
          placeholder="Hired them for a corporate event last month. Showed up early, professional team, no incidents — would book again."
          className="input min-h-[120px]"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={rating === 0 || pending}
          className="btn-primary disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
          Post review
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setRating(0);
            setHover(0);
          }}
          className="btn-ghost text-sm text-ink-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
