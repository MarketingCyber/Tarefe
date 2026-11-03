import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readUploadedFile } from "@/lib/document-storage";
import { canAccessPipeline } from "@/lib/permissions";

/**
 * GET /api/crm-files/[id] — a file attached to an old-CRM note (id = the note's Dynamics GUID), copied by
 * lib/dynamics/files.ts. Pipeline staff only, like the rest of the old-CRM data; never a public URL. PDFs and
 * images open in the browser, everything else downloads.
 */
const INLINE = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!canAccessPipeline(session.user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const file = await prisma.crmFile.findUnique({ where: { annotationId: id.toLowerCase() } });
  if (!file)
    return new NextResponse("<!doctype html><meta charset=utf-8><p dir=rtl style=font-family:sans-serif>این فایل هنوز از CRM قدیم کپی نشده — چند دقیقه دیگر دوباره امتحان کنید.</p>", {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });

  const buffer = await readUploadedFile(file.storagePath).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "File missing on disk" }, { status: 404 });

  const type = file.mimeType && /^[\w.+-]+\/[\w.+-]+$/.test(file.mimeType) ? file.mimeType : "application/octet-stream";
  const disposition = INLINE.includes(type) ? "inline" : "attachment";
  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    status: 200,
    headers: {
      "Content-Type": type,
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(file.fileName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
