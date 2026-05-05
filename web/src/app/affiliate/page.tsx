import Link from "next/link";
import {
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Clock,
  MousePointerClick,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser, getCurrentUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { formatPrice } from "@/lib/stripe";
import {
  FIRST_CREDIT_COMMISSION_BPS,
  PAYOUT_THRESHOLD_CENTS,
  SUBSCRIPTION_COMMISSION_BPS,
  getOrCreateReferral,
} from "@/lib/referrals";
import { CopyButton } from "./CopyButton";
import { ShareButtons } from "@/components/ShareButtons";
import { updateReferralCodeAction } from "./actions";

type ConversionRow = {
  id: string;
  payment_kind: "credits" | "subscription";
  amount_cents: number;
  commission_cents: number;
  rate_bps: number;
  status: "pending" | "paid" | "reversed";
  created_at: string;
};

type ClickRow = {
  id: string;
  ua: string | null;
  path: string | null;
  created_at: string;
};

function appUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://vanguard.insforge.site"
  ).replace(/\/$/, "");
}

export default async function AffiliatePage({
  searchParams,
}: {
  searchParams: Promise<{ code_msg?: string }>;
}) {
  const params = await searchParams;
  const codeMsg = params.code_msg;
  const codeBanner =
    codeMsg === "ok"
      ? { tone: "ok" as const, text: "Custom code saved." }
      : codeMsg
        ? { tone: "err" as const, text: codeMsg }
        : null;

  const user = await requireUser("/affiliate");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const profileRes = await insforge.database
    .from("profiles")
    .select("is_pro, full_name")
    .eq("id", user.id)
    .maybeSingle();
  const isPro = (profileRes.data as { is_pro?: boolean } | null)?.is_pro ?? false;

  const referral = await getOrCreateReferral(token!, user.id, isPro);
  if (!referral) {
    return (
      <>
        <Header user={user} />
        <main className="container-page py-20">
          <p className="rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-900">
            Could not generate your referral link. Please refresh — if it
            keeps happening, contact support.
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const [conversionsRes, clicksRes] = await Promise.all([
    insforge.database
      .from("referral_conversions")
      .select(
        "id, payment_kind, amount_cents, commission_cents, rate_bps, status, created_at"
      )
      .eq("referral_id", referral.id)
      .order("created_at", { ascending: false })
      .limit(50),
    insforge.database
      .from("referral_clicks")
      .select("id, ua, path, created_at")
      .eq("referral_id", referral.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const conversions = (conversionsRes.data ?? []) as ConversionRow[];
  const clicks = (clicksRes.data ?? []) as ClickRow[];

  const pendingCents = conversions
    .filter((c) => c.status === "pending")
    .reduce((a, b) => a + b.commission_cents, 0);
  const paidCents = conversions
    .filter((c) => c.status === "paid")
    .reduce((a, b) => a + b.commission_cents, 0);

  const shareUrl = `${appUrl()}/r/${referral.code}`;
  const isAdmin = await isAdminEmail((await getCurrentUser())?.email);

  return (
    <>
      <Header user={user} isAdmin={isAdmin} />

      <main className="container-page py-12">
        <div className="grid gap-8">
          <section>
            <p className="eyebrow">Affiliate</p>
            <h1 className="display-h2 mt-2">
              Refer friends. Earn on every payment.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-ink-300">
              Share your unique link. When someone signs up and pays, you
              earn{" "}
              <span className="font-medium text-ink-50">
                {(FIRST_CREDIT_COMMISSION_BPS / 100).toFixed(0)}%
              </span>{" "}
              of their first credit purchase, plus{" "}
              <span className="font-medium text-ink-50">
                {(SUBSCRIPTION_COMMISSION_BPS / 100).toFixed(0)}%
              </span>{" "}
              of every subscription invoice for 12 months.
            </p>
          </section>

          {/* Share card */}
          <section className="card-elev p-6">
            {codeBanner && (
              <div
                className={`mb-4 rounded-xl border px-4 py-2.5 text-sm ${
                  codeBanner.tone === "ok"
                    ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                    : "border-red-400 bg-red-100 text-red-900"
                }`}
              >
                {codeBanner.text}
              </div>
            )}

            <p className="label">Your referral link</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <code className="flex-1 break-all rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 font-mono text-sm">
                {shareUrl}
              </code>
              <CopyButton value={shareUrl} label="Copy link" />
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Clicks drop a 30-day attribution cookie on the visitor&apos;s
              device.
            </p>

            <form
              action={updateReferralCodeAction}
              className="mt-4 grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end"
            >
              <span className="label">Customize your code</span>
              <div className="flex items-stretch overflow-hidden rounded-xl border border-ink-700 bg-white">
                <span className="grid place-items-center bg-ink-900 px-3 font-mono text-xs text-ink-300">
                  /r/
                </span>
                <input
                  name="code"
                  defaultValue={referral.code}
                  pattern="[A-Za-z0-9_-]{3,20}"
                  maxLength={20}
                  required
                  className="flex-1 bg-transparent px-3 py-2 font-mono text-sm focus:outline-none"
                  placeholder="travis"
                  aria-label="Custom referral code"
                />
              </div>
              <button type="submit" className="btn-outline">
                Save code
              </button>
              <p className="sm:col-span-3 text-xs text-ink-400">
                3–20 characters · letters, numbers, dashes, underscores. Pick
                something memorable — your name works great.
              </p>
            </form>

            <div className="mt-5">
              <ShareButtons
                url={shareUrl}
                message="Vetted private security pros, fast quotes. Try Vanguard:"
                label="Share your link"
              />
            </div>

            <div className="mt-5 border-t border-ink-700 pt-4 text-sm">
              <Link
                href="/affiliates/marketing-docs"
                className="inline-flex items-center gap-1.5 text-amber-accent hover:text-amber-deep"
              >
                Affiliate marketing docs &rarr;
              </Link>
              <p className="mt-1 text-xs text-ink-400">
                Branded images, sample emails, talking points and videos to
                promote Vanguard.
              </p>
            </div>
          </section>

          {/* KPI strip */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Clicks"
              value={String(referral.total_clicks)}
              icon={<MousePointerClick className="h-4 w-4" />}
            />
            <Stat
              label="Signups"
              value={String(referral.total_signups)}
              icon={<Users className="h-4 w-4" />}
            />
            <Stat
              label="Pending payout"
              value={formatPrice(pendingCents, "usd", "$0.00")}
              icon={<Clock className="h-4 w-4" />}
              tone={pendingCents >= PAYOUT_THRESHOLD_CENTS ? "ok" : "default"}
              sublabel={
                pendingCents >= PAYOUT_THRESHOLD_CENTS
                  ? "Ready for payout!"
                  : `${formatPrice(PAYOUT_THRESHOLD_CENTS - pendingCents, "usd", "$0.00")} to go`
              }
            />
            <Stat
              label="Paid out"
              value={formatPrice(paidCents, "usd", "$0.00")}
              icon={<Banknote className="h-4 w-4" />}
              tone="primary"
              sublabel="Lifetime"
            />
          </section>

          {/* Conversions */}
          <section className="card-elev p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Commissions</h2>
              <span className="text-xs text-ink-400">
                {conversions.length} on record
              </span>
            </div>

            {conversions.length === 0 ? (
              <p className="mt-6 text-sm text-ink-400">
                No commissions yet. Share your link to get started.
              </p>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink-700 text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Type</th>
                      <th className="py-2 pr-4">Sale</th>
                      <th className="py-2 pr-4">Rate</th>
                      <th className="py-2 pr-4">Earned</th>
                      <th className="py-2 pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conversions.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-ink-700 last:border-0"
                      >
                        <td className="py-3 pr-4">
                          {new Date(c.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 pr-4 capitalize">
                          {c.payment_kind}
                        </td>
                        <td className="py-3 pr-4 font-mono">
                          {formatPrice(c.amount_cents)}
                        </td>
                        <td className="py-3 pr-4 font-mono text-ink-300">
                          {(c.rate_bps / 100).toFixed(0)}%
                        </td>
                        <td className="py-3 pr-4 font-mono font-medium">
                          {formatPrice(c.commission_cents)}
                        </td>
                        <td className="py-3 pr-4">
                          <ConversionStatus status={c.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recent clicks */}
          <section className="card-elev p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Recent clicks</h2>
              <span className="text-xs text-ink-400">last {clicks.length}</span>
            </div>
            {clicks.length === 0 ? (
              <p className="mt-6 text-sm text-ink-400">
                Nobody&apos;s used your link yet.
              </p>
            ) : (
              <ul className="mt-5 grid gap-2 text-sm">
                {clicks.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink-700 bg-white px-4 py-2"
                  >
                    <span className="font-mono text-xs text-ink-300">
                      {c.path ?? "/"}
                    </span>
                    <span className="text-xs text-ink-400">
                      {new Date(c.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* How it works */}
          <section className="rounded-2xl border border-ink-700 bg-ink-900 p-6">
            <p className="eyebrow">How it works</p>
            <ol className="mt-4 grid gap-3 text-sm text-ink-200 sm:grid-cols-3">
              <li className="rounded-xl border border-ink-700 bg-white p-4">
                <ArrowUpRight className="h-4 w-4 text-amber-accent" />
                <p className="mt-2 font-medium">1. Share your link</p>
                <p className="mt-1 text-xs text-ink-400">
                  Send to colleagues, post on socials, link from your website.
                </p>
              </li>
              <li className="rounded-xl border border-ink-700 bg-white p-4">
                <CheckCircle2 className="h-4 w-4 text-amber-accent" />
                <p className="mt-2 font-medium">2. They sign up &amp; pay</p>
                <p className="mt-1 text-xs text-ink-400">
                  Attribution cookie lasts 30 days. We track Stripe payments
                  automatically.
                </p>
              </li>
              <li className="rounded-xl border border-ink-700 bg-white p-4">
                <Banknote className="h-4 w-4 text-amber-accent" />
                <p className="mt-2 font-medium">3. Get paid</p>
                <p className="mt-1 text-xs text-ink-400">
                  Once your pending balance hits {formatPrice(PAYOUT_THRESHOLD_CENTS)}, we&apos;ll reach out
                  to arrange payout.
                </p>
              </li>
            </ol>

            <div className="mt-5 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.18em] text-emerald-900">
              <ShieldCheck className="h-3.5 w-3.5" />
              Self-referrals don&apos;t count · refunds reverse commissions
            </div>
          </section>

          <section>
            <Link href="/" className="text-sm text-ink-300 hover:text-amber-accent">
              ← Back to home
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </>
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
  tone?: "default" | "primary" | "ok";
}) {
  const accent =
    tone === "primary"
      ? "bg-navy-900 text-white border-navy-900"
      : tone === "ok"
        ? "border-emerald-400 bg-emerald-50"
        : "bg-white border-ink-600";
  const labelColor =
    tone === "primary"
      ? "text-amber-glow"
      : tone === "ok"
        ? "text-emerald-900"
        : "text-amber-accent";
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
