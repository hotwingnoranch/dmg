import Link from "next/link";
import Image from "next/image";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { ArrowRight, BadgeCheck, MapPin, Mail, Star } from "lucide-react";

type ProRow = {
  id: string;
  company_name: string;
  is_elite: boolean;
  credits: number;
  rating_avg: number | string | null;
  review_count: number;
  contact_email: string | null;
  hires_count: number;
  response_time_minutes: number | null;
};

export default async function ProDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ setup?: string }>;
}) {
  const { setup } = await searchParams;
  const user = await requireUser("/pros/dashboard");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const [proRes, profileRes] = await Promise.all([
    insforge.database
      .from("pros")
      .select(
        "id, company_name, is_elite, credits, rating_avg, review_count, contact_email, hires_count, response_time_minutes"
      )
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const pro = proRes.data as ProRow | null;
  if (!pro) {
    return null;
  }
  const avatarUrl =
    (profileRes.data as { avatar_url: string | null } | null)?.avatar_url ??
    null;

  const services = await insforge.database
    .from("pro_services")
    .select("category_id, service_categories(name, slug)")
    .eq("pro_id", user.id);

  const areas = await insforge.database
    .from("service_areas")
    .select("zip_code, radius_miles, city, state")
    .eq("pro_id", user.id);

  const leadsCount = await insforge.database
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const responsesCount = await insforge.database
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("pro_id", user.id);

  const unreadResponses = await insforge.database
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("pro_id", user.id)
    .eq("status", "pending");

  return (
    <div className="grid gap-8">
      <div>
        <p className="text-sm text-ink-300">
          Hello, {user?.name ?? user?.email}!
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold">
          {pro.company_name}
        </h1>
      </div>

      {setup === "1" && (
        <div className="rounded-2xl border border-emerald-400 bg-emerald-100 px-5 py-4 text-sm text-emerald-900">
          Your Pro profile is live. We&apos;ll start sending matching leads
          shortly.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile card */}
        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="relative grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-full bg-amber-accent/15 font-display text-lg text-amber-accent">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              ) : (
                pro.company_name.charAt(0)
              )}
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-tight">
                {pro.company_name}
              </p>
              <p className="text-xs text-ink-300">
                {pro.is_elite ? "Elite Pro" : "Pro"}
              </p>
            </div>
            {pro.is_elite && (
              <BadgeCheck className="ml-auto h-5 w-5 text-amber-accent" />
            )}
          </div>

          <div className="mt-5">
            <p className="text-xs text-ink-300">Profile completeness</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-50/5">
              <div
                className="h-full bg-amber-accent"
                style={{ width: "85%" }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-300">85% complete</p>
            <Link
              href="/pros/settings"
              className="mt-4 inline-block text-sm text-amber-accent hover:text-amber-deep"
            >
              Edit profile →
            </Link>
          </div>

          <hr className="my-6 border-ink-50/5" />

          <p className="label">Your Account</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-accent" />
                Elite Pro
              </span>
              <Link href="/pros/elite" className="text-amber-accent hover:text-amber-deep">
                {pro.is_elite ? "Manage" : "Apply"}
              </Link>
            </li>
            <li className="flex items-center justify-between">
              <span>{pro.credits} Credits</span>
              <Link href="/pros/billing" className="text-amber-accent hover:text-amber-deep">
                Manage
              </Link>
            </li>
          </ul>
        </section>

        {/* Lead settings card */}
        <section className="card p-6">
          <p className="label">Lead settings</p>
          <h2 className="mt-2 font-display text-xl font-bold">Services & area</h2>

          <p className="label mt-5">Services</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(services.data ?? []).map((s, i) => {
              const raw = (s as unknown as { service_categories: unknown })
                .service_categories;
              const cat = (Array.isArray(raw) ? raw[0] : raw) as
                | { name: string; slug: string }
                | null;
              return (
                <li
                  key={cat?.slug ?? `svc-${i}`}
                  className="inline-flex items-center gap-2"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-glow" />
                  {cat?.name ?? "—"}
                </li>
              );
            })}
            {(services.data ?? []).length === 0 && (
              <li className="text-ink-300">No services configured.</li>
            )}
          </ul>

          <p className="label mt-5">Locations</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {(areas.data ?? []).map((a, i) => (
              <li key={i} className="inline-flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-amber-accent" />
                {a.city ? `${a.city}, ` : ""}
                {a.zip_code} · {a.radius_miles}mi
              </li>
            ))}
            {(areas.data ?? []).length === 0 && (
              <li className="text-ink-300">No service area set.</li>
            )}
          </ul>

          <Link
            href="/pros/settings"
            className="mt-6 inline-block text-sm text-amber-accent hover:text-amber-deep"
          >
            Edit settings →
          </Link>
        </section>

        {/* Leads + responses */}
        <section className="grid gap-4">
          <Link
            href="/pros/leads"
            className="card group flex flex-col gap-3 p-6 transition hover:border-amber-accent/40"
          >
            <p className="label">Leads</p>
            <div className="flex items-end justify-between">
              <p className="font-display text-5xl font-bold tracking-tightest">
                {leadsCount.count ?? 0}
              </p>
              <span className="font-display text-sm text-amber-accent group-hover:translate-x-0.5 transition">
                View <ArrowRight className="inline h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-ink-300">Open leads matching you</p>
          </Link>

          <Link
            href="/pros/responses"
            className="card group flex flex-col gap-3 p-6 transition hover:border-amber-accent/40"
          >
            <p className="label">Responses</p>
            <div className="flex items-end justify-between">
              <p className="font-display text-5xl font-bold tracking-tightest">
                {responsesCount.count ?? 0}
              </p>
              <span className="font-display text-sm text-amber-accent group-hover:translate-x-0.5 transition">
                View <ArrowRight className="inline h-4 w-4" />
              </span>
            </div>
            <p className="text-xs text-ink-300">
              {unreadResponses.count ?? 0} pending replies
            </p>
          </Link>
        </section>
      </div>

      <section className="card p-6">
        <p className="label">Help</p>
        <p className="mt-2 text-sm text-ink-200">
          Visit our{" "}
          <Link href="/help" className="text-amber-accent hover:text-amber-deep">
            help center
          </Link>{" "}
          for tips on writing fast, professional responses that win contracts.
          Or reach us at{" "}
          <span className="inline-flex items-center gap-1 text-amber-accent">
            <Mail className="h-3.5 w-3.5" />
            team@dmg.security
          </span>
          .
        </p>
      </section>
    </div>
  );
}
