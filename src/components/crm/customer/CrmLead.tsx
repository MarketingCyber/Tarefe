import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { loadWithRelated } from "@/lib/crm/record360";
import { emailKey, personKeys, phoneKey } from "@/lib/dynamics/identity";
import { TABLE_LABELS, displayName } from "@/lib/dynamics/view";
import { LEAD_STATUS_FA } from "@/lib/status-labels";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { FilterChip, HISTORY_TYPES, HistoryItem, happenedAt, plain, shown, shownDate } from "@/components/crm/customer/OldCrmParts";

/**
 * An old-CRM lead (Dynamics lead): who asked about what, where they came from (source), what became of it — the
 * contract it was converted to, or why it was closed — the same person's website form submissions (matched by
 * phone / e-mail), and the history filed on the lead. Read-only until write-back to Dynamics exists. Rendered by
 * /ops/leads/[id] for Dynamics ids; website leads keep their page.
 */

const DYNAMICS_RECORD = (id: string) => `http://tarefe.online/Tarefe/main.aspx?etn=lead&pagetype=entityrecord&id=${id}`;
export const LEAD_STATE_TONE: BadgeTone[] = ["purple", "success", "neutral"]; // 0 open, 1 qualified, 2 disqualified

export async function CrmLead({ id, history }: { id: string; history?: string }) {
  const loaded = await loadWithRelated("lead", id);
  if (!loaded) notFound();
  const { record, related } = loaded;
  const d = record.data;
  const self = `/ops/leads/${record.crmId}`;

  const contractId = typeof d._qualifyingopportunityid_value === "string" ? d._qualifyingopportunityid_value : null;
  const contactId = (typeof d._parentcontactid_value === "string" ? d._parentcontactid_value : null) ?? (typeof d._customerid_value === "string" ? d._customerid_value : null);
  const state = Number(d.statecode);

  // The same person's website form submissions: same e-mail, or same phone in any notation.
  const keys = new Set(personKeys(d));
  const emails = [...keys].filter((k) => k.startsWith("email:")).map((k) => k.slice(6));
  const phoneTails = [...keys].filter((k) => k.startsWith("tel:")).map((k) => k.slice(-7));
  const siteLeads = keys.size
    ? (
        await prisma.lead.findMany({
          where: {
            OR: [
              ...emails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })),
              ...phoneTails.map((t) => ({ phone: { contains: t } })),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      ).filter((l) => keys.has(emailKey(l.email) ?? "") || keys.has(phoneKey(l.phone) ?? ""))
    : [];

  const historyAll = Object.keys(HISTORY_TYPES)
    .flatMap((t) => related[t] ?? [])
    .sort((a, b) => happenedAt(b) - happenedAt(a));
  const historyShown = history && HISTORY_TYPES[history] ? historyAll.filter((r) => r.entity === history) : historyAll;
  const others = Object.entries(related).filter(([entity]) => !(entity in HISTORY_TYPES) && !(entity === "opportunity" && contractId));

  const facts: [string, string | null][] = [
    ["منبع", shown(d, "leadsourcecode")],
    ["نوع قرارداد", shown(d, "new_type")],
    ["موبایل", shown(d, "mobilephone") ?? shown(d, "telephone1")],
    ["ایمیل", shown(d, "emailaddress1")],
    ["زبان مادری", shown(d, "new_motherllanguage")],
    ["شهر", [shown(d, "new_codeposti"), shown(d, "new_city")].filter(Boolean).join(" ") || null],
    ["تاریخ تولد", shownDate(d, "new_birthday")],
    ["مرحله", shown(d, "new_step")],
    ["کد سرنخ", shown(d, "new_leadcode")],
    ["مسئول", shown(d, "ownerid")],
    ["ایجاد", shownDate(d, "createdon", true)],
  ];

  return (
    <div className="container-page py-8">
      <Link href="/ops/leads" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به لیدها
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-purple-900">{shown(d, "fullname") ?? "بدون نام"}</h1>
              <Badge tone={LEAD_STATE_TONE[state] ?? "neutral"}>{shown(d, "new_status") ?? "—"}</Badge>
            </div>
            <p className="mt-1 text-sm text-secondary">{shown(d, "subject") ?? "بدون موضوع"}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {contractId && (
                <p>
                  <span className="text-secondary">تبدیل شد به: </span>
                  <Link href={`/ops/contracts/${contractId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "qualifyingopportunityid") ?? "قرارداد"}
                  </Link>
                </p>
              )}
              {contactId && (
                <p>
                  <span className="text-secondary">مشتری: </span>
                  <Link href={`/ops/customers/${contactId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "parentcontactid") ?? shown(d, "customerid") ?? "مشاهده مشتری"}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ops/old-crm/lead/${record.crmId}`} className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
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

        {state === 2 && (
          <p className="mt-4 rounded-xl bg-tint px-3 py-2 text-sm text-body">
            <span className="font-medium">دلیل بستن: </span>
            {shown(d, "statuscode") ?? "—"}
            {plain(d.new_disqualified_desc) && <span className="text-secondary"> — {plain(d.new_disqualified_desc)}</span>}
          </p>
        )}

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {facts
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 text-secondary">{label}:</dt>
                <dd className={`min-w-0 text-body [overflow-wrap:anywhere] ${label === "موبایل" || label === "ایمیل" ? "font-latin" : ""}`}>{value}</dd>
              </div>
            ))}
        </dl>
        {plain(d.description) && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-body [overflow-wrap:anywhere]">{plain(d.description)}</p>}
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-white p-6 2xl:col-span-2">
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

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">فرم‌های سایت ({siteLeads.length.toLocaleString("fa-IR")})</h2>
            <p className="mt-1 text-xs text-secondary">ثبت‌های همین شخص در سایت، با همان شماره یا ایمیل.</p>
            {siteLeads.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">موردی پیدا نشد.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {siteLeads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/ops/leads/${l.id}`} className="block rounded-lg border border-border p-2.5 text-sm hover:border-purple-600">
                      <span className="font-medium text-body">{[l.category, l.serviceSlug].filter(Boolean).join(" / ") || "فرم مشاوره"}</span>
                      <span className="mt-0.5 block text-xs text-secondary">
                        {l.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })} · {LEAD_STATUS_FA[l.status] ?? l.status}
                        {l.utmLastSource ? ` · ${l.utmLastSource}` : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {others.length > 0 && (
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
                            href={entity === "opportunity" ? `/ops/contracts/${r.crmId}` : entity === "contact" ? `/ops/customers/${r.crmId}` : `/ops/old-crm/${entity}/${r.crmId}`}
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
