"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const AVATAR_MIME_PREFIXES = ["image/"];

const MEDIA_IMAGE_MAX = 12 * 1024 * 1024; // 12 MB
const MEDIA_VIDEO_MAX = 80 * 1024 * 1024; // 80 MB
const MEDIA_VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];

const ALLOWED_KINDS = [
  "license",
  "insurance",
  "coi",
  "certification",
  "other",
] as const;

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_PREFIXES = ["application/pdf", "image/"];

function back(qs: string): never {
  redirect(`/pros/settings?${qs}`);
}

export async function uploadDocumentAction(formData: FormData): Promise<void> {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const file = formData.get("file");
  const kindRaw = String(formData.get("kind") ?? "");
  const expiresRaw = String(formData.get("expires_at") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    back("doc_msg=missing_file");
  }

  if (!ALLOWED_KINDS.includes(kindRaw as (typeof ALLOWED_KINDS)[number])) {
    back("doc_msg=invalid_kind");
  }
  const kind = kindRaw as (typeof ALLOWED_KINDS)[number];

  if (file.size > MAX_BYTES) {
    back("doc_msg=too_large");
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_PREFIXES.some((p) => mime === p || mime.startsWith(p))) {
    back("doc_msg=bad_type");
  }

  // Expiry is optional but must parse if provided.
  let expiresAt: string | null = null;
  if (expiresRaw) {
    const d = new Date(expiresRaw);
    if (Number.isNaN(d.getTime())) {
      back("doc_msg=bad_expiry");
    }
    expiresAt = d.toISOString();
  }

  // Path key gives admins a hint of who/what the file belongs to.
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  const objectKey = `${user.id}/${kind}/${Date.now()}-${safeName}`;

  const upload = await insforge.storage
    .from("pro-documents")
    .upload(objectKey, file);

  if (upload.error || !upload.data) {
    console.error("[pro-documents upload]", upload.error);
    back("doc_msg=upload_failed");
  }

  const insert = await insforge.database.from("pro_documents").insert([
    {
      pro_id: user.id,
      kind,
      storage_key: upload.data.key,
      file_name: file.name,
      mime,
      size_bytes: file.size,
      expires_at: expiresAt,
      status: "pending",
    },
  ]);

  if (insert.error) {
    // Best effort cleanup so we don't orphan the object.
    try {
      await insforge.storage.from("pro-documents").remove(upload.data.key);
    } catch {
      // ignore
    }
    console.error("[pro-documents insert]", insert.error);
    back("doc_msg=db_failed");
  }

  revalidatePath("/pros/settings");
  revalidatePath("/admin/documents");
  back("doc_msg=uploaded");
}

export async function deleteDocumentAction(formData: FormData): Promise<void> {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const id = String(formData.get("id") ?? "");
  if (!id) back("doc_msg=missing_id");

  // Read first so we know the storage key, and confirm ownership via RLS.
  const row = await insforge.database
    .from("pro_documents")
    .select("id, pro_id, storage_key")
    .eq("id", id)
    .maybeSingle();
  const doc = row.data as
    | { id: string; pro_id: string; storage_key: string }
    | null;
  if (!doc || doc.pro_id !== user.id) {
    back("doc_msg=not_found");
  }

  const del = await insforge.database
    .from("pro_documents")
    .delete()
    .eq("id", id);
  if (del.error) back("doc_msg=delete_failed");

  // Best-effort: remove the object too.
  try {
    await insforge.storage.from("pro-documents").remove(doc.storage_key);
  } catch (e) {
    console.error("[pro-documents storage remove]", e);
  }

  revalidatePath("/pros/settings");
  revalidatePath("/admin/documents");
  back("doc_msg=deleted");
}

// ============================================================
// Avatar / company logo
// ============================================================

export async function uploadAvatarAction(formData: FormData): Promise<void> {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    back("avatar_msg=missing_file");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    back("avatar_msg=too_large");
  }
  const mime = file.type || "application/octet-stream";
  if (!AVATAR_MIME_PREFIXES.some((p) => mime.startsWith(p))) {
    back("avatar_msg=bad_type");
  }

  // Read existing avatar so we can clean it up after the new one lands.
  const existing = await insforge.database
    .from("profiles")
    .select("avatar_storage_key")
    .eq("id", user.id)
    .maybeSingle();
  const oldKey =
    (existing.data as { avatar_storage_key: string | null } | null)
      ?.avatar_storage_key ?? null;

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
  const objectKey = `${user.id}/${Date.now()}-${safeName}`;

  const upload = await insforge.storage
    .from("avatars")
    .upload(objectKey, file);

  if (upload.error || !upload.data) {
    console.error("[avatar upload]", upload.error);
    back("avatar_msg=upload_failed");
  }

  const upd = await insforge.database
    .from("profiles")
    .update({
      avatar_url: upload.data.url,
      avatar_storage_key: upload.data.key,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (upd.error) {
    // Best-effort cleanup of the just-uploaded object.
    try {
      await insforge.storage.from("avatars").remove(upload.data.key);
    } catch {
      // ignore
    }
    console.error("[avatar profile update]", upd.error);
    back("avatar_msg=db_failed");
  }

  // Drop the previous avatar so we don't leave orphans.
  if (oldKey) {
    try {
      await insforge.storage.from("avatars").remove(oldKey);
    } catch (e) {
      console.error("[avatar old remove]", e);
    }
  }

  revalidatePath("/pros/settings");
  revalidatePath("/pros/dashboard");
  back("avatar_msg=uploaded");
}

export async function removeAvatarAction(): Promise<void> {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const existing = await insforge.database
    .from("profiles")
    .select("avatar_storage_key")
    .eq("id", user.id)
    .maybeSingle();
  const key = (existing.data as { avatar_storage_key: string | null } | null)
    ?.avatar_storage_key;

  await insforge.database
    .from("profiles")
    .update({ avatar_url: null, avatar_storage_key: null })
    .eq("id", user.id);

  if (key) {
    try {
      await insforge.storage.from("avatars").remove(key);
    } catch (e) {
      console.error("[avatar remove]", e);
    }
  }

  revalidatePath("/pros/settings");
  back("avatar_msg=removed");
}

// ============================================================
// Past-job photos + videos (gallery)
// ============================================================

export async function uploadProMediaAction(formData: FormData): Promise<void> {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const file = formData.get("file");
  const caption = String(formData.get("caption") ?? "").trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    back("media_msg=missing_file");
  }
  const mime = file.type || "application/octet-stream";
  const isVideo =
    mime.startsWith("video/") || MEDIA_VIDEO_MIME.includes(mime);
  const isImage = mime.startsWith("image/");
  if (!isVideo && !isImage) {
    back("media_msg=bad_type");
  }
  const limit = isVideo ? MEDIA_VIDEO_MAX : MEDIA_IMAGE_MAX;
  if (file.size > limit) {
    back(isVideo ? "media_msg=video_too_large" : "media_msg=image_too_large");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
  const objectKey = `${user.id}/${Date.now()}-${safeName}`;

  const upload = await insforge.storage
    .from("pro-photos")
    .upload(objectKey, file);

  if (upload.error || !upload.data) {
    console.error("[pro media upload]", upload.error);
    back("media_msg=upload_failed");
  }

  const ins = await insforge.database.from("pro_photos").insert([
    {
      pro_id: user.id,
      storage_key: upload.data.key,
      url: upload.data.url,
      media_kind: isVideo ? "video" : "image",
      mime,
      size_bytes: file.size,
      caption,
    },
  ]);

  if (ins.error) {
    try {
      await insforge.storage.from("pro-photos").remove(upload.data.key);
    } catch {
      // ignore
    }
    console.error("[pro media insert]", ins.error);
    back("media_msg=db_failed");
  }

  revalidatePath("/pros/settings");
  // Surface immediately on the public profile too — query is RLS-bound but
  // the cache key needs to bust regardless of which slug is used.
  revalidatePath("/pros/profile/[slug]", "page");
  back("media_msg=uploaded");
}

export async function deleteProMediaAction(formData: FormData): Promise<void> {
  const user = await requireUser("/pros/settings");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const id = String(formData.get("id") ?? "");
  if (!id) back("media_msg=missing_id");

  const row = await insforge.database
    .from("pro_photos")
    .select("id, pro_id, storage_key")
    .eq("id", id)
    .maybeSingle();
  const item = row.data as
    | { id: string; pro_id: string; storage_key: string }
    | null;
  if (!item || item.pro_id !== user.id) {
    back("media_msg=not_found");
  }

  const del = await insforge.database
    .from("pro_photos")
    .delete()
    .eq("id", id);
  if (del.error) back("media_msg=delete_failed");

  try {
    await insforge.storage.from("pro-photos").remove(item.storage_key);
  } catch (e) {
    console.error("[pro media remove]", e);
  }

  revalidatePath("/pros/settings");
  revalidatePath("/pros/profile/[slug]", "page");
  back("media_msg=deleted");
}
