import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@insforge/sdk";

// Cookie names (kept in sync with src/lib/auth.ts so the proxy and the
// server actions agree on storage).
const ACCESS = "insforge_access_token";
const REFRESH = "insforge_refresh_token";

const ACCESS_MAX_AGE = 60 * 60; // 1 hour
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Transparent session refresh.
 *
 * When the short-lived access cookie has expired (browser drops it after
 * `maxAge`), but the long-lived refresh cookie is still present, ask
 * InsForge for a new access token and rotate both cookies. This lets users
 * who came back from a long Stripe Checkout flow stay signed in instead of
 * landing on /login.
 *
 * The proxy runs only on routes that actually read the session — public
 * pages and the webhook are skipped.
 */
export async function proxy(request: NextRequest) {
  // Always echo the current pathname so server components can build
  // accurate "next" redirect URLs without each page hardcoding it.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);

  const access = request.cookies.get(ACCESS)?.value;
  const refresh = request.cookies.get(REFRESH)?.value;

  // Nothing to do: either we have a valid access cookie, or there's no
  // refresh cookie to recover with. Still propagate the path header.
  if (access || !refresh) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const baseUrl = process.env.NEXT_PUBLIC_INSFORGE_URL;
  const anonKey = process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY;
  if (!baseUrl || !anonKey) {
    return NextResponse.next();
  }

  try {
    const insforge = createClient({ baseUrl, anonKey, isServerMode: true });
    const { data, error } = await insforge.auth.refreshSession({
      refreshToken: refresh,
    });

    if (error || !data?.accessToken) {
      // Refresh token rejected — clear both cookies so the user gets a
      // clean trip to /login next render.
      const res = NextResponse.next();
      res.cookies.set(ACCESS, "", { ...cookieOpts, maxAge: 0 });
      res.cookies.set(REFRESH, "", { ...cookieOpts, maxAge: 0 });
      return res;
    }

    // Rotate both cookies. Set on the request so the rendering pass picks
    // up the fresh access token, and on the response so the browser stores
    // it for subsequent requests.
    request.cookies.set(ACCESS, data.accessToken);
    if (data.refreshToken) request.cookies.set(REFRESH, data.refreshToken);

    const res = NextResponse.next({
      request: { headers: requestHeaders },
    });
    res.cookies.set(ACCESS, data.accessToken, {
      ...cookieOpts,
      maxAge: ACCESS_MAX_AGE,
    });
    if (data.refreshToken) {
      res.cookies.set(REFRESH, data.refreshToken, {
        ...cookieOpts,
        maxAge: REFRESH_MAX_AGE,
      });
    }
    return res;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  // Run on routes that actually read the session. Skip static assets,
  // marketing pages, the auth pages themselves (refresh would be a no-op),
  // and the Stripe webhook (no user session involved).
  matcher: [
    "/buyer/:path*",
    "/pros/:path*",
    "/affiliate/:path*",
    "/affiliate",
    "/messages/:path*",
    "/messages",
    "/api/auth/:path*",
  ],
};
