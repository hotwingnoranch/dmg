import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "./insforge";
import { getCurrentUser, type SessionUser } from "./auth";

/**
 * Admin check by email (case-insensitive). Uses the InsForge admin client
 * so the lookup bypasses RLS and is independent of the per-user policy
 * machinery on the `admins` table.
 */
export async function isAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const admin = createAdminClient();
  const res = await admin.database
    .from("admins")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return !!res.data;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (!(await isAdminEmail(user.email))) {
    redirect("/?denied=admin");
  }
  return user;
}

export async function getCurrentUserWithAdmin(): Promise<{
  user: SessionUser | null;
  isAdmin: boolean;
}> {
  const user = await getCurrentUser();
  if (!user) return { user: null, isAdmin: false };
  const admin = await isAdminEmail(user.email);
  return { user, isAdmin: admin };
}

/**
 * All admin email addresses, used as a recipient list for operational alerts.
 */
export async function listAdminEmails(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const res = await admin.database.from("admins").select("email");
    return ((res.data ?? []) as { email: string }[])
      .map((r) => r.email)
      .filter(Boolean);
  } catch {
    return [];
  }
}
