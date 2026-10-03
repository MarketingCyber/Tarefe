import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readUploadedFile, contentTypeFor } from "@/lib/document-storage";
import { canAccessPipeline } from "@/lib/permissions";

/**
 * The only path any uploaded file is ever served through — never a
 * public/static URL (see src/lib/document-storage.ts's comment on why).
 * Authorization: the document's own owner, or pipeline-capable staff
 * (ADVISOR/ADMIN/LEAD_MANAGER) — a customer document is pipeline data, not
 * something CONTENT_EDITOR/ANALYST have any reason to reach. Anyone else —
 * including another signed-in customer — gets 403, not a redirect to
 * login (they may well be logged in, just not allowed to see this
 * specific document).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !doc.fileUrl) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = doc.ownerId === session.user.id;
  const isStaff = canAccessPipeline(session.user.role);
  if (!isOwner && !isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const buffer = await readUploadedFile(doc.fileUrl).catch(() => null);
  if (!buffer) return NextResponse.json({ error: "File missing on disk" }, { status: 404 });

  // Buffer's ArrayBufferLike type admits SharedArrayBuffer, which Blob's
  // stricter BodyInit type doesn't accept — Uint8Array.from() copies into
  // a fresh, definitely-plain ArrayBuffer, sidestepping the mismatch.
  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(doc.fileUrl),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
