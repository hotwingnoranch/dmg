import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RequestForm } from "./RequestForm";
import { createServerClient } from "@/lib/insforge";
import { getCurrentUser } from "@/lib/auth";
import { categoryImage } from "@/lib/images";

type Category = { id: string; slug: string; name: string; description: string | null };

async function getCategories(): Promise<Category[]> {
  const insforge = createServerClient();
  const { data } = await insforge.database
    .from("service_categories")
    .select("id, slug, name, description")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Category[];
}

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; zip?: string }>;
}) {
  const { category, zip } = await searchParams;
  const [user, categories] = await Promise.all([getCurrentUser(), getCategories()]);

  const selected =
    categories.find((c) => c.slug === category) ?? categories[0];

  return (
    <>
      <Header user={user} />
      <main className="container-page py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">New request</p>
            <h1 className="display-h2 mt-3">Tell us what you need.</h1>
            <p className="mt-4 text-ink-300">
              We&apos;ll match you with vetted security teams in your area.
              Most requests get 3–5 quotes within an hour.
            </p>

            <div
              className="mt-8 overflow-hidden rounded-2xl border border-ink-50/5 bg-cover bg-center"
              style={{
                backgroundImage: `url(${categoryImage(selected?.slug ?? "security-guard")})`,
                aspectRatio: "4 / 3",
              }}
            >
              <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black via-black/40 to-transparent p-5 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-amber-accent">
                  Selected service
                </p>
                <p className="font-display text-2xl font-bold mt-1">
                  {selected?.name ?? "Security"}
                </p>
                {selected?.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-white/80">
                    {selected.description}
                  </p>
                )}
              </div>
            </div>

            {!user && (
              <div className="mt-8 rounded-2xl border border-amber-accent/30 bg-amber-accent/5 p-5 text-sm">
                <p className="font-medium text-amber-accent">
                  Almost ready — sign in or create an account to submit.
                </p>
                <p className="mt-2 text-ink-200">
                  Account creation takes 30 seconds. We use it to verify and
                  protect your contact info.
                </p>
                <div className="mt-4 flex gap-3">
                  <Link
                    href={`/signup?next=/buyer/request/new?category=${selected?.slug}${zip ? `%26zip=${zip}` : ""}`}
                    className="btn-primary"
                  >
                    Create account
                  </Link>
                  <Link
                    href={`/login?next=/buyer/request/new?category=${selected?.slug}${zip ? `%26zip=${zip}` : ""}`}
                    className="btn-outline"
                  >
                    Log in
                  </Link>
                </div>
              </div>
            )}
          </aside>

          <RequestForm
            categories={categories}
            initialCategory={selected?.slug ?? ""}
            initialZip={zip ?? ""}
            user={user}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
