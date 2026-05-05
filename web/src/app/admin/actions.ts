"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function back(qs: string): never {
  redirect(`/admin?${qs}`);
}

async function logAudit(opts: {
  action: string;
  actorId?: string;
  actorEmail?: string | null;
  targetEmail?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    await admin.database.from("admin_audit").insert([
      {
        action: opts.action,
        actor_id: opts.actorId ?? null,
        actor_email: opts.actorEmail ?? null,
        target_email: opts.targetEmail ?? null,
        target_id: opts.targetId ?? null,
        metadata: opts.metadata ?? {},
      },
    ]);
  } catch (e) {
    console.error("[admin_audit] failed:", e);
  }
}

export async function addAdminAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    back(`admin_msg=invalid_email`);
  }

  const admin = createAdminClient();

  // Try to backfill user_id by joining auth.users by email. Failures are
  // OK — user_id is informational; matching is by email.
  let userId: string | null = null;
  try {
    const found = (await admin.database
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .maybeSingle()) as { data?: { id: string } | null };
    userId = found.data?.id ?? null;
  } catch {
    userId = null;
  }

  const { error } = await admin.database.from("admins").insert([
    {
      email,
      user_id: userId,
      added_by: me.id,
    },
  ]);
  if (error) {
    const msg = error.message.includes("unique")
      ? "already_admin"
      : "add_failed";
    back(`admin_msg=${msg}`);
  }
  await logAudit({
    action: "admin_added",
    actorId: me.id,
    actorEmail: me.email,
    targetEmail: email,
  });
  revalidatePath("/admin");
  back("admin_msg=added");
}

export async function removeAdminAction(formData: FormData): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) back("admin_msg=missing_id");

  const admin = createAdminClient();
  const target = await admin.database
    .from("admins")
    .select("id, email")
    .eq("id", id)
    .maybeSingle();
  const targetEmail = (target.data as { email?: string } | null)?.email ?? "";
  if (me.email && targetEmail.toLowerCase() === me.email.toLowerCase()) {
    back("admin_msg=cannot_remove_self");
  }

  const { error } = await admin.database.from("admins").delete().eq("id", id);
  if (error) back(`admin_msg=remove_failed`);
  await logAudit({
    action: "admin_removed",
    actorId: me.id,
    actorEmail: me.email,
    targetEmail: targetEmail || null,
    targetId: id,
  });
  revalidatePath("/admin");
  back("admin_msg=removed");
}
