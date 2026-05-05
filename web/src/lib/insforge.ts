import { createClient } from "@insforge/sdk";

export const INSFORGE_URL = process.env.NEXT_PUBLIC_INSFORGE_URL!;
export const INSFORGE_ANON_KEY =
  process.env.INSFORGE_ANON_KEY ?? process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!;

export function createServerClient(accessToken?: string) {
  return createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
    isServerMode: true,
    edgeFunctionToken: accessToken,
  });
}

export function createBrowserClient() {
  return createClient({
    baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
    anonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY!,
  });
}

/**
 * Admin/service-role client. Uses the InsForge API key (bypasses RLS).
 * Use ONLY in server contexts that don't have a user session — e.g. Stripe
 * webhook handlers updating any pro's data. Never call from a request that
 * carries an end-user identity.
 */
export function createAdminClient() {
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!apiKey) {
    throw new Error("INSFORGE_API_KEY is not set");
  }
  return createClient({
    baseUrl: INSFORGE_URL,
    anonKey: apiKey,
    isServerMode: true,
  });
}
