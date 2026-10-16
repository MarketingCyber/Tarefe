import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { Badge } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { LEAD_STATUS_FA } from "@/lib/status-labels";
import { trackServer } from "@/lib/analytics-server";
import { EVENT } from "@/lib/analytics";
import { canAccessPipeline } from "@/lib/permissions";
import { LeadAttributionPanel } from "@/components/crm/LeadAttribution";

const STATUS_OPTIONS = ["NEW", "CONTACTED", "QUALIFIED", "CONSULTATION_SCHEDULED", "APPLICATION_STARTED", "APPLICATION_SUBMITTED", "CONTRACT_ACTIVE", "LOST"] as const;

async function updateStatus(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return;
  const leadId = formData.get("leadId") as string;
  const status = formData.get("status") as string;
  await prisma.lead.update({ where: { id: leadId }, data: { status: status as (typeof STATUS_OPTIONS)[number] } });
  await prisma.activityLog.create({
    data: { entityType: "lead", entityId: leadId, action: "status_changed", note: `Status changed to ${status}`, actorId: session.user.id, leadId },
  });
  await trackServer(EVENT.LEAD_STATUS_CHANGED, { userId: session.user.id, metadata: { leadId, status } });
  revalidatePath(`/ops/leads/${leadId}`);
}

async function assignToMe(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return;
  const leadId = formData.get("leadId") as string;
  await prisma.lead.update({ where: { id: leadId }, data: { assignedAdvisorId: session.user.id } });
  await prisma.activityLog.create({
    data: { entityType: "lead", entityId: leadId, action: "assigned", note: `Assigned to ${session.user.name}`, actorId: session.user.id, leadId },
  });
  revalidatePath(`/ops/leads/${leadId}`);
}

async function addNote(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return;
  const leadId = formData.get("leadId") as string;
  const note = (formData.get("note") as string)?.trim();
  if (!note) return;
  await prisma.activityLog.create({ data: { entityType: "lead", entityId: leadId, action: "note_added", note, actorId: session.user.id, leadId } });
  revalidatePath(`/ops/leads/${leadId}`);
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedAdvisor: { select: { name: true } },
      activityLogs: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true } } } },
      tasks: { orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }], include: { assignee: { select: { name: true } } } },
    },
  });
  if (!lead) notFound();

  return (
    <div className="container-page py-8">
      <Link href="/ops/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به لیدها
      </Link>

      <div className="grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          <div className="rounded-2xl border border-border bg-white p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-purple-900">{lead.name}</h1>
                <p className="font-latin mt-1 text-sm text-secondary">
                  {lead.phone ?? "—"} · {lead.email ?? "—"}
                </p>
              </div>
              <Badge tone="neutral">{LEAD_STATUS_FA[lead.status] ?? lead.status}</Badge>
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-secondary">خدمت</dt>
                <dd className="mt-0.5 text-body">
                  {lead.category ?? "—"} {lead.serviceSlug ? `/ ${lead.serviceSlug}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">صفحه منبع</dt>
                <dd className="font-latin mt-0.5 text-body">{lead.sourcePage ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">مشاور واگذارشده</dt>
                <dd className="mt-0.5 text-body">{lead.assignedAdvisor?.name ?? "بدون مشاور"}</dd>
              </div>
              <div>
                <dt className="text-xs text-secondary">دریافت</dt>
                <dd className="mt-0.5 text-body">{lead.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</dd>
              </div>
            </dl>

            <LeadAttributionPanel lead={lead} />

            <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
              <form action={updateStatus} className="flex items-center gap-2">
                <input type="hidden" name="leadId" value={lead.id} />
                <select name="status" defaultValue={lead.status} className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium text-purple-900">
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {LEAD_STATUS_FA[s] ?? s}
                    </option>
                  ))}
                </select>
                <Button type="submit">به‌روزرسانی وضعیت</Button>
              </form>
              {!lead.assignedAdvisor && (
                <form action={assignToMe}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <Button type="submit" variant="secondary">
                    واگذاری به من
                  </Button>
                </form>
              )}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">تسک‌ها</h2>
            <div className="mb-4">
              <QuickAddTask returnPath={`/ops/leads/${lead.id}`} leadId={lead.id} />
            </div>
            <TaskList tasks={lead.tasks} returnPath={`/ops/leads/${lead.id}`} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-bold text-purple-900">فعالیت‌ها</h2>
          <form action={addNote} className="mb-5 flex gap-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <input
              name="note"
              placeholder="یادداشتی اضافه کن…"
              className="flex-1 rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
            />
            <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900">
              افزودن
            </button>
          </form>
          <ActivityTimeline entries={lead.activityLogs} locale="fa" />
        </div>
      </div>
    </div>
  );
}
