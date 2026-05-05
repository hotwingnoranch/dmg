"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInAction, type AuthState } from "../actions";
import { Loader2 } from "lucide-react";

const INITIAL: AuthState = { status: "idle" };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signInAction, INITIAL);

  useEffect(() => {
    if (state.status === "ok") {
      router.replace(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="mt-8 grid gap-5">
      <input type="hidden" name="redirect_to" value={redirectTo} />
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
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </label>

      {state.status === "error" && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2 h-12">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </button>
    </form>
  );
}
