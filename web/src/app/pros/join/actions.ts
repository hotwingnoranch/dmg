"use server";

import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken } from "@/lib/auth";
import { sendProWelcome } from "@/lib/email";

export type ProSetupState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok" };

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 60);
}

function normalizeUrl(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  // Prepend https:// if the user typed a bare host like "example.com".
  const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(candidate);
    return u.toString();
  } catch {
    return null;
  }
}

export async function setupProAction(
  _prev: ProSetupState,
  formData: FormData
): Promise<ProSetupState> {
  const token = await getAccessToken();
  if (!token) return { status: "error", message: "Please sign in first." };

  const insforge = createServerClient(token);
  const me = await insforge.auth.getCurrentUser();
  if (!me.data?.user) {
    return { status: "error", message: "Session expired. Please sign in again." };
  }
  const userId = me.data.user.id;

  const companyName = String(formData.get("company_name") ?? "").trim();
  const tagline = String(formData.get("tagline") ?? "").trim() || null;
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const yearsRaw = String(formData.get("years") ?? "").trim();
  const years = yearsRaw ? Number(yearsRaw) : null;
  const staff = String(formData.get("staff") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const websiteRaw = String(formData.get("website") ?? "").trim();
  const website = normalizeUrl(websiteRaw);
  const zip = String(formData.get("zip") ?? "").trim();
  const radius = Number(String(formData.get("radius") ?? "50"));
  const services = formData.getAll("services").map(String).filter(Boolean);

  if (!companyName || !zip || services.length === 0) {
    return {
      status: "error",
      message: "Company name, ZIP, and at least one service are required.",
    };
  }

  const baseSlug = slugify(companyName) || `pro-${userId.slice(0, 8)}`;
  const slug = `${baseSlug}-${userId.slice(0, 6)}`;

  await insforge.database.from("profiles").upsert([
    {
      id: userId,
      full_name: me.data.user.profile?.name ?? null,
      phone,
      zip_code: zip,
      is_pro: true,
    },
  ]);

  const proUpsert = await insforge.database.from("pros").upsert([
    {
      id: userId,
      slug,
      company_name: companyName,
      tagline,
      bio,
      years_in_business: years,
      staff_size: staff,
      website,
      contact_email: me.data.user.email ?? null,
      is_published: true,
    },
  ]);

  if (proUpsert.error) {
    return { status: "error", message: proUpsert.error.message };
  }

  // Reset and write services + service area
  await insforge.database.from("pro_services").delete().eq("pro_id", userId);
  if (services.length > 0) {
    const cats = await insforge.database
      .from("service_categories")
      .select("id, slug")
      .in("slug", services);
    const rows = (cats.data ?? []).map((c: { id: string }) => ({
      pro_id: userId,
      category_id: c.id,
    }));
    if (rows.length) {
      await insforge.database.from("pro_services").insert(rows);
    }
  }

  await insforge.database.from("service_areas").delete().eq("pro_id", userId);
  await insforge.database
    .from("service_areas")
    .insert([{ pro_id: userId, zip_code: zip, radius_miles: radius || 50 }]);

  // Welcome email — fire-and-await; failures must not block onboarding.
  if (me.data.user.email) {
    await sendProWelcome({
      to: me.data.user.email,
      proCompany: companyName,
    }).catch((e) => console.error("[email] pro welcome failed:", e));
  }

  redirect("/pros/dashboard?setup=1");
}
