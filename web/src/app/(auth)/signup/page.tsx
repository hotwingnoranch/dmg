import Link from "next/link";
import { SignupForm } from "./SignupForm";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = next && next.startsWith("/") ? next : "/";

  return (
    <div>
      <p className="eyebrow">Create account</p>
      <h1 className="display-h2 mt-3">Get matched in minutes.</h1>
      <p className="mt-3 text-sm text-ink-300">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-accent hover:text-amber-deep">
          Log in
        </Link>
        .
      </p>

      <SignupForm redirectTo={redirectTo} />
    </div>
  );
}
