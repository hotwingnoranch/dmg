import { NextResponse } from "next/server";
import {
  REF_COOKIE,
  REF_COOKIE_MAX_AGE,
  logReferralClick,
} from "@/lib/referrals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public referral entry: /r/<code>?to=<path>. Logs the click, sets a
 * 30-day cookie, then 302s to the destination (default "/"). The cookie
 * is consumed by the signup action when the visitor creates an account.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const url = new URL(req.url);
  const toRaw = url.searchParams.get("to") ?? "/";
  const to = toRaw.startsWith("/") && !toRaw.startsWith("//") ? toRaw : "/";

  // Compose a clean redirect URL on the same host.
  const dest = new URL(to, url.origin);

  const res = NextResponse.redirect(dest, { status: 302 });

  if (code && /^[A-Z0-9]{4,16}$/.test(code)) {
    res.cookies.set(REF_COOKIE, code, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: REF_COOKIE_MAX_AGE,
    });

    // Best-effort click logging — don't block the redirect on failure.
    const ua = req.headers.get("user-agent") ?? null;
    try {
      await logReferralClick(code, { ua, path: to });
    } catch (e) {
      console.error("[referral click]", e);
    }
  }

  return res;
}
