import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "دریافت‌شده",
  UNDER_REVIEW: "در حال بررسی",
  SENT_TO_PROVIDER: "ارسال‌شده به ارائه‌دهنده",
  PROVIDER_PROCESSING: "در حال پردازش",
  COMPLETED: "تکمیل‌شده",
};

async function replyToTicket(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id) return;
  const ticketId = formData.get("ticketId") as string;
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;

  // Only the customer who owns this ticket may reply on the portal side.
  const ticket = await prisma.serviceRequest.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.customerId !== session.user.id) return;

  await prisma.message.create({ data: { serviceRequestId: ticketId, senderId: session.user.id, content } });
  await prisma.activityLog.create({
    data: { entityType: "service_request", entityId: ticketId, action: "reply_sent", note: "پاسخ توسط مشتری ارسال شد", actorId: session.user.id },
  });
  if (ticket.advisorId) {
    await notifyUser(ticket.advisorId, "ticket_reply", "پاسخ جدید مشتری", `مشتری در درخواست «${ticket.subject}» پاسخ داد.`);
  }
  revalidatePath(`/app/support/${ticketId}`);
}

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  // Same fresh-login race as PortalDashboard (app/page.tsx) — auth() can
  // return null right after sign-in. Distinguish that from "not your
  // ticket": the former should bounce to login, not show a misleading 404.
  if (!session?.user?.id) redirect(`/login?callbackUrl=/app/support/${id}`);

  const ticket = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true, role: true } } } },
      contract: { select: { provider: true, productName: true } },
    },
  });
  // A customer may only view their own ticket — not just "any ticket that exists".
  if (!ticket || ticket.customerId !== session.user.id) notFound();

  return (
    <div dir="rtl" className="container-page py-8">
      <Link href="/app/support" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به پشتیبانی
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-purple-900">{ticket.subject}</h1>
            {ticket.contract && (
              <p className="mt-1 text-sm text-secondary">
                مرتبط با: {ticket.contract.provider} {ticket.contract.productName}
              </p>
            )}
          </div>
          <span className="shrink-0 rounded-full bg-tint px-2.5 py-0.5 text-[11px] font-medium text-purple-900">{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
        </div>
        {ticket.description && <p className="mt-4 text-sm text-body">{ticket.description}</p>}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-purple-900">گفتگو</h2>
        <div className="space-y-3">
          {ticket.messages.length === 0 && <p className="text-sm text-secondary">هنوز پیامی رد و بدل نشده.</p>}
          {ticket.messages.map((m) => (
            <div key={m.id} className={`max-w-[80%] rounded-xl p-3 ${m.sender.role === "CUSTOMER" ? "me-auto bg-purple-600/10" : "bg-tint"}`}>
              <p className="text-xs font-semibold text-purple-900">{m.sender.role === "CUSTOMER" ? "شما" : m.sender.name}</p>
              <p className="mt-1 text-sm text-body">{m.content}</p>
              <p className="mt-1 text-[10px] text-secondary">{m.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</p>
            </div>
          ))}
        </div>
        <form action={replyToTicket} className="mt-5 flex gap-2">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <input
            name="content"
            placeholder="پیام خود را بنویس…"
            className="flex-1 rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
          />
          <button type="submit" className="press rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900">
            ارسال
          </button>
        </form>
      </div>
    </div>
  );
}
