import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/insforge";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // requireAdmin throws/redirects if not authorized; we still wrap in
  // try/catch so the response is a clean 403 on failure rather than a
  // surprise redirect from a fetch.
  try {
    await requireAdmin();
  } catch {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { id } = await params;
  if (!id) return new NextResponse("Not found", { status: 404 });

  const admin = createAdminClient();

  const docRes = await admin.database
    .from("pro_documents")
    .select("id, storage_key, file_name, mime")
    .eq("id", id)
    .maybeSingle();
  const doc = docRes.data as
    | { id: string; storage_key: string; file_name: string; mime: string | null }
    | null;
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const dl = await admin.storage.from("pro-documents").download(doc.storage_key);
  if (dl.error || !dl.data) {
    console.error("[admin doc download]", dl.error);
    return new NextResponse("Download failed", { status: 500 });
  }

  const blob = dl.data as Blob;
  const buf = Buffer.from(await blob.arrayBuffer());

  return new NextResponse(buf, {
    headers: {
      "Content-Type": doc.mime ?? blob.type ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${doc.file_name.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
