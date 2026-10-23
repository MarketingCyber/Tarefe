import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fail, requireUser } from "@/lib/app-api";
import { contentTypeFor, readUploadedFile } from "@/lib/document-storage";

/** Streams one of the customer's own files to the app. Never a public URL; always checked against the owner. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;

  const doc = await prisma.document.findFirst({ where: { id, ownerId: user.id } });
  if (!doc?.fileUrl) return fail(404, "not_found");
  const buffer = await readUploadedFile(doc.fileUrl).catch(() => null);
  if (!buffer) return fail(404, "file_missing");

  return new NextResponse(new Blob([Uint8Array.from(buffer)]), {
    headers: {
      "Content-Type": contentTypeFor(doc.fileUrl),
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
