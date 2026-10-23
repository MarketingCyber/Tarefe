import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { describeService } from "@/lib/app-api";
import { GENERAL_TITLE } from "@/lib/app-conversations";

/**
 * Staff side of the mobile app chat (2026-10-23): one conversation per customer per contract, plus each
 * customer's general conversation. "Waiting" = the customer wrote after staff last opened it. Default view is
 * the conversations assigned to me plus unassigned ones; "all" shows everyone's.
 */
export default async function OpsConversationsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) redirect("/ops");
  const { view } = await searchParams;
  const showAll = view === "all";

  const conversations = await prisma.conversation.findMany({
    where: {
      messages: { some: {} },
      ...(showAll ? {} : { OR: [{ advisorId: session.user.id }, { advisorId: null }] }),
    },
    include: {
      customer: { select: { name: true, email: true } },
      contract: { select: { provider: true, category: true } },
      advisor: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { role: true } } } },
    },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
  });

  const rows = await Promise.all(
    conversations.map(async (c) => {
      const waiting = await prisma.message.count({
        where: { conversationId: c.id, kind: "TEXT", senderId: c.customerId, ...(c.staffLastReadAt ? { createdAt: { gt: c.staffLastReadAt } } : {}) },
      });
      return { c, waiting, last: c.messages[0] };
    }),
  );

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">گفتگوهای اپ</h1>
          <p className="mt-1 text-sm text-secondary">هر قرارداد مشتری یک گفتگوی جدا دارد. «در انتظار» یعنی مشتری نوشته و هنوز کسی باز نکرده.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/ops/conversations" className={`rounded-lg px-3 py-1.5 font-medium ${!showAll ? "bg-purple-600 text-white" : "border border-border bg-white text-purple-900"}`}>
            مال من و بدون مسئول
          </Link>
          <Link href="/ops/conversations?view=all" className={`rounded-lg px-3 py-1.5 font-medium ${showAll ? "bg-purple-600 text-white" : "border border-border bg-white text-purple-900"}`}>
            همه
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        {rows.length === 0 && <p className="p-6 text-sm text-secondary">هنوز گفتگویی نیست.</p>}
        {rows.map(({ c, waiting, last }) => (
          <Link key={c.id} href={`/ops/conversations/${c.id}`} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0 hover:bg-tint">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-purple-900">
                {c.customer.name || <span className="font-latin">{c.customer.email}</span>}
                <span className="font-normal text-secondary"> · {c.contract ? `${describeService(c.contract.category, "fa").serviceName} · ${c.contract.provider}` : GENERAL_TITLE.fa}</span>
              </p>
              {last && (
                <p className="mt-1 truncate text-sm text-secondary">
                  {last.sender.role === "CUSTOMER" ? "مشتری: " : ""}
                  {last.content}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
              {waiting > 0 && <span className="rounded-full bg-purple-600 px-2 py-0.5 font-semibold text-white">{waiting.toLocaleString("fa-IR")} در انتظار</span>}
              <span className="text-secondary">{c.advisor?.name ?? "بدون مسئول"}</span>
              <span className="text-secondary">{c.lastMessageAt.toLocaleString("fa-IR", { calendar: "gregory", dateStyle: "short", timeStyle: "short" })}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
