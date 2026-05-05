import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  CreditCard,
  Mail,
  MapPin,
  Star,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";
import { formatPrice, SUBSCRIPTION_TIERS } from "@/lib/stripe";
import { categoryImage } from "@/lib/images";

type ProRow = {
  id: string;
  slug: string;
  company_name: string;
  tagline: string | null;
  bio: string | null;
  contact_email: string | null;
  years_in_business: number | null;
  staff_size: string | null;
  hires_count: number;
  rating_avg: number | string | null;
  review_count: number;
  is_elite: boolean;
  credits: number;
  is_published: boolean;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  auto_topup_enabled: boolean;
  auto_topup_pack_slug: string | null;
  auto_topup_threshold: number;
  default_payment_method_id: string | null;
  stripe_customer_id: string | null;
  created_at: string;
};

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
};

type ServiceRow = {
  category_id: string;
  service_categories: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

type AreaRow = {
  zip_code: string;
  city: string | null;
  state: string | null;
  radius_miles: number;
};

type PaymentRow = {
  id: string;
  kind: string;
  product_slug: string;
  amount_cents: number;
  credits_granted: number;
  status: string;
  created_at: string;
};

type ResponseRow = {
  id: string;
  status: string;
  estimate_amount: number | null;
  created_at: string;
};

function pickName(rel: ServiceRow["service_categories"]): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name;
}

export default async function ProDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireAdmin();
  const { id } = await params;

  const admin = createAdminClient();

  const [proRes, profileRes, servicesRes, areasRes, paymentsRes, responsesRes] =
    await Promise.all([
      admin.database
        .from("pros")
        .select(
          "id, slug, company_name, tagline, bio, contact_email, years_in_business, staff_size, hires_count, rating_avg, review_count, is_elite, credits, is_published, subscription_tier, subscription_status, subscription_period_end, auto_topup_enabled, auto_topup_pack_slug, auto_topup_threshold, default_payment_method_id, stripe_customer_id, created_at"
        )
        .eq("id", id)
        .maybeSingle(),
      admin.database
        .from("profiles")
        .select("full_name, phone, zip_code, city, state")
        .eq("id", id)
        .maybeSingle(),
      admin.database
        .from("pro_services")
        .select("category_id, service_categories(name, slug)")
        .eq("pro_id", id),
      admin.database
        .from("service_areas")
        .select("zip_code, city, state, radius_miles")
        .eq("pro_id", id),
      admin.database
        .from("payments")
        .select(
          "id, kind, product_slug, amount_cents, credits_granted, status, created_at"
        )
        .eq("pro_id", id)
        .order("created_at", { ascending: false })
        .limit(50),
      admin.database
        .from("responses")
        .select("id, status, estimate_amount, created_at")
        .eq("pro_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const pro = proRes.data as ProRow | null;
  if (!pro) notFound();

  const profile = (profileRes.data ?? null) as ProfileRow | null;
  const services = (servicesRes.data ?? []) as unknown as ServiceRow[];
  const areas = (areasRes.data ?? []) as AreaRow[];
  const payments = (paymentsRes.data ?? []) as PaymentRow[];
  const responses = (responsesRes.data ?? []) as ResponseRow[];

  const ltv = payments
    .filter((p) => p.status === "succeeded")
    .reduce((a, b) => a + b.amount_cents, 0);
  const subPaid = payments
    .filter((p) => p.status === "succeeded" && p.kind === "subscription")
    .reduce((a, b) => a + b.amount_cents, 0);
  const creditsPaid = payments
    .filter((p) => p.status === "succeeded" && p.kind === "credits")
    .reduce((a, b) => a + b.amount_cents, 0);
  const hiredCount = responses.filter((r) => r.status === "hired").length;
  const tier = SUBSCRIPTION_TIERS.find((t) => t.slug === pro.subscription_tier);

  return (
    <div className="min-h-screen bg-ink-900">
      <header className="sticky top-0 z-30 border-b border-ink-700 bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Logo />
            <span className="rounded-full border border-amber-accent bg-amber-accent/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-accent">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden sm:inline text-ink-300">{me.email}</span>
            <Link href="/admin" className="btn-outline">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Pro detail</p>
            <h1 className="display-h2 mt-2 flex items-center gap-3">
              {pro.company_name}
              {pro.is_elite && (
                <BadgeCheck className="h-7 w-7 text-amber-accent" />
              )}
            </h1>
            {pro.tagline && (
              <p className="mt-1 text-sm text-ink-300">{pro.tagline}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-400">
            <span>
              Joined{" "}
              {new Date(pro.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>·</span>
            <span className="font-mono">{pro.slug}</span>
          </div>
        </div>

        {/* HEADLINE STATS */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Lifetime value"
            value={formatPrice(ltv)}
            sublabel={`${formatPrice(subPaid)} subs · ${formatPrice(creditsPaid)} credits`}
          />
          <Stat
            label="Plan"
            value={tier?.name ?? "Standard"}
            sublabel={
              pro.subscription_status === "active"
                ? `Renews ${pro.subscription_period_end ? new Date(pro.subscription_period_end).toLocaleDateString() : "monthly"}`
                : pro.subscription_status ?? "Free plan"
            }
            tone={pro.subscription_status === "past_due" ? "warn" : "default"}
          />
          <Stat
            label="Credits"
            value={pro.credits.toString()}
            sublabel={
              pro.auto_topup_enabled
                ? `Auto top-up ${pro.auto_topup_pack_slug ?? "?"} below ${pro.auto_topup_threshold}`
                : "Auto top-up off"
            }
          />
          <Stat
            label="Engagement"
            value={`${responses.length} responses`}
            sublabel={`${hiredCount} hires · ${pro.review_count} reviews`}
          />
        </section>

        {/* PROFILE + SERVICES + AREAS */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <DetailCard title="Contact">
            <ul className="grid gap-2 text-sm">
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-ink-400" />
                {pro.contact_email ?? <span className="text-ink-400">—</span>}
              </li>
              <li className="flex items-center gap-2">
                <Star className="h-4 w-4 text-ink-400" />
                Rating {pro.rating_avg ?? "—"} ({pro.review_count} reviews)
              </li>
              {profile?.phone && (
                <li className="text-sm text-ink-200">
                  <span className="text-ink-400">Phone</span> ·{" "}
                  <span className="font-mono">{profile.phone}</span>
                </li>
              )}
              {profile && (profile.city || profile.state || profile.zip_code) && (
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-ink-400" />
                  {profile.city ? `${profile.city}, ` : ""}
                  {profile.state ?? ""} {profile.zip_code ?? ""}
                </li>
              )}
              {pro.stripe_customer_id && (
                <li className="flex items-center gap-2 text-xs text-ink-400">
                  <CreditCard className="h-3.5 w-3.5" />
                  Stripe customer{" "}
                  <span className="font-mono">{pro.stripe_customer_id}</span>
                </li>
              )}
            </ul>
            {pro.bio && (
              <p className="mt-4 border-t border-ink-700 pt-4 text-sm text-ink-200">
                {pro.bio}
              </p>
            )}
          </DetailCard>

          <DetailCard title={`Services (${services.length})`}>
            {services.length === 0 ? (
              <p className="text-sm text-ink-400">No services configured.</p>
            ) : (
              <ul className="grid gap-3">
                {services.map((s, i) => {
                  const name = pickName(s.service_categories) ?? "—";
                  const cat = Array.isArray(s.service_categories)
                    ? s.service_categories[0]
                    : s.service_categories;
                  return (
                    <li
                      key={`${s.category_id}-${i}`}
                      className="flex items-center gap-3 rounded-xl border border-ink-700 bg-ink-900 p-2.5"
                    >
                      {cat?.slug && (
                        <span className="relative h-10 w-12 flex-none overflow-hidden rounded-md">
                          <Image
                            src={categoryImage(cat.slug)}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        </span>
                      )}
                      <span className="text-sm">{name}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </DetailCard>

          <DetailCard title={`Service areas (${areas.length})`}>
            {areas.length === 0 ? (
              <p className="text-sm text-ink-400">No service areas configured.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {areas.map((a, i) => (
                  <li
                    key={`${a.zip_code}-${i}`}
                    className="flex items-center justify-between rounded-xl border border-ink-700 bg-ink-900 px-3 py-2"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-amber-accent" />
                      {a.city ? `${a.city}, ` : ""}
                      {a.state ?? ""} {a.zip_code}
                    </span>
                    <span className="font-mono text-xs text-ink-300">
                      {a.radius_miles}mi
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </DetailCard>
        </section>

        {/* PAYMENTS HISTORY */}
        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">
              Payments history ({payments.length})
            </h2>
            <span className="text-xs text-ink-400">
              Lifetime succeeded: {formatPrice(ltv)}
            </span>
          </div>
          <div className="card-elev overflow-hidden">
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                No payments yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink-700">
                      {["Date", "Kind", "Product", "Amount", "Status"].map(
                        (h) => (
                          <th
                            key={h}
                            className="px-5 py-3 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-ink-400"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr
                        key={p.id}
                        className={`border-b border-ink-700 last:border-0 ${i % 2 === 1 ? "bg-ink-900" : ""}`}
                      >
                        <td className="px-5 py-3">
                          {new Date(p.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-3">{p.kind}</td>
                        <td className="px-5 py-3">
                          {p.kind === "credits"
                            ? `${p.credits_granted} credits — ${p.product_slug}`
                            : p.product_slug}
                        </td>
                        <td className="px-5 py-3 font-mono">
                          {formatPrice(p.amount_cents)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* RESPONSES */}
        <section className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold">
            Recent responses ({responses.length})
          </h2>
          <div className="card-elev overflow-hidden">
            {responses.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-400">
                No responses yet.
              </p>
            ) : (
              <ul className="divide-y divide-ink-700 text-sm">
                {responses.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <span>
                      {new Date(r.created_at).toLocaleDateString()} ·{" "}
                      <Badge status={r.status} />
                    </span>
                    <span className="font-mono">
                      {r.estimate_amount
                        ? `$${Number(r.estimate_amount).toFixed(0)}`
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// ============================================================ atoms ====

function Stat({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "warn";
}) {
  const accent =
    tone === "warn"
      ? "bg-red-50 border-red-300"
      : "bg-white border-ink-600";
  return (
    <article className={`rounded-2xl border-2 p-5 shadow-card ${accent}`}>
      <p className="text-xs uppercase tracking-[0.18em] font-semibold text-amber-accent">
        {label}
      </p>
      <p className="mt-2 font-display text-2xl font-bold tracking-tightest">
        {value}
      </p>
      {sublabel && <p className="mt-1 text-xs text-ink-400">{sublabel}</p>}
    </article>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elev p-5">
      <h3 className="mb-3 font-display text-base font-bold">{title}</h3>
      {children}
    </section>
  );
}

function Badge({ status }: { status: string }) {
  const tone =
    status === "succeeded" || status === "hired"
      ? "border-emerald-400 bg-emerald-100 text-emerald-900"
      : status === "failed" || status === "declined"
        ? "border-red-400 bg-red-100 text-red-900"
        : status === "pending"
          ? "border-amber-accent/40 bg-amber-accent/10 text-amber-accent"
          : "border-ink-600 bg-ink-900 text-ink-200";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {status}
    </span>
  );
}
