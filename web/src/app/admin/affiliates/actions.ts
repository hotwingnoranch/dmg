"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";

function back(qs: string): never {
  redirect(`/admin/affiliates?${qs}`);
}

async function logAudit(opts: {
  action: string;
  actorId?: string;
  actorEmail?: string | null;
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
        target_id: opts.targetId ?? null,
        metadata: opts.metadata ?? {},
      },
    ]);
  } catch (e) {
    console.error("[admin_audit] failed:", e);
  }
}

export async function markConversionPaidAction(
  formData: FormData
): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) back("aff_msg=missing_id");

  const admin = createAdminClient();
  const upd = await admin.database
    .from("referral_conversions")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upd.error) back("aff_msg=update_failed");

  await logAudit({
    action: "commission_paid",
    actorId: me.id,
    actorEmail: me.email,
    targetId: id,
  });

  revalidatePath("/admin/affiliates");
  back("aff_msg=marked_paid");
}

export async function reverseConversionAction(
  formData: FormData
): Promise<void> {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) back("aff_msg=missing_id");

  const admin = createAdminClient();
  const conv = await admin.database
    .from("referral_conversions")
    .select("id, referral_id, commission_cents")
    .eq("id", id)
    .maybeSingle();
  const row = conv.data as
    | { id: string; referral_id: string; commission_cents: number }
    | null;
  if (!row) back("aff_msg=not_found");

  const upd = await admin.database
    .from("referral_conversions")
    .update({ status: "reversed", paid_at: null })
    .eq("id", id);
  if (upd.error) back("aff_msg=update_failed");

  // Decrement the parent referral's denormalized total.
  const refRow = await admin.database
    .from("referrals")
    .select("total_commission_cents")
    .eq("id", row.referral_id)
    .maybeSingle();
  const current =
    (refRow.data as { total_commission_cents: number } | null)
      ?.total_commission_cents ?? 0;
  await admin.database
    .from("referrals")
    .update({
      total_commission_cents: Math.max(0, current - row.commission_cents),
    })
    .eq("id", row.referral_id);

  await logAudit({
    action: "commission_reversed",
    actorId: me.id,
    actorEmail: me.email,
    targetId: id,
    metadata: { commission_cents: row.commission_cents },
  });

  revalidatePath("/admin/affiliates");
  back("aff_msg=reversed");
}
