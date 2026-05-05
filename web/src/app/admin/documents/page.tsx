import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";
import { verifyDocumentAction, rejectDocumentAction } from "./actions";

type DocRow = {
  id: string;
  pro_id: string;
  kind: "license" | "insurance" | "coi" | "certification" | "other";
  storage_key: string;
  file_name: string;
  mime: string | null;
  size_bytes: number | null;
  expires_at: string | null;
  status: "pending" | "verified" | "rejected";
  reviewer_id: string | null;
  reviewed_at: string | null;
  notes: string | null;
  created_at: string;
};

type ProMini = {
  id: string;
  company_name: string;
  slug: string;
  contact_email: string | null;
};

const KIND_LABEL: Record<DocRow["kind"], string> = {
  license: "License",
  insurance: "Insurance",
  coi: "COI",
  certification: "Certification",
  other: "Other",
};

const DOC_MSG: Record<string, { tone: "ok" | "err"; text: string }> = {
  verified: { tone: "ok", text: "Document marked verified." },
  rejected: { tone: "ok", text: "Document marked rejected." },
  missing_id: { tone: "err", text: "Missing document id." },
  not_found: { tone: "err", text: "Document not found." },
  update_failed: { tone: "err", text: "Could not update document." },
};

function formatBytes(n: number | null) {
  if (!n || n <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 ? 1 : 0)} ${units[i]}`;
}

export default async function AdminDocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ doc_msg?: string; status?: string }>;
}) {
  const me = await requireAdmin();
  const params = await searchParams;
  const filter = params.status === "all" ? "all" : params.status === "reviewed" ? "reviewed" : "pending";
  const msg = params.doc_msg ? DOC_MSG[params.doc_msg] : null;

  const admin = createAdminClient();

  let docsQ = admin.database
    .from("pro_documents")
    .select(
      "id, pro_id, kind, storage_key, file_name, mime, size_bytes, expires_at, status, reviewer_id, reviewed_at, notes, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (filter === "pending") docsQ = docsQ.eq("status", "pending");
  else if (filter === "reviewed") docsQ = docsQ.in("status", ["verified", "rejected"]);

  const docsRes = await docsQ;
  const docs = (docsRes.data ?? []) as DocRow[];

  // Counts (separate cheap queries — small numbers).
  const [pendingCount, verifiedCount, rejectedCount] = await Promise.all([
    admin.database
      .from("pro_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin.database
      .from("pro_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified"),
    admin.database
      .from("pro_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected"),
  ]);

  // Resolve unique pro_ids → company_name + slug.
  const proIds = Array.from(new Set(docs.map((d) => d.pro_id)));
  const prosRes =
    proIds.length === 0
      ? { data: [] as ProMini[] }
      : await admin.database
          .from("pros")
          .select("id, company_name, slug, contact_email")
          .in("id", proIds);
  const proMap = new Map<string, ProMini>(
    ((prosRes.data ?? []) as ProMini[]).map((p) => [p.id, p])
  );

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
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Verification queue</p>
            <h1 className="display-h2 mt-2">Pro documents</h1>
            <p className="mt-2 text-sm text-ink-300">
              Review uploaded licenses, insurance and certifications. Verified
              documents unlock public badges on a pro&apos;s profile.
            </p>
          </div>
          <nav className="flex gap-2 text-sm">
            <FilterTab href="/admin/documents" active={filter === "pending"} label={`Pending · ${pendingCount.count ?? 0}`} />
            <FilterTab href="/admin/documents?status=reviewed" active={filter === "reviewed"} label={`Reviewed · ${(verifiedCount.count ?? 0) + (rejectedCount.count ?? 0)}`} />
            <FilterTab href="/admin/documents?status=all" active={filter === "all"} label="All" />
          </nav>
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
        <section className="grid gap-4 sm:grid-cols-3">
          <Stat
            label="Pending"
            value={pendingCount.count ?? 0}
            icon={<Clock className="h-4 w-4" />}
            tone="warn"
          />
          <Stat
            label="Verified"
            value={verifiedCount.count ?? 0}
            icon={<CheckCircle2 className="h-4 w-4" />}
            tone="ok"
          />
          <Stat
            label="Rejected"
            value={rejectedCount.count ?? 0}
            icon={<XCircle className="h-4 w-4" />}
            tone="err"
          />
        </section>

        {/* List */}
        <section className="mt-8 grid gap-3">
          {docs.length === 0 ? (
            <div className="card-elev p-10 text-center text-sm text-ink-300">
              <ShieldCheck className="mx-auto h-8 w-8 text-amber-accent" />
              <p className="mt-3 font-display text-xl font-bold">
                Nothing in this queue.
              </p>
              <p className="mt-1 text-ink-400">
                You&apos;re all caught up.
              </p>
            </div>
          ) : (
            docs.map((d) => {
              const pro = proMap.get(d.pro_id);
              return <DocCard key={d.id} doc={d} pro={pro ?? null} />;
            })
          )}
        </section>
      </main>
    </div>
  );
}

function DocCard({ doc, pro }: { doc: DocRow; pro: ProMini | null }) {
  const expired =
    doc.expires_at && new Date(doc.expires_at).getTime() < Date.now();

  return (
    <article className="card-elev p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-ink-900 text-amber-accent">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {doc.file_name}{" "}
              <span className="ml-2 inline-block rounded-full border border-ink-600 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-ink-300">
                {KIND_LABEL[doc.kind]}
              </span>
            </p>
            <p className="text-xs text-ink-300">
              {pro ? (
                <Link
                  href={`/admin/pros/${pro.id}`}
                  className="hover:text-amber-accent"
                >
                  {pro.company_name}
                </Link>
              ) : (
                <span className="text-ink-500">unknown pro</span>
              )}{" "}
              · {formatBytes(doc.size_bytes)} · uploaded{" "}
              {new Date(doc.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {doc.expires_at && (
                <>
                  {" · "}
                  <span className={expired ? "text-red-900" : ""}>
                    {expired ? "expired " : "expires "}
                    {new Date(doc.expires_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </>
              )}
            </p>
            {doc.notes && (
              <p className="mt-1 text-xs text-ink-300">
                <span className="font-medium">Note:</span> {doc.notes}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/admin/documents/${doc.id}/download`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 px-3 py-1.5 text-xs text-ink-200 hover:border-amber-accent hover:text-amber-accent"
          >
            <Download className="h-3.5 w-3.5" />
            View file
          </a>
          <StatusPill status={doc.status} />
        </div>
      </div>

      {doc.status === "pending" && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-ink-700 pt-4">
          <form action={verifyDocumentAction}>
            <input type="hidden" name="id" value={doc.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </button>
          </form>
          <form action={rejectDocumentAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={doc.id} />
            <input
              type="text"
              name="notes"
              maxLength={300}
              placeholder="Reason for rejection (optional)"
              className="input w-72 max-w-full text-xs"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-400 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </form>
        </div>
      )}

      {doc.status !== "pending" && (
        <p className="mt-3 text-[11px] text-ink-400">
          Reviewed{" "}
          {doc.reviewed_at
            ? new Date(doc.reviewed_at).toLocaleString()
            : "—"}
        </p>
      )}
    </article>
  );
}

function StatusPill({ status }: { status: DocRow["status"] }) {
  const map = {
    verified: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      cls: "border-emerald-400 bg-emerald-100 text-emerald-900",
      label: "Verified",
    },
    pending: {
      icon: <Clock className="h-3.5 w-3.5" />,
      cls: "border-amber-accent/30 bg-amber-accent/10 text-amber-accent",
      label: "Pending",
    },
    rejected: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      cls: "border-red-400 bg-red-100 text-red-900",
      label: "Rejected",
    },
  } as const;
  const m = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${m.cls}`}
    >
      {m.icon}
      {m.label}
    </span>
  );
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "ok" | "warn" | "err";
}) {
  const accent =
    tone === "ok"
      ? "border-emerald-400 bg-emerald-50"
      : tone === "warn"
        ? "border-amber-accent/30 bg-amber-accent/5"
        : "border-red-300 bg-red-50";
  const labelColor =
    tone === "ok"
      ? "text-emerald-900"
      : tone === "warn"
        ? "text-amber-accent"
        : "text-red-900";
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
    </article>
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
