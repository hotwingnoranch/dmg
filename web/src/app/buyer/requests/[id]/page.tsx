import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock3,
  DollarSign,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Star,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { openConversationFromResponseAction } from "@/app/messages/actions";
import { totalUnread } from "@/lib/messaging";

type RequestRow = {
  id: string;
  buyer_id: string;
  zip_code: string;
  city: string | null;
  state: string | null;
  status: string;
  urgency: string;
  budget_band: string | null;
  start_date: string | null;
  duration_text: string | null;
  details: { description?: string } | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  created_at: string;
  service_categories:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
};

type ResponseRow = {
  id: string;
  status: string;
  message: string | null;
  estimate_amount: number | null;
  created_at: string;
  pros:
    | {
        id: string;
        slug: string;
        company_name: string;
        tagline: string | null;
        rating_avg: number | string | null;
        review_count: number;
        is_elite: boolean;
      }
    | {
        id: string;
        slug: string;
        company_name: string;
        tagline: string | null;
        rating_avg: number | string | null;
        review_count: number;
        is_elite: boolean;
      }[]
    | null;
};

const STATUS_TONE: Record<
  string,
  { label: string; tone: string; description: string }
> = {
  open: {
    label: "Awaiting matches",
    tone: "border-amber-accent bg-amber-accent/10 text-amber-accent",
    description:
      "We're routing this to vetted security teams in your area. Expect outreach within an hour.",
  },
  matched: {
    label: "Quotes received",
    tone: "border-emerald-400 bg-emerald-100 text-emerald-900",
    description:
      "Pros have responded. Compare credentials and hire the best fit.",
  },
  closed: {
    label: "Closed",
    tone: "border-ink-600 bg-ink-900 text-ink-300",
    description: "This request is closed.",
  },
  cancelled: {
    label: "Cancelled",
    tone: "border-ink-600 bg-ink-900 text-ink-300",
    description: "You cancelled this request.",
  },
};

function pickCategory(
  rel: RequestRow["service_categories"]
): { name: string; slug: string } | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

function pickPro(
  rel: ResponseRow["pros"]
): {
  id: string;
  slug: string;
  company_name: string;
  tagline: string | null;
  rating_avg: number | string | null;
  review_count: number;
  is_elite: boolean;
} | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

export default async function BuyerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/buyer/requests/${id}`);
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // RLS already enforces buyer_id = auth.uid(), so this returns null for
  // requests that don't belong to the current user.
  const reqRes = await insforge.database
    .from("requests")
    .select(
      "id, buyer_id, zip_code, city, state, status, urgency, budget_band, start_date, duration_text, details, contact_name, contact_phone, contact_email, created_at, service_categories(name, slug)"
    )
    .eq("id", id)
    .maybeSingle();
  const request = reqRes.data as RequestRow | null;
  if (!request) notFound();

  const responsesRes = await insforge.database
    .from("responses")
    .select(
      "id, status, message, estimate_amount, created_at, pros(id, slug, company_name, tagline, rating_avg, review_count, is_elite)"
    )
    .eq("request_id", id)
    .order("created_at", { ascending: false });
  const responses = (responsesRes.data ?? []) as unknown as ResponseRow[];

  const isAdmin = await isAdminEmail(user.email);
  const unread = await totalUnread(token!, user.id).catch(() => 0);
  const cat = pickCategory(request.service_categories);
  const tone = STATUS_TONE[request.status] ?? STATUS_TONE.open;
  const where = `${request.city ? `${request.city}, ` : ""}${request.state ?? ""} ${request.zip_code}`.trim();
  const hiredCount = responses.filter((r) => r.status === "hired").length;
  const pendingCount = responses.filter((r) => r.status === "pending").length;

  return (
    <>
      <Header user={user} isAdmin={isAdmin} unreadMessages={unread} variant="solid" />
      <main className="container-page py-10">
        <Link
          href="/buyer/dashboard"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-amber-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My requests
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Request detail</p>
            <h1 className="display-h2 mt-2">{cat?.name ?? "Security request"}</h1>
            <p className="mt-1 text-sm text-ink-300">
              {where} · placed{" "}
              {new Date(request.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${tone.tone}`}
          >
            {tone.label}
          </span>
        </div>

        {/* STATUS BANNER */}
        <div className="mt-6 rounded-2xl border border-ink-600 bg-white p-5 shadow-card">
          <p className="text-sm text-ink-200">{tone.description}</p>
        </div>

        {/* DETAIL + RESPONSES */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* LEFT: details */}
          <aside className="grid gap-4 self-start">
            <Card title="Details">
              <ul className="grid gap-3 text-sm">
                <Detail
                  icon={<MapPin className="h-4 w-4" />}
                  label="Location"
                  value={where}
                />
                <Detail
                  icon={<Clock3 className="h-4 w-4" />}
                  label="Urgency"
                  value={
                    request.urgency === "urgent"
                      ? "Urgent (within 24–48 hrs)"
                      : request.urgency === "soon"
                        ? "Soon (within a week)"
                        : "Flexible (next few weeks)"
                  }
                />
                {request.start_date && (
                  <Detail
                    icon={<Calendar className="h-4 w-4" />}
                    label="Start date"
                    value={new Date(request.start_date).toLocaleDateString()}
                  />
                )}
                {request.duration_text && (
                  <Detail
                    icon={<Clock3 className="h-4 w-4" />}
                    label="Duration"
                    value={request.duration_text}
                  />
                )}
                {request.budget_band && (
                  <Detail
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Budget"
                    value={request.budget_band}
                  />
                )}
              </ul>
            </Card>

            {request.details?.description && (
              <Card title="Notes for pros">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                  {request.details.description}
                </p>
              </Card>
            )}

            <Card title="Your contact">
              <ul className="grid gap-2 text-sm">
                {request.contact_name && (
                  <li className="text-ink-200">{request.contact_name}</li>
                )}
                {request.contact_email && (
                  <li className="inline-flex items-center gap-2 text-ink-200">
                    <Mail className="h-4 w-4 text-ink-400" />
                    <span className="font-mono text-xs">
                      {request.contact_email}
                    </span>
                  </li>
                )}
                {request.contact_phone && (
                  <li className="inline-flex items-center gap-2 text-ink-200">
                    <Phone className="h-4 w-4 text-ink-400" />
                    <span className="font-mono text-xs">
                      {request.contact_phone}
                    </span>
                  </li>
                )}
                <li className="mt-1 text-xs text-ink-400">
                  Pros only see masked details until you respond.
                </li>
              </ul>
            </Card>
          </aside>

          {/* RIGHT: responses */}
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Responses</p>
                <h2 className="font-display text-2xl font-bold mt-2">
                  {responses.length === 0
                    ? "Awaiting first response"
                    : `${responses.length} ${responses.length === 1 ? "team has" : "teams have"} replied`}
                </h2>
              </div>
              <p className="text-xs text-ink-400">
                {pendingCount} pending · {hiredCount} hired
              </p>
            </div>

            {responses.length === 0 ? (
              <div className="card-elev grid place-items-center gap-2 p-10 text-center">
                <p className="font-display text-lg font-bold">
                  Pros are reviewing your request now.
                </p>
                <p className="max-w-md text-sm text-ink-300">
                  Most requests get their first response within an hour.
                  We&apos;ll email you the moment a pro replies.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3">
                {responses.map((r) => {
                  const pro = pickPro(r.pros);
                  if (!pro) return null;
                  const ratingNum =
                    pro.rating_avg == null
                      ? null
                      : typeof pro.rating_avg === "string"
                        ? parseFloat(pro.rating_avg)
                        : pro.rating_avg;
                  return (
                    <li
                      key={r.id}
                      className="card-elev grid gap-3 p-5 transition hover:border-amber-accent"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-12 w-12 flex-none place-items-center rounded-xl bg-navy-900 font-display text-lg font-bold text-amber-glow">
                            {pro.company_name.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <Link
                              href={`/pros/profile/${pro.slug}`}
                              className="font-display text-lg font-bold leading-tight hover:text-amber-accent"
                            >
                              {pro.company_name}
                              {pro.is_elite && (
                                <span className="ml-1.5 align-middle text-xs uppercase tracking-[0.18em] text-amber-accent">
                                  Elite
                                </span>
                              )}
                            </Link>
                            {pro.tagline && (
                              <p className="mt-0.5 text-sm text-ink-300">
                                {pro.tagline}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-400">
                              {ratingNum != null && ratingNum > 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Star className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" />
                                  <span className="font-medium text-ink-200">
                                    {ratingNum.toFixed(1)}
                                  </span>
                                  <span>({pro.review_count})</span>
                                </span>
                              )}
                              <span>
                                Replied{" "}
                                {new Date(r.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                            r.status === "hired"
                              ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                              : r.status === "declined"
                                ? "border-ink-600 bg-ink-900 text-ink-300"
                                : "border-amber-accent bg-amber-accent/10 text-amber-accent"
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      {r.message && (
                        <p className="rounded-xl border border-ink-700 bg-ink-900 p-3 text-sm text-ink-200">
                          {r.message}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink-700 pt-3 text-sm">
                        <span className="text-ink-300">
                          Estimate:{" "}
                          <span className="font-mono text-ink-50">
                            {r.estimate_amount != null
                              ? `$${Number(r.estimate_amount).toFixed(0)}`
                              : "—"}
                          </span>
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={openConversationFromResponseAction}>
                            <input type="hidden" name="response_id" value={r.id} />
                            <button type="submit" className="btn-primary">
                              <MessageSquare className="h-4 w-4" />
                              Message
                            </button>
                          </form>
                          <Link
                            href={`/pros/profile/${pro.slug}`}
                            className="btn-outline"
                          >
                            View profile
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {request.status === "open" && (
              <div className="mt-6 rounded-2xl border border-ink-600 bg-white p-5 shadow-card">
                <p className="text-sm text-ink-200">
                  Need to update or close this request?{" "}
                  <Link
                    href="/buyer/dashboard"
                    className="font-medium text-amber-accent hover:text-amber-deep"
                  >
                    Open dashboard
                  </Link>
                  .
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ============================================================ atoms ====

function Card({
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

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start justify-between gap-3 border-t border-ink-700 pt-3 first:border-0 first:pt-0">
      <span className="inline-flex items-center gap-2 text-ink-400">
        {icon}
        {label}
      </span>
      <span className="text-right text-ink-100">{value}</span>
    </li>
  );
}
