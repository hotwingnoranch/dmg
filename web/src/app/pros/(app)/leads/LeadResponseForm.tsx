"use client";

import { useState } from "react";
import { ArrowRight, Loader2, X } from "lucide-react";
import { respondToLeadAction, dismissLeadAction } from "./actions";

export function LeadResponseForm({
  requestId,
  urgency,
  cost,
  proCredits,
}: {
  requestId: string;
  urgency: string;
  cost: number;
  proCredits: number;
}) {
  const [message, setMessage] = useState("");
  const [estimate, setEstimate] = useState("");
  const [pendingRespond, setPendingRespond] = useState(false);
  const [pendingDismiss, setPendingDismiss] = useState(false);
  const insufficient = proCredits < cost;

  return (
    <div className="grid gap-3">
      {insufficient && (
        <div className="rounded-xl border border-amber-accent/40 bg-amber-accent/10 px-3 py-2 text-sm text-amber-accent">
          You have <span className="font-mono">{proCredits}</span> credits — this
          lead costs {cost}. Top up first to respond.
        </div>
      )}

      <div className="grid gap-2">
        <label className="grid gap-1.5">
          <span className="label">Quick message (optional)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Hi — we cover this area. Available the date you mentioned. Happy to share references."
          />
        </label>
        <label className="grid gap-1.5">
          <span className="label">Estimate (optional, USD)</span>
          <input
            inputMode="decimal"
            value={estimate}
            onChange={(e) => setEstimate(e.target.value.replace(/[^0-9.]/g, ""))}
            className="input"
            placeholder="2400"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Respond */}
        <form
          action={respondToLeadAction}
          onSubmit={() => setPendingRespond(true)}
        >
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="urgency" value={urgency} />
          <input type="hidden" name="message" value={message} />
          <input type="hidden" name="estimate" value={estimate} />
          <button
            type="submit"
            disabled={pendingRespond || pendingDismiss || insufficient}
            className="btn-primary"
          >
            {pendingRespond ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                One-click response · {cost} credits
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Dismiss */}
        <form
          action={dismissLeadAction}
          onSubmit={() => setPendingDismiss(true)}
        >
          <input type="hidden" name="request_id" value={requestId} />
          <button
            type="submit"
            disabled={pendingRespond || pendingDismiss}
            className="btn-ghost"
            title="Hide this lead from your feed"
          >
            {pendingDismiss ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4" /> Not interested
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
