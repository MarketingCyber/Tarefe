import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { Badge } from "@/components/shared/Badge";
import { LEAD_STATUS_FA, TICKET_STATUS_FA } from "@/lib/status-labels";

/**
 * Per Phase 2's "CRM workspace + account-manager 'My Work' dashboard" —
 * distinct from the org-wide /ops overview: everything scoped to the
 * currently signed-in advisor's own assigned leads and tickets, so an
 * advisor's actual daily queue doesn't require filtering the full lists
 * by eye every time.
 */
export default async function MyWorkPage() {
  const session = await auth();
  // See PortalDashboard (app/page.tsx) — same fix, same reason: don't trust
  // the layout's auth gate blindly here, auth() has been seen returning
  // null on a fresh-login race.
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/my-work");
  const advisorId = session.user.id;

  const [myLeads, myTickets, myTasks] = await Promise.all([
    prisma.lead.findMany({
      where: { assignedAdvisorId: advisorId, status: { notIn: ["CONTRACT_ACTIVE", "LOST"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.serviceRequest.findMany({
      where: { advisorId, status: { not: "COMPLETED" } },
      orderBy: { updatedAt: "desc" },
      include: { customer: { select: { name: true } } },
      take: 20,
    }),
    // Overdue and open tasks assigned to me — the plan's "Overdue Tasks /
    // Follow-ups Today" slice of the account-manager dashboard (8.3).
    prisma.task.findMany({
      where: { assigneeId: advisorId, status: "OPEN" },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      include: {
        assignee: { select: { name: true } },
        lead: { select: { id: true, name: true } },
        contract: { select: { id: true, provider: true, productName: true } },
        serviceRequest: { select: { id: true, subject: true } },
        customer: { select: { id: true, name: true } },
      },
      take: 30,
    }),
  ]);

  function linkFor(task: (typeof myTasks)[number]) {
    if (task.lead) return { href: `/ops/leads/${task.lead.id}`, label: task.lead.name };
    if (task.serviceRequest) return { href: `/ops/tickets/${task.serviceRequest.id}`, label: task.serviceRequest.subject };
    if (task.contract) return { href: `/ops/contracts`, label: `${task.contract.provider} — ${task.contract.productName}` };
    if (task.customer) return { href: `/ops/leads`, label: task.customer.name };
    return null;
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">کارهای من</h1>
      <p className="mt-1 text-sm text-secondary">لیدها و تیکت‌های واگذارشده به شما که هنوز بسته نشده‌اند، {session?.user?.name}.</p>

      <div className="mt-6 rounded-2xl border border-border bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-purple-900">تسک‌های من ({myTasks.length})</h2>
        <div className="mb-4">
          <QuickAddTask returnPath="/ops/my-work" />
        </div>
        <TaskList tasks={myTasks.map((t) => ({ ...t, link: linkFor(t) }))} returnPath="/ops/my-work" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-bold text-purple-900">لیدهای من ({myLeads.length})</h2>
          {myLeads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-white py-10 text-center">
              <p className="text-sm text-secondary">در حال حاضر چیزی به شما واگذار نشده.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myLeads.map((lead) => (
                <Link key={lead.id} href={`/ops/leads/${lead.id}`} className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">{lead.name}</p>
                    <p className="text-xs text-secondary">
                      {lead.category ?? "—"} {lead.serviceSlug ? `/ ${lead.serviceSlug}` : ""}
                    </p>
                  </div>
                  <Badge>{LEAD_STATUS_FA[lead.status] ?? lead.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-bold text-purple-900">تیکت‌های من ({myTickets.length})</h2>
          {myTickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border-strong bg-white py-10 text-center">
              <p className="text-sm text-secondary">در حال حاضر چیزی به شما واگذار نشده.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myTickets.map((ticket) => (
                <Link key={ticket.id} href={`/ops/tickets/${ticket.id}`} className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600">
                  <div>
                    <p className="text-sm font-semibold text-purple-900">{ticket.subject}</p>
                    <p className="text-xs text-secondary">{ticket.customer.name}</p>
                  </div>
                  <Badge>{TICKET_STATUS_FA[ticket.status] ?? ticket.status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
