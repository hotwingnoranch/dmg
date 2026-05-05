"use server";

import { redirect } from "next/navigation";
import { createServerClient, createAdminClient } from "@/lib/insforge";
import { getAccessToken } from "@/lib/auth";
import {
  sendBuyerRequestConfirmation,
  sendNewLeadAlert,
} from "@/lib/email";

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

  // ---- email notifications (fire-and-await; failures must not block) ----
  const userEmail =
    (me.data.user as { email?: string }).email ?? contactEmail ?? null;
  const userName =
    (me.data.user as { profile?: { name?: string } }).profile?.name ??
    contactName ??
    null;
  const categoryName = await getCategoryName(insforge, cat.data.id);

  // Use the admin client so the lead fan-out doesn't depend on per-user RLS
  // column visibility for pros' contact_email.
  await Promise.all([
    userEmail
      ? sendBuyerRequestConfirmation({
          to: userEmail,
          buyerName: userName,
          categoryName,
          city,
          zip,
          requestId: data.id,
        }).catch((e) => console.error("[email] buyer confirm failed:", e))
      : Promise.resolve(),
    notifyMatchingPros({
      categoryId: cat.data.id,
      categoryName,
      city,
      zip,
      urgency,
      description,
    }).catch((e) => console.error("[email] pro fan-out failed:", e)),
  ]);

  redirect(`/buyer/dashboard?new=${data.id}`);
}

async function getCategoryName(
  insforge: ReturnType<typeof createServerClient>,
  categoryId: string
): Promise<string> {
  const res = await insforge.database
    .from("service_categories")
    .select("name")
    .eq("id", categoryId)
    .maybeSingle();
  return (res.data?.name as string) ?? "Security";
}

async function notifyMatchingPros(opts: {
  categoryId: string;
  categoryName: string;
  city: string | null;
  zip: string;
  urgency: string;
  description: string | null;
}) {
  const admin = createAdminClient();

  // Find pros offering this category with a published profile + an email.
  // Cap at 5 for now; in production you'd batch and queue.
  const { data, error } = await admin.database
    .from("pro_services")
    .select(
      "pro_id, pros(id, company_name, contact_email, is_published)"
    )
    .eq("category_id", opts.categoryId)
    .limit(20);

  if (error || !data) return;

  const recipients = data
    .map((row) => {
      const raw = (row as { pros: unknown }).pros;
      const pro = (Array.isArray(raw) ? raw[0] : raw) as
        | {
            id: string;
            company_name: string;
            contact_email: string | null;
            is_published: boolean;
          }
        | null;
      return pro;
    })
    .filter(
      (p): p is {
        id: string;
        company_name: string;
        contact_email: string;
        is_published: boolean;
      } => !!p && p.is_published && !!p.contact_email
    )
    .slice(0, 5);

  await Promise.all(
    recipients.map((p) =>
      sendNewLeadAlert({
        to: p.contact_email,
        proCompany: p.company_name,
        categoryName: opts.categoryName,
        city: opts.city,
        zip: opts.zip,
        urgency: opts.urgency,
        description: opts.description,
      }).catch((e) => console.error("[email] lead alert failed:", e))
    )
  );
}
