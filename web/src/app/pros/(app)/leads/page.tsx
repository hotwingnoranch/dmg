import Link from "next/link";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { Filter, Phone, Verified, Sparkles } from "lucide-react";

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

export default async function ProLeadsPage() {
  const user = await requireUser("/pros/leads");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // Pro's categories to filter by
  const myCats = await insforge.database
    .from("pro_services")
    .select("category_id")
    .eq("pro_id", user.id);

  const ids = (myCats.data ?? []).map((r) => r.category_id);

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
      .limit(50);
  } else {
    leadsRes = await insforge.database
      .from("requests")
      .select(
        "id, zip_code, city, state, urgency, status, created_at, contact_name, contact_phone, details, service_categories(name, slug)"
      )
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50);
  }

  const leads = (leadsRes.data ?? []) as unknown as Lead[];

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <aside className="card flex flex-col gap-3 p-5 lg:max-h-[70vh] lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-bold">{leads.length} leads</p>
            <p className="text-xs text-ink-300">Matching your services</p>
          </div>
          <button className="btn-ghost">
            <Filter className="h-4 w-4" />
            Filter
          </button>
        </div>

        <hr className="border-ink-50/5" />

        <ul className="grid gap-2">
          {leads.map((l) => (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                className="block rounded-xl border border-ink-50/5 bg-ink-800 p-4 transition hover:border-amber-accent/40"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{maskName(l.contact_name)}</p>
                    <p className="text-xs text-ink-300">
                      {l.city ? `${l.city}, ` : ""}
                      {l.state ?? ""} {l.zip_code}
                    </p>
                  </div>
                  <span className="text-xs text-ink-300">{timeAgo(l.created_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                  {l.urgency === "urgent" && (
                    <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-red-200">
                      Urgent
                    </span>
                  )}
                  <span className="rounded-full border border-amber-accent/30 bg-amber-accent/10 px-2 py-0.5 text-amber-accent">
                    High intent
                  </span>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-200">
                    Verified phone
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink-200">
                  {leadCategory(l)?.name} —{" "}
                  {l.details?.description ?? "Awaiting more details"}
                </p>
              </a>
            </li>
          ))}
          {leads.length === 0 && (
            <li className="rounded-xl border border-ink-50/5 bg-ink-800 p-6 text-center text-sm text-ink-300">
              No matching leads yet. We&apos;ll notify you the moment one
              arrives.
            </li>
          )}
        </ul>
      </aside>

      <section className="card p-6">
        {leads[0] ? (
          <LeadDetail lead={leads[0]} />
        ) : (
          <div className="grid place-items-center py-24 text-center">
            <Sparkles className="h-8 w-8 text-amber-accent" />
            <p className="mt-4 font-display text-2xl font-bold">
              You&apos;re all caught up.
            </p>
            <p className="mt-2 text-sm text-ink-300">
              We&apos;ll notify you when fresh leads in your area come in.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function LeadDetail({ lead }: { lead: Lead }) {
  return (
    <div>
      <p className="font-display text-2xl font-bold">
        {leadCategory(lead)?.name}
      </p>
      <p className="text-sm text-ink-300">
        {lead.city ? `${lead.city}, ` : ""}
        {lead.state ?? ""} {lead.zip_code} · {timeAgo(lead.created_at)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-ink-50/5 bg-ink-800 p-4">
          <p className="label">Verified phone</p>
          <p className="mt-2 inline-flex items-center gap-2 font-mono">
            <Phone className="h-4 w-4 text-amber-accent" />
            {maskPhone(lead.contact_phone)}
            <Verified className="h-4 w-4 text-emerald-300" />
          </p>
        </div>
        <div className="rounded-xl border border-ink-50/5 bg-ink-800 p-4">
          <p className="label">Email</p>
          <p className="mt-2 text-sm">{lead.contact_name ?? "—"} · masked</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button className="btn-primary">One-click response · 18 credits</button>
        <Link href="/pros/responses" className="btn-outline">
          View pipeline
        </Link>
        <button className="btn-ghost">Not interested</button>
      </div>

      <hr className="my-8 border-ink-50/5" />

      <p className="label">Highlights</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="pill">High hiring intent</span>
        <span className="pill">Verified phone</span>
        <span className="pill">Frequent client</span>
      </div>

      <p className="label mt-6">Details</p>
      <p className="mt-2 text-sm text-ink-200">
        {lead.details?.description ?? "Awaiting more information from the client."}
      </p>
    </div>
  );
}
