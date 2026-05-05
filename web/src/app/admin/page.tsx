import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  Download,
  History,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";
import { SUBSCRIPTION_TIERS, formatPrice } from "@/lib/stripe";
import { addAdminAction, removeAdminAction } from "./actions";

type Counts = {
  total_users: number;
  total_pros: number;
  total_buyers: number;
  signups_mtd: number;
  signups_7d: number;
  active_pro_subs: number;
  active_elite_subs: number;
  past_due_subs: number;
  canceled_mtd: number;
  total_requests: number;
  requests_7d: number;
  total_responses: number;
  hired_responses: number;
  pros_with_autotopup: number;
};

type Payment = {
  id: string;
  pro_id: string;
  kind: string;
  product_slug: string;
  amount_cents: number;
  credits_granted: number;
  status: string;
  created_at: string;
};

type SignupRow = {
  id: string;
  full_name: string | null;
  is_pro: boolean;
  created_at: string;
  city: string | null;
  state: string | null;
};

type AdminRow = {
  id: string;
  email: string;
  added_at: string;
  notes: string | null;
};

type AuditRow = {
  id: string;
  action: string;
  actor_email: string | null;
  target_email: string | null;
  created_at: string;
};

type SeriesPoint = { label: string; value: number };

const PRO_PRICE_CENTS =
  SUBSCRIPTION_TIERS.find((t) => t.slug === "sub-pro")?.price_cents ?? 7900;
const ELITE_PRICE_CENTS =
  SUBSCRIPTION_TIERS.find((t) => t.slug === "sub-elite")?.price_cents ?? 24900;

function startOfMonthIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function startOfWeekIso() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

// Returns the Monday-anchored ISO week start.
function weekKey(iso: string) {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7; // shift so Monday=0
  d.setUTCDate(d.getUTCDate() - day);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function monthKey(iso: string) {
  return iso.slice(0, 7); // YYYY-MM
}

function bucketByWeek(rows: { created_at: string }[], weeks = 12): SeriesPoint[] {
  const counts = new Map<string, number>();
  const now = new Date();
  // Seed N weekly buckets up to current week so the series is contiguous.
  const buckets: string[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    buckets.push(weekKey(d.toISOString()));
  }
  for (const k of buckets) counts.set(k, 0);

  for (const r of rows) {
    const k = weekKey(r.created_at);
    if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return buckets.map((k) => ({ label: k, value: counts.get(k) ?? 0 }));
}

function bucketSumByMonth(
  rows: { created_at: string; amount_cents: number; kind: string }[],
  filter: (r: { kind: string }) => boolean,
  months = 6
): SeriesPoint[] {
  const sums = new Map<string, number>();
  const now = new Date();
  const buckets: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
    buckets.push(d.toISOString().slice(0, 7));
  }
  for (const k of buckets) sums.set(k, 0);
  for (const r of rows) {
    if (!filter(r)) continue;
    const k = monthKey(r.created_at);
    if (sums.has(k)) sums.set(k, (sums.get(k) ?? 0) + r.amount_cents);
  }
  return buckets.map((k) => ({ label: k, value: sums.get(k) ?? 0 }));
}

async function loadAffiliateSummary() {
  const admin = createAdminClient();
  const [pendingRes, paidRes, referralsRes, signupsRes] = await Promise.all([
    admin.database
      .from("referral_conversions")
      .select("commission_cents")
      .eq("status", "pending")
      .limit(5000),
    admin.database
      .from("referral_conversions")
      .select("commission_cents")
      .eq("status", "paid")
      .limit(5000),
    admin.database
      .from("referrals")
      .select("id", { count: "exact", head: true }),
    admin.database
      .from("referral_attributions")
      .select("id", { count: "exact", head: true }),
  ]);

  const pending = ((pendingRes.data ?? []) as { commission_cents: number }[])
    .reduce((a, b) => a + (b.commission_cents ?? 0), 0);
  const paid = ((paidRes.data ?? []) as { commission_cents: number }[])
    .reduce((a, b) => a + (b.commission_cents ?? 0), 0);
  return {
    pending_cents: pending,
    paid_cents: paid,
    referrals: referralsRes.count ?? 0,
    attributed_signups: signupsRes.count ?? 0,
  };
}

async function loadDashboard() {
  const admin = createAdminClient();
  const monthStart = startOfMonthIso();
  const weekStart = startOfWeekIso();

  // Helpers
  const count = async (
    table: string,
    filters: { eq?: [string, unknown][]; gte?: [string, string][] } = {}
  ) => {
    let q = admin.database
      .from(table)
      .select("id", { count: "exact", head: true });
    for (const [c, v] of filters.eq ?? []) q = q.eq(c, v);
    for (const [c, v] of filters.gte ?? []) q = q.gte(c, v);
    const res = await q;
    return res.count ?? 0;
  };

  const [
    total_users,
    total_pros,
    total_buyers,
    signups_mtd,
    signups_7d,
    active_pro_subs,
    active_elite_subs,
    past_due_subs,
    canceled_mtd,
    total_requests,
    requests_7d,
    total_responses,
    hired_responses,
    pros_with_autotopup,
  ] = await Promise.all([
    count("profiles"),
    count("profiles", { eq: [["is_pro", true]] }),
    count("profiles", { eq: [["is_pro", false]] }),
    count("profiles", { gte: [["created_at", monthStart]] }),
    count("profiles", { gte: [["created_at", weekStart]] }),
    count("pros", {
      eq: [
        ["subscription_tier", "sub-pro"],
        ["subscription_status", "active"],
      ],
    }),
    count("pros", {
      eq: [
        ["subscription_tier", "sub-elite"],
        ["subscription_status", "active"],
      ],
    }),
    count("pros", { eq: [["subscription_status", "past_due"]] }),
    count("pros", {
      eq: [["subscription_status", "canceled"]],
      gte: [["updated_at", monthStart]],
    }),
    count("requests"),
    count("requests", { gte: [["created_at", weekStart]] }),
    count("responses"),
    count("responses", { eq: [["status", "hired"]] }),
    count("pros", { eq: [["auto_topup_enabled", true]] }),
  ]);

  // Revenue: fetch succeeded payments and sum in JS. Cap at 5k to avoid
  // pulling massive result sets — we'd swap to a SQL aggregate at scale.
  const paymentsRes = await admin.database
    .from("payments")
    .select("amount_cents, kind, created_at")
    .eq("status", "succeeded")
    .order("created_at", { ascending: false })
    .limit(5000);
  const allPayments = (paymentsRes.data ?? []) as {
    amount_cents: number;
    kind: string;
    created_at: string;
  }[];
  let revenue_all_cents = 0;
  let revenue_mtd_cents = 0;
  let credits_revenue_cents = 0;
  let sub_revenue_cents = 0;
  for (const p of allPayments) {
    revenue_all_cents += p.amount_cents;
    if (p.created_at >= monthStart) revenue_mtd_cents += p.amount_cents;
    if (p.kind === "credits") credits_revenue_cents += p.amount_cents;
    else if (p.kind === "subscription") sub_revenue_cents += p.amount_cents;
  }

  const counts: Counts = {
    total_users,
    total_pros,
    total_buyers,
    signups_mtd,
    signups_7d,
    active_pro_subs,
    active_elite_subs,
    past_due_subs,
    canceled_mtd,
    total_requests,
    requests_7d,
    total_responses,
    hired_responses,
    pros_with_autotopup,
  };

  const mrr_cents =
    active_pro_subs * PRO_PRICE_CENTS + active_elite_subs * ELITE_PRICE_CENTS;

  // Tables
  const recentPaymentsRes = await admin.database
    .from("payments")
    .select(
      "id, pro_id, kind, product_slug, amount_cents, credits_granted, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(10);
  const recentPayments = (recentPaymentsRes.data ?? []) as Payment[];

  const recentSignupsRes = await admin.database
    .from("profiles")
    .select("id, full_name, is_pro, created_at, city, state")
    .order("created_at", { ascending: false })
    .limit(10);
  const recentSignups = (recentSignupsRes.data ?? []) as SignupRow[];

  const adminsRes = await admin.database
    .from("admins")
    .select("id, email, added_at, notes")
    .order("added_at", { ascending: true });
  const admins = (adminsRes.data ?? []) as AdminRow[];

  // Audit log — last 12 events for the dashboard panel.
  const auditRes = await admin.database
    .from("admin_audit")
    .select("id, action, actor_email, target_email, created_at")
    .order("created_at", { ascending: false })
    .limit(12);
  const audit = (auditRes.data ?? []) as AuditRow[];

  // Time-series: signups by week (12-week window) and subscription
  // revenue by month (6-month window). All aggregation is JS-side over
  // the rows we already fetched.
  const signupsAllRes = await admin.database
    .from("profiles")
    .select("created_at")
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .limit(5000);
  const signupsAll = (signupsAllRes.data ?? []) as { created_at: string }[];
  const signupsSeries = bucketByWeek(signupsAll, 12);

  const subSeries = bucketSumByMonth(
    allPayments,
    (r) => r.kind === "subscription",
    6
  );

  const churnRate =
    active_pro_subs + active_elite_subs + canceled_mtd > 0
      ? (canceled_mtd / (active_pro_subs + active_elite_subs + canceled_mtd)) *
        100
      : 0;
  const hireRate =
    total_responses > 0 ? (hired_responses / total_responses) * 100 : 0;

  return {
    counts,
    mrr_cents,
    revenue_all_cents,
    revenue_mtd_cents,
    credits_revenue_cents,
    sub_revenue_cents,
    churnRate,
    hireRate,
    recentPayments,
    recentSignups,
    admins,
    audit,
    signupsSeries,
    subSeries,
  };
}

const ADMIN_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  added: { tone: "ok", text: "Admin added." },
  removed: { tone: "ok", text: "Admin removed." },
  invalid_email: { tone: "err", text: "Enter a valid email." },
  already_admin: { tone: "err", text: "That email is already an admin." },
  add_failed: { tone: "err", text: "Could not add admin. Check the logs." },
  cannot_remove_self: {
    tone: "err",
    text: "You can't remove yourself. Ask another admin.",
  },
  remove_failed: { tone: "err", text: "Could not remove admin." },
  missing_id: { tone: "err", text: "Missing admin id." },
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ admin_msg?: string }>;
}) {
  const me = await requireAdmin();
  const params = await searchParams;
  const msg = params.admin_msg ? ADMIN_MSG[params.admin_msg] : null;
  const data = await loadDashboard();
  const affiliateSummary = await loadAffiliateSummary();

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
            <Link href="/admin/affiliates" className="btn-ghost">
              Affiliates
            </Link>
            <Link href="/admin/documents" className="btn-ghost">
              Documents
            </Link>
            <Link href="/" className="btn-outline">
              Exit admin
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page py-10">
        <div className="mb-10">
          <p className="eyebrow">Vanguard control room</p>
          <h1 className="display-h2 mt-2">Operations dashboard</h1>
          <p className="mt-2 text-sm text-ink-300">
            Live counts. Refresh the page for the latest numbers.
          </p>
        </div>

        {msg && (
          <div
            className={`mb-6 rounded-2xl border px-5 py-3 text-sm ${
              msg.tone === "ok"
                ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                : "border-red-400 bg-red-100 text-red-900"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* HEADLINE KPIs */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="MRR"
            value={formatPrice(data.mrr_cents)}
            sublabel={`${data.counts.active_pro_subs + data.counts.active_elite_subs} active subscribers`}
            icon={<TrendingUp className="h-4 w-4" />}
            tone="primary"
          />
          <Stat
            label="Revenue MTD"
            value={formatPrice(data.revenue_mtd_cents)}
            sublabel={`All time: ${formatPrice(data.revenue_all_cents)}`}
            icon={<Banknote className="h-4 w-4" />}
            tone="primary"
          />
          <Stat
            label="Signups MTD"
            value={data.counts.signups_mtd.toString()}
            sublabel={`${data.counts.signups_7d} in last 7 days`}
            icon={<UserPlus className="h-4 w-4" />}
          />
          <Stat
            label="Churn this month"
            value={`${data.churnRate.toFixed(1)}%`}
            sublabel={`${data.counts.canceled_mtd} canceled · ${data.counts.past_due_subs} past due`}
            icon={<AlertTriangle className="h-4 w-4" />}
            tone={data.churnRate > 5 ? "warn" : "default"}
          />
        </section>

        {/* SUB MIX + ACTIVITY */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <Panel title="Subscription mix">
            <ul className="grid gap-3 text-sm">
              <MixRow
                name="Standard"
                price="Free"
                count={Math.max(
                  0,
                  data.counts.total_pros -
                    data.counts.active_pro_subs -
                    data.counts.active_elite_subs
                )}
                highlight={false}
              />
              <MixRow
                name="Pro"
                price={`${formatPrice(PRO_PRICE_CENTS)} / mo`}
                count={data.counts.active_pro_subs}
                highlight={false}
              />
              <MixRow
                name="Elite Pro"
                price={`${formatPrice(ELITE_PRICE_CENTS)} / mo`}
                count={data.counts.active_elite_subs}
                highlight
              />
              <li className="mt-2 flex items-center justify-between border-t border-ink-700 pt-3 text-sm">
                <span className="font-display text-base font-bold">MRR</span>
                <span className="font-mono">
                  {formatPrice(data.mrr_cents)}
                </span>
              </li>
            </ul>
          </Panel>

          <Panel title="Revenue split (succeeded)">
            <ul className="grid gap-3 text-sm">
              <li className="flex items-center justify-between">
                <span>Subscriptions</span>
                <span className="font-mono">
                  {formatPrice(data.sub_revenue_cents)}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span>Credit packs</span>
                <span className="font-mono">
                  {formatPrice(data.credits_revenue_cents)}
                </span>
              </li>
              <li className="mt-2 flex items-center justify-between border-t border-ink-700 pt-3">
                <span className="font-display font-bold">Lifetime total</span>
                <span className="font-mono">
                  {formatPrice(data.revenue_all_cents)}
                </span>
              </li>
              <li className="text-xs text-ink-400">
                {data.counts.pros_with_autotopup} pros have auto top-up enabled
              </li>
            </ul>
          </Panel>

          <Panel title="Marketplace activity">
            <ul className="grid gap-3 text-sm">
              <li className="flex items-center justify-between">
                <span>Total leads</span>
                <span className="font-mono">{data.counts.total_requests}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Leads in last 7d</span>
                <span className="font-mono">{data.counts.requests_7d}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Total responses</span>
                <span className="font-mono">{data.counts.total_responses}</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Hire rate</span>
                <span className="font-mono">{data.hireRate.toFixed(1)}%</span>
              </li>
              <li className="flex items-center justify-between border-t border-ink-700 pt-3">
                <span>Pros · Buyers</span>
                <span className="font-mono">
                  {data.counts.total_pros} · {data.counts.total_buyers}
                </span>
              </li>
            </ul>
          </Panel>
        </section>

        {/* TIME-SERIES TRENDS */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <Panel title="Signups by week">
            <Sparkline
              series={data.signupsSeries}
              accent="#0b1730"
              fill="rgba(11,23,48,0.10)"
            />
            <div className="mt-3 flex items-baseline justify-between text-xs text-ink-400">
              <span>
                {data.signupsSeries.reduce((a, b) => a + b.value, 0)} signups in
                last {data.signupsSeries.length} weeks
              </span>
              <span>
                Peak{" "}
                {Math.max(...data.signupsSeries.map((p) => p.value))} / week
              </span>
            </div>
          </Panel>

          <Panel title="Subscription revenue by month">
            <BarChart
              series={data.subSeries}
              format={(v) => formatPrice(v)}
            />
            <div className="mt-3 flex items-baseline justify-between text-xs text-ink-400">
              <span>
                Last {data.subSeries.length} months · subscription invoices
              </span>
              <span>
                Total{" "}
                {formatPrice(
                  data.subSeries.reduce((a, b) => a + b.value, 0)
                )}
              </span>
            </div>
          </Panel>
        </section>

        {/* AFFILIATE SUMMARY */}
        <section className="mt-10">
          <Panel
            title="Affiliate program"
            action={
              <Link
                href="/admin/affiliates"
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-3 py-1.5 text-xs text-ink-200 hover:border-amber-accent hover:text-amber-accent"
              >
                Open queue
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            <ul className="grid gap-3 text-sm sm:grid-cols-4">
              <li className="rounded-xl border border-amber-accent/30 bg-amber-accent/5 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-accent">
                  Pending payouts
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tightest">
                  {formatPrice(affiliateSummary.pending_cents)}
                </p>
              </li>
              <li className="rounded-xl border border-ink-700 bg-ink-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-accent">
                  Paid lifetime
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tightest">
                  {formatPrice(affiliateSummary.paid_cents)}
                </p>
              </li>
              <li className="rounded-xl border border-ink-700 bg-ink-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-accent">
                  Affiliates
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tightest">
                  {affiliateSummary.referrals}
                </p>
              </li>
              <li className="rounded-xl border border-ink-700 bg-ink-900 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-amber-accent">
                  Attributed signups
                </p>
                <p className="mt-1 font-display text-2xl font-bold tracking-tightest">
                  {affiliateSummary.attributed_signups}
                </p>
              </li>
            </ul>
          </Panel>
        </section>

        {/* TABLES */}
        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <Panel
            title="Recent payments"
            action={
              <CsvLink href="/admin/export/payments" label="Export CSV" />
            }
          >
            <Table
              cols={["Date", "Type", "Product", "Amount", "Status"]}
              rows={data.recentPayments.map((p) => [
                new Date(p.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
                p.kind,
                p.kind === "credits"
                  ? `${p.credits_granted} credits`
                  : p.product_slug,
                <span key={`${p.id}-amt`} className="font-mono">
                  {formatPrice(p.amount_cents)}
                </span>,
                <Badge key={`${p.id}-st`} status={p.status} />,
              ])}
              empty="No payments yet."
            />
          </Panel>

          <Panel
            title="Recent signups"
            action={
              <CsvLink href="/admin/export/signups" label="Export CSV" />
            }
          >
            <Table
              cols={["Date", "Name", "Role", "Location", ""]}
              rows={data.recentSignups.map((s) => [
                new Date(s.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                }),
                s.full_name ?? <span className="text-ink-400">—</span>,
                <span
                  key={`${s.id}-role`}
                  className={`pill ${s.is_pro ? "border-amber-accent/40 text-amber-accent" : ""}`}
                >
                  {s.is_pro ? "Pro" : "Buyer"}
                </span>,
                s.city || s.state
                  ? `${s.city ?? ""}${s.city && s.state ? ", " : ""}${s.state ?? ""}`
                  : "—",
                s.is_pro ? (
                  <Link
                    key={`${s.id}-link`}
                    href={`/admin/pros/${s.id}`}
                    className="inline-flex items-center text-amber-accent hover:text-amber-deep"
                    aria-label="Open pro detail"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <span className="text-ink-500">—</span>
                ),
              ])}
              empty="No signups yet."
            />
          </Panel>
        </section>

        {/* AUDIT LOG */}
        <section className="mt-10">
          <Panel
            title="Audit log"
            action={<History className="h-4 w-4 text-ink-400" />}
          >
            {data.audit.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-400">
                No admin actions yet.
              </p>
            ) : (
              <ul className="divide-y divide-ink-700 text-sm">
                {data.audit.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <ActionTag action={a.action} />
                      <span className="text-ink-300">
                        {a.actor_email ?? "system"} →{" "}
                        <span className="font-medium text-ink-100">
                          {a.target_email ?? "—"}
                        </span>
                      </span>
                    </div>
                    <span className="text-xs text-ink-400">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </section>

        {/* ADMINS */}
        <section className="mt-12">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Access</p>
              <h2 className="display-h2 mt-2">Admins</h2>
            </div>
            <p className="text-xs text-ink-400">
              Only listed emails can reach this page.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="card-elev overflow-hidden">
              <ul className="divide-y divide-ink-700">
                {data.admins.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <p className="font-medium">{a.email}</p>
                      <p className="text-xs text-ink-400">
                        Added{" "}
                        {new Date(a.added_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {me.email && a.email.toLowerCase() === me.email.toLowerCase()
                          ? " · you"
                          : ""}
                      </p>
                    </div>
                    <form action={removeAdminAction}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        disabled={
                          !!me.email &&
                          a.email.toLowerCase() === me.email.toLowerCase()
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-900 disabled:opacity-30 disabled:hover:border-ink-600 disabled:hover:text-ink-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </div>

            <form action={addAdminAction} className="card-elev p-5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-accent" />
                <p className="label">Add admin</p>
              </div>
              <p className="mt-2 text-sm text-ink-300">
                The new admin gains access immediately. They&apos;ll see this
                dashboard the next time they sign in (or on their next page
                load if already signed in).
              </p>
              <label className="mt-4 grid gap-2">
                <span className="label">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  className="input"
                  placeholder="teammate@yourdomain.com"
                />
              </label>
              <button type="submit" className="btn-primary mt-4 w-full">
                Add admin <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
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
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "warn";
}) {
  const accent =
    tone === "primary"
      ? "bg-navy-900 text-white border-navy-900"
      : tone === "warn"
        ? "bg-red-50 border-red-200"
        : "bg-white border-ink-600";
  const labelColor = tone === "primary" ? "text-amber-glow" : "text-amber-accent";
  const subColor = tone === "primary" ? "text-white/70" : "text-ink-400";
  return (
    <article className={`rounded-2xl border-2 p-5 shadow-card ${accent}`}>
      <div className="flex items-center gap-2">
        <span className={labelColor}>{icon}</span>
        <p
          className={`text-xs uppercase tracking-[0.18em] font-semibold ${labelColor}`}
        >
          {label}
        </p>
      </div>
      <p className="mt-2 font-display text-3xl font-bold tracking-tightest">
        {value}
      </p>
      {sublabel && <p className={`mt-1 text-xs ${subColor}`}>{sublabel}</p>}
    </article>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="card-elev p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CsvLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-3 py-1.5 text-xs text-ink-200 hover:border-amber-accent hover:text-amber-accent"
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function ActionTag({ action }: { action: string }) {
  const styles =
    action === "admin_added"
      ? "border-emerald-400 bg-emerald-100 text-emerald-900"
      : action === "admin_removed"
        ? "border-red-400 bg-red-100 text-red-900"
        : "border-ink-600 bg-ink-900 text-ink-200";
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${styles}`}
    >
      {action.replace(/_/g, " ")}
    </span>
  );
}

function Sparkline({
  series,
  accent,
  fill,
}: {
  series: SeriesPoint[];
  accent: string;
  fill: string;
}) {
  const W = 320;
  const H = 80;
  const pad = 4;
  const max = Math.max(1, ...series.map((p) => p.value));
  const stepX = series.length > 1 ? (W - pad * 2) / (series.length - 1) : 0;
  const points = series.map((p, i) => {
    const x = pad + i * stepX;
    const y = H - pad - (p.value / max) * (H - pad * 2);
    return { x, y, value: p.value, label: p.label };
  });
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
  const area =
    points.length > 0
      ? `${path} L ${points[points.length - 1].x.toFixed(1)} ${H - pad} L ${pad} ${H - pad} Z`
      : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="block h-20 w-full"
      aria-label="Signups by week"
    >
      <path d={area} fill={fill} />
      <path
        d={path}
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle
          key={p.label}
          cx={p.x}
          cy={p.y}
          r={2.5}
          fill={accent}
        >
          <title>{`Week of ${p.label}: ${p.value}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function BarChart({
  series,
  format,
}: {
  series: SeriesPoint[];
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...series.map((p) => p.value));
  return (
    <div className="grid grid-cols-6 items-end gap-2 h-24">
      {series.map((p) => {
        const h = (p.value / max) * 100;
        const labelMonth = new Date(`${p.label}-01`).toLocaleDateString(undefined, {
          month: "short",
        });
        return (
          <div key={p.label} className="flex flex-col items-center gap-1">
            <div className="relative h-full w-full">
              <div
                className="absolute bottom-0 left-1/2 w-7 -translate-x-1/2 rounded-t-md bg-amber-accent"
                style={{ height: `${Math.max(2, h)}%` }}
                title={`${labelMonth}: ${format(p.value)}`}
              />
            </div>
            <span className="text-[10px] text-ink-400">{labelMonth}</span>
          </div>
        );
      })}
    </div>
  );
}

function MixRow({
  name,
  price,
  count,
  highlight,
}: {
  name: string;
  price: string;
  count: number;
  highlight: boolean;
}) {
  return (
    <li
      className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${
        highlight
          ? "border-amber-accent/40 bg-amber-accent/5"
          : "border-ink-700 bg-ink-900"
      }`}
    >
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-xs text-ink-400">{price}</p>
      </div>
      <span className="font-display text-2xl font-bold tracking-tightest">
        {count}
      </span>
    </li>
  );
}

function Table({
  cols,
  rows,
  empty,
}: {
  cols: string[];
  rows: React.ReactNode[][];
  empty: string;
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-6 text-center text-sm text-ink-400">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-700">
            {cols.map((c) => (
              <th
                key={c}
                className="py-2 pr-4 text-left text-[11px] font-medium uppercase tracking-[0.18em] text-ink-400"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-ink-700 last:border-0">
              {r.map((cell, j) => (
                <td key={j} className="py-3 pr-4 align-middle">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const tone =
    status === "succeeded"
      ? "border-emerald-400 bg-emerald-100 text-emerald-900"
      : status === "failed"
        ? "border-red-400 bg-red-100 text-red-900"
        : status === "pending"
          ? "border-amber-accent/30 bg-amber-accent/5 text-amber-accent"
          : "border-ink-600 bg-ink-900";
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {status}
    </span>
  );
}
