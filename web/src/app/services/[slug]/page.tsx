import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowRight, Clock, ShieldCheck, Star } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProCard, type ProCardData } from "@/components/ProCard";
import { createServerClient } from "@/lib/insforge";
import { getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { categoryImage } from "@/lib/images";

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
};

async function getCategory(slug: string): Promise<Category | null> {
  const insforge = createServerClient();
  const { data } = await insforge.database
    .from("service_categories")
    .select("id, slug, name, description")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (data as Category | null) ?? null;
}

type ProRow = {
  id: string;
  slug: string;
  company_name: string;
  tagline: string | null;
  bio: string | null;
  is_elite: boolean;
  rating_avg: number | string | null;
  review_count: number;
  hires_count: number;
  response_time_minutes: number | null;
};

type AreaRow = {
  pro_id: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
};

async function getProsForCategory(categoryId: string): Promise<ProCardData[]> {
  const insforge = createServerClient();

  // Step 1: which pros offer this category?
  const links = await insforge.database
    .from("pro_services")
    .select("pro_id")
    .eq("category_id", categoryId)
    .limit(200);
  const proIds = ((links.data ?? []) as { pro_id: string }[]).map(
    (r) => r.pro_id
  );
  if (proIds.length === 0) return [];

  // Step 2: load published pros only (RLS already enforces is_published).
  const prosRes = await insforge.database
    .from("pros")
    .select(
      "id, slug, company_name, tagline, bio, is_elite, rating_avg, review_count, hires_count, response_time_minutes"
    )
    .in("id", proIds)
    .order("is_elite", { ascending: false })
    .order("rating_avg", { ascending: false })
    .order("hires_count", { ascending: false })
    .limit(50);
  const pros = (prosRes.data ?? []) as ProRow[];
  if (pros.length === 0) return [];

  // Step 3: attach a representative service area + service list.
  const [areasRes, servicesRes] = await Promise.all([
    insforge.database
      .from("service_areas")
      .select("pro_id, city, state, zip_code")
      .in(
        "pro_id",
        pros.map((p) => p.id)
      ),
    insforge.database
      .from("pro_services")
      .select("pro_id, service_categories(name)")
      .in(
        "pro_id",
        pros.map((p) => p.id)
      ),
  ]);

  const areasByPro = new Map<string, AreaRow>();
  for (const a of (areasRes.data ?? []) as AreaRow[]) {
    if (!areasByPro.has(a.pro_id)) areasByPro.set(a.pro_id, a);
  }
  const servicesByPro = new Map<string, string[]>();
  for (const row of servicesRes.data ?? []) {
    const proId = (row as { pro_id: string }).pro_id;
    const raw = (row as { service_categories: unknown }).service_categories;
    const name =
      (Array.isArray(raw)
        ? (raw[0] as { name?: string } | undefined)?.name
        : (raw as { name?: string } | null)?.name) ?? null;
    if (!name) continue;
    if (!servicesByPro.has(proId)) servicesByPro.set(proId, []);
    servicesByPro.get(proId)!.push(name);
  }

  return pros.map((p) => {
    const area = areasByPro.get(p.id);
    return {
      slug: p.slug,
      company_name: p.company_name,
      tagline: p.tagline,
      bio: p.bio,
      is_elite: p.is_elite,
      rating_avg: p.rating_avg,
      review_count: p.review_count,
      hires_count: p.hires_count,
      response_time_minutes: p.response_time_minutes,
      city: area?.city,
      state: area?.state,
      zip_code: area?.zip_code,
      services: servicesByPro.get(p.id) ?? [],
    };
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) return { title: "Service not found — Vanguard" };
  return {
    title: `${cat.name} — Vanguard`,
    description:
      cat.description ?? `Find vetted ${cat.name.toLowerCase()} on Vanguard.`,
  };
}

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = await getCategory(slug);
  if (!cat) notFound();

  const [user, pros] = await Promise.all([
    getCurrentUser(),
    getProsForCategory(cat.id),
  ]);
  const isAdmin = await isAdminEmail(user?.email);
  const eliteCount = pros.filter((p) => p.is_elite).length;

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <Image
          aria-hidden
          src={categoryImage(cat.slug)}
          alt=""
          fill
          sizes="100vw"
          priority
          className="-z-20 object-cover opacity-25"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-white/70 via-white/85 to-white"
        />
        <div className="container-page pt-16 pb-12 lg:pt-20">
          <Link
            href="/services"
            className="text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-amber-accent"
          >
            ← All services
          </Link>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow">Category</p>
              <h1 className="display-h1 mt-4 text-balance">{cat.name}</h1>
              {cat.description && (
                <p className="mt-5 max-w-xl text-pretty text-lg text-ink-300">
                  {cat.description}
                </p>
              )}
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link
                  href={`/buyer/request/new?category=${cat.slug}`}
                  className="btn-primary"
                >
                  Get matched <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/buyer/request/new"
                  className="btn-outline"
                >
                  Need something else
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <Stat
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Vetted teams"
                value={pros.length.toString()}
              />
              <Stat
                icon={<Star className="h-4 w-4" />}
                label="Elite Pros"
                value={eliteCount.toString()}
              />
              <Stat
                icon={<Clock className="h-4 w-4" />}
                label="Avg response"
                value="< 18 min"
              />
            </div>
          </div>
        </div>
      </section>

      {/* PROS LIST */}
      <section className="container-page py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Available pros</p>
            <h2 className="display-h2 mt-2">
              {pros.length === 0
                ? "We're onboarding teams now."
                : `${pros.length} ${pros.length === 1 ? "team" : "teams"} ready to respond.`}
            </h2>
          </div>
          <p className="text-xs text-ink-400">
            Sorted: Elite Pro · rating · hires
          </p>
        </div>

        {pros.length === 0 ? (
          <div className="card-elev grid place-items-center gap-3 p-12 text-center">
            <p className="font-display text-xl font-bold">
              No pros listed for {cat.name} yet.
            </p>
            <p className="max-w-md text-sm text-ink-300">
              Place a request anyway — we&apos;ll route it to the closest
              matching teams in your area and notify you when there&apos;s a
              fit.
            </p>
            <Link
              href={`/buyer/request/new?category=${cat.slug}`}
              className="btn-primary mt-2"
            >
              Place a request
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pros.map((p) => (
              <ProCard key={p.slug} pro={p} />
            ))}
          </div>
        )}
      </section>

      <Footer />
    </>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card-elev flex items-center justify-between gap-3 px-4 py-3">
      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-amber-accent">
        {icon}
        {label}
      </span>
      <span className="font-display text-xl font-bold">{value}</span>
    </div>
  );
}
