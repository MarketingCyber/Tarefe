import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { computeTicketSla, TICKET_SLA_BREACH_HOURS } from "@/lib/sla";
import { Headset, Clock } from "@phosphor-icons/react/dist/ssr";
import { TICKET_STATUS_FA, PRIORITY_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";

const STATUS_TONE: Record<string, BadgeTone> = {
  RECEIVED: "purple",
  UNDER_REVIEW: "neutral",
  SENT_TO_PROVIDER: "warning",
  PROVIDER_PROCESSING: "warning",
  COMPLETED: "success",
};
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-secondary",
  NORMAL: "text-body",
  HIGH: "text-warning",
  URGENT: "text-danger",
};

export default async function OpsTicketsPage() {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const tickets = await prisma.serviceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { id: true, name: true, email: true } },
      advisor: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { role: true } } } },
    },
    take: 100,
  });

  const withSla = tickets.map((t) => ({
    ticket: t,
    sla: computeTicketSla(t.status, t.createdAt, t.messages[0] ? { createdAt: t.messages[0].createdAt, senderRole: t.messages[0].sender.role } : null),
  }));
  const breachedCount = withSla.filter((t) => t.sla?.breached).length;

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">تیکت‌ها</h1>
      <p className="mt-1 text-sm text-secondary">
        درخواست‌های پشتیبانی مشتریان — لغو قرارداد، تغییر آدرس، سوالات صورتحساب، خسارت‌ها.
        {breachedCount > 0 && (
          <span className="ms-2 font-semibold text-danger">
            {breachedCount} تیکت بیش از {TICKET_SLA_BREACH_HOURS} ساعت منتظر پاسخ‌اند.
          </span>
        )}
      </p>

      {tickets.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Headset} title="هنوز تیکتی ثبت نشده" body="با ثبت تیکت توسط مشتری در پنل خودش، همین‌جا نمایش داده می‌شود." />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">موضوع</th>
                <th className="px-4 py-3 text-start font-medium">مشتری</th>
                <th className="px-4 py-3 text-start font-medium">اولویت</th>
                <th className="px-4 py-3 text-start font-medium">وضعیت</th>
                <th className="px-4 py-3 text-start font-medium">SLA</th>
                <th className="px-4 py-3 text-start font-medium">مشاور</th>
                <th className="px-4 py-3 text-start font-medium">ایجاد</th>
              </tr>
            </thead>
            <tbody>
              {withSla.map(({ ticket, sla }) => (
                <tr key={ticket.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-purple-900">
                    <Link href={`/ops/tickets/${ticket.id}`} className="hover:text-purple-600 hover:underline">
                      {ticket.subject}
                    </Link>
                    <p className="text-xs font-normal text-secondary">{ticket.subjectType}</p>
                  </td>
                  <td className="px-4 py-3 text-secondary">
                    <Link href={`/ops/customers/${ticket.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {ticket.customer.name}
                    </Link>
                    <br />
                    <span className="font-latin text-xs">{ticket.customer.email}</span>
                  </td>
                  <td className={`px-4 py-3 text-xs font-semibold ${PRIORITY_COLORS[ticket.priority]}`}>{PRIORITY_FA[ticket.priority] ?? ticket.priority}</td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUS_TONE[ticket.status]}>{TICKET_STATUS_FA[ticket.status] ?? ticket.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {sla ? (
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${sla.breached ? "text-danger" : "text-secondary"}`}>
                        <Clock size={12} weight={sla.breached ? "fill" : "regular"} />
                        {Math.round(sla.hoursWaiting)} ساعت در انتظار
                      </span>
                    ) : (
                      <span className="text-xs text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary">{ticket.advisor?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{ticket.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
