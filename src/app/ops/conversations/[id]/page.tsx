import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { notifyUser } from "@/lib/notifications";
import { describeService, requestStep, STATUS_WORDS, ticketNumber } from "@/lib/app-api";
import { addMessage, GENERAL_TITLE } from "@/lib/app-conversations";
import { Button } from "@/components/shared/Button";

async function reply(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return;
  const id = formData.get("conversationId") as string;
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  const conv = await prisma.conversation.findUnique({ where: { id } });
  if (!conv) return;
  await addMessage(conv, { senderId: session.user.id, content: content.slice(0, 4000) });
  await prisma.conversation.update({ where: { id }, data: { staffLastReadAt: new Date(), ...(conv.advisorId ? {} : { advisorId: session.user.id }) } });
  // Shows in the customer's notification list today; the push to the phone goes out once push sending is set up.
  await notifyUser(conv.customerId, "app_message", "پیام تازه از مشاور تعرفه", content.slice(0, 140));
  revalidatePath(`/ops/conversations/${id}`);
}

async function assignToMe(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return;
  const id = formData.get("conversationId") as string;
  await prisma.conversation.update({ where: { id }, data: { advisorId: session.user.id } });
  revalidatePath(`/ops/conversations/${id}`);
}

export default async function OpsConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) redirect("/ops");
  const { id } = await params;

  const conv = await prisma.conversation.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      contract: true,
      advisor: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, take: 300, include: { sender: { select: { name: true, role: true } }, document: { select: { id: true, title: true } } } },
    },
  });
  if (!conv) notFound();

  // Opening the conversation counts as staff having read it.
  await prisma.conversation.update({ where: { id }, data: { staffLastReadAt: new Date() } });

  const requests = await prisma.serviceRequest.findMany({
    where: conv.contractId ? { customerId: conv.customerId, OR: [{ conversationId: conv.id }, { contractId: conv.contractId }] } : { conversationId: conv.id },
    orderBy: { updatedAt: "desc" },
  });
  const title = conv.contract ? `${describeService(conv.contract.category, "fa").serviceName} · ${conv.contract.provider}` : GENERAL_TITLE.fa;

  return (
    <div className="container-page py-8">
      <Link href="/ops/conversations" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به گفتگوها
      </Link>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-6 2xl:col-span-2">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
            <div>
              <h1 className="text-xl font-bold text-purple-900">{title}</h1>
              <p className="mt-1 text-sm text-secondary">
                <Link href={`/ops/customers/${conv.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                  {conv.customer.name || conv.customer.email}
                </Link>{" "}
                · <span className="font-latin">{conv.customer.email}</span>
                {conv.customer.phone && <> · <span className="font-latin">{conv.customer.phone}</span></>}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-secondary">
              مسئول: {conv.advisor?.name ?? "ندارد"}
              {!conv.advisor && (
                <form action={assignToMe}>
                  <input type="hidden" name="conversationId" value={conv.id} />
                  <Button type="submit" variant="secondary">واگذاری به من</Button>
                </form>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {conv.messages.length === 0 && <p className="text-sm text-secondary">هنوز پیامی نیست.</p>}
            {conv.messages.map((m) =>
              m.kind === "SYSTEM" ? (
                <p key={m.id} className="mx-auto w-fit rounded-full border border-dashed border-border-strong px-3 py-1 text-xs font-semibold text-secondary">
                  {m.content}
                </p>
              ) : (
                <div key={m.id} className={`max-w-[80%] rounded-xl p-3 ${m.sender.role === "CUSTOMER" ? "bg-tint" : "ms-auto bg-purple-600/10"}`}>
                  <p className="text-xs font-semibold text-purple-900">{m.sender.name || "مشتری"}</p>
                  <p className="mt-1 whitespace-pre-line text-sm text-body">{m.content}</p>
                  {m.document && (
                    <a href={`/api/documents/${m.document.id}`} className="mt-1 inline-block text-xs font-semibold text-purple-600 hover:underline">
                      فایل: {m.document.title}
                    </a>
                  )}
                  <p className="mt-1 text-[10px] text-secondary">{m.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</p>
                </div>
              ),
            )}
          </div>

          <form action={reply} className="mt-5 flex gap-2">
            <input type="hidden" name="conversationId" value={conv.id} />
            <textarea
              name="content"
              rows={2}
              placeholder="پاسخ به مشتری…"
              className="flex-1 resize-none rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
            />
            <button type="submit" className="press self-end rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900">
              ارسال
            </button>
          </form>
        </div>

        <div className="space-y-6">
          {conv.contract && (
            <div className="rounded-2xl border border-border bg-white p-6 text-sm">
              <h2 className="mb-3 font-bold text-purple-900">قرارداد</h2>
              <p className="text-body">{conv.contract.provider} · <span className="font-latin">{conv.contract.productName}</span></p>
              {conv.contract.contractNumber && <p className="mt-1 font-latin text-secondary">{conv.contract.contractNumber}</p>}
              {conv.contract.cancellationDeadline && (
                <p className="mt-1 text-secondary">مهلت فسخ: {conv.contract.cancellationDeadline.toLocaleDateString("fa-IR", { calendar: "gregory" })}</p>
              )}
              <Link href={`/ops/customers/${conv.customer.id}`} className="mt-3 inline-block font-semibold text-purple-600 hover:underline">پرونده مشتری</Link>
            </div>
          )}
          <div className="rounded-2xl border border-border bg-white p-6 text-sm">
            <h2 className="mb-3 font-bold text-purple-900">درخواست‌های این قرارداد</h2>
            {requests.length === 0 && <p className="text-secondary">درخواستی نیست.</p>}
            <ul className="space-y-2">
              {requests.map((r) => (
                <li key={r.id}>
                  <Link href={`/ops/tickets/${r.id}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-tint">
                    <span className="text-purple-900">
                      <span className="font-latin text-secondary">{ticketNumber(r.id)}</span> {r.subject}
                    </span>
                    <span className="shrink-0 text-xs text-secondary">{STATUS_WORDS[requestStep(r.status)].fa}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
