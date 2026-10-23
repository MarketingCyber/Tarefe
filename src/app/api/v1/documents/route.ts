import { prisma } from "@/lib/db";
import { ok, fail, requireUser, describeService } from "@/lib/app-api";
import { ALLOWED_MIME_TYPES, UploadValidationError, saveUploadedFile } from "@/lib/document-storage";
import { addMessage, findOwnConversation } from "@/lib/app-conversations";
import { rateLimit } from "@/lib/rate-limit";
import type { DocumentType } from "@prisma/client";

// Owner's rule for the app (2026-10-23): PDF, JPG, PNG or WEBP, up to 10 MB.
const APP_MAX_BYTES = 10 * 1024 * 1024;
const TYPES: DocumentType[] = ["CONTRACT", "POLICY", "INVOICE", "LETTER", "ID_DOC", "CERTIFICATE", "OTHER"];

/** All of the customer's documents, each with the contract it belongs to (the app groups them by contract). */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const docs = await prisma.document.findMany({
    where: { ownerId: user.id },
    orderBy: { uploadedAt: "desc" },
    include: { contract: { select: { id: true, provider: true, category: true } } },
  });
  return ok({
    documents: docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      uploadedAt: d.uploadedAt,
      fromTarefe: d.uploadedByStaff,
      hasFile: Boolean(d.fileUrl),
      contract: d.contract ? { id: d.contract.id, provider: d.contract.provider, serviceName: describeService(d.contract.category, user.locale).serviceName } : null,
    })),
  });
}

/**
 * Upload (multipart form): `file`, optional `title`, `type`, `contractId`, `conversationId`. When sent from a
 * contract conversation, the file is filed under that contract and appears in the chat as an attachment.
 */
export async function POST(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  if (!rateLimit(`app-upload:${user.id}`, 10).allowed) return fail(429, "too_many_requests");

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail(400, "missing_file");
  if (file.size > APP_MAX_BYTES) return fail(400, "file_too_large", "Up to 10 MB");
  if (!ALLOWED_MIME_TYPES.includes(file.type)) return fail(400, "file_type", "PDF, JPG, PNG or WEBP");

  const conversationId = typeof form?.get("conversationId") === "string" ? String(form?.get("conversationId")) : "";
  const conv = conversationId ? await findOwnConversation(user.id, conversationId) : null;
  if (conversationId && !conv) return fail(400, "invalid_conversation");

  let contractId = typeof form?.get("contractId") === "string" ? String(form?.get("contractId")) : conv?.contractId ?? null;
  if (contractId) {
    const owned = await prisma.contract.findFirst({ where: { id: contractId, customerId: user.id }, select: { id: true } });
    if (!owned) contractId = null;
  }

  const rawType = String(form?.get("type") ?? "OTHER").toUpperCase() as DocumentType;
  const title = (typeof form?.get("title") === "string" && String(form?.get("title")).trim()) || file.name || "Document";

  let stored;
  try {
    stored = await saveUploadedFile(file);
  } catch (error) {
    if (error instanceof UploadValidationError) return fail(400, "invalid_file", error.message);
    throw error;
  }

  const doc = await prisma.document.create({
    data: { title: title.slice(0, 120), type: TYPES.includes(rawType) ? rawType : "OTHER", fileUrl: stored.storagePath, ownerId: user.id, contractId },
  });
  if (conv) await addMessage(conv, { senderId: user.id, content: doc.title, documentId: doc.id });

  return ok({ document: { id: doc.id, title: doc.title, type: doc.type, uploadedAt: doc.uploadedAt, contractId } }, 201);
}
