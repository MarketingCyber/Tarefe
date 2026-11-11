import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fail, requireUser } from "@/lib/app-api";
import { readDocumentFile } from "@/lib/document-storage";

/** Streams one of the customer's own files to the app. Never a public URL; always checked against the owner. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;

  const doc = await prisma.document.findFirst({ where: { id, ownerId: user.id } });
  if (!doc?.fileUrl) return fail(404, "not_found");
  const file = await readDocumentFile(doc.fileUrl, doc.title).catch(() => null);
  if (!file) return fail(404, "file_missing");

  return new NextResponse(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
