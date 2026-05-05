import { NextResponse } from "next/server";
import { clearAuthCookies } from "@/lib/auth";

export async function POST(request: Request) {
  await clearAuthCookies();
  const url = new URL("/", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
