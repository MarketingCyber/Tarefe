import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { FilterChip, HISTORY_TYPES, shown, shownDate } from "@/components/crm/customer/OldCrmParts";
import { crmUserOf, crmUsers } from "@/lib/crm/crm-users";
import { setMyCrmUser } from "@/lib/crm/crm-user-actions";
import { ListChecks } from "@phosphor-icons/react/dist/ssr";

/**
 * Tasks across both CRMs.
 *  - old CRM (default for pipeline roles): open Dynamics tasks, phone calls and appointments, by due date
 *    (crm_records.dueAt) — overdue / today / this week / later / no date — for one operator ("mine" = the Dynamics
 *    user the staff member picked, or the one with their e-mail) or everyone, each linked to the contract, customer
 *    or ticket it's about. Read-only until write-back to Dynamics exists.
 *  - site: tasks created on tarefe.de (Phase 8.4), open to every staff role; /ops/my-work shows the "mine, due soon"
 *    slice of these.
 */
export const dynamic = "force-dynamic";

const PAGE = 100;
const DAY = 86_400_000;
const OPEN_ACTIVITIES = ["task", "phonecall", "appointment"];

type Due = "overdue" | "today" | "week" | "later" | "none";
const DUE_LABEL: Record<Due, string> = { overdue: "عقب‌افتاده", today: "امروز", week: "۷ روز آینده", later: "بعدتر", none: "بدون موعد" };
const DUE_TONE: Record<Due, BadgeTone> = { overdue: "danger", today: "warning", week: "purple", later: "neutral", none: "neutral" };

// Where an activity's "about" link goes: contracts and customers have their 360 pages, the rest the mirror view.
const ABOUT_HREF: Record<string, (id: string) => string> = {
  opportunity: (id) => `/ops/contracts/${id}`,
  contact: (id) => `/ops/customers/${id}`,
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; scope?: string; status?: string; owner?: string; type?: string; due?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/ops/tasks");
  const sp = await searchParams;
  const crmAllowed = canAccessPipeline(session.user.role);
  const source = crmAllowed && sp.source !== "site" ? "crm" : "site";

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">تسک‌ها</h1>
      <p className="mt-1 text-sm text-secondary">کارهای باز تیم — تسک‌ها، تماس‌ها و قرارهای CRM قدیم و تسک‌های سایت.</p>

      {crmAllowed && (
        <div className="mt-5 flex flex-wrap gap-1.5">
          <FilterChip href="/ops/tasks" active={source === "crm"}>
            CRM قدیم
          </FilterChip>
          <FilterChip href="/ops/tasks?source=site" active={source === "site"}>
            تسک‌های سایت
          </FilterChip>
        </div>
      )}

      {source === "crm" ? <CrmTasks userId={session.user.id} sp={sp} /> : <SiteTasks userId={session.user.id} scope={sp.scope ?? "mine"} status={sp.status ?? "open"} />}
    </div>
  );
}

async function CrmTasks({ userId, sp }: { userId: string; sp: { owner?: string; type?: string; due?: string; page?: string } }) {
  const [staff, users] = await Promise.all([prisma.user.findUnique({ where: { id: userId }, select: { email: true, crmUserId: true } }), crmUsers()]);
  const me = staff ? crmUserOf(staff, users) : null;
  // owner: "all", a Dynamics user id, or unset = me (everyone when the staff member isn't linked yet).
  const owner = sp.owner === "all" ? null : (sp.owner?.toLowerCase() ?? me?.id ?? null);
  const type = sp.type && OPEN_ACTIVITIES.includes(sp.type) ? sp.type : null;
  const due = (sp.due && sp.due in DUE_LABEL ? sp.due : null) as Due | null;
  const page = Math.max(1, Number(sp.page) || 1);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const range: Record<Due, object> = {
    overdue: { lt: new Date(today) },
    today: { gte: new Date(today), lt: new Date(today + DAY) },
    week: { gte: new Date(today + DAY), lt: new Date(today + 8 * DAY) },
    later: { gte: new Date(today + 8 * DAY) },
    none: { equals: null },
  };
  const base = { entity: { in: type ? [type] : OPEN_ACTIVITIES }, deletedAt: null, state: 0, ...(owner ? { ownerId: owner } : {}) };
  const counts = Object.fromEntries(
    await Promise.all((Object.keys(DUE_LABEL) as Due[]).map(async (d) => [d, await prisma.crmRecord.count({ where: { ...base, dueAt: range[d] } })] as const)),
  ) as Record<Due, number>;
  const where = { ...base, ...(due ? { dueAt: range[due] } : {}) };
  const rows = await prisma.crmRecord.findMany({
    where,
    select: { entity: true, crmId: true, data: true, dueAt: true },
    orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
    skip: (page - 1) * PAGE,
    take: PAGE + 1,
  });
  const hasNext = rows.length > PAGE;

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { owner: sp.owner ?? null, type, due, ...patch };
    const params = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1]));
    const qs = params.toString();
    return `/ops/tasks${qs ? `?${qs}` : ""}`;
  };
  const dueOf = (d: Date | null): Due => (!d ? "none" : d.getTime() < today ? "overdue" : d.getTime() < today + DAY ? "today" : d.getTime() < today + 8 * DAY ? "week" : "later");
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <>
      <form action={setMyCrmUser} className="mt-4 flex flex-wrap items-center gap-2 text-xs text-secondary">
        <span>من در CRM قدیم:</span>
        <select name="crmUserId" defaultValue={me?.id ?? ""} className="rounded-full border border-border-strong bg-white px-3 py-1.5 font-medium text-purple-900">
          <option value="">انتخاب نشده</option>
          {users
            .filter((u) => !u.disabled)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
        </select>
        <button type="submit" className="press rounded-full border border-border-strong px-3 py-1.5 font-medium text-purple-900 hover:border-purple-600">
          ذخیره
        </button>
        {!me && <span>— انتخاب کنید تا کارهای خودتان پیش‌فرض نمایش داده شود.</span>}
      </form>

      <form className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <select name="owner" defaultValue={sp.owner === "all" ? "all" : (owner ?? "all")} aria-label="مسئول" className="rounded-full border border-border-strong bg-white px-3 py-2 text-xs font-medium text-purple-900">
          <option value="all">همه کارکنان</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.id === me?.id ? " (من)" : ""}
              {u.disabled ? " (غیرفعال)" : ""}
            </option>
          ))}
        </select>
        <select name="type" defaultValue={type ?? ""} aria-label="نوع" className="rounded-full border border-border-strong bg-white px-3 py-2 text-xs font-medium text-purple-900">
          <option value="">همه انواع</option>
          {OPEN_ACTIVITIES.map((t) => (
            <option key={t} value={t}>
              {HISTORY_TYPES[t].label}
            </option>
          ))}
        </select>
        {due && <input type="hidden" name="due" value={due} />}
        <button type="submit" className="press rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
          اعمال
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <DueTile href={href({ due: null, page: null })} active={!due} label="همه باز" value={total} />
        {(Object.keys(DUE_LABEL) as Due[]).map((d) => (
          <DueTile key={d} href={href({ due: d, page: null })} active={due === d} label={DUE_LABEL[d]} value={counts[d]} danger={d === "overdue"} />
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={ListChecks} title="کار بازی اینجا نیست" body="فیلتر مسئول یا موعد را عوض کنید." />
        </div>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">موعد</th>
                <th className="px-4 py-3 text-start font-medium">کار</th>
                <th className="px-4 py-3 text-start font-medium">درباره</th>
                <th className="px-4 py-3 text-start font-medium">مسئول</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, PAGE).map((r) => {
                const d = r.data as Record<string, unknown>;
                const bucket = dueOf(r.dueAt);
                const aboutId = typeof d._regardingobjectid_value === "string" ? d._regardingobjectid_value : null;
                const aboutType = d["_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname"];
                const aboutHref = aboutId && typeof aboutType === "string" ? (ABOUT_HREF[aboutType]?.(aboutId) ?? `/ops/old-crm/${aboutType}/${aboutId}`) : null;
                return (
                  <tr key={r.crmId} className="border-b border-border last:border-0 hover:bg-tint/40">
                    <td className="whitespace-nowrap px-4 py-3">
                      <Badge tone={DUE_TONE[bucket]}>{r.dueAt ? shownDate(d, r.entity === "appointment" ? "scheduledstart" : "scheduledend", true) : DUE_LABEL.none}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-secondary">{HISTORY_TYPES[r.entity]?.label} · </span>
                      <Link href={`/ops/old-crm/${r.entity}/${r.crmId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                        {shown(d, "subject") ?? HISTORY_TYPES[r.entity]?.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {aboutHref ? (
                        <Link href={aboutHref} className="text-purple-900 hover:text-purple-600 hover:underline">
                          {shown(d, "regardingobjectid") ?? "—"}
                        </Link>
                      ) : (
                        <span className="text-secondary">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-secondary">{shown(d, "ownerid") ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="mt-4 flex items-center gap-3 text-sm">
          {page > 1 && (
            <Link href={href({ page: page > 2 ? String(page - 1) : null })} className="font-medium text-purple-600 hover:underline">
              صفحه قبل
            </Link>
          )}
          <span className="text-secondary">صفحه {page.toLocaleString("fa-IR")}</span>
          {hasNext && (
            <Link href={href({ page: String(page + 1) })} className="font-medium text-purple-600 hover:underline">
              صفحه بعد
            </Link>
          )}
        </div>
      )}
    </>
  );
}

function DueTile({ href, active, label, value, danger }: { href: string; active: boolean; label: string; value: number; danger?: boolean }) {
  return (
    <Link href={href} className={`rounded-2xl border bg-white p-4 transition-colors ${active ? "border-purple-600" : "border-border hover:border-purple-600"}`}>
      <p className="text-xs text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${danger && value ? "text-danger" : "text-purple-900"}`}>{value.toLocaleString("fa-IR")}</p>
    </Link>
  );
}

async function SiteTasks({ userId, scope, status }: { userId: string; scope: string; status: string }) {
  const tasks = await prisma.task.findMany({
    where: {
      ...(scope === "mine" ? { assigneeId: userId } : {}),
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
    if (task.contract) return { href: `/ops/contracts?view=site`, label: `${task.contract.provider} — ${task.contract.productName}` };
    if (task.customer) return { href: `/ops/customers/${task.customer.id}`, label: task.customer.name };
    return null;
  }

  const base = "/ops/tasks?source=site";
  return (
    <>
      <div className="mt-6 rounded-2xl border border-border bg-white p-4">
        <QuickAddTask returnPath="/ops/tasks" />
      </div>

      <div className="mt-5 flex items-center gap-2 text-xs font-medium">
        <FilterLink label="تسک‌های من" active={scope === "mine"} href={`${base}&scope=mine&status=${status}`} />
        <FilterLink label="همه" active={scope === "all"} href={`${base}&scope=all&status=${status}`} />
        <span className="mx-1 text-border-strong">·</span>
        <FilterLink label="باز" active={status === "open"} href={`${base}&scope=${scope}&status=open`} />
        <FilterLink label="انجام‌شده" active={status === "done"} href={`${base}&scope=${scope}&status=done`} />
        <FilterLink label="همه" active={status === "all"} href={`${base}&scope=${scope}&status=all`} />
      </div>

      <div className="mt-4 space-y-2">
        {tasks.length === 0 ? (
          <EmptyState icon={ListChecks} title="چیزی اینجا نیست" body="یکی از بالا اضافه کنید، یا فیلترها را عوض کنید تا تسک‌های محدوده یا وضعیت دیگری را ببینید." />
        ) : (
          <TaskList tasks={tasks.map((t) => ({ ...t, link: linkFor(t) }))} returnPath="/ops/tasks" />
        )}
      </div>
    </>
  );
}

function FilterLink({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link href={href} className={`rounded-full px-3 py-1.5 transition-colors ${active ? "bg-purple-600 text-white" : "border border-border-strong text-purple-900 hover:border-purple-600"}`}>
      {label}
    </Link>
  );
}
