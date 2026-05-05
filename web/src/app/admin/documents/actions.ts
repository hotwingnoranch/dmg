"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";

function back(qs: string): never {
  redirect(`/admin/documents?${qs}`);
}

async function logAudit(opts: {
  action: string;
  actorId?: string;
  actorEmail?: string | null;
  targetId?: string | null;
  targetEmail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.database.from("admin_audit").insert([
      {
        action: opts.action,
        actor_id: opts.actorId ?? null,
        actor_email: opts.actorEmail ?? null,
        target_id: opts.targetId ?? null,
        target_email: opts.targetEmail ?? null,
        metadata: opts.metadata ?? {},
      },
    ]);
  } catch (e) {
    console.error("[admin_audit] failed:", e);
  }
}

export async function verifyDocumentAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) back("doc_msg=missing_id");

  const admin = createAdminClient();
  const docRes = await admin.database
    .from("pro_documents")
    .select("id, pro_id, kind, file_name")
    .eq("id", id)
    .maybeSingle();
  const doc = docRes.data as
    | { id: string; pro_id: string; kind: string; file_name: string }
    | null;
  if (!doc) back("doc_msg=not_found");

  const upd = await admin.database
    .from("pro_documents")
    .update({
      status: "verified",
      reviewer_id: me.id,
      reviewed_at: new Date().toISOString(),
      notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (upd.error) back("doc_msg=update_failed");

  await logAudit({
    action: "doc_verified",
    actorId: me.id,
    actorEmail: me.email,
    targetId: doc.pro_id,
    metadata: { kind: doc.kind, file_name: doc.file_name, doc_id: id },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/pros/settings");
  back("doc_msg=verified");
}

export async function rejectDocumentAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!id) back("doc_msg=missing_id");

  const admin = createAdminClient();
  const docRes = await admin.database
    .from("pro_documents")
    .select("id, pro_id, kind, file_name")
    .eq("id", id)
    .maybeSingle();
  const doc = docRes.data as
    | { id: string; pro_id: string; kind: string; file_name: string }
    | null;
  if (!doc) back("doc_msg=not_found");

  const upd = await admin.database
    .from("pro_documents")
    .update({
      status: "rejected",
      reviewer_id: me.id,
      reviewed_at: new Date().toISOString(),
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (upd.error) back("doc_msg=update_failed");

  await logAudit({
    action: "doc_rejected",
    actorId: me.id,
    actorEmail: me.email,
    targetId: doc.pro_id,
    metadata: { kind: doc.kind, file_name: doc.file_name, doc_id: id, notes },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/pros/settings");
  back("doc_msg=rejected");
}
