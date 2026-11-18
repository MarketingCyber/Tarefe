import Link from "next/link";
import { CrmEditPanel } from "@/components/crm/customer/CrmEditPanel";
import { LeadLinks } from "@/components/crm/customer/LeadLinks";
import { conversionRates, scoreLead, TIER_FA, reasonText, reasonsFor } from "@/lib/crm/lead-score";
import { canAccessMarketing } from "@/lib/permissions";
import { auth } from "@/lib/auth";
import { writeMode } from "@/lib/dynamics/write";
import { AddNoteForm } from "@/components/crm/customer/CrmWriteForms";
import { notFound } from "next/navigation";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { loadWithRelated } from "@/lib/crm/record360";
import { emailKey, personKeys, phoneKey } from "@/lib/dynamics/identity";
import { TABLE_LABELS } from "@/lib/dynamics/view";
import { LEAD_STATUS_FA } from "@/lib/status-labels";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { FilterChip, HISTORY_TYPES, HistoryItem, happenedAt, plain, shown, shownDate } from "@/components/crm/customer/OldCrmParts";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
import { RecordName } from "@/components/crm/RecordName";
/**
 * An old-CRM lead (Dynamics lead): who asked about what, where they came from (source), what became of it — the
 * contract it was converted to, or why it was closed — the same person's website form submissions (matched by
 * phone / e-mail), and the history filed on the lead. Read-only until write-back to Dynamics exists. Rendered by
 * /ops/leads/[id] for Dynamics ids; website leads keep their page.
 */

const DYNAMICS_RECORD = (id: string) => `http://tarefe.online/Tarefe/main.aspx?etn=lead&pagetype=entityrecord&id=${id}`;
export const LEAD_STATE_TONE: BadgeTone[] = ["purple", "success", "neutral"]; // 0 open, 1 qualified, 2 disqualified

export async function CrmLead({ id, history, linkQuery }: { id: string; history?: string; linkQuery?: string }) {
  const { t, tn, intl } = await getOpsI18n();
  const loaded = await loadWithRelated("lead", id);
  if (!loaded) notFound();
  const { record, related } = loaded;
  const d = record.data;
  const self = `/ops/leads/${record.crmId}`;

  const contractId = typeof d._qualifyingopportunityid_value === "string" ? d._qualifyingopportunityid_value : null;
  const contactId = (typeof d._parentcontactid_value === "string" ? d._parentcontactid_value : null) ?? (typeof d._customerid_value === "string" ? d._customerid_value : null);
  const state = Number(d.statecode);
  // Open leads: estimated chance of becoming a contract (lib/crm/lead-score.ts).
  const score = state === 0 ? scoreLead(d, await conversionRates()) : null;

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
              ...phoneTails.map((tail) => ({ phone: { contains: tail } })),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      ).filter((l) => keys.has(emailKey(l.email) ?? "") || keys.has(phoneKey(l.phone) ?? ""))
    : [];

  const historyAll = Object.keys(HISTORY_TYPES)
    .flatMap((k) => related[k] ?? [])
    .sort((a, b) => happenedAt(b) - happenedAt(a));
  const historyShown = history && HISTORY_TYPES[history] ? historyAll.filter((r) => r.entity === history) : historyAll;
  const others = Object.entries(related).filter(([entity]) => !(entity in HISTORY_TYPES) && !(entity === "opportunity" && contractId));

  const facts: [string, string | null][] = [
    [t("منبع"), tn(shown(d, "leadsourcecode"))],
    [t("نوع قرارداد"), shown(d, "new_type")],
    [t("موبایل"), shown(d, "mobilephone") ?? shown(d, "telephone1")],
    [t("ایمیل"), shown(d, "emailaddress1")],
    [t("زبان مادری"), tn(shown(d, "new_motherllanguage"))],
    [t("شهر"), [shown(d, "new_codeposti"), shown(d, "new_city")].filter(Boolean).join(" ") || null],
    [t("تاریخ تولد"), shownDate(d, "new_birthday", false, intl)],
    [t("مرحله"), shown(d, "new_step")],
    [t("کد سرنخ"), shown(d, "new_leadcode")],
    [t("مسئول"), shown(d, "ownerid")],
    [t("ایجاد"), shownDate(d, "createdon", true, intl)],
  ];

  return (
    <div className="container-page py-8">
      <BackLink fallback="/ops/leads" />

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-purple-900">{shown(d, "fullname") ?? t("بدون نام")}</h1>
              <Badge tone={LEAD_STATE_TONE[state] ?? "neutral"}>{tn(shown(d, "new_status")) ?? "—"}</Badge>
              {score && (
                <span title={reasonsFor(score.reasons, canAccessMarketing((await auth())?.user?.role)).map((r) => reasonText(r, t, intl)).join(" — ")} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${score.tier === "hot" ? "bg-danger-bg text-danger" : score.tier === "warm" ? "bg-warning-bg text-warning" : "bg-tint text-secondary"}`}>
                  {t("امتیاز {n}٪", { n: score.score.toLocaleString(intl) })} · {t(TIER_FA[score.tier])}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-secondary">{shown(d, "subject") ?? t("بدون موضوع")}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {contractId && (
                <p>
                  <span className="text-secondary">{t("تبدیل شد به:")} </span>
                  <Link href={`/ops/contracts/${contractId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "qualifyingopportunityid") ?? t("قرارداد")}
                  </Link>
                </p>
              )}
              {contactId && (
                <p>
                  <span className="text-secondary">{t("مشتری:")} </span>
                  <Link href={`/ops/customers/${contactId}`} className="font-medium text-purple-900 hover:text-purple-600 hover:underline">
                    {shown(d, "parentcontactid") ?? shown(d, "customerid") ?? t("مشاهده مشتری")}
                  </Link>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/ops/old-crm/lead/${record.crmId}`} className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
              {t("فرم کامل در CRM قدیم")}
            </Link>
            <a
              href={DYNAMICS_RECORD(record.crmId)}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600"
            >
              {t("ویرایش در Dynamics")}
              <ArrowSquareOut size={12} />
            </a>
          </div>
        </div>

        {state === 2 && (
          <p className="mt-4 rounded-xl bg-tint px-3 py-2 text-sm text-body">
            <span className="font-medium">{t("دلیل بستن:")} </span>
            {tn(shown(d, "statuscode")) ?? "—"}
            {plain(d.new_disqualified_desc) && <span className="text-secondary"> — {plain(d.new_disqualified_desc)}</span>}
          </p>
        )}

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {facts
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="shrink-0 text-secondary">{label}:</dt>
                <dd className={`min-w-0 text-body [overflow-wrap:anywhere] ${label === t("موبایل") || label === t("ایمیل") ? "font-latin" : ""}`}>{value}</dd>
              </div>
            ))}
        </dl>
        {plain(d.description) && <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-body [overflow-wrap:anywhere]">{plain(d.description)}</p>}
      </div>

      <CrmEditPanel entity="lead" id={record.crmId} data={d} state={state} returnPath={self} />
      <LeadLinks id={record.crmId} data={d} query={linkQuery?.slice(0, 100)} returnPath={self} />

      <div className="mt-6 grid gap-6 @3xl:grid-cols-3">
        <section className="rounded-2xl border border-border bg-white p-6 @3xl:col-span-2">
          <h2 className="text-sm font-bold text-purple-900">{t("تاریخچه ({n})", { n: historyAll.length.toLocaleString(intl) })}</h2>
          {writeMode() !== "off" && (
            <div className="mt-3">
              <AddNoteForm entity="lead" id={record.crmId} returnPath={self} dry={writeMode() === "dry"} />
            </div>
          )}
          {historyAll.length > 0 && (
            <div className="mb-4 mt-3 flex flex-wrap gap-1.5">
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
          )}
          {historyShown.length ? (
            <ol className="relative">
              {historyShown.map((r) => (
                <HistoryItem key={`${r.entity}:${r.crmId}`} r={r} customerId={record.crmId} />
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-secondary">{t("موردی وجود ندارد.")}</p>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-white p-6">
            <h2 className="text-sm font-bold text-purple-900">{t("فرم‌های سایت ({n})", { n: siteLeads.length.toLocaleString(intl) })}</h2>
            <p className="mt-1 text-xs text-secondary">{t("ثبت‌های همین شخص در سایت، با همان شماره یا ایمیل.")}</p>
            {siteLeads.length === 0 ? (
              <p className="mt-3 text-sm text-secondary">{t("موردی پیدا نشد.")}</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {siteLeads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/ops/leads/${l.id}`} className="block rounded-lg border border-border p-2.5 text-sm hover:border-purple-600">
                      <span className="font-medium text-body">{[l.category, l.serviceSlug].filter(Boolean).join(" / ") || t("فرم مشاوره")}</span>
                      <span className="mt-0.5 block text-xs text-secondary">
                        {l.createdAt.toLocaleDateString(intl, { calendar: "gregory" })} · {LEAD_STATUS_FA[l.status] ?? l.status}
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
              <h2 className="mb-3 text-sm font-bold text-purple-900">{t("سوابق مرتبط")}</h2>
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
                            href={entity === "opportunity" ? `/ops/contracts/${r.crmId}` : entity === "contact" ? `/ops/customers/${r.crmId}` : `/ops/old-crm/${entity}/${r.crmId}`}
                            className="text-sm text-purple-900 hover:text-purple-600 hover:underline"
                          >
                            <RecordName entity={entity} data={r.data} />
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
