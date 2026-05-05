"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { leadCost } from "./cost";

export async function respondToLeadAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "");
  const urgency = String(formData.get("urgency") ?? "flexible");
  const message = String(formData.get("message") ?? "").trim() || null;
  const estimateRaw = String(formData.get("estimate") ?? "").trim();
  const estimateAmount =
    estimateRaw && !Number.isNaN(Number(estimateRaw))
      ? Number(estimateRaw)
      : null;

  if (!requestId) redirect("/pros/leads?result=missing_request");

  const cost = leadCost(urgency);
  const user = await requireUser("/pros/leads");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const proRes = await insforge.database
    .from("pros")
    .select("credits")
    .eq("id", user.id)
    .single();
  const credits = (proRes.data?.credits ?? 0) as number;

  if (credits < cost) {
    redirect(`/pros/billing?tab=credits&result=insufficient&need=${cost}`);
  }

  // Insert the response row. unique(request_id, pro_id) catches re-submits.
  const insert = await insforge.database
    .from("responses")
    .insert([
      {
        request_id: requestId,
        pro_id: user.id,
        message,
        estimate_amount: estimateAmount,
        credits_spent: cost,
        status: "pending",
      },
    ])
    .select("id")
    .single();

  if (insert.error || !insert.data) {
    if (insert.error?.message?.toLowerCase().includes("unique")) {
      redirect("/pros/leads?result=already_responded");
    }
    redirect("/pros/leads?result=error");
  }

  await insforge.database
    .from("pros")
    .update({ credits: credits - cost })
    .eq("id", user.id);

  revalidatePath("/pros/leads");
  revalidatePath("/pros/responses");
  revalidatePath("/pros/dashboard");

  redirect(`/pros/responses/${insert.data.id}?fresh=1`);
}

export async function dismissLeadAction(formData: FormData): Promise<void> {
  const requestId = String(formData.get("request_id") ?? "");
  if (!requestId) redirect("/pros/leads?result=missing_request");

  const user = await requireUser("/pros/leads");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // Insert a declined row so the lead drops out of the matching feed for
  // this pro. Idempotent on (request_id, pro_id).
  const res = await insforge.database.from("responses").insert([
    {
      request_id: requestId,
      pro_id: user.id,
      status: "declined",
      credits_spent: 0,
    },
  ]);

  if (res.error && !res.error.message?.toLowerCase().includes("unique")) {
    redirect("/pros/leads?result=error");
  }

  revalidatePath("/pros/leads");
  redirect("/pros/leads?result=dismissed");
}
