import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChatPanel, type ChatMessage } from "@/components/ChatPanel";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { totalUnread } from "@/lib/messaging";

type ConversationRow = {
  id: string;
  buyer_id: string;
  pro_id: string;
  request_id: string | null;
  response_id: string | null;
  created_at: string;
};

type RequestRow = {
  id: string;
  city: string | null;
  state: string | null;
  zip_code: string;
  service_categories:
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
};

function pickCategoryName(rel: RequestRow["service_categories"]): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name;
}

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/messages/${id}`);
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const isAdmin = await isAdminEmail(user.email);
  const unread = await totalUnread(token!, user.id).catch(() => 0);

  const convRes = await insforge.database
    .from("conversations")
    .select("id, buyer_id, pro_id, request_id, response_id, created_at")
    .eq("id", id)
    .maybeSingle();
  const conv = convRes.data as ConversationRow | null;
  if (!conv) notFound();

  const isBuyer = conv.buyer_id === user.id;

  const [proRes, profileRes, requestRes, messagesRes] = await Promise.all([
    insforge.database
      .from("pros")
      .select("id, company_name, slug")
      .eq("id", conv.pro_id)
      .maybeSingle(),
    insforge.database
      .from("profiles")
      .select("id, full_name")
      .eq("id", conv.buyer_id)
      .maybeSingle(),
    conv.request_id
      ? insforge.database
          .from("requests")
          .select(
            "id, city, state, zip_code, service_categories(name, slug)"
          )
          .eq("id", conv.request_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    insforge.database
      .from("messages")
      .select("id, conversation_id, sender_id, body, read_at, created_at")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);

  const pro = proRes.data as
    | { id: string; company_name: string; slug: string }
    | null;
  const buyerProfile = profileRes.data as
    | { id: string; full_name: string | null }
    | null;
  const request = (requestRes.data ?? null) as RequestRow | null;
  const initialMessages = (messagesRes.data ?? []) as ChatMessage[];

  const counterpartName = isBuyer
    ? pro?.company_name ?? "Pro"
    : buyerProfile?.full_name ?? "Buyer";
  const requestName = pickCategoryName(request?.service_categories ?? null);
  const where = request
    ? `${request.city ? `${request.city}, ` : ""}${request.state ?? ""} ${request.zip_code}`.trim()
    : null;

  const contextLine = [requestName, where].filter(Boolean).join(" · ") || undefined;

  return (
    <>
      <Header user={user} isAdmin={isAdmin} unreadMessages={unread} variant="solid" />
      <main className="container-page py-10">
        <Link
          href="/messages"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-ink-400 hover:text-amber-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inbox
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <ChatPanel
            conversationId={conv.id}
            currentUserId={user.id}
            counterpartName={counterpartName}
            contextLine={contextLine}
            initialMessages={initialMessages}
          />

          <aside className="grid gap-4 self-start">
            <section className="card-elev p-5">
              <p className="eyebrow">About</p>
              <p className="mt-2 font-display text-base font-bold">
                {counterpartName}
              </p>
              {requestName && (
                <p className="mt-1 text-sm text-ink-300">{requestName}</p>
              )}
              {where && (
                <p className="text-xs text-ink-400">{where}</p>
              )}
              <hr className="my-4 border-ink-700" />
              {isBuyer && pro && (
                <Link
                  href={`/pros/profile/${pro.slug}`}
                  className="btn-outline w-full"
                >
                  View pro profile
                </Link>
              )}
              {!isBuyer && conv.response_id && (
                <Link
                  href={`/pros/responses/${conv.response_id}`}
                  className="btn-outline w-full"
                >
                  Open response
                </Link>
              )}
              {isBuyer && conv.request_id && (
                <Link
                  href={`/buyer/requests/${conv.request_id}`}
                  className="btn-ghost mt-2 w-full"
                >
                  Open request
                </Link>
              )}
            </section>

            <section className="rounded-2xl border border-ink-700 bg-ink-900 p-5 text-xs text-ink-300">
              <p className="font-medium text-ink-100">Tips</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Messages deliver instantly to both sides.</li>
                <li>Press Enter to send · Shift+Enter for a new line.</li>
                <li>
                  Don&apos;t share payment details here — keep money flowing
                  through Vanguard.
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
