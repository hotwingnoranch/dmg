import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; status?: string }>;
}) {
  const { next, status } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/";

  return (
    <div>
      <p className="eyebrow">Log in</p>
      <h1 className="display-h2 mt-3">Welcome back.</h1>
      <p className="mt-3 text-sm text-ink-300">
        Use your email and password. New here?{" "}
        <Link href="/signup" className="text-amber-accent hover:text-amber-deep">
          Create an account
        </Link>
        .
      </p>

      {status === "verified" && (
        <div className="mt-6 rounded-xl border border-emerald-400 bg-emerald-100 px-4 py-3 text-sm text-emerald-900">
          Email verified. You can sign in now.
        </div>
      )}

      <LoginForm redirectTo={redirectTo} />

      <p className="mt-8 text-xs text-ink-300">
        By continuing, you agree to our{" "}
        <Link href="/legal/terms" className="underline hover:text-amber-accent">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline hover:text-amber-accent">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
