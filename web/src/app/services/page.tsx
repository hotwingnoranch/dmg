import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ServiceCard } from "@/components/ServiceCard";
import { createServerClient } from "@/lib/insforge";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { categoryImage } from "@/lib/images";

export const metadata: Metadata = {
  title: "Security services — Vanguard",
  description:
    "Browse the full Vanguard directory of vetted security and protection services.",
};

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
};

async function getCategories(): Promise<Category[]> {
  const insforge = createServerClient();
  const { data } = await insforge.database
    .from("service_categories")
    .select("id, slug, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Category[];
}

export default async function ServicesIndexPage() {
  const [user, categories] = await Promise.all([
    getCurrentUser(),
    getCategories(),
  ]);
  const isAdmin = await isAdminEmail(user?.email);

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      <section className="relative overflow-hidden bg-vanguard-wash">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-grid-faint opacity-50 [mask-image:radial-gradient(60%_60%_at_50%_30%,#000_30%,transparent_75%)]"
        />
        <div className="container-page py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow">All services</p>
            <h1 className="display-h1 mt-4 text-balance">
              The full spectrum of{" "}
              <em className="not-italic font-display italic text-amber-accent">
                protection
              </em>
              .
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-lg text-ink-300">
              {categories.length} vetted categories, from one-night event
              security to long-term executive protection and cyber risk
              programs. Pick a service to see teams in your area.
            </p>
          </div>
        </div>
      </section>

      <section className="container-page pb-24">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((c) => (
            <ServiceCard
              key={c.slug}
              slug={c.slug}
              name={c.name}
              description={c.description ?? undefined}
              image={categoryImage(c.slug)}
            />
          ))}
        </div>

        <div className="mt-16 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-600 bg-white p-6 shadow-card">
          <div>
            <p className="font-display text-2xl font-bold">
              Don&apos;t see what you need?
            </p>
            <p className="mt-1 text-sm text-ink-300">
              Tell us the situation and we&apos;ll route to the closest match.
            </p>
          </div>
          <Link href="/buyer/request/new" className="btn-primary">
            Place a request <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
