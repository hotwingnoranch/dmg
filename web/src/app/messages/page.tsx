import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
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
  last_message_at: string | null;
  unread_for_buyer: number;
  unread_for_pro: number;
  created_at: string;
};

type LastMessageRow = {
  conversation_id: string;
  body: string;
  sender_id: string;
  created_at: string;
};

type ProRow = {
  id: string;
  company_name: string;
  slug: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type RequestRow = {
  id: string;
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

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const isAdmin = await isAdminEmail(user.email);
  const unread = await totalUnread(token!, user.id).catch(() => 0);

  const convsRes = await insforge.database
    .from("conversations")
    .select("*")
    .or(`buyer_id.eq.${user.id},pro_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(100);
  const conversations = (convsRes.data ?? []) as ConversationRow[];

  // Resolve counterpart names + last messages in batches.
  const proIds = Array.from(
    new Set(
      conversations
        .filter((c) => c.buyer_id === user.id)
        .map((c) => c.pro_id)
    )
  );
  const buyerIds = Array.from(
    new Set(
      conversations
        .filter((c) => c.pro_id === user.id)
        .map((c) => c.buyer_id)
    )
  );
  const requestIds = Array.from(
    new Set(conversations.map((c) => c.request_id).filter((x): x is string => !!x))
  );

  const [prosRes, profilesRes, requestsRes] = await Promise.all([
    proIds.length === 0
      ? Promise.resolve({ data: [] as ProRow[] })
      : insforge.database
          .from("pros")
          .select("id, company_name, slug")
          .in("id", proIds),
    buyerIds.length === 0
      ? Promise.resolve({ data: [] as ProfileRow[] })
      : insforge.database
          .from("profiles")
          .select("id, full_name")
          .in("id", buyerIds),
    requestIds.length === 0
      ? Promise.resolve({ data: [] as RequestRow[] })
      : insforge.database
          .from("requests")
          .select("id, service_categories(name, slug)")
          .in("id", requestIds),
  ]);

  const proMap = new Map<string, ProRow>(
    ((prosRes.data ?? []) as ProRow[]).map((p) => [p.id, p])
  );
  const profileMap = new Map<string, ProfileRow>(
    ((profilesRes.data ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );
  const requestMap = new Map<string, RequestRow>(
    ((requestsRes.data ?? []) as unknown as RequestRow[]).map((r) => [r.id, r])
  );

  // Pull the most recent message per conversation. Single query then group.
  const convIds = conversations.map((c) => c.id);
  const lastsRes =
    convIds.length === 0
      ? { data: [] as LastMessageRow[] }
      : await insforge.database
          .from("messages")
          .select("conversation_id, body, sender_id, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
          .limit(500);
  const lastByConv = new Map<string, LastMessageRow>();
  for (const m of (lastsRes.data ?? []) as LastMessageRow[]) {
    if (!lastByConv.has(m.conversation_id)) {
      lastByConv.set(m.conversation_id, m);
    }
  }

  return (
    <>
      <Header user={user} isAdmin={isAdmin} unreadMessages={unread} variant="solid" />
      <main className="container-page py-10">
        <div>
          <p className="eyebrow">Messages</p>
          <h1 className="display-h2 mt-2">Inbox</h1>
          <p className="mt-2 text-sm text-ink-300">
            Real-time conversations with the people you&apos;re working with.
          </p>
        </div>

        {conversations.length === 0 ? (
          <div className="mt-10 grid place-items-center rounded-2xl border border-ink-700 bg-white p-14 text-center">
            <MessageSquare className="h-8 w-8 text-amber-accent" />
            <p className="mt-3 font-display text-xl font-bold">
              No conversations yet
            </p>
            <p className="mt-2 max-w-md text-sm text-ink-300">
              When a pro responds to a request, you&apos;ll be able to message
              them directly here.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3">
            {conversations.map((c) => {
              const isBuyer = c.buyer_id === user.id;
              const counterpart = isBuyer
                ? proMap.get(c.pro_id)?.company_name ?? "Pro"
                : profileMap.get(c.buyer_id)?.full_name ?? "Buyer";
              const unread = isBuyer ? c.unread_for_buyer : c.unread_for_pro;
              const last = lastByConv.get(c.id);
              const requestName = c.request_id
                ? pickCategoryName(requestMap.get(c.request_id)?.service_categories ?? null)
                : null;

              return (
                <li key={c.id}>
                  <Link
                    href={`/messages/${c.id}`}
                    className={`flex items-start justify-between gap-4 rounded-xl border bg-white p-4 transition hover:border-amber-accent ${
                      unread > 0
                        ? "border-amber-accent"
                        : "border-ink-700"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 flex-none place-items-center rounded-full bg-navy-900 font-display text-sm font-bold text-amber-glow">
                        {counterpart.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {counterpart}{" "}
                          {requestName && (
                            <span className="ml-2 text-[11px] uppercase tracking-[0.18em] text-ink-400">
                              · {requestName}
                            </span>
                          )}
                        </p>
                        {last ? (
                          <p className="truncate text-sm text-ink-300">
                            {last.sender_id === user.id ? "You: " : ""}
                            {last.body}
                          </p>
                        ) : (
                          <p className="text-sm italic text-ink-400">
                            No messages yet — say hello.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 text-right">
                      {c.last_message_at && (
                        <span className="text-[11px] text-ink-400">
                          {new Date(c.last_message_at).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      )}
                      {unread > 0 && (
                        <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-accent px-1.5 text-[10px] font-bold text-white">
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Footer />
    </>
  );
}
