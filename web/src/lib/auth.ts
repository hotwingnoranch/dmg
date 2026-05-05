import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "./insforge";

const ACCESS = "insforge_access_token";
const REFRESH = "insforge_refresh_token";
const VERIFIER = "insforge_code_verifier";

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1 hour
export const REFRESH_TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days
export const REFRESH_TOKEN_REMEMBER_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export async function setAuthCookies(
  accessToken: string,
  refreshToken?: string,
  opts?: { remember?: boolean }
) {
  const store = await cookies();
  // Access token always 1h — proxy refreshes silently from the refresh
  // cookie. Refresh cookie persistence is what "Remember me" controls:
  // - remember=true  → 30-day persistent cookie
  // - remember=false → session cookie (no maxAge; browser drops on close)
  store.set(ACCESS, accessToken, { ...baseCookie, maxAge: ACCESS_TOKEN_MAX_AGE });
  if (refreshToken) {
    if (opts?.remember === false) {
      // Omit maxAge → browser-session cookie.
      store.set(REFRESH, refreshToken, baseCookie);
    } else {
      const maxAge =
        opts?.remember === true
          ? REFRESH_TOKEN_REMEMBER_MAX_AGE
          : REFRESH_TOKEN_MAX_AGE;
      store.set(REFRESH, refreshToken, { ...baseCookie, maxAge });
    }
  }
}

export async function clearAuthCookies() {
  const store = await cookies();
  store.delete(ACCESS);
  store.delete(REFRESH);
  store.delete(VERIFIER);
}

export async function setVerifierCookie(verifier: string) {
  const store = await cookies();
  store.set(VERIFIER, verifier, { ...baseCookie, maxAge: 600 });
}

export async function readVerifierCookie() {
  const store = await cookies();
  const v = store.get(VERIFIER)?.value;
  if (v) store.delete(VERIFIER);
  return v;
}

export async function getAccessToken() {
  const store = await cookies();
  return store.get(ACCESS)?.value;
}

export type SessionUser = {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string | null;
};

export async function requireUser(fallbackPath: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    // Prefer the proxy-provided current pathname so users bounce back to
    // the page they were trying to reach, not always the dashboard.
    const h = await headers();
    const fromProxy = h.get("x-pathname");
    const target =
      fromProxy && fromProxy.startsWith("/") && !fromProxy.startsWith("//")
        ? fromProxy
        : fallbackPath;
    redirect(`/login?next=${encodeURIComponent(target)}`);
  }
  return user;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const insforge = createServerClient(token);
  const { data, error } = await insforge.auth.getCurrentUser();
  if (error || !data?.user) return null;

  const u = data.user as {
    id: string;
    email?: string;
    profile?: { name?: string } | null;
  };

  // Pull avatar_url so the Header / UserMenu can render it on every page
  // for the signed-in user without each caller wiring it through.
  let avatarUrl: string | null = null;
  try {
    const profileRes = await insforge.database
      .from("profiles")
      .select("avatar_url")
      .eq("id", u.id)
      .maybeSingle();
    avatarUrl =
      (profileRes.data as { avatar_url: string | null } | null)?.avatar_url ??
      null;
  } catch {
    // Best-effort — auth still works without the avatar.
  }

  return { id: u.id, email: u.email, name: u.profile?.name, avatarUrl };
}

export async function getCurrentProfile() {
  const token = await getAccessToken();
  if (!token) return null;
  const insforge = createServerClient(token);
  const me = await insforge.auth.getCurrentUser();
  if (me.error || !me.data?.user) return null;

  const { data, error } = await insforge.database
    .from("profiles")
    .select("*")
    .eq("id", me.data.user.id)
    .single();
  if (error) return { user: me.data.user, profile: null, pro: null };

  const proRes = await insforge.database
    .from("pros")
    .select("*")
    .eq("id", me.data.user.id)
    .maybeSingle();

  return { user: me.data.user, profile: data, pro: proRes.data ?? null };
}
