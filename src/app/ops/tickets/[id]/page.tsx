import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { computeTicketSla } from "@/lib/sla";
import { Clock } from "@phosphor-icons/react/dist/ssr";
import { TICKET_STATUS_FA, PRIORITY_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";
import { isGuid } from "@/lib/dynamics/identity";
import { CrmTicket } from "@/components/crm/customer/CrmTicket";
import { addMessage } from "@/lib/app-conversations";
import { requestStep, STATUS_WORDS, ticketNumber } from "@/lib/app-api";

const STATUS_OPTIONS = ["RECEIVED", "UNDER_REVIEW", "SENT_TO_PROVIDER", "PROVIDER_PROCESSING", "COMPLETED"] as const;

async function updateStatus(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return;
  const ticketId = formData.get("ticketId") as string;
  const status = formData.get("status") as string;
  const ticket = await prisma.serviceRequest.update({ where: { id: ticketId }, data: { status: status as (typeof STATUS_OPTIONS)[number] } });
  await prisma.activityLog.create({
    data: { entityType: "service_request", entityId: ticketId, action: "status_changed", note: `Status changed to ${status}`, actorId: session.user.id },
  });
  // Requests opened in the app: mark the new status in the contract conversation, so the customer sees it in the chat.
  if (ticket.conversationId) {
    const conv = await prisma.conversation.findUnique({ where: { id: ticket.conversationId } });
    if (conv) {
      const step = STATUS_WORDS[requestStep(status)].fa;
      await addMessage(conv, { senderId: session.user.id, kind: "SYSTEM", content: `درخواست ${ticketNumber(ticket.id)}: ${step}`, serviceRequestId: ticket.id });
    }
  }
  await notifyUser(ticket.customerId, "ticket_update", "به‌روزرسانی درخواست شما", `وضعیت درخواست «${ticket.subject}» به‌روزرسانی شد.`);
  revalidatePath(`/ops/tickets/${ticketId}`);
}

async function assignToMe(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return;
  const ticketId = formData.get("ticketId") as string;
  await prisma.serviceRequest.update({ where: { id: ticketId }, data: { advisorId: session.user.id } });
  await prisma.activityLog.create({
    data: { entityType: "service_request", entityId: ticketId, action: "assigned", note: `Assigned to ${session.user.name}`, actorId: session.user.id },
  });
  revalidatePath(`/ops/tickets/${ticketId}`);
}

async function replyToTicket(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return;
  const ticketId = formData.get("ticketId") as string;
  const content = (formData.get("content") as string)?.trim();
  if (!content) return;
  const ticket = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: ticketId } });
  // A request opened in the app also lives in its contract conversation: the reply goes there too, or the
  // customer would never see it in the app.
  const conv = ticket.conversationId ? await prisma.conversation.findUnique({ where: { id: ticket.conversationId } }) : null;
  if (conv) await addMessage(conv, { senderId: session.user.id, content, serviceRequestId: ticketId });
  else await prisma.message.create({ data: { serviceRequestId: ticketId, senderId: session.user.id, content } });
  await prisma.activityLog.create({
    data: { entityType: "service_request", entityId: ticketId, action: "reply_sent", note: `Reply from ${session.user.name}`, actorId: session.user.id },
  });
  await notifyUser(ticket.customerId, "ticket_reply", "پاسخ جدید به درخواست شما", `مشاور تعرفه به درخواست «${ticket.subject}» پاسخ داد.`);
  revalidatePath(`/ops/tickets/${ticketId}`);
}

export default async function OpsTicketDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ history?: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  // Old-CRM tickets have Dynamics GUIDs; tarefe.de tickets (cuid ids) keep this page.
  if (isGuid(id)) return <CrmTicket id={id} history={(await searchParams).history} />;
  const ticket = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
      advisor: { select: { name: true } },
      contract: { select: { provider: true, productName: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true, role: true } } } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }], include: { assignee: { select: { name: true } } } },
    },
  });
  if (!ticket) notFound();

  const lastMessage = ticket.messages.at(-1);
  const sla = computeTicketSla(ticket.status, ticket.createdAt, lastMessage ? { createdAt: lastMessage.createdAt, senderRole: lastMessage.sender.role } : null);

  const activityLogs = await prisma.activityLog.findMany({
    where: { entityType: "service_request", entityId: ticket.id },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { name: true } } },
  });

  return (
    <div className="container-page py-8">
      <Link href="/ops/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به تیکت‌ها
      </Link>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-purple-900">{ticket.subject}</h1>
                <p className="mt-1 text-sm text-secondary">
                  <Link href={`/ops/customers/${ticket.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {ticket.customer.name}
                  </Link>{" "}
                  · <span className="font-latin">{ticket.customer.email}</span>
                  {ticket.contract && ` · ${ticket.contract.provider} ${ticket.contract.productName}`}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <Badge tone="neutral">{PRIORITY_FA[ticket.priority] ?? ticket.priority}</Badge>
                {sla && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${sla.breached ? "text-danger" : "text-secondary"}`}>
                    <Clock size={12} weight={sla.breached ? "fill" : "regular"} />
                    {Math.round(sla.hoursWaiting)} ساعت در انتظار پاسخ
                  </span>
                )}
              </div>
            </div>
            {ticket.description && <p className="mt-4 text-sm text-body">{ticket.description}</p>}

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <form action={updateStatus} className="flex items-center gap-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <select name="status" defaultValue={ticket.status} className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-purple-900">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {TICKET_STATUS_FA[s] ?? s}
                    </option>
                  ))}
                </select>
                <Button type="submit">به‌روزرسانی وضعیت</Button>
              </form>
              {!ticket.advisor && (
                <form action={assignToMe}>
                  <input type="hidden" name="ticketId" value={ticket.id} />
                  <Button type="submit" variant="secondary">
                    واگذاری به من
                  </Button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">گفتگو</h2>
            <div className="space-y-3">
              {ticket.messages.length === 0 && <p className="text-sm text-secondary">هنوز پیامی ثبت نشده.</p>}
              {ticket.messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] rounded-xl p-3 ${m.sender.role === "CUSTOMER" ? "bg-tint" : "ms-auto bg-purple-600/10"}`}>
                  <p className="text-xs font-semibold text-purple-900">{m.sender.name}</p>
                  <p className="mt-1 text-sm text-body">{m.content}</p>
                  <p className="mt-1 text-[10px] text-secondary">{m.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</p>
                </div>
              ))}
            </div>
            <form action={replyToTicket} className="mt-5 flex gap-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input
                name="content"
                placeholder="پاسخ خود را بنویسید…"
                className="flex-1 rounded-lg border border-border-strong bg-white px-3 py-2 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
              />
              <button type="submit" className="press rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-900">
                ارسال
              </button>
            </form>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">تسک‌ها</h2>
            <div className="mb-4">
              <QuickAddTask returnPath={`/ops/tickets/${ticket.id}`} serviceRequestId={ticket.id} />
            </div>
            <TaskList tasks={ticket.tasks} returnPath={`/ops/tickets/${ticket.id}`} />
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">فعالیت‌ها</h2>
            <ActivityTimeline entries={activityLogs} locale="fa" />
          </div>
        </div>
      </div>
    </div>
  );
}
