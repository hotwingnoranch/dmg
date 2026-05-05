import Link from "next/link";
import { CheckCircle2, Sparkles, ShieldCheck, CreditCard, Zap } from "lucide-react";
import {
  CREDIT_PACKS,
  SUBSCRIPTION_TIERS,
  formatPrice,
} from "@/lib/stripe";
import {
  startCreditCheckout,
  startSubscriptionCheckout,
  reconcileCheckoutSession,
  setAutoTopUp,
  triggerAutoTopUp,
} from "./actions";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";

type ProRow = {
  credits: number;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_period_end: string | null;
  default_payment_method_id: string | null;
  auto_topup_enabled: boolean;
  auto_topup_pack_slug: string | null;
  auto_topup_threshold: number;
};

const RESULT_BANNERS: Record<string, { tone: "success" | "info" | "error"; text: string }> = {
  cancel: { tone: "info", text: "Checkout was cancelled. No charge was made." },
  "autotopup-saved": { tone: "success", text: "Auto top-up settings saved." },
  "autotopup-disabled": { tone: "info", text: "Enable auto top-up first." },
  "autotopup-needs-card": {
    tone: "info",
    text: "Add a card by buying any credit pack with “Save card for auto top-up” checked.",
  },
  "autotopup-charged": { tone: "success", text: "Auto top-up charged successfully." },
  "autotopup-failed": {
    tone: "error",
    text: "Auto top-up charge failed. Card may need re-authentication.",
  },
};

export default async function ProBillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    stripe_session?: string;
    result?: string;
    autotopup?: string;
    code?: string;
  }>;
}) {
  const params = await searchParams;
  const tab = params.tab === "subscription" ? "subscription" : "credits";

  const user = await requireUser("/pros/billing");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  let reconciled: { kind: string; alreadyApplied: boolean } | null = null;
  if (params.stripe_session && params.result === "success") {
    try {
      reconciled = await reconcileCheckoutSession(params.stripe_session);
      // If the user opted into auto top-up at checkout, enable it now that
      // the card is on file.
      if (params.autotopup === "enable") {
        const session = await insforge.database
          .from("payments")
          .select("product_slug")
          .eq("stripe_session_id", params.stripe_session)
          .maybeSingle();
        await insforge.database
          .from("pros")
          .update({
            auto_topup_enabled: true,
            auto_topup_pack_slug: session.data?.product_slug ?? "credits-120",
          })
          .eq("id", user.id);
      }
    } catch (e) {
      console.error("reconcile failed:", e);
    }
  }

  const proRes = await insforge.database
    .from("pros")
    .select(
      "credits, subscription_tier, subscription_status, subscription_period_end, default_payment_method_id, auto_topup_enabled, auto_topup_pack_slug, auto_topup_threshold"
    )
    .eq("id", user.id)
    .maybeSingle();
  const pro = (proRes.data ?? {
    credits: 0,
    subscription_tier: null,
    subscription_status: null,
    subscription_period_end: null,
    default_payment_method_id: null,
    auto_topup_enabled: false,
    auto_topup_pack_slug: null,
    auto_topup_threshold: 10,
  }) as ProRow;

  const recent = await insforge.database
    .from("payments")
    .select(
      "id, kind, product_slug, amount_cents, credits_granted, status, created_at"
    )
    .eq("pro_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const banner = params.result ? RESULT_BANNERS[params.result] : null;

  return (
    <div className="grid gap-8">
      <div>
        <p className="eyebrow">Billing</p>
        <h1 className="display-h2 mt-2">Credits & subscription</h1>
        <p className="mt-3 max-w-xl text-sm text-ink-300">
          Buy credits to respond to leads, or upgrade to a Pro plan to unlock
          higher placement and more leads each month.
        </p>
      </div>

      {reconciled && !reconciled.alreadyApplied && (
        <Banner tone="success" title="Payment received — thank you.">
          {reconciled.kind === "credits"
            ? "Your credits have been added to your account."
            : "Your subscription is now active."}
        </Banner>
      )}
      {banner && (
        <Banner tone={banner.tone} title={banner.text}>
          {params.code ? <span className="font-mono">code: {params.code}</span> : null}
        </Banner>
      )}

      {/* Status strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="card-elev p-5">
          <p className="label">Credits</p>
          <p className="mt-2 font-display text-4xl font-bold tracking-tightest">
            {pro.credits ?? 0}
          </p>
          <p className="text-xs text-ink-400">$1.88 per credit</p>
        </article>
        <article className="card-elev p-5">
          <p className="label">Plan</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {tierLabel(pro.subscription_tier)}
          </p>
          <p className="text-xs text-ink-400">
            {pro.subscription_status === "active"
              ? `Renews ${pro.subscription_period_end ? new Date(pro.subscription_period_end).toLocaleDateString() : "monthly"}`
              : "Free plan"}
          </p>
        </article>
        <article className="card-elev p-5">
          <p className="label">Auto top-up</p>
          <p className="mt-2 font-display text-2xl font-bold">
            {pro.auto_topup_enabled ? "On" : "Off"}
          </p>
          <p className="text-xs text-ink-400">
            {pro.auto_topup_enabled && pro.auto_topup_pack_slug
              ? `Refills ${pro.auto_topup_pack_slug} when below ${pro.auto_topup_threshold}`
              : "Configure below"}
          </p>
        </article>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <Tab href="/pros/billing?tab=credits" active={tab === "credits"}>
          Credits
        </Tab>
        <Tab
          href="/pros/billing?tab=subscription"
          active={tab === "subscription"}
        >
          Subscription
        </Tab>
      </div>

      {tab === "credits" ? (
        <>
          <CreditsTab hasCard={!!pro.default_payment_method_id} />
          <AutoTopUpCard pro={pro} />
        </>
      ) : (
        <SubscriptionTab activeSlug={pro.subscription_tier} />
      )}

      {/* History */}
      {(recent.data?.length ?? 0) > 0 && (
        <section className="mt-6">
          <p className="label">Recent transactions</p>
          <div className="card-elev mt-3 divide-y divide-ink-600 overflow-hidden">
            {(recent.data ?? []).map((p, i) => (
              <div
                key={p.id as string}
                className={`flex items-center justify-between gap-4 px-5 py-4 ${
                  i % 2 === 1 ? "bg-ink-900" : ""
                }`}
              >
                <div>
                  <p className="text-sm font-medium">
                    {p.kind === "credits"
                      ? `${p.credits_granted} credits — ${p.product_slug}`
                      : `Subscription — ${p.product_slug}`}
                  </p>
                  <p className="text-xs text-ink-400">
                    {new Date(p.created_at as string).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm">
                    {formatPrice(p.amount_cents as number)}
                  </span>
                  <span
                    className={`pill ${
                      p.status === "succeeded"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                        : p.status === "failed"
                          ? "border-red-500/40 bg-red-500/10 text-red-600"
                          : ""
                    }`}
                  >
                    {String(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function tierLabel(slug: string | null) {
  if (!slug) return "Standard";
  const t = SUBSCRIPTION_TIERS.find((x) => x.slug === slug);
  return t?.name ?? "Standard";
}

function Tab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm transition ${
        active
          ? "border-navy-900 bg-navy-900 text-white shadow-card"
          : "border-ink-600 bg-white text-ink-200 hover:border-ink-500"
      }`}
    >
      {children}
    </Link>
  );
}

function Banner({
  tone,
  title,
  children,
}: {
  tone: "success" | "info" | "error";
  title: string;
  children?: React.ReactNode;
}) {
  const styles = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-800",
    info: "border-ink-600 bg-ink-900 text-ink-200",
    error: "border-red-500/40 bg-red-500/10 text-red-700",
  }[tone];
  return (
    <div className={`rounded-2xl border px-5 py-4 text-sm ${styles}`}>
      <p className="font-medium">{title}</p>
      {children && <p className="mt-1">{children}</p>}
    </div>
  );
}

function CreditsTab({ hasCard }: { hasCard: boolean }) {
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {CREDIT_PACKS.map((p) => {
        const featured = p.slug === "credits-480";
        return (
          <article
            key={p.slug}
            className={`relative flex flex-col rounded-2xl border-2 bg-white p-6 transition shadow-card hover:shadow-card-strong ${
              featured
                ? "border-amber-accent shadow-glow-amber"
                : "border-ink-600 hover:border-ink-500"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-accent/10 px-2.5 py-0.5 text-xs font-bold text-amber-accent">
                {p.discount_label}
              </span>
              {featured && (
                <span className="rounded-full bg-amber-accent px-2.5 py-0.5 text-xs font-bold text-white">
                  BEST VALUE
                </span>
              )}
            </div>

            <h3 className="mt-4 font-display text-2xl font-bold">{p.label}</h3>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-display text-4xl font-bold tracking-tightest">
                {p.credits}
              </span>
              <span className="text-sm text-ink-300">credits</span>
            </div>

            <p className="mt-4 font-mono text-lg">{formatPrice(p.price_cents)}</p>
            <p className="text-xs text-ink-400">(Excl. tax) · $1.88/credit</p>

            <form action={startCreditCheckout} className="mt-6 grid gap-3">
              <input type="hidden" name="slug" value={p.slug} />
              <button className="btn-primary w-full">Buy credits</button>
              <label className="inline-flex items-center gap-2 text-sm text-ink-200">
                <input
                  type="checkbox"
                  name="save_card"
                  className="h-4 w-4 rounded border-ink-500 text-navy-900 focus:ring-navy-700/30"
                  defaultChecked={hasCard}
                />
                <span>
                  {hasCard
                    ? "Use saved card next time"
                    : "Save card for auto top-up"}
                </span>
              </label>
            </form>
          </article>
        );
      })}
    </section>
  );
}

function AutoTopUpCard({ pro }: { pro: ProRow }) {
  const hasCard = !!pro.default_payment_method_id;
  return (
    <section className="card-elev mt-2 grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-accent" />
          <p className="label">Auto top-up</p>
        </div>
        <h3 className="mt-2 font-display text-2xl font-bold">
          Never run out of credits.
        </h3>
        <p className="mt-2 max-w-md text-sm text-ink-300">
          When your balance drops below the threshold we automatically charge
          your saved card and refill the chosen pack. Powered by Stripe
          off-session payments — your card stays on Stripe&apos;s servers.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900 px-3 py-1.5 text-xs">
          <CreditCard className="h-3.5 w-3.5 text-ink-300" />
          {hasCard ? (
            <span>
              Card on file ·{" "}
              <span className="font-mono text-ink-200">
                {pro.default_payment_method_id?.slice(-6)}
              </span>
            </span>
          ) : (
            <span className="text-ink-400">
              No card saved yet — buy a credit pack with the box checked
            </span>
          )}
        </div>
      </div>

      <form action={setAutoTopUp} className="grid gap-4">
        <label className="inline-flex items-center justify-between gap-3 rounded-xl border border-ink-600 bg-ink-900 px-4 py-3 text-sm">
          <span className="font-medium">Enable auto top-up</span>
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={pro.auto_topup_enabled}
            disabled={!hasCard}
            className="h-5 w-5 rounded border-ink-500 text-navy-900 focus:ring-navy-700/30 disabled:opacity-40"
          />
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="label">Refill with</span>
          <select
            name="pack_slug"
            defaultValue={pro.auto_topup_pack_slug ?? "credits-120"}
            className="input"
          >
            {CREDIT_PACKS.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.label} · {p.credits} credits · {formatPrice(p.price_cents)}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-sm">
          <span className="label">When below (credits)</span>
          <input
            type="number"
            name="threshold"
            min={1}
            max={500}
            defaultValue={pro.auto_topup_threshold ?? 10}
            className="input"
          />
        </label>

        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn-primary flex-1" type="submit">
            Save settings
          </button>
        </div>
      </form>

      <form
        action={triggerAutoTopUp}
        className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-5"
      >
        <p className="text-xs text-ink-400">
          In production, the system fires this automatically when your
          balance drops below the threshold. Use this button to test the
          off-session charge against your saved card.
        </p>
        <button
          type="submit"
          disabled={!pro.auto_topup_enabled || !hasCard}
          className="btn-outline disabled:opacity-50"
        >
          Trigger top-up now (test)
        </button>
      </form>
    </section>
  );
}

function SubscriptionTab({ activeSlug }: { activeSlug: string | null }) {
  const effective = activeSlug ?? "sub-standard";
  return (
    <section className="grid gap-5 lg:grid-cols-3">
      {SUBSCRIPTION_TIERS.map((t) => {
        const isActive = effective === t.slug;
        const isElite = t.slug === "sub-elite";
        const isFree = t.price_cents === 0;
        return (
          <article
            key={t.slug}
            className={`relative flex flex-col rounded-2xl border-2 p-6 transition ${
              isElite
                ? "bg-navy-900 text-white border-navy-900 shadow-lift"
                : "bg-white border-ink-600 hover:border-ink-500 shadow-card hover:shadow-card-strong"
            } ${isActive ? "ring-2 ring-amber-accent ring-offset-2 ring-offset-ink-900" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p
                className={`text-xs uppercase tracking-[0.22em] ${
                  isElite ? "text-amber-glow" : "text-amber-accent"
                }`}
              >
                {t.blurb}
              </p>
              {isElite && <Sparkles className="h-4 w-4 text-amber-glow" />}
            </div>

            <h3
              className={`mt-3 font-display text-3xl font-bold ${
                isElite ? "text-white" : ""
              }`}
            >
              {t.name}
            </h3>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-bold tracking-tightest">
                {formatPrice(t.price_cents)}
              </span>
              {!isFree && (
                <span
                  className={`text-sm ${isElite ? "text-white/60" : "text-ink-400"}`}
                >
                  /mo
                </span>
              )}
            </div>

            <ul
              className={`mt-6 grid gap-2.5 text-sm ${
                isElite ? "text-white/85" : "text-ink-200"
              }`}
            >
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <CheckCircle2
                    className={`mt-0.5 h-4 w-4 flex-none ${
                      isElite ? "text-amber-glow" : "text-amber-accent"
                    }`}
                  />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <form
              action={startSubscriptionCheckout}
              className="mt-auto pt-6"
            >
              <input type="hidden" name="slug" value={t.slug} />
              <button
                disabled={isActive}
                className={`w-full ${
                  isElite
                    ? "btn bg-amber-accent text-white hover:bg-amber-deep"
                    : isFree
                      ? "btn-outline"
                      : "btn-primary"
                }`}
              >
                {isActive
                  ? "Current plan"
                  : isFree
                    ? "Stay on Standard"
                    : `Choose ${t.name}`}
              </button>
            </form>
          </article>
        );
      })}

      <p className="lg:col-span-3 inline-flex items-center gap-2 text-xs text-ink-400">
        <ShieldCheck className="h-4 w-4 text-amber-accent" />
        Cancel anytime. Test mode — no real charges.
      </p>
    </section>
  );
}
