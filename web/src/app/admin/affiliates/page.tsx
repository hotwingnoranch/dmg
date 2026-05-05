import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  MousePointerClick,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";
import { formatPrice } from "@/lib/stripe";
import { PAYOUT_THRESHOLD_CENTS } from "@/lib/referrals";
import {
  markConversionPaidAction,
  reverseConversionAction,
} from "./actions";

type ReferralRow = {
  id: string;
  code: string;
  owner_user_id: string;
  kind: "pro" | "buyer";
  total_clicks: number;
  total_signups: number;
  total_commission_cents: number;
  created_at: string;
};

type ConversionRow = {
  id: string;
  referral_id: string;
  referred_user_id: string;
  payment_kind: "credits" | "subscription";
  amount_cents: number;
  commission_cents: number;
  rate_bps: number;
  status: "pending" | "paid" | "reversed";
  paid_at: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  is_pro: boolean;
};

const AFF_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  marked_paid: { tone: "ok", text: "Commission marked paid." },
  reversed: { tone: "ok", text: "Commission reversed." },
  missing_id: { tone: "err", text: "Missing commission id." },
  not_found: { tone: "err", text: "Commission not found." },
  update_failed: { tone: "err", text: "Could not update commission." },
};

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ aff_msg?: string; tab?: string }>;
}) {
  const me = await requireAdmin();
  const params = await searchParams;
  const tab = params.tab === "all" ? "all" : params.tab === "paid" ? "paid" : "pending";
  const msg = params.aff_msg ? AFF_MSG[params.aff_msg] : null;

  const admin = createAdminClient();

  // Top referrers by lifetime commission.
  const referralsRes = await admin.database
    .from("referrals")
    .select(
      "id, code, owner_user_id, kind, total_clicks, total_signups, total_commission_cents, created_at"
    )
    .order("total_commission_cents", { ascending: false })
    .limit(50);
  const referrals = (referralsRes.data ?? []) as ReferralRow[];

  // Conversions feed for the queue.
  let convQ = admin.database
    .from("referral_conversions")
    .select(
      "id, referral_id, referred_user_id, payment_kind, amount_cents, commission_cents, rate_bps, status, paid_at, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (tab === "pending") convQ = convQ.eq("status", "pending");
  else if (tab === "paid") convQ = convQ.eq("status", "paid");
  const conversionsRes = await convQ;
  const conversions = (conversionsRes.data ?? []) as ConversionRow[];

  // Resolve owner profiles + referred profiles.
  const userIds = Array.from(
    new Set([
      ...referrals.map((r) => r.owner_user_id),
      ...conversions.map((c) => c.referred_user_id),
    ])
  );
  const profilesRes =
    userIds.length === 0
      ? { data: [] as ProfileRow[] }
      : await admin.database
          .from("profiles")
          .select("id, full_name, is_pro")
          .in("id", userIds);
  const profileMap = new Map<string, ProfileRow>(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );

  // Aggregate totals.
  const [
    totalClicksAgg,
    totalSignupsAgg,
    pendingTotal,
    paidTotal,
    pendingCount,
  ] = await Promise.all([
    admin.database.from("referrals").select("total_clicks").limit(5000),
    admin.database.from("referrals").select("total_signups").limit(5000),
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
      .from("referral_conversions")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const sumClicks = ((totalClicksAgg.data ?? []) as { total_clicks: number }[])
    .reduce((a, b) => a + (b.total_clicks ?? 0), 0);
  const sumSignups = ((totalSignupsAgg.data ?? []) as { total_signups: number }[])
    .reduce((a, b) => a + (b.total_signups ?? 0), 0);
  const sumPending = ((pendingTotal.data ?? []) as { commission_cents: number }[])
    .reduce((a, b) => a + (b.commission_cents ?? 0), 0);
  const sumPaid = ((paidTotal.data ?? []) as { commission_cents: number }[])
    .reduce((a, b) => a + (b.commission_cents ?? 0), 0);

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
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="container-page py-10">
        <div className="mb-8">
          <p className="eyebrow">Affiliate program</p>
          <h1 className="display-h2 mt-2">Referral activity</h1>
          <p className="mt-2 text-sm text-ink-300">
            Top referrers, pending payouts, and conversion history.
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

        {/* KPI strip */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Pending payouts"
            value={formatPrice(sumPending, "usd", "$0.00")}
            sublabel={`${pendingCount.count ?? 0} commissions`}
            icon={<Clock className="h-4 w-4" />}
            tone="warn"
          />
          <Stat
            label="Paid lifetime"
            value={formatPrice(sumPaid, "usd", "$0.00")}
            sublabel="To affiliates"
            icon={<Banknote className="h-4 w-4" />}
            tone="primary"
          />
          <Stat
            label="Total clicks"
            value={String(sumClicks)}
            icon={<MousePointerClick className="h-4 w-4" />}
          />
          <Stat
            label="Attributed signups"
            value={String(sumSignups)}
            icon={<Users className="h-4 w-4" />}
          />
        </section>

        {/* Top referrers */}
        <section className="mt-10">
          <Panel title="Top referrers" subtitle="Sorted by lifetime commission">
            {referrals.length === 0 ? (
              <p className="px-1 py-6 text-center text-sm text-ink-400">
                No referrals yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink-700 text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="py-2 pr-4">Affiliate</th>
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Kind</th>
                      <th className="py-2 pr-4">Clicks</th>
                      <th className="py-2 pr-4">Signups</th>
                      <th className="py-2 pr-4">Earned</th>
                      <th className="py-2 pr-4">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.map((r) => {
                      const owner = profileMap.get(r.owner_user_id);
                      const ready =
                        r.total_commission_cents >= PAYOUT_THRESHOLD_CENTS;
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-ink-700 last:border-0"
                        >
                          <td className="py-3 pr-4">
                            {owner?.is_pro ? (
                              <Link
                                href={`/admin/pros/${r.owner_user_id}`}
                                className="hover:text-amber-accent"
                              >
                                {owner?.full_name ?? "—"}
                              </Link>
                            ) : (
                              <span>{owner?.full_name ?? "—"}</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs">
                            {r.code}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`pill ${
                                r.kind === "pro"
                                  ? "border-amber-accent/40 text-amber-accent"
                                  : ""
                              }`}
                            >
                              {r.kind}
                            </span>
                          </td>
                          <td className="py-3 pr-4 font-mono">
                            {r.total_clicks}
                          </td>
                          <td className="py-3 pr-4 font-mono">
                            {r.total_signups}
                          </td>
                          <td className="py-3 pr-4 font-mono">
                            <span className={ready ? "text-emerald-900 font-medium" : ""}>
                              {formatPrice(r.total_commission_cents)}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-ink-300">
                            {new Date(r.created_at).toLocaleDateString(
                              undefined,
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </section>

        {/* Conversions queue */}
        <section className="mt-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Conversions</p>
              <h2 className="display-h2 mt-2">Commission queue</h2>
            </div>
            <nav className="flex gap-2 text-sm">
              <FilterTab
                href="/admin/affiliates"
                active={tab === "pending"}
                label="Pending"
              />
              <FilterTab
                href="/admin/affiliates?tab=paid"
                active={tab === "paid"}
                label="Paid"
              />
              <FilterTab
                href="/admin/affiliates?tab=all"
                active={tab === "all"}
                label="All"
              />
            </nav>
          </div>

          <div className="mt-6 grid gap-3">
            {conversions.length === 0 ? (
              <div className="card-elev p-10 text-center text-sm text-ink-300">
                <TrendingUp className="mx-auto h-8 w-8 text-amber-accent" />
                <p className="mt-3 font-display text-xl font-bold">
                  No conversions in this view.
                </p>
              </div>
            ) : (
              conversions.map((c) => {
                const referral = referrals.find((r) => r.id === c.referral_id);
                const referredProfile = profileMap.get(c.referred_user_id);
                return (
                  <article key={c.id} className="card-elev p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold">
                          {formatPrice(c.commission_cents)}{" "}
                          <span className="text-sm font-normal text-ink-300">
                            on {formatPrice(c.amount_cents)} ·{" "}
                            {(c.rate_bps / 100).toFixed(0)}%
                          </span>
                        </p>
                        <p className="text-xs text-ink-300">
                          <span className="capitalize">{c.payment_kind}</span> by{" "}
                          {referredProfile?.full_name ?? "anonymous"} · referred
                          via{" "}
                          <span className="font-mono">
                            {referral?.code ?? "—"}
                          </span>
                          {" · "}
                          {new Date(c.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ConversionStatus status={c.status} />
                    </div>

                    {c.status === "pending" && (
                      <div className="mt-4 flex flex-wrap gap-3 border-t border-ink-700 pt-4">
                        <form action={markConversionPaidAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Mark paid
                          </button>
                        </form>
                        <form action={reverseConversionAction}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-white px-3 py-1.5 text-xs text-ink-300 hover:border-red-500/40 hover:text-red-900"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reverse
                          </button>
                        </form>
                      </div>
                    )}

                    {c.status === "paid" && c.paid_at && (
                      <p className="mt-3 text-[11px] text-ink-400">
                        Paid {new Date(c.paid_at).toLocaleString()}
                      </p>
                    )}
                  </article>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function ConversionStatus({
  status,
}: {
  status: ConversionRow["status"];
}) {
  const map = {
    pending: {
      cls: "border-amber-accent/30 bg-amber-accent/10 text-amber-accent",
      label: "Pending",
    },
    paid: {
      cls: "border-emerald-400 bg-emerald-100 text-emerald-900",
      label: "Paid",
    },
    reversed: {
      cls: "border-ink-600 bg-ink-900 text-ink-300",
      label: "Reversed",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${m.cls}`}
    >
      {m.label}
    </span>
  );
}

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
  icon: React.ReactNode;
  tone?: "default" | "primary" | "warn";
}) {
  const accent =
    tone === "primary"
      ? "bg-navy-900 text-white border-navy-900"
      : tone === "warn"
        ? "border-amber-accent/40 bg-amber-accent/5"
        : "bg-white border-ink-600";
  const labelColor = tone === "primary" ? "text-amber-glow" : "text-amber-accent";
  const subColor = tone === "primary" ? "text-white/70" : "text-ink-400";
  return (
    <article className={`rounded-2xl border-2 p-5 shadow-card ${accent}`}>
      <div className={`flex items-center gap-2 ${labelColor}`}>
        {icon}
        <p className="text-xs uppercase tracking-[0.18em] font-semibold">
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
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-elev p-5">
      <div className="mb-4">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {subtitle && <p className="text-xs text-ink-400">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function FilterTab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 ${
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-ink-600 bg-white text-ink-300 hover:border-amber-accent"
      }`}
    >
      {label}
    </Link>
  );
}
