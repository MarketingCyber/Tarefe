import { prisma } from "@/lib/db";
import { ok, fail, requireUser, describeService, REQUEST_TOPICS } from "@/lib/app-api";
import { conversationTitle, findOwnConversation, requestsWhere, serializeContract, serializeMessage, serializeRequest } from "@/lib/app-conversations";

const PAGE = 200;

/** One contract conversation: its messages (oldest first), its requests, and the request topics that fit it. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;

  const conv = await findOwnConversation(user.id, id);
  if (!conv) return fail(404, "not_found");

  const [messages, requests] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: "desc" },
      take: PAGE,
      include: { sender: { select: { id: true, name: true } }, document: { select: { id: true, title: true } } },
    }),
    prisma.serviceRequest.findMany({ where: requestsWhere(conv), orderBy: { updatedAt: "desc" } }),
  ]);

  const kind = conv.contract ? describeService(conv.contract.category, user.locale).kind : "general";
  return ok({
    id: conv.id,
    title: conversationTitle(conv, user.locale),
    contract: conv.contract ? serializeContract(conv.contract, user.locale) : null,
    advisor: conv.advisor?.name ? { name: conv.advisor.name } : null,
    messages: messages.reverse().map((m) => serializeMessage(m, user.id)),
    // Open requests first, then finished ones; newest activity first within each group.
    requests: requests.map((r) => serializeRequest(r, user.locale)).sort((a, b) => Number(a.step === 2) - Number(b.step === 2)),
    topics: REQUEST_TOPICS[kind].map((t) => ({ key: t.key, label: t.label[user.locale] })),
  });
}
