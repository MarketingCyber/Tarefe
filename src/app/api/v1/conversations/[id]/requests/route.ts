import { prisma } from "@/lib/db";
import { ok, fail, readJson, requireUser, describeService, REQUEST_TOPICS, ticketNumber } from "@/lib/app-api";
import { addMessage, conversationTitle, findOwnConversation, serializeRequest } from "@/lib/app-conversations";
import { notifyUser } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import type { Locale } from "@/lib/taxonomy";

const OPENED: Record<Locale, (n: string, topic: string) => string> = {
  fa: (n, t) => `درخواست ${n} باز شد: ${t}`,
  de: (n, t) => `Anfrage ${n} eröffnet: ${t}`,
  ru: (n, t) => `Запрос ${n} открыт: ${t}`,
};

/**
 * Opens a request (ticket) for this contract. The topic must be one of the topics for the contract's kind; the
 * request is linked to the contract and to its conversation, and a small system message marks it in the chat.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  if (!rateLimit(`app-request:${user.id}`, 10).allowed) return fail(429, "too_many_requests");
  const { id } = await params;

  const conv = await findOwnConversation(user.id, id);
  if (!conv) return fail(404, "not_found");

  const body = await readJson<{ topic?: unknown; description?: unknown }>(request);
  const kind = conv.contract ? describeService(conv.contract.category, user.locale).kind : "general";
  const topic = REQUEST_TOPICS[kind].find((t) => t.key === body?.topic);
  if (!topic) return fail(400, "invalid_topic", "Choose a topic");
  const description = typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : "";

  const created = await prisma.serviceRequest.create({
    data: {
      subjectType: topic.key,
      subject: topic.label[user.locale],
      description: description || null,
      customerId: user.id,
      advisorId: conv.advisorId,
      contractId: conv.contractId,
      conversationId: conv.id,
    },
  });
  await addMessage(conv, { senderId: user.id, kind: "SYSTEM", content: OPENED[user.locale](ticketNumber(created.id), topic.label[user.locale]), serviceRequestId: created.id });

  if (conv.advisorId) {
    await notifyUser(conv.advisorId, "app_request", `درخواست تازه ${ticketNumber(created.id)}`, `${topic.label.fa} · ${conversationTitle(conv, "fa")}`);
  }
  return ok({ request: serializeRequest(created, user.locale) }, 201);
}
