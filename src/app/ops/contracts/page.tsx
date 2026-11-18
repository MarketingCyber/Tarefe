import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { FilterChip, shown, shownDate, statusFa } from "@/components/crm/customer/OldCrmParts";
import { CONTRACT_STATUS_FA } from "@/lib/status-labels";
import { canAccessPipeline } from "@/lib/permissions";
import { crmUsers } from "@/lib/crm/crm-users";

import { getOpsI18n } from "@/lib/ops-i18n/server";
/**
 * Contracts across both CRMs. Three views:
 *  - deadlines (default): active old-CRM contracts (Dynamics state open/won) whose cancellation deadline
 *    (new_datelaqve → crm_records.dueAt) passed in the last 30 days or comes in the next 90 — the list operators
 *    work through so no Kündigungsfrist is missed — bucketed by urgency, filterable by owner and contract type;
 *  - all: every old-CRM contract, searchable, filterable by stage, state, type and owner;
 *  - site: contracts entered on tarefe.de (the Contract model), with their own deadline calendar.
 * Each old-CRM contract opens its Contract 360 (/ops/contracts/[id]).
 */
export const dynamic = "force-dynamic";

const PAGE = 100;
const DAY = 86_400_000;
type Row = { crmId: string; data: Record<string, unknown>; dueAt: Date | null };
type Bucket = "overdue" | "week" | "month" | "later";

const BUCKET_LABEL: Record<Bucket, string> = { overdue: "گذشته (۳۰ روز اخیر)", week: "تا ۷ روز", month: "تا ۳۰ روز", later: "تا ۹۰ روز" };
const BUCKET_TONE: Record<Bucket, BadgeTone> = { overdue: "danger", week: "warning", month: "warning", later: "neutral" };

function bucketFor(due: Date, today: number): Bucket {
  const days = Math.floor((due.getTime() - today) / DAY);
  if (days < 0) return "overdue";
  if (days <= 7) return "week";
  if (days <= 30) return "month";
  return "later";
}

const STATE_FILTER: Record<string, { label: string; states: number[] }> = {
  active: { label: "فعال", states: [0, 1] },
  ended: { label: "پایان‌یافته", states: [2] },
};

export default async function OpsContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; owner?: string; category?: string; step?: string; state?: string; page?: string }>;
}) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const sp = await searchParams;
  const view = sp.view === "all" || sp.view === "site" ? sp.view : "deadlines";
  const page = Math.max(1, Number(sp.page) || 1);
  const owner = sp.owner?.toLowerCase() || null;
  const category = sp.category?.toLowerCase() || null;

  const [owners, categories] = await Promise.all([
    crmUsers(),
    prisma.crmRecord.findMany({ where: { entity: "new_category", deletedAt: null }, select: { crmId: true, data: true } }),
  ]);
  const ownerOptions = owners.map((o) => ({ id: o.id, name: o.disabled ? `${o.name} (${t("غیرفعال")})` : o.name }));
  const categoryOptions = categories.map((c) => ({ id: c.crmId.toLowerCase(), name: shown(c.data as Record<string, unknown>, "new_name") ?? "—" })).sort((a, b) => a.name.localeCompare(b.name));

  const href = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const merged = { view, q: sp.q ?? null, owner, category, step: sp.step ?? null, state: sp.state ?? null, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v && !(k === "view" && v === "deadlines")) params.set(k, v);
    const qs = params.toString();
    return `/ops/contracts${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold text-purple-900">{t("قراردادها")}</h1>
      <p className="mt-1 text-sm text-secondary">{t("قراردادهای CRM قدیم و سایت در یک‌جا — مهلت‌های لغو، جستجو و پروفایل کامل هر قرارداد.")}</p>

      <div className="mt-5 flex flex-wrap gap-1.5">
        <FilterChip href={href({ view: "deadlines", page: null })} active={view === "deadlines"}>
          {t("مهلت‌های لغو")}
        </FilterChip>
        <FilterChip href={href({ view: "all", page: null })} active={view === "all"}>
          {t("همه قراردادها")}
        </FilterChip>
        <FilterChip href={href({ view: "site", page: null })} active={view === "site"}>
          {t("قراردادهای سایت")}
        </FilterChip>
      </div>

      {view !== "site" && (
        <form className="mt-4 flex flex-wrap items-center gap-2 text-sm" role="search">
          <input type="hidden" name="view" value={view} />
          {view === "all" && (
            <div className="flex min-w-64 flex-1 items-center gap-2 rounded-full border border-border-strong bg-white px-4 py-2 focus-within:border-purple-600">
              <MagnifyingGlass size={16} className="shrink-0 text-secondary" aria-hidden />
              <input name="q" defaultValue={sp.q ?? ""} placeholder={t("عنوان، Vertragsnummer، کد، مشتری…")} aria-label={t("جستجوی قرارداد")} className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-secondary" />
            </div>
          )}
          <Select name="owner" value={owner} label={t("مسئول")} options={ownerOptions} />
          <Select name="category" value={category} label={t("نوع قرارداد")} options={categoryOptions} />
          {view === "all" && (
            <>
              <Select name="step" value={sp.step ?? null} label={t("مرحله")} options={["Angebot", "Aktuell", "Aktuell T"].map((s) => ({ id: s, name: s }))} />
              <Select name="state" value={sp.state ?? null} label={t("وضعیت")} options={Object.entries(STATE_FILTER).map(([id, s]) => ({ id, name: t(s.label) }))} />
            </>
          )}
          <button type="submit" className="press rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
            {t("اعمال")}
          </button>
          {(owner || category || sp.q || sp.step || sp.state) && (
            <Link href={href({ q: null, owner: null, category: null, step: null, state: null, page: null })} className="text-xs font-medium text-secondary hover:text-purple-600">
              {t("حذف فیلترها")}
            </Link>
          )}
        </form>
      )}

      {view === "deadlines" && <Deadlines owner={owner} category={category} page={page} href={href} />}
      {view === "all" && <AllContracts q={sp.q?.trim() ?? ""} owner={owner} category={category} step={sp.step ?? null} state={sp.state ?? null} page={page} href={href} />}
      {view === "site" && <SiteContracts />}
    </div>
  );
}

async function Deadlines({ owner, category, page, href }: { owner: string | null; category: string | null; page: number; href: (p: Record<string, string | null>) => string }) {
  const { t, intl } = await getOpsI18n();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const where = {
    entity: "opportunity",
    deletedAt: null,
    state: { in: [0, 1] },
    dueAt: { gte: new Date(today - 30 * DAY), lt: new Date(today + 91 * DAY) },
    ...(owner ? { ownerId: owner } : {}),
    ...(category ? { data: { path: ["_new_category_value"], equals: category } } : {}),
  };
  const [rows, total, overdue, week, month] = await Promise.all([
    prisma.crmRecord.findMany({ where, select: { crmId: true, data: true, dueAt: true }, orderBy: { dueAt: "asc" }, skip: (page - 1) * PAGE, take: PAGE }) as Promise<Row[]>,
    prisma.crmRecord.count({ where }),
    prisma.crmRecord.count({ where: { ...where, dueAt: { gte: new Date(today - 30 * DAY), lt: new Date(today) } } }),
    prisma.crmRecord.count({ where: { ...where, dueAt: { gte: new Date(today), lt: new Date(today + 8 * DAY) } } }),
    prisma.crmRecord.count({ where: { ...where, dueAt: { gte: new Date(today + 8 * DAY), lt: new Date(today + 31 * DAY) } } }),
  ]);
  const counts: Record<Bucket, number> = { overdue, week, month, later: total - overdue - week - month };

  if (!total)
    return (
      <div className="mt-8">
        <EmptyState icon={FileText} title={t("مهلت لغوی در این بازه نیست")} body={t("قراردادهای فعال با مهلت لغو در ۳۰ روز گذشته تا ۹۰ روز آینده این‌جا نمایش داده می‌شوند.")} />
      </div>
    );

  // A bucket header row before the first contract of each bucket (rows are sorted by deadline).
  const listed = rows.map((r, i) => {
    const bucket = bucketFor(r.dueAt!, today);
    return { r, bucket, header: i === 0 || bucketFor(rows[i - 1].dueAt!, today) !== bucket, days: Math.floor((r.dueAt!.getTime() - today) / DAY) };
  });
  return (
    <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(BUCKET_LABEL) as Bucket[]).map((b) => (
          <div key={b} className="rounded-2xl border border-border bg-white p-4">
            <p className="text-xs text-secondary">{t(BUCKET_LABEL[b])}</p>
            <p className={`mt-1 text-2xl font-bold tabular-nums ${b === "overdue" && counts[b] ? "text-danger" : "text-purple-900"}`}>{counts[b].toLocaleString(intl)}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="px-4 py-3 text-start font-medium">{t("مهلت لغو")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("قرارداد")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("مشتری")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("پایان")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("مرحله")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("مسئول")}</th>
            </tr>
          </thead>
          <tbody>
            {listed.map(({ r, bucket, header, days }) => {
              return [
                header && (
                  <tr key={`h-${bucket}`} className="border-b border-border bg-tint/60">
                    <td colSpan={6} className="px-4 py-2 text-xs font-bold text-purple-900">
                      {t(BUCKET_LABEL[bucket])}
                    </td>
                  </tr>
                ),
                <tr key={r.crmId} className="border-b border-border last:border-0 hover:bg-tint/40">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="text-body">{shownDate(r.data, "new_datelaqve", false, intl)}</span>{" "}
                    <Badge tone={BUCKET_TONE[bucket]}>{days < 0 ? t("{n} روز گذشته", { n: (-days).toLocaleString(intl) }) : days === 0 ? t("امروز") : t("{n} روز", { n: days.toLocaleString(intl) })}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/ops/contracts/${r.crmId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                      {shown(r.data, "name") ?? t("قرارداد")}
                    </Link>
                    <span className="block text-xs text-secondary">{[shown(r.data, "new_category"), shown(r.data, "parentaccountid")].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="px-4 py-3">
                    <CustomerLink data={r.data} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-secondary">{shownDate(r.data, "new_dateend", false, intl) ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{shown(r.data, "new_step") ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-secondary">{shown(r.data, "ownerid") ?? "—"}</td>
                </tr>,
              ];
            })}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasNext={page * PAGE < total} href={href} />
    </>
  );
}

async function AllContracts({
  q,
  owner,
  category,
  step,
  state,
  page,
  href,
}: {
  q: string;
  owner: string | null;
  category: string | null;
  step: string | null;
  state: string | null;
  page: number;
  href: (p: Record<string, string | null>) => string;
}) {
  const { t, intl } = await getOpsI18n();
  const ids = q
    ? (
        await prisma.$queryRaw<{ crmId: string }[]>`
          SELECT "crmId" FROM crm_records WHERE entity = 'opportunity' AND "deletedAt" IS NULL
            AND data::text ILIKE ${`%${q.replace(/[%_\\]/g, "\\$&")}%`}
          ORDER BY "crmModifiedAt" DESC NULLS LAST LIMIT 1000`
      ).map((r) => r.crmId)
    : null;
  const where = {
    entity: "opportunity",
    deletedAt: null,
    ...(ids ? { crmId: { in: ids } } : {}),
    ...(owner ? { ownerId: owner } : {}),
    ...(state && STATE_FILTER[state] ? { state: { in: STATE_FILTER[state].states } } : {}),
    ...(category || step
      ? {
          AND: [
            ...(category ? [{ data: { path: ["_new_category_value"], equals: category } }] : []),
            ...(step ? [{ data: { path: ["new_step@OData.Community.Display.V1.FormattedValue"], equals: step } }] : []),
          ],
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.crmRecord.findMany({ where, select: { crmId: true, data: true, dueAt: true }, orderBy: { crmModifiedAt: "desc" }, skip: (page - 1) * PAGE, take: PAGE }) as Promise<Row[]>,
    prisma.crmRecord.count({ where }),
  ]);

  if (!rows.length)
    return (
      <div className="mt-8">
        <EmptyState icon={FileText} title={q ? t("قراردادی با «{q}» پیدا نشد", { q }) : t("قراردادی با این فیلترها نیست")} body={t("فیلترها را تغییر دهید یا عبارت دیگری جستجو کنید.")} />
      </div>
    );

  return (
    <>
      <p className="mt-5 text-xs text-secondary">{t("{n} قرارداد", { n: total.toLocaleString(intl) })}{ids && ids.length >= 1000 ? t(" (۱٬۰۰۰ نتیجه اول جستجو)") : ""}</p>
      <div className="mt-2 overflow-x-auto rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="px-4 py-3 text-start font-medium">{t("قرارداد")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("مشتری")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("مرحله / وضعیت")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("شروع")}</th>
              <th className="px-4 py-3 text-start font-medium">{t("مهلت لغو")}</th>
              <th className="px-4 py-3 text-start font-medium">Vertragsnummer</th>
              <th className="px-4 py-3 text-start font-medium">{t("مسئول")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.crmId} className="border-b border-border last:border-0 hover:bg-tint/40">
                <td className="px-4 py-3">
                  <Link href={`/ops/contracts/${r.crmId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(r.data, "name") ?? t("قرارداد")}
                  </Link>
                  <span className="block text-xs text-secondary">{[shown(r.data, "new_category"), shown(r.data, "parentaccountid")].filter(Boolean).join(" · ")}</span>
                </td>
                <td className="px-4 py-3">
                  <CustomerLink data={r.data} />
                </td>
                <td className="px-4 py-3 text-xs text-secondary">{[shown(r.data, "new_step"), statusFa(shown(r.data, "statuscode"))].filter(Boolean).join(" · ") || "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-secondary">{shownDate(r.data, "new_startdate", false, intl) ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-secondary">{shownDate(r.data, "new_datelaqve", false, intl) ?? "—"}</td>
                <td className="font-latin px-4 py-3 text-xs text-secondary">{shown(r.data, "new_shomareh") ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-secondary">{shown(r.data, "ownerid") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={page} hasNext={page * PAGE < total} href={href} />
    </>
  );
}

const SITE_STATUS_TONE: Record<string, BadgeTone> = { ACTIVE: "success", PENDING: "warning", EXPIRING: "warning", CANCELLED: "danger" };

async function SiteContracts() {
  const { t, intl } = await getOpsI18n();
  const contracts = await prisma.contract.findMany({
    where: { crmId: null }, // projected Dynamics contracts are in the views above
    orderBy: { createdAt: "desc" },
    include: { customer: { select: { id: true, name: true, email: true } } },
    take: 100,
  });
  if (!contracts.length)
    return (
      <div className="mt-8">
        <EmptyState icon={FileText} title={t("هنوز قراردادی در سایت ثبت نشده")} body={t("با تایید یک درخواست، یک قرارداد ساخته می‌شود.")} />
      </div>
    );
  return (
    <div className="mt-5 overflow-x-auto rounded-xl border border-border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-secondary">
            <th className="px-4 py-3 text-start font-medium">{t("ارائه‌دهنده / محصول")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("مشتری")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("دسته‌بندی")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("قیمت")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("وضعیت")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("شروع")}</th>
            <th className="px-4 py-3 text-start font-medium">{t("سررسید لغو")}</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map((c) => (
            <tr key={c.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-purple-900">
                {c.provider} — {c.productName}
              </td>
              <td className="px-4 py-3 text-secondary">
                <Link href={`/ops/customers/${c.customer.id}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                  {c.customer.name}
                </Link>
                <br />
                <span className="font-latin text-xs">{c.customer.email}</span>
              </td>
              <td className="px-4 py-3 text-secondary">{c.category}</td>
              <td className="font-latin px-4 py-3 text-secondary">{c.priceMonthly ?? "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={SITE_STATUS_TONE[c.status]}>{CONTRACT_STATUS_FA[c.status] ?? c.status}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-secondary">{c.startDate ? c.startDate.toLocaleDateString(intl, { calendar: "gregory" }) : "—"}</td>
              <td className="px-4 py-3 text-xs text-secondary">{c.cancellationDeadline ? c.cancellationDeadline.toLocaleDateString(intl, { calendar: "gregory" }) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

async function CustomerLink({ data }: { data: Record<string, unknown> }) {
  const { t } = await getOpsI18n();
  const id = data._customerid_value;
  const name = shown(data, "customerid");
  if (typeof id !== "string") return <span className="text-xs text-secondary">—</span>;
  return (
    <Link href={`/ops/customers/${id}`} className="text-purple-900 hover:text-purple-600 hover:underline">
      {name ?? t("مشتری")}
    </Link>
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

async function Pager({ page, hasNext, href }: { page: number; hasNext: boolean; href: (p: Record<string, string | null>) => string }) {
  const { t, intl } = await getOpsI18n();
  if (page === 1 && !hasNext) return null;
  return (
    <div className="mt-4 flex items-center gap-3 text-sm">
      {page > 1 && (
        <Link href={href({ page: page > 2 ? String(page - 1) : null })} className="font-medium text-purple-600 hover:underline">
          {t("صفحه قبل")}
        </Link>
      )}
      <span className="text-secondary">{t("صفحه {n}", { n: page.toLocaleString(intl) })}</span>
      {hasNext && (
        <Link href={href({ page: String(page + 1) })} className="font-medium text-purple-600 hover:underline">
          {t("صفحه بعد")}
        </Link>
      )}
    </div>
  );
}
