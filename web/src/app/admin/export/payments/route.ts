import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  pro_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_subscription_id: string | null;
  kind: string;
  product_slug: string;
  credits_granted: number;
  amount_cents: number;
  currency: string;
  status: string;
  created_at: string;
  succeeded_at: string | null;
};

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  await requireAdmin();
  const admin = createAdminClient();
  const res = await admin.database
    .from("payments")
    .select(
      "id, pro_id, stripe_session_id, stripe_payment_intent_id, stripe_subscription_id, kind, product_slug, credits_granted, amount_cents, currency, status, created_at, succeeded_at"
    )
    .order("created_at", { ascending: false })
    .limit(10000);
  const rows = (res.data ?? []) as Row[];

  const cols: (keyof Row)[] = [
    "id",
    "created_at",
    "succeeded_at",
    "kind",
    "product_slug",
    "amount_cents",
    "currency",
    "credits_granted",
    "status",
    "pro_id",
    "stripe_session_id",
    "stripe_payment_intent_id",
    "stripe_subscription_id",
  ];

  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => csvCell(r[c])).join(","));
  }
  const body = lines.join("\n");
  const filename = `vanguard-payments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
