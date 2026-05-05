import Link from "next/link";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { Filter, Phone, Verified, Sparkles, CheckCircle2, X } from "lucide-react";
import { LeadResponseForm } from "./LeadResponseForm";
import { leadCost } from "./cost";

type Lead = {
  id: string;
  zip_code: string;
  city: string | null;
  state: string | null;
  urgency: string;
  status: string;
  created_at: string;
  contact_name: string | null;
  contact_phone: string | null;
  details: { description?: string } | null;
  service_categories:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
};

const RESULT_BANNERS: Record<string, { tone: "ok" | "info" | "err"; text: string }> = {
  dismissed: { tone: "info", text: "Lead dismissed. It won't appear in your feed again." },
  already_responded: {
    tone: "info",
    text: "You already responded to that lead — see /pros/responses.",
  },
  error: { tone: "err", text: "Something went wrong. Try again." },
  missing_request: { tone: "err", text: "Missing lead reference." },
};

function leadCategory(l: Lead) {
  const raw = l.service_categories;
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const hours = Math.round(ms / 3_600_000);
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function maskPhone(p?: string | null) {
  if (!p) return "—";
  const digits = p.replace(/\D/g, "");
  if (digits.length < 7) return "(•••) •••-••••";
  return `${digits.slice(0, 3)} ***-****`;
}

function maskName(n?: string | null) {
  if (!n) return "Client";
  const first = n.trim().split(/\s+/)[0] ?? "Client";
  return first;
}

export default async function ProLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; lead?: string }>;
}) {
  const params = await searchParams;
  const banner = params.result ? RESULT_BANNERS[params.result] : null;

  const user = await requireUser("/pros/leads");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // Pro context: categories + credit balance.
  const [myCatsRes, proRes, repliedRes] = await Promise.all([
    insforge.database
      .from("pro_services")
      .select("category_id")
      .eq("pro_id", user.id),
    insforge.database
      .from("pros")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle(),
    insforge.database
      .from("responses")
      .select("request_id")
      .eq("pro_id", user.id),
  ]);

  const ids = (myCatsRes.data ?? []).map((r) => r.category_id);
  const proCredits = (proRes.data?.credits ?? 0) as number;
  const repliedSet = new Set(
    ((repliedRes.data ?? []) as { request_id: string }[]).map(
      (r) => r.request_id
    )
  );

  let leadsRes;
  if (ids.length > 0) {
    leadsRes = await insforge.database
      .from("requests")
      .select(
        "id, zip_code, city, state, urgency, status, created_at, contact_name, contact_phone, details, service_categories(name, slug)"
      )
      .eq("status", "open")
      .in("category_id", ids)
      .order("created_at", { ascending: false })
      .limit(80);
  } else {
    leadsRes = await insforge.database
      .from("requests")
      .select(
        "id, zip_code, city, state, urgency, status, created_at, contact_name, contact_phone, details, service_categories(name, slug)"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(80);
  }

  // Filter out leads the pro already responded to (any status, including
  // dismissed/declined). The unique constraint on (request_id, pro_id)
  // guarantees we only keep one entry per pair.
  const allLeads = (leadsRes.data ?? []) as unknown as Lead[];
  const leads = allLeads.filter((l) => !repliedSet.has(l.id));

  // Selected lead for the right pane: ?lead=<id> wins; otherwise first.
  const selected =
    leads.find((l) => l.id === params.lead) ?? leads[0] ?? null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Leads</p>
          <h1 className="display-h2 mt-2">
            {leads.length === 0
              ? "You're all caught up."
              : `${leads.length} matching ${leads.length === 1 ? "lead" : "leads"}`}
          </h1>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-white px-3 py-1.5 text-xs text-ink-300">
          <span className="font-mono text-ink-50">{proCredits}</span> credits ·
          <Link
            href="/pros/billing?tab=credits"
            className="font-medium text-amber-accent hover:text-amber-deep"
          >
            top up
          </Link>
        </div>
      </div>

      {banner && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            banner.tone === "ok"
              ? "border-emerald-400 bg-emerald-100 text-emerald-900"
              : banner.tone === "err"
                ? "border-red-400 bg-red-100 text-red-900"
                : "border-ink-600 bg-ink-900 text-ink-200"
          }`}
        >
          {banner.text}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <aside className="card flex flex-col gap-3 p-5 lg:max-h-[70vh] lg:overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-xl font-bold">
                {leads.length} leads
              </p>
              <p className="text-xs text-ink-300">Matching your services</p>
            </div>
            <button className="btn-ghost" disabled title="Coming soon">
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>

          <hr className="border-ink-700" />

          <ul className="grid gap-2">
            {leads.map((l) => {
              const cost = leadCost(l.urgency);
              const isSelected = selected?.id === l.id;
              return (
                <li key={l.id}>
                  <Link
                    href={`/pros/leads?lead=${l.id}`}
                    className={`block rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-amber-accent bg-amber-accent/5"
                        : "border-ink-700 bg-white hover:border-ink-500"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {maskName(l.contact_name)}
                        </p>
                        <p className="text-xs text-ink-300">
                          {l.city ? `${l.city}, ` : ""}
                          {l.state ?? ""} {l.zip_code}
                        </p>
                      </div>
                      <span className="text-xs text-ink-300">
                        {timeAgo(l.created_at)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                      {l.urgency === "urgent" && (
                        <span className="rounded-full border border-red-400 bg-red-100 px-2 py-0.5 text-red-900">
                          Urgent
                        </span>
                      )}
                      <span className="rounded-full border border-amber-accent/30 bg-amber-accent/10 px-2 py-0.5 text-amber-accent">
                        {cost} credits
                      </span>
                      <span className="rounded-full border border-emerald-400 bg-emerald-100 px-2 py-0.5 text-emerald-900">
                        Verified phone
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm text-ink-200">
                      {leadCategory(l)?.name} —{" "}
                      {l.details?.description ?? "Awaiting more details"}
                    </p>
                  </Link>
                </li>
              );
            })}
            {leads.length === 0 && (
              <li className="rounded-xl border border-ink-700 bg-white p-6 text-center text-sm text-ink-300">
                No new matching leads. We&apos;ll notify you the moment one
                arrives.
              </li>
            )}
          </ul>
        </aside>

        <section className="card p-6">
          {selected ? (
            <LeadDetail lead={selected} proCredits={proCredits} />
          ) : (
            <div className="grid place-items-center py-24 text-center">
              <Sparkles className="h-8 w-8 text-amber-accent" />
              <p className="mt-4 font-display text-2xl font-bold">
                You&apos;re all caught up.
              </p>
              <p className="mt-2 text-sm text-ink-300">
                We&apos;ll notify you when fresh leads in your area come in.
              </p>
              <Link
                href="/pros/responses"
                className="btn-outline mt-6"
              >
                View your pipeline
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function LeadDetail({
  lead,
  proCredits,
}: {
  lead: Lead;
  proCredits: number;
}) {
  const cost = leadCost(lead.urgency);
  const cat = leadCategory(lead);

  return (
    <div>
      <p className="font-display text-2xl font-bold">
        {cat?.name ?? "Security request"}
      </p>
      <p className="text-sm text-ink-300">
        {lead.city ? `${lead.city}, ` : ""}
        {lead.state ?? ""} {lead.zip_code} · {timeAgo(lead.created_at)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
          <p className="label">Verified phone</p>
          <p className="mt-2 inline-flex items-center gap-2 font-mono">
            <Phone className="h-4 w-4 text-amber-accent" />
            {maskPhone(lead.contact_phone)}
            <Verified className="h-4 w-4 text-emerald-800" />
          </p>
          <p className="mt-1 text-[11px] text-ink-400">
            Full number revealed after you respond.
          </p>
        </div>
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-4">
          <p className="label">Client</p>
          <p className="mt-2 text-sm">
            {lead.contact_name ? maskName(lead.contact_name) : "Client"} ·
            email masked
          </p>
        </div>
      </div>

      <div className="mt-6">
        <LeadResponseForm
          requestId={lead.id}
          urgency={lead.urgency}
          cost={cost}
          proCredits={proCredits}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 border-t border-ink-700 pt-4">
        <Link href="/pros/responses" className="btn-outline">
          View pipeline
        </Link>
        <Link
          href="/pros/billing?tab=credits"
          className="text-sm text-ink-400 hover:text-amber-accent self-center"
        >
          {proCredits} credits available — top up
        </Link>
      </div>

      <hr className="my-8 border-ink-700" />

      <p className="label">Highlights</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {lead.urgency === "urgent" && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-400 bg-red-100 px-2.5 py-0.5 text-red-900">
            <CheckCircle2 className="h-3 w-3" />
            Urgent
          </span>
        )}
        <span className="pill">High hiring intent</span>
        <span className="pill">Verified phone</span>
        {lead.details?.description && (
          <span className="pill">Detailed brief</span>
        )}
      </div>

      <p className="label mt-6">Details</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
        {lead.details?.description ?? (
          <span className="italic text-ink-400">
            <X className="inline h-3.5 w-3.5" /> Awaiting more information from
            the client.
          </span>
        )}
      </p>
    </div>
  );
}
