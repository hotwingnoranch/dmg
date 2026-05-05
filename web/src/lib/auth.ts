import "server-only";
import { cookies } from "next/headers";
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

export async function setAuthCookies(accessToken: string, refreshToken?: string) {
  const store = await cookies();
  store.set(ACCESS, accessToken, { ...baseCookie, maxAge: 60 * 15 });
  if (refreshToken) {
    store.set(REFRESH, refreshToken, { ...baseCookie, maxAge: 60 * 60 * 24 * 7 });
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
};

export async function requireUser(redirectTo: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
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
  return { id: u.id, email: u.email, name: u.profile?.name };
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
