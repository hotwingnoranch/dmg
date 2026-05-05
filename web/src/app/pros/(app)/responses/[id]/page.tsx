import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock3,
  DollarSign,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  StickyNote,
  X,
} from "lucide-react";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { ensureConversation } from "@/lib/messaging";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";

type ResponseRow = {
  id: string;
  status: string;
  message: string | null;
  estimate_amount: number | null;
  credits_spent: number;
  created_at: string;
  updated_at: string;
  request_id: string;
  pro_id: string;
};

type RequestRow = {
  id: string;
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

type ActivityRow = {
  id: string;
  kind: string;
  body: string | null;
  created_at: string;
  actor_id: string;
};

const ACTIVITY_LABEL: Record<string, { label: string; tone: string }> = {
  call_no_answer: {
    label: "Called, no answer",
    tone: "border-amber-accent/30 bg-amber-accent/10 text-amber-accent",
  },
  call_spoke: {
    label: "Called, spoke",
    tone: "border-emerald-400 bg-emerald-100 text-emerald-900",
  },
  email_sent: {
    label: "Email sent",
    tone: "border-emerald-400 bg-emerald-100 text-emerald-900",
  },
  sms_sent: {
    label: "SMS sent",
    tone: "border-emerald-400 bg-emerald-100 text-emerald-900",
  },
  note: {
    label: "Note",
    tone: "border-ink-600 bg-ink-900 text-ink-200",
  },
  reminder: {
    label: "Reminder",
    tone: "border-amber-accent/30 bg-amber-accent/10 text-amber-accent",
  },
};

function pickCategory(
  rel: RequestRow["service_categories"]
): { name: string; slug: string } | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel;
}

export default async function ProResponseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/pros/responses/${id}`);
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // RLS: responses_pro_read enforces auth.uid() === pro_id, so this returns
  // null if the response doesn't belong to the current pro.
  const respRes = await insforge.database
    .from("responses")
    .select(
      "id, status, message, estimate_amount, credits_spent, created_at, updated_at, request_id, pro_id"
    )
    .eq("id", id)
    .maybeSingle();
  const response = respRes.data as ResponseRow | null;
  if (!response) notFound();

  const [reqRes, actsRes] = await Promise.all([
    insforge.database
      .from("requests")
      .select(
        "id, buyer_id, zip_code, city, state, status, urgency, budget_band, start_date, duration_text, details, contact_name, contact_phone, contact_email, created_at, service_categories(name, slug)"
      )
      .eq("id", response.request_id)
      .maybeSingle(),
    insforge.database
      .from("response_activity")
      .select("id, kind, body, created_at, actor_id")
      .eq("response_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  const request = reqRes.data as (RequestRow & { buyer_id: string }) | null;
  const activity = (actsRes.data ?? []) as ActivityRow[];

  if (!request) notFound();

  // Open or create the chat thread tied to this response, then prefetch
  // the message history so the client-side ChatPanel renders instantly.
  const conversation = await ensureConversation(token!, {
    buyerId: request.buyer_id,
    proId: response.pro_id,
    requestId: response.request_id,
    responseId: response.id,
  });
  let initialMessages: ChatMessage[] = [];
  if (conversation) {
    const msgs = await insforge.database
      .from("messages")
      .select("id, conversation_id, sender_id, body, read_at, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);
    initialMessages = (msgs.data ?? []) as ChatMessage[];
  }
  const buyerName = request.contact_name?.split(" ")[0] ?? "Client";

  const cat = pickCategory(request.service_categories);
  const where = `${request.city ? `${request.city}, ` : ""}${request.state ?? ""} ${request.zip_code}`.trim();

  return (
    <div className="grid gap-8">
      <div>
        <Link
          href="/pros/responses"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-amber-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          My responses
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Response detail</p>
            <h1 className="display-h2 mt-2">
              {request.contact_name?.split(" ")[0] ?? "Client"} · {cat?.name ?? "Lead"}
            </h1>
            <p className="mt-1 text-sm text-ink-300">
              {where} · responded{" "}
              {new Date(response.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium ${
              response.status === "hired"
                ? "border-emerald-400 bg-emerald-100 text-emerald-900"
                : response.status === "declined"
                  ? "border-ink-600 bg-ink-900 text-ink-300"
                  : response.status === "expired"
                    ? "border-red-400 bg-red-100 text-red-900"
                    : "border-amber-accent bg-amber-accent/10 text-amber-accent"
            }`}
          >
            {response.status}
          </span>
        </div>
      </div>

      {/* Two-column: lead detail / contact + activity timeline */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* LEFT: lead + contact */}
        <aside className="grid gap-4 self-start">
          <Card title="Lead details">
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
                    ? "Urgent (24–48 hrs)"
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
            <Card title="Buyer's notes">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                {request.details.description}
              </p>
            </Card>
          )}

          <Card title="Contact">
            <ul className="grid gap-2 text-sm">
              {request.contact_name && (
                <li className="text-ink-200">{request.contact_name}</li>
              )}
              {request.contact_email && (
                <li className="inline-flex items-center gap-2 text-ink-200">
                  <Mail className="h-4 w-4 text-ink-400" />
                  <a
                    href={`mailto:${request.contact_email}`}
                    className="font-mono text-xs hover:text-amber-accent"
                  >
                    {request.contact_email}
                  </a>
                </li>
              )}
              {request.contact_phone && (
                <li className="inline-flex items-center gap-2 text-ink-200">
                  <Phone className="h-4 w-4 text-ink-400" />
                  <a
                    href={`tel:${request.contact_phone.replace(/\D/g, "")}`}
                    className="font-mono text-xs hover:text-amber-accent"
                  >
                    {request.contact_phone}
                  </a>
                </li>
              )}
            </ul>
            <p className="mt-3 text-[11px] text-ink-400">
              Buyer&apos;s contact details — they&apos;ve agreed to be reached
              about this request.
            </p>
          </Card>

          <Card title="Your spend">
            <ul className="grid gap-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-ink-300">Credits spent</span>
                <span className="font-mono">{response.credits_spent}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-ink-300">Estimate</span>
                <span className="font-mono">
                  {response.estimate_amount != null
                    ? `$${Number(response.estimate_amount).toFixed(0)}`
                    : "—"}
                </span>
              </li>
              <li className="flex items-center justify-between border-t border-ink-700 pt-2">
                <span className="text-ink-300">Last update</span>
                <span className="text-xs text-ink-400">
                  {new Date(response.updated_at).toLocaleString()}
                </span>
              </li>
            </ul>
          </Card>
        </aside>

        {/* RIGHT: response message + activity timeline */}
        <div className="grid gap-6 self-start">
          <section className="card-elev p-6">
            <p className="eyebrow">Your message</p>
            {response.message ? (
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-200">
                {response.message}
              </p>
            ) : (
              <p className="mt-3 text-sm italic text-ink-400">
                No message yet — leave one to introduce your team.
              </p>
            )}
          </section>

          {conversation && (
            <div>
              <p className="eyebrow mb-3">Chat with {buyerName}</p>
              <ChatPanel
                conversationId={conversation.id}
                currentUserId={user.id}
                counterpartName={buyerName}
                contextLine={`${cat?.name ?? "Lead"} · ${where}`}
                initialMessages={initialMessages}
                emptyHint={`Send the first message to ${buyerName} — replies notify in real time.`}
              />
            </div>
          )}

          <section className="card-elev p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Activity timeline</p>
                <h2 className="font-display text-xl font-bold mt-2">
                  {activity.length === 0
                    ? "No activity yet"
                    : `${activity.length} event${activity.length === 1 ? "" : "s"}`}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <ActionStub icon={<Phone className="h-3.5 w-3.5" />} label="Log call" />
                <ActionStub icon={<MessageSquare className="h-3.5 w-3.5" />} label="Log email" />
                <ActionStub icon={<StickyNote className="h-3.5 w-3.5" />} label="Add note" />
              </div>
            </div>

            {activity.length === 0 ? (
              <p className="mt-6 text-sm text-ink-400">
                Log calls, emails, and notes here to keep your pipeline tight.
                Activity entries are private to you.
              </p>
            ) : (
              <ol className="mt-6 grid gap-4">
                {activity.map((a) => {
                  const meta = ACTIVITY_LABEL[a.kind] ?? {
                    label: a.kind,
                    tone: "border-ink-600 bg-ink-900 text-ink-200",
                  };
                  return (
                    <li key={a.id} className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 flex-none rounded-full bg-amber-accent" />
                      <div className="flex-1 border-l border-ink-700 pb-3 pl-4 last:border-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] ${meta.tone}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-xs text-ink-400">
                            {new Date(a.created_at).toLocaleString()}
                          </span>
                        </div>
                        {a.body && (
                          <p className="mt-2 text-sm text-ink-200">{a.body}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Status panel */}
          <section className="card-elev p-6">
            <p className="eyebrow">Status</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <StatusPill
                active={response.status === "pending"}
                icon={<Clock3 className="h-4 w-4" />}
                label="Pending"
              />
              <StatusPill
                active={response.status === "hired"}
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Hired"
              />
              <StatusPill
                active={response.status === "declined" || response.status === "expired"}
                icon={<X className="h-4 w-4" />}
                label="Closed"
              />
            </div>
            <p className="mt-3 text-xs text-ink-400">
              Status changes are driven by the buyer hiring you (or
              another team) and by the response expiring after 14 days of no
              activity.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

// =================================================================== atoms

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

function ActionStub({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="inline-flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-900 px-2.5 py-1 text-[11px] text-ink-300 opacity-70"
    >
      {icon}
      {label}
    </button>
  );
}

function StatusPill({
  active,
  icon,
  label,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${
        active
          ? "border-amber-accent bg-amber-accent/10 text-amber-accent"
          : "border-ink-700 bg-ink-900 text-ink-300"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </div>
  );
}
