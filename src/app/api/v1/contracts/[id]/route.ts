import { prisma } from "@/lib/db";
import { ok, fail, requireUser } from "@/lib/app-api";
import { ensureConversations, serializeContract } from "@/lib/app-conversations";

/** One contract with its documents and a pointer to its conversation (for "chat and requests of this contract"). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;

  const contract = await prisma.contract.findFirst({
    where: { id, customerId: user.id },
    include: { documents: { orderBy: { uploadedAt: "desc" }, select: { id: true, title: true, type: true, uploadedAt: true, uploadedByStaff: true } } },
  });
  if (!contract) return fail(404, "not_found");

  await ensureConversations(user.id);
  const conversation = await prisma.conversation.findFirst({ where: { customerId: user.id, contractId: contract.id }, select: { id: true } });
  const openRequests = await prisma.serviceRequest.count({ where: { customerId: user.id, contractId: contract.id, status: { not: "COMPLETED" } } });

  return ok({
    contract: serializeContract(contract, user.locale),
    documents: contract.documents,
    conversationId: conversation?.id ?? null,
    openRequests,
  });
}
