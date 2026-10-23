import { prisma } from "@/lib/db";
import { ok, fail, requireUser } from "@/lib/app-api";

/** Marks everything in this conversation as read by the customer (clears its unread badge). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;
  const { id } = await params;
  const updated = await prisma.conversation.updateMany({ where: { id, customerId: user.id }, data: { customerLastReadAt: new Date() } });
  return updated.count ? ok({ read: true }) : fail(404, "not_found");
}
