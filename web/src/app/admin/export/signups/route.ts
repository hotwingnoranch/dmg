import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  full_name: string | null;
  is_pro: boolean;
  phone: string | null;
  zip_code: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
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
    .from("profiles")
    .select(
      "id, full_name, is_pro, phone, zip_code, city, state, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(10000);
  const rows = (res.data ?? []) as Row[];

  const cols: (keyof Row)[] = [
    "id",
    "created_at",
    "is_pro",
    "full_name",
    "phone",
    "zip_code",
    "city",
    "state",
    "updated_at",
  ];

  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => csvCell(r[c])).join(","));
  }
  const body = lines.join("\n");
  const filename = `vanguard-signups-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
