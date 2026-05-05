"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { ensureConversation } from "@/lib/messaging";

/**
 * Buyer side: from a response card on /buyer/requests/[id], open or
 * create the chat with that pro and redirect to /messages/[conv].
 */
export async function openConversationFromResponseAction(
  formData: FormData
): Promise<void> {
  const responseId = String(formData.get("response_id") ?? "");
  if (!responseId) redirect("/buyer/dashboard?msg=missing_response");

  const user = await requireUser("/buyer/dashboard");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // Pull buyer_id + pro_id off the response. RLS lets a buyer read any
  // response on their own request; the pro can also read their own.
  const respRes = await insforge.database
    .from("responses")
    .select("id, request_id, pro_id, requests(buyer_id)")
    .eq("id", responseId)
    .maybeSingle();
  const resp = respRes.data as
    | {
        id: string;
        request_id: string;
        pro_id: string;
        requests: { buyer_id: string } | { buyer_id: string }[] | null;
      }
    | null;
  if (!resp) redirect("/buyer/dashboard?msg=not_found");

  const buyerId = Array.isArray(resp.requests)
    ? resp.requests[0]?.buyer_id
    : resp.requests?.buyer_id;
  if (!buyerId) redirect("/buyer/dashboard?msg=not_found");

  if (user.id !== buyerId && user.id !== resp.pro_id) {
    redirect("/buyer/dashboard?msg=forbidden");
  }

  const conv = await ensureConversation(token!, {
    buyerId,
    proId: resp.pro_id,
    requestId: resp.request_id,
    responseId: resp.id,
  });
  if (!conv) redirect("/buyer/dashboard?msg=open_failed");

  redirect(`/messages/${conv.id}`);
}

export async function sendMessageAction(formData: FormData): Promise<void> {
  const convId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!convId || !body) return;
  if (body.length > 4000) return;

  const user = await requireUser(`/messages/${convId}`);
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const ins = await insforge.database.from("messages").insert([
    {
      conversation_id: convId,
      sender_id: user.id,
      body,
    },
  ]);
  if (ins.error) {
    console.error("[messaging] send failed:", ins.error);
    return;
  }

  revalidatePath(`/messages/${convId}`);
  revalidatePath("/messages");
}

export async function markReadAction(formData: FormData): Promise<void> {
  const convId = String(formData.get("conversation_id") ?? "");
  if (!convId) return;

  await requireUser(`/messages/${convId}`);
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // SECURITY DEFINER RPC handles the read marking atomically.
  await insforge.database.rpc("mark_conversation_read", { conv_id: convId });

  revalidatePath(`/messages/${convId}`);
  revalidatePath("/messages");
}
