import Link from "next/link";
import { writeMode } from "@/lib/dynamics/write";
import { CloseActivityButton } from "@/components/crm/customer/CrmWriteForms";
import { prisma } from "@/lib/db";
import { crmUserOf, crmUsers } from "@/lib/crm/crm-users";
import { setMyCrmUser } from "@/lib/crm/crm-user-actions";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { HISTORY_TYPES, regardingHref, shown, shownDate } from "@/components/crm/customer/OldCrmParts";

/**
 * The old-CRM part of «کارهای من» (/ops/my-work): one operator's day in the Dynamics mirror — open tasks, calls and
 * appointments overdue or due today, cancellation deadlines of their active contracts in the next 14 days (and
 * those passed in the last 30), their tickets' follow-up dates that are due, and their open leads. "Me" is the
 * Dynamics user the staff member picked (User.crmUserId) or the one with their e-mail. Read-only; each tile opens
 * the full, filtered workspace list.
 */

const DAY = 86_400_000;
const ACTIVITIES = ["task", "phonecall", "appointment"];

function dayLabel(due: Date | null, today: number): { text: string; tone: BadgeTone } {
  if (!due) return { text: "بدون موعد", tone: "neutral" };
  const days = Math.floor((due.getTime() - today) / DAY);
  if (days < 0) return { text: `${(-days).toLocaleString("fa-IR")} روز گذشته`, tone: "danger" };
  if (days === 0) return { text: "امروز", tone: "warning" };
  return { text: `${days.toLocaleString("fa-IR")} روز`, tone: days <= 7 ? "warning" : "neutral" };
}

export async function MyCrmWork({ userId }: { userId: string }) {
  const [staff, users] = await Promise.all([prisma.user.findUnique({ where: { id: userId }, select: { email: true, crmUserId: true } }), crmUsers()]);
  const me = staff ? crmUserOf(staff, users) : null;

  if (!me)
    return (
      <section className="rounded-2xl border border-border bg-white p-6">
        <h2 className="text-sm font-bold text-purple-900">کارهای من در CRM قدیم</h2>
        <p className="mt-1 text-sm text-secondary">بگویید در CRM قدیم کدام کاربر هستید تا تسک‌ها، مهلت‌ها و لیدهای خودتان این‌جا نمایش داده شود.</p>
        <form action={setMyCrmUser} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <select name="crmUserId" defaultValue="" aria-label="کاربر من در CRM قدیم" className="rounded-full border border-border-strong bg-white px-3 py-2 text-xs font-medium text-purple-900">
            <option value="">انتخاب کنید…</option>
            {users
              .filter((u) => !u.disabled)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
          </select>
          <button type="submit" className="press rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
            ذخیره
          </button>
        </form>
      </section>
    );

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const mine = { deletedAt: null, ownerId: me.id };
  const activityWhere = { ...mine, entity: { in: ACTIVITIES }, state: 0 };
  const deadlineWhere = { ...mine, entity: "opportunity", state: { in: [0, 1] }, dueAt: { gte: new Date(today - 30 * DAY), lt: new Date(today + 15 * DAY) } };
  const followUpWhere = { ...mine, entity: "incident", dueAt: { gte: new Date(today - 60 * DAY), lt: new Date(today + 8 * DAY) } };
  const leadWhere = { ...mine, entity: "lead", state: 0 };
  const select = { entity: true, crmId: true, data: true, dueAt: true };

  const [overdue, dueToday, todayList, deadlines, deadlineCount, followUps, followUpCount, leads, leadCount] = await Promise.all([
    prisma.crmRecord.count({ where: { ...activityWhere, dueAt: { lt: new Date(today) } } }),
    prisma.crmRecord.count({ where: { ...activityWhere, dueAt: { gte: new Date(today), lt: new Date(today + DAY) } } }),
    prisma.crmRecord.findMany({ where: { ...activityWhere, dueAt: { lt: new Date(today + DAY) } }, select, orderBy: { dueAt: "asc" }, take: 25 }),
    prisma.crmRecord.findMany({ where: deadlineWhere, select, orderBy: { dueAt: "asc" }, take: 10 }),
    prisma.crmRecord.count({ where: deadlineWhere }),
    prisma.crmRecord.findMany({ where: followUpWhere, select, orderBy: { dueAt: "asc" }, take: 10 }),
    prisma.crmRecord.count({ where: followUpWhere }),
    prisma.crmRecord.findMany({ where: leadWhere, select, orderBy: { crmModifiedAt: "desc" }, take: 10 }),
    prisma.crmRecord.count({ where: leadWhere }),
  ]);
  const owner = encodeURIComponent(me.id);
  const writes = writeMode();

  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-purple-900">کارهای من در CRM قدیم</h2>
        <p className="text-xs text-secondary">
          به‌عنوان {me.name} ·{" "}
          <Link href="/ops/tasks" className="hover:text-purple-600 hover:underline">
            تغییر
          </Link>
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile href={`/ops/tasks?owner=${owner}&due=overdue`} label="کارهای عقب‌افتاده" value={overdue} danger />
        <Tile href={`/ops/tasks?owner=${owner}&due=today`} label="کارهای امروز" value={dueToday} />
        <Tile href={`/ops/contracts?owner=${owner}`} label="مهلت‌های لغو" value={deadlineCount} />
        <Tile href={`/ops/tickets?owner=${owner}`} label="پیگیری تیکت" value={followUpCount} />
        <Tile href={`/ops/leads?result=open&owner=${owner}`} label="لید باز" value={leadCount} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-bold text-secondary">امروز و عقب‌افتاده</h3>
          {todayList.length === 0 ? (
            <Empty text="برای امروز کاری باز نیست." />
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {todayList.map((r) => {
                const d = r.data as Record<string, unknown>;
                const due = dayLabel(r.dueAt, today);
                const about = regardingHref(d);
                return (
                  <li key={r.crmId} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/ops/old-crm/${r.entity}/${r.crmId}`} className="font-medium text-body hover:text-purple-600 hover:underline">
                        <span className="text-xs font-normal text-secondary">{HISTORY_TYPES[r.entity]?.label} · </span>
                        {shown(d, "subject") ?? HISTORY_TYPES[r.entity]?.label}
                      </Link>
                      {about && (
                        <Link href={about} className="block truncate text-xs text-secondary hover:text-purple-600">
                          {shown(d, "regardingobjectid")}
                        </Link>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <Badge tone={due.tone}>{due.text}</Badge>
                      {writes !== "off" && <CloseActivityButton entity={r.entity} id={r.crmId} returnPath="/ops/my-work" dry={writes === "dry"} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-xs font-bold text-secondary">مهلت لغو قراردادهای من</h3>
            {deadlines.length === 0 ? (
              <Empty text="مهلت لغوی در ۱۴ روز آینده یا ۳۰ روز گذشته نیست." />
            ) : (
              <ul className="divide-y divide-border rounded-xl border border-border">
                {deadlines.map((r) => {
                  const d = r.data as Record<string, unknown>;
                  const due = dayLabel(r.dueAt, today);
                  return (
                    <li key={r.crmId} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link href={`/ops/contracts/${r.crmId}`} className="font-medium text-body hover:text-purple-600 hover:underline">
                          {shown(d, "name") ?? "قرارداد"}
                        </Link>
                        <span className="block truncate text-xs text-secondary">{[shown(d, "customerid"), shownDate(d, "new_datelaqve")].filter(Boolean).join(" · ")}</span>
                      </div>
                      <Badge tone={due.tone}>{due.text}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {followUps.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold text-secondary">پیگیری تیکت‌های من</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {followUps.map((r) => {
                  const d = r.data as Record<string, unknown>;
                  const due = dayLabel(r.dueAt, today);
                  return (
                    <li key={r.crmId} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link href={`/ops/tickets/${r.crmId}`} className="font-medium text-body hover:text-purple-600 hover:underline">
                          {shown(d, "title") ?? "تیکت"}
                        </Link>
                        <span className="block truncate text-xs text-secondary">{shown(d, "customerid")}</span>
                      </div>
                      <Badge tone={due.tone}>{due.text}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {leads.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold text-secondary">لیدهای باز من</h3>
              <ul className="divide-y divide-border rounded-xl border border-border">
                {leads.map((r) => {
                  const d = r.data as Record<string, unknown>;
                  return (
                    <li key={r.crmId} className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm">
                      <Link href={`/ops/leads/${r.crmId}`} className="min-w-0 font-medium text-body hover:text-purple-600 hover:underline">
                        {shown(d, "fullname") ?? "بدون نام"}
                        <span className="block truncate text-xs font-normal text-secondary">{[shown(d, "subject"), shown(d, "leadsourcecode")].filter(Boolean).join(" · ")}</span>
                      </Link>
                      <Badge>{shown(d, "new_status") ?? "باز"}</Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function Tile({ href, label, value, danger }: { href: string; label: string; value: number; danger?: boolean }) {
  return (
    <Link href={href} className="rounded-2xl border border-border p-4 transition-colors hover:border-purple-600">
      <p className="text-xs text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${danger && value ? "text-danger" : "text-purple-900"}`}>{value.toLocaleString("fa-IR")}</p>
    </Link>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-sm text-secondary">{text}</p>;
}
