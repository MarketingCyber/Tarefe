import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { loadWithRelated } from "@/lib/crm/record360";
import { TABLE_LABELS, displayName } from "@/lib/dynamics/view";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { FilterChip, HISTORY_TYPES, HistoryItem, happenedAt, plain, shown, shownDate, statusFa } from "@/components/crm/customer/OldCrmParts";

/**
 * An old-CRM ticket (Dynamics incident) — what the customer asked, the operator's note, the contract and customer
 * it's about, the follow-up date, and its history (e-mails, calls, tasks, notes filed on it). Read-only until
 * write-back to Dynamics exists. Rendered by /ops/tickets/[id] for Dynamics ids; tarefe.de tickets keep their page.
 */

const DYNAMICS_RECORD = (id: string) => `http://tarefe.online/Tarefe/main.aspx?etn=incident&pagetype=entityrecord&id=${id}`;
const STATE_TONE: BadgeTone[] = ["warning", "success", "neutral"]; // 0 active, 1 resolved, 2 cancelled

/** Whole days from now until `date` (negative when it has passed). */
function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - new Date().getTime()) / 86_400_000);
}

export async function CrmTicket({ id, history }: { id: string; history?: string }) {
  const loaded = await loadWithRelated("incident", id);
  if (!loaded) notFound();
  const { record, related } = loaded;
  const d = record.data;
  const self = `/ops/tickets/${record.crmId}`;

  const customerId = typeof d._customerid_value === "string" ? d._customerid_value : null;
  const contractId = typeof d._new_opportunity_value === "string" ? d._new_opportunity_value : null;
  const followUp = typeof d.new_follow_up_again === "string" ? new Date(d.new_follow_up_again) : null;
  const followUpDays = followUp ? daysUntil(followUp) : null;
  const description = plain(d.description);
  const operatorNote = plain(d.new_description_operator);

  const historyAll = Object.keys(HISTORY_TYPES)
    .flatMap((t) => related[t] ?? [])
    .sort((a, b) => happenedAt(b) - happenedAt(a));
  const historyShown = history && HISTORY_TYPES[history] ? historyAll.filter((r) => r.entity === history) : historyAll;
  const others = Object.entries(related).filter(([entity]) => !(entity in HISTORY_TYPES));

  const facts: [string, string | null][] = [
    ["شماره", shown(d, "ticketnumber")],
    ["کد سایت", shown(d, "new_ticket_code")],
    ["نوع قرارداد", shown(d, "new_category")],
    ["اولویت", statusFa(shown(d, "prioritycode"))],
    ["مسئول", shown(d, "ownerid")],
    ["ایجاد", shownDate(d, "createdon", true)],
    ["آخرین تغییر", shownDate(d, "modifiedon", true)],
  ];

  return (
    <div className="container-page py-8">
      <Link href="/ops/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به تیکت‌ها
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-purple-900">{shown(d, "title") ?? "تیکت بدون عنوان"}</h1>
              <Badge tone={STATE_TONE[Number(d.statecode)] ?? "neutral"}>{shown(d, "new_status") ?? statusFa(shown(d, "statuscode")) ?? "—"}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {customerId && (
                <p>
                  <span className="text-secondary">مشتری: </span>
                  <Link href={`/ops/customers/${customerId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "customerid") ?? "مشاهده مشتری"}
                  </Link>
                </p>
              )}
              {contractId && (
                <p>
                  <span className="text-secondary">قرارداد: </span>
                  <Link href={`/ops/contracts/${contractId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "new_opportunity") ?? "مشاهده قرارداد"}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ops/old-crm/incident/${record.crmId}`} className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
              فرم کامل در CRM قدیم
            </Link>
            <a
              href={DYNAMICS_RECORD(record.crmId)}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600"
            >
              ویرایش در Dynamics
              <ArrowSquareOut size={12} />
            </a>
          </div>
        </div>

        {followUp && followUpDays !== null && (
          <div
            className={`mt-4 inline-flex items-baseline gap-2 rounded-xl px-3 py-2 text-sm ${followUpDays < 0 ? "bg-danger-bg text-danger" : followUpDays <= 7 ? "bg-warning-bg text-warning" : "bg-tint text-body"}`}
          >
            <span className="font-medium">پیگیری مجدد: {shownDate(d, "new_follow_up_again")}</span>
            <span className="text-xs">{followUpDays < 0 ? `${(-followUpDays).toLocaleString("fa-IR")} روز گذشته` : followUpDays === 0 ? "امروز" : `${followUpDays.toLocaleString("fa-IR")} روز مانده`}</span>
          </div>
        )}

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {facts
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 text-secondary">{label}:</dt>
                <dd className="min-w-0 text-body [overflow-wrap:anywhere]">{value}</dd>
              </div>
            ))}
        </dl>
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-3">
        <div className="space-y-6 2xl:col-span-2">
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">شرح درخواست</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-body [overflow-wrap:anywhere]">{description || "شرحی ثبت نشده."}</p>
            {operatorNote && (
              <>
                <h3 className="mt-5 text-xs font-bold text-secondary">یادداشت اپراتور</h3>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-body [overflow-wrap:anywhere]">{operatorNote}</p>
              </>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">تاریخچه ({historyAll.length.toLocaleString("fa-IR")})</h2>
            {historyAll.length > 0 && (
              <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
                <FilterChip href={self} active={!history}>
                  همه
                </FilterChip>
                {Object.entries(HISTORY_TYPES).map(([type, t]) => {
                  const n = (related[type] ?? []).length;
                  return n ? (
                    <FilterChip key={type} href={`${self}?history=${type}`} active={history === type}>
                      {t.label} ({n.toLocaleString("fa-IR")})
                    </FilterChip>
                  ) : null;
                })}
              </div>
            )}
            {historyShown.length ? (
              <ol className="relative">
                {historyShown.map((r) => (
                  <HistoryItem key={`${r.entity}:${r.crmId}`} r={r} customerId={record.crmId} />
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-sm text-secondary">موردی وجود ندارد.</p>
            )}
          </section>
        </div>

        {others.length > 0 && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-3 text-sm font-bold text-purple-900">سوابق مرتبط</h2>
              <div className="space-y-4">
                {others.map(([entity, rows]) => (
                  <div key={entity}>
                    <p className="text-xs font-medium text-secondary">
                      {TABLE_LABELS[entity] ?? entity} ({rows.length.toLocaleString("fa-IR")})
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {rows.slice(0, 5).map((r) => (
                        <li key={r.crmId}>
                          <Link
                            href={entity === "opportunity" ? `/ops/contracts/${r.crmId}` : `/ops/old-crm/${entity}/${r.crmId}`}
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
          </div>
        )}
      </div>
    </div>
  );
}
