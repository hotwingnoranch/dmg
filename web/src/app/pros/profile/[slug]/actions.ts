"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, getCurrentUser } from "@/lib/auth";

function back(slug: string, qs: string): never {
  redirect(`/pros/profile/${slug}?${qs}#reviews`);
}

export async function leaveReviewAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const proId = String(formData.get("pro_id") ?? "");
  const ratingRaw = String(formData.get("rating") ?? "");
  const body = String(formData.get("body") ?? "").trim() || null;

  if (!slug || !proId) redirect("/services");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/pros/profile/${slug}`)}`);
  }
  if (user.id === proId) {
    back(slug, "review_msg=self");
  }

  const rating = Number(ratingRaw);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    back(slug, "review_msg=bad_rating");
  }
  if (body && body.length > 2000) {
    back(slug, "review_msg=body_too_long");
  }

  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const ins = await insforge.database.from("reviews").insert([
    {
      pro_id: proId,
      buyer_id: user.id,
      rating,
      body,
    },
  ]);

  if (ins.error) {
    console.error("[reviews] insert failed:", ins.error);
    if (ins.error.message?.toLowerCase().includes("self_review")) {
      back(slug, "review_msg=self");
    }
    back(slug, "review_msg=insert_failed");
  }

  revalidatePath(`/pros/profile/${slug}`);
  back(slug, "review_msg=ok");
}

export async function deleteOwnReviewAction(formData: FormData): Promise<void> {
  const slug = String(formData.get("slug") ?? "");
  const id = String(formData.get("id") ?? "");
  if (!slug || !id) redirect("/services");

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/pros/profile/${slug}`)}`);
  }

  const token = await getAccessToken();
  const insforge = createServerClient(token);

  // RLS prevents deleting another user's review, but we filter by both
  // for a clearer 0-row response if something is off.
  const del = await insforge.database
    .from("reviews")
    .delete()
    .eq("id", id)
    .eq("buyer_id", user.id);

  if (del.error) {
    console.error("[reviews] delete failed:", del.error);
    back(slug, "review_msg=delete_failed");
  }

  revalidatePath(`/pros/profile/${slug}`);
  back(slug, "review_msg=deleted");
}
