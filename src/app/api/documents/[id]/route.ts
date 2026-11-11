import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { readDocumentFile } from "@/lib/document-storage";
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

  const file = await readDocumentFile(doc.fileUrl, doc.title).catch(() => null);
  if (!file) return NextResponse.json({ error: "File missing" }, { status: 404 });
  return new NextResponse(file.body, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
