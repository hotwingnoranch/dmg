"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/insforge";
import { getAccessToken, requireUser } from "@/lib/auth";
import { validateReferralCode } from "@/lib/referrals";

function back(qs: string): never {
  redirect(`/affiliate?${qs}`);
}

export async function updateReferralCodeAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser("/affiliate");
  const token = await getAccessToken();
  const insforge = createServerClient(token);

  const result = validateReferralCode(String(formData.get("code") ?? ""));
  if (!result.ok) {
    back(`code_msg=${encodeURIComponent(result.message)}`);
  }
  const code = result.code;

  // Match the pre-existing row so the PG unique constraint is the only
  // source of truth on collisions.
  const upd = await insforge.database
    .from("referrals")
    .update({ code })
    .eq("owner_user_id", user.id);

  if (upd.error) {
    if (upd.error.message?.toLowerCase().includes("unique")) {
      back(`code_msg=${encodeURIComponent("That code is already taken — try another.")}`);
    }
    console.error("[referrals] update code failed:", upd.error);
    back(`code_msg=${encodeURIComponent("Could not update your code. Try again.")}`);
  }

  revalidatePath("/affiliate");
  back("code_msg=ok");
}
