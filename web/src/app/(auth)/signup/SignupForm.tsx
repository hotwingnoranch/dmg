"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUpAction, verifyEmailAction, type AuthState } from "../actions";
import { Loader2 } from "lucide-react";

const INITIAL: AuthState = { status: "idle" };

export function SignupForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signUpAction, INITIAL);
  const [verifyState, verifyAction, verifying] = useActionState(
    verifyEmailAction,
    INITIAL
  );

  const showVerify =
    state.status === "verify" ||
    verifyState.status === "verify" ||
    verifyState.status === "error";

  useEffect(() => {
    if (state.status === "ok") {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  useEffect(() => {
    if (verifyState.status === "ok") {
      router.replace(verifyState.redirectTo);
      router.refresh();
    }
  }, [verifyState, router]);

  if (showVerify) {
    const email =
      state.status === "verify" ? state.email :
      verifyState.status === "verify" ? verifyState.email :
      "";
    const name =
      state.status === "verify" ? state.name :
      verifyState.status === "verify" ? verifyState.name :
      "";
    return (
      <form action={verifyAction} className="mt-8 grid gap-5">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="name" value={name ?? ""} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <div className="rounded-xl border border-amber-accent/20 bg-amber-accent/5 px-4 py-3 text-sm text-ink-100">
          We sent a 6-digit code to <strong>{email}</strong>. Enter it below to
          finish creating your account.
        </div>
        <label className="grid gap-2">
          <span className="label">Verification code</span>
          <input
            name="otp"
            inputMode="numeric"
            maxLength={6}
            required
            autoFocus
            className="input text-center text-lg font-mono tracking-[0.5em]"
            placeholder="••••••"
          />
        </label>
        {verifyState.status === "error" && (
          <p className="rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-900">
            {verifyState.message}
          </p>
        )}
        <button type="submit" disabled={verifying} className="btn-primary mt-2 h-12">
          {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and continue"}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <label className="grid gap-2">
        <span className="label">Full name</span>
        <input
          name="name"
          required
          autoComplete="name"
          className="input"
          placeholder="Alex Morgan"
        />
      </label>
      <label className="grid gap-2">
        <span className="label">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input"
          placeholder="you@company.com"
        />
      </label>
      <label className="grid gap-2">
        <span className="label">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="input"
          placeholder="At least 6 characters"
        />
      </label>

      {state.status === "error" && (
        <p className="rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-900">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2 h-12">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </button>
    </form>
  );
}
