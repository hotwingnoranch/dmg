"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken } from "@/lib/auth";

export type RequestState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "need_auth" }
  | { status: "ok"; requestId: string };

export async function createRequestAction(
  _prev: RequestState,
  formData: FormData
): Promise<RequestState> {
  const token = await getAccessToken();
  if (!token) return { status: "need_auth" };

  const insforge = createServerClient(token);
  const me = await insforge.auth.getCurrentUser();
  if (!me.data?.user) return { status: "need_auth" };

  const categorySlug = String(formData.get("category") ?? "").trim();
  const zip = String(formData.get("zip") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const state = String(formData.get("state") ?? "").trim() || null;
  const urgency = String(formData.get("urgency") ?? "flexible") as
    | "flexible"
    | "soon"
    | "urgent";
  const budget = String(formData.get("budget") ?? "").trim() || null;
  const startDate = String(formData.get("start_date") ?? "").trim() || null;
  const duration = String(formData.get("duration") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const contactPhone = String(formData.get("contact_phone") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim() || null;

  if (!categorySlug || zip.length < 5) {
    return { status: "error", message: "Service and a 5-digit ZIP are required." };
  }

  const cat = await insforge.database
    .from("service_categories")
    .select("id")
    .eq("slug", categorySlug)
    .single();

  if (cat.error || !cat.data) {
    return { status: "error", message: "Unknown service category." };
  }

  const { data, error } = await insforge.database
    .from("requests")
    .insert([
      {
        buyer_id: me.data.user.id,
        category_id: cat.data.id,
        zip_code: zip,
        city,
        state,
        urgency,
        budget_band: budget,
        start_date: startDate,
        duration_text: duration,
        details: { description },
        contact_name: contactName,
        contact_phone: contactPhone,
        contact_email: contactEmail,
      },
    ])
    .select("id")
    .single();

  if (error || !data) {
    return { status: "error", message: error?.message ?? "Could not save request." };
  }

  redirect(`/buyer/dashboard?new=${data.id}`);
}
