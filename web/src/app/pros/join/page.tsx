import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProJoinForm } from "./ProJoinForm";
import { createServerClient } from "@/lib/insforge";
import { getCurrentUser } from "@/lib/auth";
import { CheckCircle2 } from "lucide-react";

type Cat = { slug: string; name: string };

async function getCategories(): Promise<Cat[]> {
  const insforge = createServerClient();
  const { data } = await insforge.database
    .from("service_categories")
    .select("slug, name")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Cat[];
}

export default async function ProJoinPage() {
  const [user, categories] = await Promise.all([getCurrentUser(), getCategories()]);

  return (
    <>
      <Header user={user} />
      <section className="relative overflow-hidden bg-vanguard-wash">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-grid-faint opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]"
        />
        <div className="container-page py-16 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <p className="eyebrow">Join as a Pro</p>
              <h1 className="display-h1 mt-4">
                Win quality contracts.{" "}
                <em className="not-italic font-display italic text-amber-accent">
                  Keep 100%
                </em>{" "}
                of the job.
              </h1>
              <p className="mt-5 max-w-md text-ink-200">
                Set your service area, pick your specialties, and start
                receiving real-time leads from clients who need protection now.
              </p>
              <ul className="mt-8 grid gap-3 max-w-md text-sm">
                {[
                  "Free to join — pay only for leads you respond to",
                  "Verified phone numbers and incident details",
                  "Background-checked client profile",
                  "Elite Pro program for top-rated teams",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-amber-accent" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              {!user && (
                <div className="mt-10 rounded-2xl border border-amber-accent/30 bg-amber-accent/5 p-5 text-sm">
                  <p className="font-medium text-amber-accent">
                    First — create your account
                  </p>
                  <p className="mt-2 text-ink-200">
                    You&apos;ll set up your team profile right after signing up.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <Link href="/signup?next=/pros/join" className="btn-primary">
                      Create account
                    </Link>
                    <Link href="/login?next=/pros/join" className="btn-outline">
                      I already have one
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-6 lg:p-8">
              {user ? (
                <ProJoinForm categories={categories} />
              ) : (
                <div className="grid place-items-center py-16 text-center">
                  <p className="font-display text-2xl font-bold">
                    Sign in to set up your team profile.
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-ink-300">
                    We&apos;ll save your setup right after you sign in.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
