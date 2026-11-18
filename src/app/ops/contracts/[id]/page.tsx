import Link from "next/link";
import { CrmEditPanel } from "@/components/crm/customer/CrmEditPanel";
import { writeMode } from "@/lib/dynamics/write";
import { JumpToNote } from "@/components/crm/customer/JumpToNote";
import { AddNoteForm } from "@/components/crm/customer/CrmWriteForms";
import { notFound, redirect } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { isGuid } from "@/lib/dynamics/identity";
import { loadWithRelated } from "@/lib/crm/record360";
import { TABLE_LABELS, displayName } from "@/lib/dynamics/view";
import { Badge } from "@/components/shared/Badge";
import { FilterChip, HISTORY_TYPES, HistoryItem, TicketCard, happenedAt, shown, shownDate, statusFa } from "@/components/crm/customer/OldCrmParts";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
/**
 * Contract 360 — one old-CRM contract (Dynamics opportunity) with its key facts and everything filed on it:
 * tickets, the merged history (e-mails, calls, tasks, appointments, notes), points and other records. Read-only
 * until write-back to Dynamics exists; «ویرایش در Dynamics» opens the record there.
 */
export const dynamic = "force-dynamic";

const DYNAMICS_RECORD = (id: string) => `http://tarefe.online/Tarefe/main.aspx?etn=opportunity&pagetype=entityrecord&id=${id}`;
const OWN_SECTION = new Set(["incident", "new_points", ...Object.keys(HISTORY_TYPES)]);

/** Whole days from now until `date` (negative when it has passed). */
function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - new Date().getTime()) / 86_400_000);
}

const euro = (v: unknown) => (typeof v === "number" && v !== 0 ? `${v.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €` : null);

export default async function ContractPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ history?: string }> }) {
  const { t, tn, intl } = await getOpsI18n();
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const { id } = await params;
  const { history } = await searchParams;
  if (!isGuid(id)) notFound();

  const loaded = await loadWithRelated("opportunity", id);
  if (!loaded) notFound();
  const { record: contract, related } = loaded;
  const d = contract.data;
  const self = `/ops/contracts/${contract.crmId}`;

  const customerId = typeof d._customerid_value === "string" ? d._customerid_value : null;
  const deadline = typeof d.new_datelaqve === "string" ? new Date(d.new_datelaqve) : null;
  const cancelled = typeof d.new_cancellation_date === "string" || Number(d.statecode) === 2;
  const daysLeft = deadline ? daysUntil(deadline) : null;

  const tickets = related.incident ?? [];
  const points = related.new_points ?? [];
  const historyAll = Object.keys(HISTORY_TYPES)
    .flatMap((t) => related[t] ?? [])
    .sort((a, b) => happenedAt(b) - happenedAt(a));
  const historyShown = history && HISTORY_TYPES[history] ? historyAll.filter((r) => r.entity === history) : historyAll;
  const others = Object.entries(related).filter(([entity]) => !OWN_SECTION.has(entity));

  // Facts grouped the way operators read a contract (staff feedback 2026-11-18: one long list was hard to scan); each
  // fact only when filled, each group only when it has one. Everything else: the full form («فرم کامل در CRM قدیم»).
  const groups: [string, [string, string | null][]][] = [
    [
      t("تاریخ‌ها"),
      [
        [t("شروع"), shownDate(d, "new_startdate", false, intl)],
        [t("پایان"), shownDate(d, "new_dateend", false, intl)],
        [t("مدت"), tn(shown(d, "new_modat"))],
        [t("مهلت لغو"), shownDate(d, "new_datelaqve", false, intl)],
        [t("لغو شد"), shownDate(d, "new_cancellation_date", false, intl)],
      ],
    ],
    [
      t("مالی"),
      [
        [t("مبلغ"), euro(d.new_mablaq) && [euro(d.new_mablaq), tn(shown(d, "new_mah"))].filter(Boolean).join(" / ")],
        [t("پورسانت"), euro(d.new_commision_amount)],
        [t("درآمد تعرفه"), euro(d.new_total_tarefe_income)],
        [t("درآمد اپراتور"), euro(d.new_total_operator_income)],
        [t("امتیاز قرارداد"), typeof d.new_opp_point === "number" && d.new_opp_point ? d.new_opp_point.toLocaleString(intl) : null],
      ],
    ],
    [
      t("شماره‌ها"),
      [
        ["Vertragsnummer", shown(d, "new_shomareh")],
        ["Auftragsnummer", shown(d, "new_request_number")],
        ["Referenznummer", shown(d, "new_refrenznummer")],
        [t("کد قرارداد"), shown(d, "new_code")],
        [t("پلاک"), shown(d, "new_pelak")],
        ["HSN / TSN", [shown(d, "new_hsn_tsn"), shown(d, "new_tsn")].filter(Boolean).join(" / ") || null],
        ["SF", shown(d, "new_sf_klasse")],
        [t("مصرف سالیانه"), shown(d, "new_masraf")],
        [t("شماره کنتور"), shown(d, "new_kontor")],
      ],
    ],
    [
      t("مسئول و ثبت"),
      [
        [t("مسئول"), shown(d, "ownerid")],
        [t("ایجاد از طریق"), tn(shown(d, "new_created_from"))],
        [t("ثبت"), shownDate(d, "createdon", false, intl)],
      ],
    ],
  ];
  const writes = writeMode();
  const customerName = shown(d, "customerid");

  return (
    <div className="container-page py-8">
      {/* Back returns to wherever the user came from (customer, list, ticket…); without history: the customer, else the list. */}
      <BackLink fallback={customerId ? `/ops/customers/${customerId}` : "/ops/contracts"} />

      <header className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-purple-900">{shown(d, "name") ?? t("قرارداد بدون عنوان")}</h1>
              {shown(d, "new_step") && <Badge tone={cancelled ? "neutral" : "purple"}>{shown(d, "new_step")}</Badge>}
              {shown(d, "statuscode") && <Badge>{tn(statusFa(shown(d, "statuscode")))}</Badge>}
            </div>
            <p className="mt-1 text-sm text-secondary">{[shown(d, "new_category"), shown(d, "parentaccountid"), shown(d, "new_contract_company")].filter(Boolean).join(" · ")}</p>
            {customerId && (
              <p className="mt-2 text-sm">
                <span className="text-secondary">{t("مشتری:")} </span>
                <Link href={`/ops/customers/${customerId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                  {customerName ?? t("مشاهده مشتری")}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {writes !== "off" && (
              <JumpToNote />
            )}
            <Link href={`/ops/old-crm/opportunity/${contract.crmId}`} className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
              {t("فرم کامل در CRM قدیم")}
            </Link>
            <a
              href={DYNAMICS_RECORD(contract.crmId)}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600"
            >
              {t("ویرایش در Dynamics")}
              <ArrowSquareOut size={12} />
            </a>
          </div>
        </div>

        {deadline && !cancelled && (
          <div
            className={`mt-4 inline-flex items-baseline gap-2 rounded-xl px-3 py-2 text-sm ${daysLeft !== null && daysLeft < 0 ? "bg-danger-bg text-danger" : daysLeft !== null && daysLeft <= 30 ? "bg-warning-bg text-warning" : "bg-tint text-body"}`}
          >
            <span className="font-medium">{t("مهلت لغو: {date}", { date: shownDate(d, "new_datelaqve", false, intl) })}</span>
            {daysLeft !== null && (
              <span className="text-xs">
                {daysLeft < 0 ? t("{n} روز گذشته", { n: (-daysLeft).toLocaleString(intl) }) : daysLeft === 0 ? t("امروز") : t("{n} روز مانده", { n: daysLeft.toLocaleString(intl) })}
              </span>
            )}
          </div>
        )}
      </header>

      {/* Two columns like the old CRM's form: the contract on one side, notes and activities on the other. */}
      <div className="mt-6 grid items-start gap-6 @3xl:grid-cols-5">
        <div className="space-y-6 @3xl:col-span-3">
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">{t("جزئیات قرارداد")}</h2>
            <div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2">
              {groups
                .map(([title, rows]) => [title, rows.filter(([, v]) => v)] as const)
                .filter(([, rows]) => rows.length)
                .map(([title, rows]) => (
                  <div key={title}>
                    <h3 className="mb-1.5 text-xs font-semibold text-secondary">{title}</h3>
                    <dl className="divide-y divide-border text-sm">
                      {rows.map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-4 py-1.5">
                          <dt className="shrink-0 text-secondary">{label}</dt>
                          <dd className="min-w-0 text-end font-medium text-body [overflow-wrap:anywhere]">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">{t("تیکت‌های این قرارداد ({n})", { n: tickets.length.toLocaleString(intl) })}</h2>
            <div className="mt-3 space-y-2">{tickets.length ? tickets.map((r) => <TicketCard key={r.crmId} r={r} />) : <Empty />}</div>
          </section>

          {points.length > 0 && (
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-3 text-sm font-bold text-purple-900">{t("امتیازها ({n})", { n: points.length.toLocaleString(intl) })}</h2>
              <ul className="space-y-1.5 text-sm">
                {points.slice(0, 10).map((p) => (
                  <li key={p.crmId}>
                    <Link href={`/ops/old-crm/new_points/${p.crmId}`} className="text-body hover:text-purple-600 hover:underline">
                      {displayName("new_points", p.data)}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {others.length > 0 && (
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-3 text-sm font-bold text-purple-900">{t("سایر سوابق")}</h2>
              <div className="space-y-4">
                {others.map(([entity, rows]) => (
                  <div key={entity}>
                    <p className="text-xs font-medium text-secondary">
                      {t(TABLE_LABELS[entity] ?? entity)} ({rows.length.toLocaleString(intl)})
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {rows.slice(0, 5).map((r) => (
                        <li key={r.crmId}>
                          <Link
                            href={r.entity === "opportunity" ? `/ops/contracts/${r.crmId}` : `/ops/old-crm/${entity}/${r.crmId}`}
                            className="text-sm text-purple-900 hover:text-purple-600 hover:underline"
                          >
                            {displayName(entity, r.data)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <CrmEditPanel entity="opportunity" id={contract.crmId} data={d} state={Number(d.statecode)} returnPath={self} folded />
        </div>

        <section className="rounded-2xl border border-border bg-white p-6 @3xl:col-span-2">
          <h2 className="text-sm font-bold text-purple-900">{t("یادداشت‌ها و فعالیت‌ها ({n})", { n: historyAll.length.toLocaleString(intl) })}</h2>
          {writes !== "off" && (
            <div className="mt-3">
              <AddNoteForm entity="opportunity" id={contract.crmId} returnPath={self} dry={writes === "dry"} anchor="note" />
            </div>
          )}
          <div className="mb-4 mt-4 flex flex-wrap gap-1.5">
            <FilterChip href={self} active={!history}>
              {t("همه")}
            </FilterChip>
            {Object.entries(HISTORY_TYPES).map(([type, ht]) => {
              const n = (related[type] ?? []).length;
              return n ? (
                <FilterChip key={type} href={`${self}?history=${type}`} active={history === type}>
                  {t(ht.label)} ({n.toLocaleString(intl)})
                </FilterChip>
              ) : null;
            })}
          </div>
          {historyShown.length ? (
            <ol className="relative">
              {historyShown.map((r) => (
                <HistoryItem key={`${r.entity}:${r.crmId}`} r={r} customerId={contract.crmId} />
              ))}
            </ol>
          ) : (
            <Empty />
          )}
        </section>
      </div>
    </div>
  );
}

async function Empty() {
  const { t } = await getOpsI18n();
  return <p className="text-sm text-secondary">{t("موردی وجود ندارد.")}</p>;
}
