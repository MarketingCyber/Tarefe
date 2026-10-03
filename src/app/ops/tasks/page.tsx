import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ListChecks } from "@phosphor-icons/react/dist/ssr";

/**
 * Org-wide task list (Phase 8.4) — /ops/my-work shows the "mine, due soon"
 * slice of this same data; this page is the full list with filters, for
 * triage/assignment across the team.
 */
export default async function TasksPage({ searchParams }: { searchParams: Promise<{ scope?: string; status?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/tasks");

  const { scope = "mine", status = "open" } = await searchParams;

  const tasks = await prisma.task.findMany({
    where: {
      ...(scope === "mine" ? { assigneeId: session.user.id } : {}),
      ...(status === "open" ? { status: "OPEN" } : status === "done" ? { status: "DONE" } : {}),
    },
    orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
    include: {
      assignee: { select: { name: true } },
      lead: { select: { id: true, name: true } },
      contract: { select: { id: true, provider: true, productName: true } },
      serviceRequest: { select: { id: true, subject: true } },
      customer: { select: { id: true, name: true } },
    },
    take: 100,
  });

  function linkFor(task: (typeof tasks)[number]) {
    if (task.lead) return { href: `/ops/leads/${task.lead.id}`, label: task.lead.name };
    if (task.serviceRequest) return { href: `/ops/tickets/${task.serviceRequest.id}`, label: task.serviceRequest.subject };
    if (task.contract) return { href: `/ops/contracts`, label: `${task.contract.provider} — ${task.contract.productName}` };
    if (task.customer) return { href: `/ops/leads`, label: task.customer.name };
    return null;
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">تسک‌ها</h1>
      <p className="mt-1 text-sm text-secondary">پیگیری‌ها و کارهای باقی‌مانده روی لیدها، قراردادها و تیکت‌ها.</p>

      <div className="mt-6 rounded-2xl border border-border bg-white p-4">
        <QuickAddTask returnPath="/ops/tasks" />
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs font-medium">
        <FilterLink label="تسک‌های من" active={scope === "mine"} href={`/ops/tasks?scope=mine&status=${status}`} />
        <FilterLink label="همه" active={scope === "all"} href={`/ops/tasks?scope=all&status=${status}`} />
        <span className="mx-1 text-border-strong">·</span>
        <FilterLink label="باز" active={status === "open"} href={`/ops/tasks?scope=${scope}&status=open`} />
        <FilterLink label="انجام‌شده" active={status === "done"} href={`/ops/tasks?scope=${scope}&status=done`} />
        <FilterLink label="همه" active={status === "all"} href={`/ops/tasks?scope=${scope}&status=all`} />
      </div>

      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="چیزی اینجا نیست" body="یکی از بالا اضافه کنید، یا فیلترها را عوض کنید تا تسک‌های محدوده یا وضعیت دیگری را ببینید." />
        ) : (
          <TaskList tasks={tasks.map((t) => ({ ...t, link: linkFor(t) }))} returnPath="/ops/tasks" />
        )}
      </div>
    </div>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1.5 transition-colors ${active ? "bg-purple-600 text-white" : "border border-border-strong text-purple-900 hover:border-purple-600"}`}>
      {label}
    </Link>
  );
}
