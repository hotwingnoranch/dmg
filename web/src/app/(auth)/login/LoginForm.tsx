"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInAction, type AuthState } from "../actions";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const INITIAL: AuthState = { status: "idle" };

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(signInAction, INITIAL);
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            autoComplete="current-password"
            className="input pr-11"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute right-2 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-md text-ink-400 hover:bg-ink-800 hover:text-ink-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-700/40"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink-200">
          <input
            type="checkbox"
            name="remember"
            value="on"
            defaultChecked
            className="h-4 w-4 rounded border-ink-500 text-navy-900 focus:ring-navy-700/30"
          />
          Remember me
        </label>
      </div>

      {state.status === "error" && (
        <p className="rounded-lg border border-red-400 bg-red-100 px-3 py-2 text-sm text-red-900">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary mt-2 h-12">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </button>
    </form>
  );
}
