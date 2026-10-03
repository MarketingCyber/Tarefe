"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { prisma } from "./db";
import { saveUploadedFile, deleteUploadedFile, UploadValidationError } from "./document-storage";
import { trackServer } from "./analytics-server";
import { EVENT } from "./analytics";
import { canAccessPipeline } from "./permissions";

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return null;
  return session;
}

/**
 * Staff-only — documents are things Tarefe gives a customer (a contract
 * copy, a policy PDF), not something customers self-serve upload here.
 * That matches the existing product shape: /app/documents has always
 * been read-only for customers, this just finally gives it something
 * real to read.
 */
export async function uploadDocument(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const ownerId = formData.get("ownerId") as string;
  const title = (formData.get("title") as string)?.trim();
  const type = (formData.get("type") as string) || "OTHER";
  const contractId = (formData.get("contractId") as string) || null;
  const returnPath = (formData.get("returnPath") as string) || `/ops/customers/${ownerId}`;
  const file = formData.get("file") as File | null;

  if (!ownerId || !title || !file || file.size === 0) {
    redirect(`${returnPath}?docError=missing_fields`);
  }

  let saved;
  try {
    saved = await saveUploadedFile(file);
  } catch (e) {
    const message = e instanceof UploadValidationError ? e.message : "upload_failed";
    redirect(`${returnPath}?docError=${encodeURIComponent(message)}`);
  }

  const doc = await prisma.document.create({
    data: {
      title,
      type: type as "CONTRACT" | "POLICY" | "INVOICE" | "LETTER" | "ID_DOC" | "CERTIFICATE" | "OTHER",
      fileUrl: saved.storagePath,
      ownerId,
      contractId,
    },
  });

  await prisma.activityLog.create({
    data: { entityType: "document", entityId: doc.id, action: "uploaded", note: `Uploaded "${title}"`, actorId: session.user.id },
  });
  await trackServer(EVENT.DOCUMENT_UPLOADED, { userId: session.user.id, metadata: { documentId: doc.id, type } });

  revalidatePath(returnPath);
  revalidatePath("/app/documents");
}

export async function deleteDocument(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const returnPath = (formData.get("returnPath") as string) || "/ops";

  const doc = await prisma.document.delete({ where: { id } });
  if (doc.fileUrl) await deleteUploadedFile(doc.fileUrl);

  revalidatePath(returnPath);
  revalidatePath("/app/documents");
}
