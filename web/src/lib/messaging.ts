import "server-only";
import { createServerClient } from "./insforge";

export type Conversation = {
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

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

/**
 * Find or create the conversation tied to a response. Caller must be one
 * of the two participants — RLS enforces this on insert/select.
 */
export async function ensureConversation(
  accessToken: string,
  opts: {
    buyerId: string;
    proId: string;
    requestId: string | null;
    responseId: string | null;
  }
): Promise<Conversation | null> {
  const insforge = createServerClient(accessToken);

  let q = insforge.database
    .from("conversations")
    .select("*")
    .eq("buyer_id", opts.buyerId)
    .eq("pro_id", opts.proId);

  // Match the unique-key shape exactly: response_id is part of the
  // uniqueness constraint, so include it (or its null) in the lookup.
  if (opts.responseId) q = q.eq("response_id", opts.responseId);
  else q = q.is("response_id", null);

  const existing = await q.maybeSingle();
  if (existing.data) return existing.data as Conversation;

  const ins = await insforge.database
    .from("conversations")
    .insert([
      {
        buyer_id: opts.buyerId,
        pro_id: opts.proId,
        request_id: opts.requestId,
        response_id: opts.responseId,
      },
    ])
    .select("*")
    .maybeSingle();
  if (ins.error) {
    // Handle the rare race where two concurrent requests both insert.
    if (ins.error.message?.toLowerCase().includes("unique")) {
      const retry = await q.maybeSingle();
      return (retry.data as Conversation) ?? null;
    }
    console.error("[messaging] conversation insert failed:", ins.error);
    return null;
  }
  return ins.data as Conversation;
}

export async function totalUnread(
  accessToken: string,
  userId: string
): Promise<number> {
  const insforge = createServerClient(accessToken);
  const res = await insforge.database
    .from("conversations")
    .select("buyer_id, pro_id, unread_for_buyer, unread_for_pro")
    .or(`buyer_id.eq.${userId},pro_id.eq.${userId}`)
    .limit(500);
  const rows = (res.data ?? []) as {
    buyer_id: string;
    pro_id: string;
    unread_for_buyer: number;
    unread_for_pro: number;
  }[];
  return rows.reduce((acc, r) => {
    if (r.buyer_id === userId) return acc + (r.unread_for_buyer ?? 0);
    if (r.pro_id === userId) return acc + (r.unread_for_pro ?? 0);
    return acc;
  }, 0);
}
