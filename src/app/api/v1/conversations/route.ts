import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/app-api";
import { conversationTitle, ensureConversations, requestsWhere, serializeContract, unreadCount } from "@/lib/app-conversations";

/**
 * The Support tab's "which contract?" list: one row per contract plus the general conversation, each with the
 * last message, unread count and open requests. Contract rows come first (most recent activity first), the
 * general conversation last.
 */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  await ensureConversations(user.id);
  const conversations = await prisma.conversation.findMany({
    where: { customerId: user.id, OR: [{ contractId: null }, { contract: { status: { not: "CANCELLED" } } }] },
    include: { contract: true, advisor: { select: { name: true } } },
    orderBy: { lastMessageAt: "desc" },
  });

  const rows = await Promise.all(
    conversations.map(async (conv) => {
      const [last, unread, openRequests] = await Promise.all([
        prisma.message.findFirst({ where: { conversationId: conv.id, kind: "TEXT" }, orderBy: { createdAt: "desc" } }),
        unreadCount(conv),
        prisma.serviceRequest.count({ where: { ...requestsWhere(conv), status: { not: "COMPLETED" } } }),
      ]);
      return {
        id: conv.id,
        title: conversationTitle(conv, user.locale),
        contract: conv.contract ? serializeContract(conv.contract, user.locale) : null,
        advisor: conv.advisor?.name ? { name: conv.advisor.name } : null,
        lastMessage: last ? { text: last.content, fromMe: last.senderId === user.id, at: last.createdAt } : null,
        unread,
        openRequests,
        lastMessageAt: conv.lastMessageAt,
      };
    }),
  );

  // Contracts first, most recent message first, contracts without messages after those; general last.
  const lastAt = (r: (typeof rows)[number]) => (r.lastMessage ? new Date(r.lastMessage.at).getTime() : 0);
  rows.sort((a, b) => Number(!a.contract) - Number(!b.contract) || lastAt(b) - lastAt(a));
  return ok({ conversations: rows, unreadTotal: rows.reduce((s, r) => s + r.unread, 0) });
}
