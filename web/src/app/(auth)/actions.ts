"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/insforge";
import { setAuthCookies, clearAuthCookies } from "@/lib/auth";
import { attributeReferral, REF_COOKIE } from "@/lib/referrals";

export type AuthState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "verify"; email: string; name?: string; redirectTo?: string }
  | { status: "ok"; redirectTo: string };

function getRedirect(formData: FormData, fallback = "/") {
  const raw = String(formData.get("redirect_to") ?? "").trim();
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return fallback;
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const redirectTo = getRedirect(formData, "/");

  if (!email || password.length < 6 || !name) {
    return { status: "error", message: "Enter your name, a valid email, and a password of at least 6 characters." };
  }

  const insforge = createServerClient();
  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  if (data?.requireEmailVerification) {
    return { status: "verify", email, name, redirectTo };
  }

  if (data?.accessToken) {
    await setAuthCookies(data.accessToken, data.refreshToken);
    await ensureProfile(data.accessToken, { name });
    await consumeReferralCookie(data.accessToken);
    return { status: "ok", redirectTo };
  }

  return { status: "error", message: "Unexpected sign-up response. Please try again." };
}

export async function verifyEmailAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const otp = String(formData.get("otp") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const redirectTo = getRedirect(formData, "/");

  if (!email || otp.length < 4) {
    return { status: "verify", email, name, redirectTo };
  }

  const insforge = createServerClient();
  const { data, error } = await insforge.auth.verifyEmail({ email, otp });
  if (error || !data?.accessToken) {
    return { status: "error", message: error?.message ?? "Could not verify code." };
  }
  await setAuthCookies(data.accessToken, data.refreshToken);
  await ensureProfile(data.accessToken, { name });
  await consumeReferralCookie(data.accessToken);
  return { status: "ok", redirectTo };
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  const redirectTo = getRedirect(formData, "/");

  if (!email || !password) {
    return { status: "error", message: "Enter your email and password." };
  }

  const insforge = createServerClient();
  const { data, error } = await insforge.auth.signInWithPassword({ email, password });
  if (error || !data?.accessToken) {
    return { status: "error", message: error?.message ?? "Could not sign in." };
  }
  await setAuthCookies(data.accessToken, data.refreshToken, { remember });
  return { status: "ok", redirectTo };
}

export async function signOutAction() {
  await clearAuthCookies();
  redirect("/");
}

async function consumeReferralCookie(accessToken: string) {
  try {
    const store = await cookies();
    const code = store.get(REF_COOKIE)?.value;
    if (!code) return;

    // Identify the just-signed-up user via their fresh access token.
    const insforge = createServerClient(accessToken);
    const me = await insforge.auth.getCurrentUser();
    const userId = me.data?.user?.id;
    if (!userId) return;

    await attributeReferral(userId, code);
    // Clear the cookie so a later signup on the same device doesn't
    // re-attribute (each user can only be attributed once anyway).
    store.delete(REF_COOKIE);
  } catch (e) {
    console.error("[referrals] consume cookie failed:", e);
  }
}

async function ensureProfile(accessToken: string, opts: { name?: string }) {
  try {
    const insforge = createServerClient(accessToken);
    const me = await insforge.auth.getCurrentUser();
    if (!me.data?.user) return;
    const userId = me.data.user.id;

    const existing = await insforge.database
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing.data) {
      await insforge.database.from("profiles").insert([
        {
          id: userId,
          full_name: opts.name ?? me.data.user.profile?.name ?? null,
        },
      ]);
    }
  } catch {
    // best-effort; profile can be backfilled later
  }
}
