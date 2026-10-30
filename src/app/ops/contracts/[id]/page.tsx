import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { isGuid } from "@/lib/dynamics/identity";
import { loadContract } from "@/lib/crm/contract360";
import { TABLE_LABELS, displayName } from "@/lib/dynamics/view";
import { Badge } from "@/components/shared/Badge";
import { FilterChip, HISTORY_TYPES, HistoryItem, TicketCard, happenedAt, shown, shownDate, statusFa } from "@/components/crm/customer/OldCrmParts";

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
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");
  const { id } = await params;
  const { history } = await searchParams;
  if (!isGuid(id)) notFound();

  const loaded = await loadContract(id);
  if (!loaded) notFound();
  const { contract, related } = loaded;
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

  // Facts in the order operators read a contract; each one only when filled. Everything else: the full form.
  const facts: [string, string | null][] = [
    ["شروع", shownDate(d, "new_startdate")],
    ["پایان", shownDate(d, "new_dateend")],
    ["مدت", shown(d, "new_modat")],
    ["لغو شد", shownDate(d, "new_cancellation_date")],
    ["مبلغ", euro(d.new_mablaq) && [euro(d.new_mablaq), shown(d, "new_mah")].filter(Boolean).join(" / ")],
    ["پورسانت", euro(d.new_commision_amount)],
    ["درآمد تعرفه", euro(d.new_total_tarefe_income)],
    ["درآمد اپراتور", euro(d.new_total_operator_income)],
    ["امتیاز قرارداد", typeof d.new_opp_point === "number" && d.new_opp_point ? d.new_opp_point.toLocaleString("fa-IR") : null],
    ["Vertragsnummer", shown(d, "new_shomareh")],
    ["Auftragsnummer", shown(d, "new_request_number")],
    ["Referenznummer", shown(d, "new_refrenznummer")],
    ["کد قرارداد", shown(d, "new_code")],
    ["پلاک", shown(d, "new_pelak")],
    ["HSN / TSN", [shown(d, "new_hsn_tsn"), shown(d, "new_tsn")].filter(Boolean).join(" / ") || null],
    ["SF", shown(d, "new_sf_klasse")],
    ["مصرف سالیانه", shown(d, "new_masraf")],
    ["شماره کنتور", shown(d, "new_kontor")],
    ["ایجاد از طریق", shown(d, "new_created_from")],
    ["مسئول", shown(d, "ownerid")],
    ["ثبت", shownDate(d, "createdon")],
  ];

  return (
    <div className="container-page py-8">
      <Link href="/ops/contracts" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به قراردادها
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-purple-900">{shown(d, "name") ?? "قرارداد بدون عنوان"}</h1>
              {shown(d, "new_step") && <Badge tone={cancelled ? "neutral" : "purple"}>{shown(d, "new_step")}</Badge>}
              {shown(d, "statuscode") && <Badge>{statusFa(shown(d, "statuscode"))}</Badge>}
            </div>
            <p className="mt-1 text-sm text-secondary">{[shown(d, "new_category"), shown(d, "parentaccountid"), shown(d, "new_contract_company")].filter(Boolean).join(" · ")}</p>
            {customerId && (
              <p className="mt-2 text-sm">
                <span className="text-secondary">مشتری: </span>
                <Link href={`/ops/customers/${customerId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                  {shown(d, "customerid") ?? "مشاهده مشتری"}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ops/old-crm/opportunity/${contract.crmId}`} className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
              فرم کامل در CRM قدیم
            </Link>
            <a
              href={DYNAMICS_RECORD(contract.crmId)}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600"
            >
              ویرایش در Dynamics
              <ArrowSquareOut size={12} />
            </a>
          </div>
        </div>

        {deadline && !cancelled && (
          <div
            className={`mt-4 inline-flex items-baseline gap-2 rounded-xl px-3 py-2 text-sm ${daysLeft !== null && daysLeft < 0 ? "bg-danger-bg text-danger" : daysLeft !== null && daysLeft <= 30 ? "bg-warning-bg text-warning" : "bg-tint text-body"}`}
          >
            <span className="font-medium">مهلت لغو: {shownDate(d, "new_datelaqve")}</span>
            {daysLeft !== null && <span className="text-xs">{daysLeft < 0 ? `${(-daysLeft).toLocaleString("fa-IR")} روز گذشته` : daysLeft === 0 ? "امروز" : `${daysLeft.toLocaleString("fa-IR")} روز مانده`}</span>}
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
            <h2 className="text-sm font-bold text-purple-900">تیکت‌های این قرارداد ({tickets.length.toLocaleString("fa-IR")})</h2>
            <div className="mt-3 space-y-2">{tickets.length ? tickets.map((r) => <TicketCard key={r.crmId} r={r} />) : <Empty />}</div>
          </section>

          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">تاریخچه ({historyAll.length.toLocaleString("fa-IR")})</h2>
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

        <div className="space-y-6">
          {points.length > 0 && (
            <section className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-3 text-sm font-bold text-purple-900">امتیازها ({points.length.toLocaleString("fa-IR")})</h2>
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
              <h2 className="mb-3 text-sm font-bold text-purple-900">سایر سوابق</h2>
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
        </div>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-secondary">موردی وجود ندارد.</p>;
}
