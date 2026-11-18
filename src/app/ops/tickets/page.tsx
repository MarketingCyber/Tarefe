import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { computeTicketSla, TICKET_SLA_BREACH_HOURS } from "@/lib/sla";
import { Headset, Clock, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { TICKET_STATUS_FA, PRIORITY_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";
import { crmUsers } from "@/lib/crm/crm-users";
import { FilterChip, shown, shownDate, statusFa } from "@/components/crm/customer/OldCrmParts";

import { getOpsI18n } from "@/lib/ops-i18n/server";
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

/**
 * Tickets across both CRMs.
 *  - old CRM (default): Dynamics closes almost every ticket as soon as it's logged — a ticket is the record of a
 *    customer's request, the follow-up work is in tasks — so the top of the page is what still needs someone: open
 *    tickets and follow-up dates («پیگیری مجدد», crm_records.dueAt) overdue or due within 7 days. Below, every
 *    ticket, newest activity first, searchable and filterable by status, contract type and owner.
 *  - site: tickets opened on tarefe.de / in the app, with their SLA.
 * Each old-CRM ticket opens /ops/tickets/[id] (components/crm/customer/CrmTicket.tsx).
 */
export const dynamic = "force-dynamic";

const PAGE = 100;
const DAY = 86_400_000;
type Ticket = { crmId: string; data: Record<string, unknown>; dueAt: Date | null; state: number | null };
const STATE_FILTER: Record<string, { label: string; states: number[] }> = { open: { label: "باز", states: [0] }, closed: { label: "بسته", states: [1, 2] } };
const CRM_STATE_TONE: BadgeTone[] = ["warning", "success", "neutral"];

export default async function OpsTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; q?: string; state?: string; category?: string; owner?: string; page?: string }>;
}) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const sp = await searchParams;
  const source = sp.source === "site" ? "site" : "crm";

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">{t("تیکت‌ها")}</h1>
      <p className="mt-1 text-sm text-secondary">{t("درخواست‌های مشتریان در CRM قدیم و سایت — لغو قرارداد، تغییر آدرس، صورتحساب، خسارت و پشتیبانی.")}</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        <FilterChip href="/ops/tickets" active={source === "crm"}>
          {t("CRM قدیم")}
        </FilterChip>
        <FilterChip href="/ops/tickets?source=site" active={source === "site"}>
          {t("تیکت‌های سایت و اپ")}
        </FilterChip>
      </div>
      {source === "crm" ? <CrmTickets sp={sp} /> : <SiteTickets />}
    </div>
  );
}

async function CrmTickets({ sp }: { sp: { q?: string; state?: string; category?: string; owner?: string; page?: string } }) {
  const { t, intl } = await getOpsI18n();
  const q = sp.q?.trim() ?? "";
  const owner = sp.owner?.toLowerCase() || null;
  const category = sp.category?.toLowerCase() || null;
  const state = sp.state && STATE_FILTER[sp.state] ? sp.state : null;
  const page = Math.max(1, Number(sp.page) || 1);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const select = { crmId: true, data: true, dueAt: true, state: true };

  // Needs attention: open tickets, and follow-ups from the last 60 days up to a week ahead (still waiting on someone).
  const attention = (await prisma.crmRecord.findMany({
    where: {
      entity: "incident",
      deletedAt: null,
      OR: [{ state: 0 }, { dueAt: { gte: new Date(today - 60 * DAY), lt: new Date(today + 8 * DAY) } }],
    },
    select,
    orderBy: [{ dueAt: { sort: "asc", nulls: "first" } }],
    take: 200,
  })) as Ticket[];

  const ids = q
    ? (
        await prisma.$queryRaw<{ crmId: string }[]>`
          SELECT "crmId" FROM crm_records WHERE entity = 'incident' AND "deletedAt" IS NULL
            AND data::text ILIKE ${`%${q.replace(/[%_\\]/g, "\\$&")}%`}
          ORDER BY "crmModifiedAt" DESC NULLS LAST LIMIT 1000`
      ).map((r) => r.crmId)
    : null;
  const where = {
    entity: "incident",
    deletedAt: null,
    ...(ids ? { crmId: { in: ids } } : {}),
    ...(owner ? { ownerId: owner } : {}),
    ...(state ? { state: { in: STATE_FILTER[state].states } } : {}),
    ...(category ? { data: { path: ["_new_category_value"], equals: category } } : {}),
  };
  const [rows, total, owners, categories] = await Promise.all([
    prisma.crmRecord.findMany({ where, select, orderBy: { crmModifiedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }) as Promise<Ticket[]>,
    prisma.crmRecord.count({ where }),
    crmUsers(),
    prisma.crmRecord.findMany({ where: { entity: "new_category", deletedAt: null }, select: { crmId: true, data: true } }),
  ]);
  const categoryOptions = categories
    .map((c) => ({ id: c.crmId.toLowerCase(), name: shown(c.data as Record<string, unknown>, "new_name") ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { q: q || null, state, category, owner, ...patch };
    const params = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1]));
    const qs = params.toString();
    return `/ops/tickets${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <section className="mt-6">
        <h2 className="text-sm font-bold text-purple-900">{t("نیاز به رسیدگی ({n})", { n: attention.length.toLocaleString(intl) })}</h2>
        <p className="mt-1 text-xs text-secondary">{t("تیکت‌های باز، و پیگیری‌های مجددی که گذشته‌اند یا تا ۷ روز آینده موعدشان است.")}</p>
        {attention.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-white p-4 text-sm text-secondary">{t("همه تیکت‌ها رسیدگی شده‌اند.")}</p>
        ) : (
          <TicketTable rows={attention} today={today} showFollowUp />
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-purple-900">{t("همه تیکت‌ها")}</h2>
        <form className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="search">
          <div className="flex min-w-64 flex-1 items-center gap-2 rounded-full border border-border-strong bg-white px-4 py-2 focus-within:border-purple-600">
            <MagnifyingGlass size={16} className="shrink-0 text-secondary" aria-hidden />
            <input name="q" defaultValue={q} placeholder={t("عنوان، شماره تیکت، مشتری، متن…")} aria-label={t("جستجوی تیکت")} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary" />
          </div>
          <Select name="state" value={state} label={t("وضعیت")} options={Object.entries(STATE_FILTER).map(([id, s]) => ({ id, name: t(s.label) }))} />
          <Select name="category" value={category} label={t("نوع قرارداد")} options={categoryOptions} />
          <Select name="owner" value={owner} label={t("مسئول")} options={owners.map((o) => ({ id: o.id, name: o.disabled ? `${o.name} (${t("غیرفعال")})` : o.name }))} />
          <button type="submit" className="press rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
            {t("اعمال")}
          </button>
          {(q || state || category || owner) && (
            <Link href="/ops/tickets" className="text-xs font-medium text-secondary hover:text-purple-600">
              {t("حذف فیلترها")}
            </Link>
          )}
        </form>
        <p className="mt-3 text-xs text-secondary">
          {t("{n} تیکت", { n: total.toLocaleString(intl) })}{ids && ids.length >= 1000 ? t(" (۱٬۰۰۰ نتیجه اول جستجو)") : ""} — {t("به ترتیب آخرین تغییر")}
        </p>
        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={Headset} title={q ? t("تیکتی با «{q}» پیدا نشد", { q }) : t("تیکتی با این فیلترها نیست")} body={t("فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.")} />
          </div>
        ) : (
          <TicketTable rows={rows} today={today} />
        )}
        {(page > 1 || page * PAGE < total) && (
          <div className="mt-4 flex items-center gap-3 text-sm">
            {page > 1 && (
              <Link href={href({ page: page > 2 ? String(page - 1) : null })} className="font-medium text-purple-600 hover:underline">
                {t("صفحه قبل")}
              </Link>
            )}
            <span className="text-secondary">{t("صفحه {n}", { n: page.toLocaleString(intl) })}</span>
            {page * PAGE < total && (
              <Link href={href({ page: String(page + 1) })} className="font-medium text-purple-600 hover:underline">
                {t("صفحه بعد")}
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

async function TicketTable({ rows, today, showFollowUp }: { rows: Ticket[]; today: number; showFollowUp?: boolean }) {
  const { t, tn, intl } = await getOpsI18n();
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-secondary">
            <th className="px-4 py-3 text-start font-medium">{t("تیکت")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("مشتری")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("قرارداد")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("وضعیت")}</th>
            {showFollowUp && <th className="px-4 py-3 text-start font-medium">{t("پیگیری مجدد")}</th>}
            <th className="px-4 py-3 text-start font-medium">{t("مسئول")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("ایجاد")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = r.data;
            const days = r.dueAt ? Math.floor((r.dueAt.getTime() - today) / DAY) : null;
            return (
              <tr key={r.crmId} className="border-b border-border last:border-0 hover:bg-tint/40">
                <td className="px-4 py-3">
                  <Link href={`/ops/tickets/${r.crmId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "title") ?? t("تیکت بدون عنوان")}
                  </Link>
                  <span className="font-latin block text-xs text-secondary">{shown(d, "ticketnumber")}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {typeof d._customerid_value === "string" ? (
                    <Link href={`/ops/customers/${d._customerid_value}`} className="text-purple-900 hover:text-purple-600 hover:underline">
                      {shown(d, "customerid") ?? t("مشتری")}
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-xs">
                  {typeof d._new_opportunity_value === "string" ? (
                    <Link href={`/ops/contracts/${d._new_opportunity_value}`} className="text-purple-900 hover:text-purple-600 hover:underline">
                      {shown(d, "new_opportunity") ?? t("قرارداد")}
                    </Link>
                  ) : (
                    <span className="text-secondary">{shown(d, "new_category") ?? "—"}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={CRM_STATE_TONE[r.state ?? 0] ?? "neutral"}>{tn(shown(d, "new_status")) ?? tn(statusFa(shown(d, "statuscode"))) ?? "—"}</Badge>
                </td>
                {showFollowUp && (
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {days === null ? (
                      <span className="text-secondary">—</span>
                    ) : (
                      <Badge tone={days < 0 ? "danger" : days <= 7 ? "warning" : "neutral"}>
                        {shownDate(d, "new_follow_up_again", false, intl)} · {days < 0 ? t("{n} روز گذشته", { n: (-days).toLocaleString(intl) }) : days === 0 ? t("امروز") : t("{n} روز", { n: days.toLocaleString(intl) })}
                      </Badge>
                    )}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-secondary">{shown(d, "ownerid") ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-secondary">{shownDate(d, "createdon", false, intl)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

async function Select({ name, value, label, options }: { name: string; value: string | null; label: string; options: { id: string; name: string }[] }) {
  const { t } = await getOpsI18n();
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className="rounded-full border border-border-strong bg-white px-3 py-2 text-xs font-medium text-purple-900">
      <option value="">{t("{label}: همه", { label })}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

async function SiteTickets() {
  const { t, intl } = await getOpsI18n();
  const tickets = await prisma.serviceRequest.findMany({
    // Projected Dynamics tickets are in the old-CRM view — unless the customer wrote on one in the portal / app:
    // then it is a conversation here, answered here.
    where: { OR: [{ crmId: null }, { messages: { some: { sender: { role: "CUSTOMER" } } } }] },
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
    <>
      {breachedCount > 0 && (
        <p className="mt-4 text-sm font-semibold text-danger">
          {t("{n} تیکت بیش از {h} ساعت منتظر پاسخ‌اند.", { n: breachedCount, h: TICKET_SLA_BREACH_HOURS })}
        </p>
      )}

      {tickets.length === 0 ? (
        <div className="mt-8">
          <EmptyState icon={Headset} title={t("هنوز تیکتی ثبت نشده")} body={t("با ثبت تیکت توسط مشتری در پنل خودش، همین‌جا نمایش داده می‌شود.")} />
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs text-secondary">
                <th className="px-4 py-3 text-start font-medium">{t("موضوع")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("مشتری")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("اولویت")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("وضعیت")}</th>
                <th className="px-4 py-3 text-start font-medium">SLA</th>
                <th className="px-4 py-3 text-start font-medium">{t("مشاور")}</th>
                <th className="px-4 py-3 text-start font-medium">{t("ایجاد")}</th>
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
                        {t("{n} ساعت در انتظار", { n: Math.round(sla.hoursWaiting) })}
                      </span>
                    ) : (
                      <span className="text-xs text-secondary">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary">{ticket.advisor?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{ticket.createdAt.toLocaleString(intl, { calendar: "gregory" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
