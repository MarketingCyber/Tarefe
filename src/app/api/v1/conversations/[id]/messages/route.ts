import { prisma } from "@/lib/db";
import { ok, fail, readJson, requireUser } from "@/lib/app-api";
import { addMessage, conversationTitle, findOwnConversation, serializeMessage } from "@/lib/app-conversations";
import { notifyUser } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";

const MAX_LENGTH = 4000;

/** The customer writes in a contract conversation, optionally with a file they already uploaded. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  if (!rateLimit(`app-msg:${user.id}`, 30).allowed) return fail(429, "too_many_requests");
  const { id } = await params;

  const conv = await findOwnConversation(user.id, id);
  if (!conv) return fail(404, "not_found");

  const body = await readJson<{ text?: unknown; documentId?: unknown }>(request);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const documentId = typeof body?.documentId === "string" ? body.documentId : null;
  if (!text && !documentId) return fail(400, "empty_message");
  if (text.length > MAX_LENGTH) return fail(400, "message_too_long", `Up to ${MAX_LENGTH} characters`);

  let attachmentTitle: string | null = null;
  if (documentId) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, ownerId: user.id }, select: { title: true } });
    if (!doc) return fail(400, "invalid_document");
    attachmentTitle = doc.title;
  }

  const message = await addMessage(conv, { senderId: user.id, content: text || attachmentTitle || "", documentId });

  // Tell the assigned advisor inside /ops. (The ops conversation view is the staff side of this chat.)
  if (conv.advisorId) {
    await notifyUser(conv.advisorId, "app_message", `پیام تازه: ${conversationTitle(conv, "fa")}`, (text || attachmentTitle || "").slice(0, 140));
  }
  return ok({ message: serializeMessage(message, user.id) }, 201);
}
