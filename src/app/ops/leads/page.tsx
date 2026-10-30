import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/feedback/EmptyState";
import { Funnel, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { LEAD_STATUS_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";
import { LeadSourceCell } from "@/components/crm/LeadAttribution";
import { FilterChip, shown, shownDate } from "@/components/crm/customer/OldCrmParts";
import { LEAD_STATE_TONE } from "@/components/crm/customer/CrmLead";
import { crmUsers } from "@/lib/crm/crm-users";
import { emailKey, phoneKey } from "@/lib/dynamics/identity";

/**
 * Leads across both CRMs.
 *  - old CRM (default): Dynamics converts or closes leads within days, so the useful view is the funnel — for a
 *    period, how many leads came in, how many became contracts and why the others were closed, per source
 *    (site, ads, referrals, Instagram, WhatsApp …) with its conversion rate — then the open leads, then every lead,
 *    searchable and filterable by result, source and owner. Each opens /ops/leads/[id] (CrmLead).
 *  - site: consultation-form submissions on tarefe.de with their traffic source, and whether the same person
 *    (same phone / e-mail) is a lead in the old CRM.
 */
export const dynamic = "force-dynamic";

const PAGE = 100;
const PERIODS = [30, 90, 365];
const RESULT: Record<string, { label: string; state: number }> = {
  open: { label: "باز", state: 0 },
  converted: { label: "تبدیل به قرارداد", state: 1 },
  closed: { label: "بسته شده", state: 2 },
};

const STATUS_TONE: Record<string, BadgeTone> = {
  NEW: "purple",
  CONTACTED: "neutral",
  QUALIFIED: "success",
  CONSULTATION_SCHEDULED: "warning",
  APPLICATION_STARTED: "warning",
  APPLICATION_SUBMITTED: "warning",
  CONTRACT_ACTIVE: "success",
  LOST: "danger",
};

async function markContacted(formData: FormData) {
  "use server";
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return;

  const leadId = formData.get("leadId") as string;
  await prisma.lead.update({
    where: { id: leadId },
    data: { status: "CONTACTED", assignedAdvisorId: session.user.id },
  });
  await prisma.activityLog.create({
    data: { entityType: "lead", entityId: leadId, action: "status_changed", note: "Marked as contacted", actorId: session.user.id, leadId },
  });
  revalidatePath("/ops/leads");
}

export default async function OpsLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; period?: string; q?: string; result?: string; channel?: string; owner?: string; page?: string }>;
}) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const sp = await searchParams;
  const source = sp.source === "site" ? "site" : "crm";

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">لیدها</h1>
      <p className="mt-1 text-sm text-secondary">سرنخ‌های CRM قدیم و فرم‌های مشاوره سایت — از کجا آمده‌اند و چند تا قرارداد شده‌اند.</p>
      <div className="mt-5 flex flex-wrap gap-1.5">
        <FilterChip href="/ops/leads" active={source === "crm"}>
          CRM قدیم
        </FilterChip>
        <FilterChip href="/ops/leads?source=site" active={source === "site"}>
          فرم‌های سایت
        </FilterChip>
      </div>
      {source === "crm" ? <CrmLeads sp={sp} /> : <SiteLeads />}
    </div>
  );
}

type FunnelRow = { channel: string | null; total: bigint; open: bigint; converted: bigint; closed: bigint };
/** ISO timestamp `days` days before now (Dynamics createdon values compare as ISO strings). */
function daysAgo(days: number) {
  return new Date(new Date().getTime() - days * 86_400_000).toISOString();
}

const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100).toLocaleString("fa-IR")}٪` : "—");

async function CrmLeads({ sp }: { sp: { period?: string; q?: string; result?: string; channel?: string; owner?: string; page?: string } }) {
  const period = PERIODS.includes(Number(sp.period)) ? Number(sp.period) : 90;
  const since = daysAgo(period);
  const q = sp.q?.trim() ?? "";
  const result = sp.result && RESULT[sp.result] ? sp.result : null;
  const channel = sp.channel || null;
  const owner = sp.owner?.toLowerCase() || null;
  const page = Math.max(1, Number(sp.page) || 1);

  // Funnel for the period, per source (leadsourcecode as Dynamics shows it).
  const [funnel, reasons] = await Promise.all([
    prisma.$queryRaw<FunnelRow[]>`
      SELECT data->>'leadsourcecode@OData.Community.Display.V1.FormattedValue' AS channel, count(*) AS total,
             count(*) FILTER (WHERE state = 0) AS open, count(*) FILTER (WHERE state = 1) AS converted, count(*) FILTER (WHERE state = 2) AS closed
      FROM crm_records WHERE entity = 'lead' AND "deletedAt" IS NULL AND data->>'createdon' >= ${since}
      GROUP BY 1 ORDER BY 2 DESC`,
    prisma.$queryRaw<{ reason: string | null; n: bigint }[]>`
      SELECT data->>'statuscode@OData.Community.Display.V1.FormattedValue' AS reason, count(*) AS n
      FROM crm_records WHERE entity = 'lead' AND "deletedAt" IS NULL AND state = 2 AND data->>'createdon' >= ${since}
      GROUP BY 1 ORDER BY 2 DESC`,
  ]);
  const sum = (k: keyof Omit<FunnelRow, "channel">) => funnel.reduce((a, r) => a + Number(r[k]), 0);
  const totals = { total: sum("total"), open: sum("open"), converted: sum("converted"), closed: sum("closed") };
  const reasonTotal = reasons.reduce((a, r) => a + Number(r.n), 0);

  const ids = q
    ? (
        await prisma.$queryRaw<{ crmId: string }[]>`
          SELECT "crmId" FROM crm_records WHERE entity = 'lead' AND "deletedAt" IS NULL
            AND data::text ILIKE ${`%${q.replace(/[%_\\]/g, "\\$&")}%`}
          ORDER BY "crmModifiedAt" DESC NULLS LAST LIMIT 1000`
      ).map((r) => r.crmId)
    : null;
  const where = {
    entity: "lead",
    deletedAt: null,
    ...(ids ? { crmId: { in: ids } } : {}),
    ...(owner ? { ownerId: owner } : {}),
    ...(result ? { state: RESULT[result].state } : {}),
    ...(channel ? { data: { path: ["leadsourcecode@OData.Community.Display.V1.FormattedValue"], equals: channel } } : {}),
  };
  const [open, rows, total, owners] = await Promise.all([
    prisma.crmRecord.findMany({ where: { entity: "lead", deletedAt: null, state: 0 }, select: { crmId: true, data: true }, orderBy: { crmModifiedAt: "desc" }, take: 100 }),
    prisma.crmRecord.findMany({ where, select: { crmId: true, data: true }, orderBy: { crmModifiedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }),
    prisma.crmRecord.count({ where }),
    crmUsers(),
  ]);
  const channels = [...new Set(funnel.map((r) => r.channel).filter((c): c is string => !!c))];

  const href = (patch: Record<string, string | null>) => {
    const merged: Record<string, string | null> = { period: period === 90 ? null : String(period), q: q || null, result, channel, owner, ...patch };
    const params = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => !!e[1]));
    const qs = params.toString();
    return `/ops/leads${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <section className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold text-purple-900">قیف لیدها</h2>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <FilterChip key={p} href={href({ period: p === 90 ? null : String(p), page: null })} active={period === p}>
                {p.toLocaleString("fa-IR")} روز اخیر
              </FilterChip>
            ))}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label="لید جدید" value={totals.total} />
          <Tile label="تبدیل به قرارداد" value={totals.converted} note={pct(totals.converted, totals.total)} tone="text-success" />
          <Tile label="بسته شده" value={totals.closed} note={pct(totals.closed, totals.total)} />
          <Tile label="هنوز باز" value={totals.open} />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="overflow-x-auto rounded-xl border border-border bg-white xl:col-span-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-secondary">
                  <th className="px-4 py-3 text-start font-medium">منبع</th>
                  <th className="px-4 py-3 text-start font-medium">لید</th>
                  <th className="px-4 py-3 text-start font-medium">قرارداد شد</th>
                  <th className="px-4 py-3 text-start font-medium">نرخ تبدیل</th>
                  <th className="px-4 py-3 text-start font-medium">بسته شد</th>
                  <th className="px-4 py-3 text-start font-medium">باز</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((r) => (
                  <tr key={r.channel ?? "none"} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5">
                      {r.channel ? (
                        <Link href={href({ channel: r.channel, page: null })} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                          {r.channel}
                        </Link>
                      ) : (
                        <span className="text-secondary">نامشخص</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{Number(r.total).toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-2.5 tabular-nums">{Number(r.converted).toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-2.5 tabular-nums font-medium text-purple-900">{pct(Number(r.converted), Number(r.total))}</td>
                    <td className="px-4 py-2.5 tabular-nums text-secondary">{Number(r.closed).toLocaleString("fa-IR")}</td>
                    <td className="px-4 py-2.5 tabular-nums text-secondary">{Number(r.open).toLocaleString("fa-IR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs font-bold text-purple-900">دلیل بستن لیدها</p>
            {reasons.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">موردی نیست.</p>
            ) : (
              <ul className="mt-3 space-y-2.5 text-sm">
                {reasons.map((r) => (
                  <li key={r.reason ?? "none"}>
                    <div className="flex justify-between gap-3">
                      <span className="text-body">{r.reason ?? "نامشخص"}</span>
                      <span className="shrink-0 tabular-nums text-secondary">{Number(r.n).toLocaleString("fa-IR")}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-tint">
                      <div className="h-1.5 rounded-full bg-purple-600/60" style={{ width: `${(Number(r.n) / reasonTotal) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-purple-900">لیدهای باز ({open.length.toLocaleString("fa-IR")})</h2>
        {open.length === 0 ? <p className="mt-3 rounded-xl border border-border bg-white p-4 text-sm text-secondary">لید بازی نیست.</p> : <LeadTable rows={open} />}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-bold text-purple-900">همه لیدها</h2>
        <form className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="search">
          {period !== 90 && <input type="hidden" name="period" value={period} />}
          <div className="flex min-w-64 flex-1 items-center gap-2 rounded-full border border-border-strong bg-white px-4 py-2 focus-within:border-purple-600">
            <MagnifyingGlass size={16} className="shrink-0 text-secondary" aria-hidden />
            <input name="q" defaultValue={q} placeholder="نام، شماره، ایمیل، موضوع…" aria-label="جستجوی لید" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary" />
          </div>
          <Select name="result" value={result} label="نتیجه" options={Object.entries(RESULT).map(([id, r]) => ({ id, name: r.label }))} />
          <Select name="channel" value={channel} label="منبع" options={channels.map((c) => ({ id: c, name: c }))} />
          <Select name="owner" value={owner} label="مسئول" options={owners.map((o) => ({ id: o.id, name: o.disabled ? `${o.name} (غیرفعال)` : o.name }))} />
          <button type="submit" className="press rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
            اعمال
          </button>
          {(q || result || channel || owner) && (
            <Link href={href({ q: null, result: null, channel: null, owner: null, page: null })} className="text-xs font-medium text-secondary hover:text-purple-600">
              حذف فیلترها
            </Link>
          )}
        </form>
        <p className="mt-3 text-xs text-secondary">
          {total.toLocaleString("fa-IR")} لید{ids && ids.length >= 1000 ? " (۱٬۰۰۰ نتیجه اول جستجو)" : ""} — به ترتیب آخرین تغییر
        </p>
        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={Funnel} title={q ? `لیدی با «${q}» پیدا نشد` : "لیدی با این فیلترها نیست"} body="فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید." />
          </div>
        ) : (
          <LeadTable rows={rows} />
        )}
        {(page > 1 || page * PAGE < total) && (
          <div className="mt-4 flex items-center gap-3 text-sm">
            {page > 1 && (
              <Link href={href({ page: page > 2 ? String(page - 1) : null })} className="font-medium text-purple-600 hover:underline">
                صفحه قبل
              </Link>
            )}
            <span className="text-secondary">صفحه {page.toLocaleString("fa-IR")}</span>
            {page * PAGE < total && (
              <Link href={href({ page: String(page + 1) })} className="font-medium text-purple-600 hover:underline">
                صفحه بعد
              </Link>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function Tile({ label, value, note, tone }: { label: string; value: number; note?: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <p className="text-xs text-secondary">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${tone ?? "text-purple-900"}`}>
        {value.toLocaleString("fa-IR")}
        {note && <span className="ms-2 text-sm font-medium text-secondary">{note}</span>}
      </p>
    </div>
  );
}

function LeadTable({ rows }: { rows: { crmId: string; data: unknown }[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-secondary">
            <th className="px-4 py-3 text-start font-medium">نام</th>
            <th className="px-4 py-3 text-start font-medium">موضوع</th>
            <th className="px-4 py-3 text-start font-medium">تماس</th>
            <th className="px-4 py-3 text-start font-medium">منبع</th>
            <th className="px-4 py-3 text-start font-medium">نتیجه</th>
            <th className="px-4 py-3 text-start font-medium">مسئول</th>
            <th className="px-4 py-3 text-start font-medium">ایجاد</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const d = r.data as Record<string, unknown>;
            const contractId = typeof d._qualifyingopportunityid_value === "string" ? d._qualifyingopportunityid_value : null;
            return (
              <tr key={r.crmId} className="border-b border-border last:border-0 hover:bg-tint/40">
                <td className="px-4 py-3">
                  <Link href={`/ops/leads/${r.crmId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "fullname") ?? "بدون نام"}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs text-secondary">{[shown(d, "subject"), shown(d, "new_type")].filter(Boolean).join(" · ") || "—"}</td>
                <td className="font-latin px-4 py-3 text-xs text-secondary">{shown(d, "mobilephone") ?? shown(d, "emailaddress1") ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-secondary">{shown(d, "leadsourcecode") ?? "—"}</td>
                <td className="px-4 py-3 text-xs">
                  {contractId ? (
                    <Link href={`/ops/contracts/${contractId}`} className="text-success hover:underline">
                      {shown(d, "qualifyingopportunityid") ?? "قرارداد"}
                    </Link>
                  ) : (
                    <Badge tone={LEAD_STATE_TONE[Number(d.statecode)] ?? "neutral"}>{Number(d.statecode) === 2 ? (shown(d, "statuscode") ?? "بسته شده") : (shown(d, "new_status") ?? "—")}</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-secondary">{shown(d, "ownerid") ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-secondary">{shownDate(d, "createdon")}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Select({ name, value, label, options }: { name: string; value: string | null; label: string; options: { id: string; name: string }[] }) {
  return (
    <select name={name} defaultValue={value ?? ""} aria-label={label} className="rounded-full border border-border-strong bg-white px-3 py-2 text-xs font-medium text-purple-900">
      <option value="">{label}: همه</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}

async function SiteLeads() {
  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
    include: { assignedAdvisor: { select: { name: true } } },
    take: 50,
  });

  // Which of these people are leads in the old CRM too (same phone / e-mail).
  const keysOf = (l: { email: string | null; phone: string | null }) => [emailKey(l.email), phoneKey(l.phone)].filter((k): k is string => !!k);
  const allKeys = [...new Set(leads.flatMap(keysOf))];
  const crmLeads = allKeys.length
    ? await prisma.crmRecord.findMany({ where: { entity: "lead", deletedAt: null, refs: { hasSome: allKeys } }, select: { crmId: true, refs: true, data: true }, orderBy: { crmModifiedAt: "desc" } })
    : [];
  const crmLeadFor = (l: { email: string | null; phone: string | null }) => {
    const keys = keysOf(l);
    return crmLeads.find((c) => keys.some((k) => c.refs.includes(k))) ?? null;
  };

  if (leads.length === 0)
    return (
      <div className="mt-8">
        <EmptyState icon={Funnel} title="هنوز لیدی ثبت نشده" body="با ثبت فرم مشاوره در سایت اصلی، یک لید همین‌جا نمایش داده می‌شود." />
      </div>
    );

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-start text-xs text-secondary">
            <th className="px-4 py-3 text-start font-medium">نام</th>
            <th className="px-4 py-3 text-start font-medium">اطلاعات تماس</th>
            <th className="px-4 py-3 text-start font-medium">خدمت</th>
            <th className="px-4 py-3 text-start font-medium">منبع ترافیک</th>
            <th className="px-4 py-3 text-start font-medium">صفحه فرم</th>
            <th className="px-4 py-3 text-start font-medium">وضعیت</th>
            <th className="px-4 py-3 text-start font-medium">در CRM قدیم</th>
            <th className="px-4 py-3 text-start font-medium">مشاور</th>
            <th className="px-4 py-3 text-start font-medium">دریافت</th>
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const crm = crmLeadFor(lead);
            const crmData = crm?.data as Record<string, unknown> | undefined;
            return (
              <tr key={lead.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3 font-medium text-purple-900">
                  <Link href={`/ops/leads/${lead.id}`} className="hover:text-purple-600 hover:underline">
                    {lead.name}
                  </Link>
                </td>
                <td className="font-latin px-4 py-3 text-secondary">
                  {lead.phone ?? "—"}
                  <br />
                  {lead.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-secondary">
                  {lead.category ?? "—"} {lead.serviceSlug ? `/ ${lead.serviceSlug}` : ""}
                </td>
                <td className="px-4 py-3">
                  <LeadSourceCell lead={lead} />
                </td>
                <td className="font-latin px-4 py-3 text-xs text-secondary">{lead.sourcePage ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={STATUS_TONE[lead.status]}>{LEAD_STATUS_FA[lead.status] ?? lead.status}</Badge>
                </td>
                <td className="px-4 py-3 text-xs">
                  {crm && crmData ? (
                    <Link href={`/ops/leads/${crm.crmId}`} className="text-purple-900 hover:text-purple-600 hover:underline">
                      {shown(crmData, "new_status") ?? "مشاهده"}
                    </Link>
                  ) : (
                    <span className="text-secondary">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-secondary">{lead.assignedAdvisor?.name ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-secondary">{lead.createdAt.toLocaleString("fa-IR", { calendar: "gregory" })}</td>
                <td className="px-4 py-3">
                  {lead.status === "NEW" && (
                    <form action={markContacted}>
                      <input type="hidden" name="leadId" value={lead.id} />
                      <Button type="submit" variant="secondary">
                        تماس گرفته شد
                      </Button>
                    </form>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
