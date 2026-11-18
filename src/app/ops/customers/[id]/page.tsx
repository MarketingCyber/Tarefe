import { notFound, redirect } from "next/navigation";
import { CrmEditPanel } from "@/components/crm/customer/CrmEditPanel";
import { CustomerLinkForm, CustomerLinkStatus } from "@/components/crm/customer/CustomerLinkForms";
import { writeMode } from "@/lib/dynamics/write";
import { JumpToNote } from "@/components/crm/customer/JumpToNote";
import { AddNoteForm, CloseActivityButton } from "@/components/crm/customer/CrmWriteForms";
import Link from "next/link";
import { ArrowSquareOut, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { loadCustomer, type CrmRow } from "@/lib/crm/customer360";
import { TABLE_LABELS, displayName } from "@/lib/dynamics/view";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { ContractCard, FilterChip, HISTORY_TYPES, HistoryItem, TicketCard, happenedAt, shown, shownDate } from "@/components/crm/customer/OldCrmParts";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { ConfirmDeleteForm } from "@/components/shared/ConfirmDeleteForm";
import { uploadDocument, deleteDocument } from "@/lib/document-actions";
import { createApplication } from "@/lib/application-actions";
import { CONTRACT_STATUS_FA, APPLICATION_STATUS_FA, TICKET_STATUS_FA, LEAD_STATUS_FA, DOCUMENT_TYPE_FA } from "@/lib/status-labels";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
const CONTRACT_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRING: "warning",
  CANCELLED: "danger",
};

// Where operators still edit (until write-back to Dynamics exists).
const DYNAMICS_RECORD = (entity: string, id: string) => `http://tarefe.online/Tarefe/main.aspx?etn=${entity}&pagetype=entityrecord&id=${id}`;

// Old-CRM tables with their own section; everything else about the person is listed under «سایر سوابق».
const OWN_SECTION = new Set(["opportunity", "incident", "new_points", ...Object.keys(HISTORY_TYPES)]);

const SERVICE_FLAGS: [string, string][] = [
  ["new_has_gas_strom_contract", "برق و گاز"],
  ["new_has_energy", "انرژی"],
  ["new_has_telecom", "ارتباطات"],
  ["new_has_insurance", "بیمه"],
  ["new_has_haftpflicht", "Haftpflicht"],
  ["new_has_hausrat", "Hausrat"],
  ["new_has_rechtsschutz", "Rechtsschutz"],
  ["new_has_dentis_contract", "دندان"],
  ["new_has_aktuellt", "Aktuell"],
];

const HISTORY_PAGE = 40;

/**
 * Customer 360 across both CRMs (lib/crm/customer360.ts). `id` is either an old-CRM contact GUID or a tarefe.de
 * account id; when both exist for the same person (same e-mail or phone) the page shows them together:
 *  - old CRM (Dynamics mirror, read-only for now): contracts, tickets, the merged history of e-mails, calls, tasks,
 *    appointments and notes — including those filed on the person's contracts and tickets — points and the rest;
 *  - tarefe.de / app: applications, documents, tickets, tasks, conversations and leads matched by e-mail.
 */
export default async function CustomerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ docError?: string; history?: string; all?: string }>;
}) {
  const { t, tn, intl } = await getOpsI18n();
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { docError, history, all } = await searchParams;

  const customer = await loadCustomer(id);
  if (!customer) notFound();
  const { contact, account, related } = customer;
  const c = contact?.data ?? {};
  const self = `/ops/customers/${id}`;
  const writes = writeMode();

  const contracts = related.opportunity ?? [];
  // Old CRM: state 2 = ended (lost / cancelled); 0 and 1 count as running, as on /ops/contracts.
  const activeContracts = contracts.filter((r) => Number(r.data.statecode) !== 2);
  const inactiveContracts = contracts.filter((r) => Number(r.data.statecode) === 2);
  const activeSite = account?.contracts.filter((ct) => ct.status !== "CANCELLED") ?? [];
  const inactiveSite = account?.contracts.filter((ct) => ct.status === "CANCELLED") ?? [];
  const tickets = related.incident ?? [];
  const points = related.new_points ?? [];
  const historyAll = Object.keys(HISTORY_TYPES)
    .flatMap((k) => related[k] ?? [])
    .sort((a, b) => happenedAt(b) - happenedAt(a));
  const historyFiltered = history && HISTORY_TYPES[history] ? historyAll.filter((r) => r.entity === history) : historyAll;
  const historyShown = all ? historyFiltered : historyFiltered.slice(0, HISTORY_PAGE);
  const openCrmTasks = (related.task ?? []).filter((x) => Number(x.data.statecode) === 0).sort((a, b) => happenedAt(a) - happenedAt(b));
  const others = Object.entries(related).filter(([entity]) => !OWN_SECTION.has(entity));

  const relatedLeads = account
    ? await prisma.lead.findMany({ where: { email: { equals: account.email, mode: "insensitive" } }, orderBy: { createdAt: "desc" } })
    : [];
  const leadIds = relatedLeads.map((l) => l.id);
  const ticketIds = account?.serviceRequests.map((sr) => sr.id) ?? [];
  const activityLogs =
    leadIds.length === 0 && ticketIds.length === 0
      ? []
      : await prisma.activityLog.findMany({
          where: {
            OR: [
              ...(leadIds.length ? [{ entityType: "lead", entityId: { in: leadIds } }] : []),
              ...(ticketIds.length ? [{ entityType: "service_request", entityId: { in: ticketIds } }] : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          include: { actor: { select: { name: true } } },
          take: 30,
        });

  const name = (contact ? shown(c, "fullname") : null) ?? account?.name ?? "—";
  const address = [
    [shown(c, "new_strasse"), shown(c, "new_hausnummer")].filter(Boolean).join(" "),
    [shown(c, "new_plz"), shown(c, "new_stadt")].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(t("، "));
  const iban = typeof c.new_iban === "string" && c.new_iban.trim() ? `${c.new_iban.trim().slice(0, 4)} •••• ${c.new_iban.trim().slice(-4)}` : null;
  const services = SERVICE_FLAGS.filter(([f]) => c[f] === true || c[f] === 1);
  const totalPoints = typeof c.new_total_point_rollup === "number" ? c.new_total_point_rollup : null;

  return (
    <div className="container-page py-8">
      <BackLink fallback="/ops/customers" />

      <div className="rounded-2xl border border-border bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-purple-900">{name}</h1>
              {contact && <Badge tone="purple">{t("CRM قدیم")}</Badge>}
              {account && <Badge tone="success">{t("حساب سایت / اپ")}</Badge>}
            </div>
            <p className="font-latin mt-1 text-sm text-secondary">
              {[shown(c, "emailaddress1") ?? account?.email, shown(c, "mobilephone") ?? account?.phone, shown(c, "telephone1")].filter(Boolean).join(" · ") || "—"}
            </p>
            {address && <p className="mt-1 text-sm text-secondary">{address}</p>}
          </div>
          {contact && (
            <div className="flex flex-wrap gap-2">
              {writes !== "off" && (
                <JumpToNote />
              )}
              <Link href={`/ops/old-crm/contact/${contact.crmId}`} className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
                {t("فرم کامل در CRM قدیم")}
              </Link>
              <a
                href={DYNAMICS_RECORD("contact", contact.crmId)}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-1 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600"
              >
                {t("ویرایش در Dynamics")}
                <ArrowSquareOut size={12} />
              </a>
            </div>
          )}
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [t("شماره مشتری"), shown(c, "new_customernumber")],
              [t("کد معرف"), shown(c, "new_id") ?? account?.referralCode ?? null],
              [t("معرفی‌شده با کد"), account?.referredByCode ?? null],
              [t("امتیاز"), totalPoints !== null ? totalPoints.toLocaleString(intl) : null],
              [t("تاریخ تولد"), shownDate(c, "birthdate", false, intl)],
              [t("زبان مادری"), tn(shown(c, "new_motherllanguage"))],
              [t("نحوه آشنایی"), tn(shown(c, "new_nahvehashnaee"))],
              ["IBAN", iban],
              [t("مسئول"), shown(c, "ownerid")],
              [t("مشتری از"), contact ? shownDate(c, "createdon", false, intl) : null],
              [t("عضویت سایت"), account ? account.createdAt.toLocaleDateString(intl, { calendar: "gregory" }) : null],
              [t("زبان سایت"), account ? account.locale.toUpperCase() : null],
            ] as [string, string | null][]
          )
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="text-secondary">{label}:</dt>
                <dd className={label === "IBAN" ? "font-latin text-body" : "text-body"}>{value}</dd>
              </div>
            ))}
        </dl>

        {services.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {services.map(([, label]) => (
              <Badge key={label}>{t(label)}</Badge>
            ))}
          </div>
        )}
        {account && (
          <div className="mt-4">
            {account.crmContactId && contact ? (
              <CustomerLinkStatus accountId={account.id} method={account.crmLinkMethod} returnPath={self} />
            ) : (
              <CustomerLinkForm accountId={account.id} suggested={contact?.crmId ?? null} returnPath={self} />
            )}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 @3xl:grid-cols-3">
        <div className="space-y-6 @3xl:col-span-2">
          {/* Active and inactive contracts as two lists, like the old CRM's customer form (staff feedback 2026-11-18). */}
          <Section title={t("قراردادهای فعال ({n})", { n: activeContracts.length + activeSite.length })}>
            {activeContracts.length + activeSite.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {activeContracts.map((r) => (
                  <ContractCard key={r.crmId} r={r} />
                ))}
                {activeSite.map((ct) => (
                  <SiteContract key={ct.id} ct={ct} />
                ))}
              </div>
            )}
          </Section>

          {inactiveContracts.length + inactiveSite.length > 0 && (
            <details className="group rounded-2xl border border-border bg-white p-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                <h2 className="text-sm font-bold text-purple-900">{t("قراردادهای غیرفعال ({n})", { n: inactiveContracts.length + inactiveSite.length })}</h2>
                <span className="text-xs font-medium text-secondary group-open:hidden">{t("نمایش")}</span>
                <span className="hidden text-xs font-medium text-secondary group-open:inline">{t("بستن")}</span>
              </summary>
              <div className="mt-3 space-y-2">
                {inactiveContracts.map((r) => (
                  <ContractCard key={r.crmId} r={r} />
                ))}
                {inactiveSite.map((ct) => (
                  <SiteContract key={ct.id} ct={ct} />
                ))}
              </div>
            </details>
          )}

          <Section title={t("تیکت‌ها ({n})", { n: tickets.length + (account?.serviceRequests.length ?? 0) })}>
            {tickets.length + (account?.serviceRequests.length ?? 0) === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {tickets.slice(0, TICKETS_SHOWN).map((r) => (
                  <TicketCard key={r.crmId} r={r} />
                ))}
                {tickets.length > TICKETS_SHOWN && (
                  <details className="group">
                    <summary className="cursor-pointer list-none rounded-xl border border-dashed border-border-strong px-3 py-2 text-center text-xs font-medium text-purple-900 hover:border-purple-600 group-open:hidden [&::-webkit-details-marker]:hidden">
                      {t("نمایش همه ({n})", { n: tickets.length.toLocaleString(intl) })}
                    </summary>
                    <div className="space-y-2">
                      {tickets.slice(TICKETS_SHOWN).map((r) => (
                        <TicketCard key={r.crmId} r={r} />
                      ))}
                    </div>
                  </details>
                )}
                {account?.serviceRequests.map((sr) => (
                  <Link key={sr.id} href={`/ops/tickets/${sr.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
                    <div>
                      <p className="font-medium text-purple-900">{sr.subject}</p>
                      <p className="text-xs text-secondary">{sr.advisor ? t("مشاور: {name}", { name: sr.advisor.name }) : t("بدون مشاور")} · {t("ثبت‌شده در سایت / اپ")}</p>
                    </div>
                    <Badge>{t(TICKET_STATUS_FA[sr.status] ?? sr.status)}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          {contact && (
            <Section title={t("تاریخچه ({n})", { n: historyAll.length })} note={t("ایمیل‌ها، تماس‌ها، تسک‌ها، قرارها و یادداشت‌های CRM قدیم — هم آن‌هایی که روی خود مشتری ثبت شده‌اند و هم روی قراردادها و تیکت‌هایش.")}>
              {writes !== "off" && (
                <div className="mb-4">
                  <AddNoteForm entity="contact" id={contact.crmId} returnPath={self} dry={writes === "dry"} anchor="note" />
                </div>
              )}
              <div className="mb-4 flex flex-wrap gap-1.5">
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
              {historyShown.length === 0 ? (
                <Empty />
              ) : (
                <ol className="relative before:absolute before:inset-y-1 before:start-3.5 before:w-px before:bg-border">
                  {historyShown.map((r) => (
                    <HistoryItem key={`${r.entity}:${r.crmId}`} r={r} customerId={contact.crmId} />
                  ))}
                </ol>
              )}
              {!all && historyFiltered.length > HISTORY_PAGE && (
                <Link href={`${self}?${history ? `history=${history}&` : ""}all=1`} className="mt-4 inline-block text-sm font-medium text-purple-600 hover:underline">
                  {t("نمایش همه ({n})", { n: historyFiltered.length.toLocaleString(intl) })}
                </Link>
              )}
            </Section>
          )}

          {account && (
            <Section title={t("درخواست‌ها ({n})", { n: account.applications.length })}>
              <form action={createApplication} className="mb-4 grid gap-2 rounded-xl border border-dashed border-border-strong p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
                <input type="hidden" name="customerId" value={account.id} />
                <input type="hidden" name="returnPath" value={self} />
                <input name="provider" placeholder={t("ارائه‌دهنده")} required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
                <input name="tariffName" placeholder={t("نام تعرفه / پلن")} required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
                <input name="category" placeholder={t("دسته‌بندی")} required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
                <input name="monthlyPrice" placeholder={t("یورو/ماه (اختیاری)")} className="w-28 rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
                <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900">
                  {t("شروع درخواست")}
                </button>
              </form>
              {account.applications.length === 0 ? (
                <Empty />
              ) : (
                <div className="space-y-2">
                  {account.applications.map((a) => (
                    <Link key={a.id} href={`/ops/applications/${a.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
                      <div>
                        <p className="font-medium text-purple-900">
                          {a.provider} — {a.tariffName}
                        </p>
                        <p className="text-xs text-secondary">{a.advisor ? t("مشاور: {name}", { name: a.advisor.name }) : t("بدون مشاور")}</p>
                      </div>
                      <Badge>{APPLICATION_STATUS_FA[a.status] ?? a.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Section>
          )}

          {account && (
            <Section title={t("مدارک ({n})", { n: account.documents.length })}>
              {docError && (
                <p role="alert" className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
                  {docError === "missing_fields" ? t("عنوان و فایل هر دو الزامی هستند.") : t("آپلود ناموفق بود: {error}", { error: decodeURIComponent(docError) })}
                </p>
              )}
              <form action={uploadDocument} className="mb-4 grid gap-2 rounded-xl border border-dashed border-border-strong p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <input type="hidden" name="ownerId" value={account.id} />
                <input type="hidden" name="returnPath" value={self} />
                <input name="title" placeholder={t("عنوان مدرک")} required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
                <select name="type" defaultValue="OTHER" className="rounded-lg border border-border-strong bg-white px-2 py-2 text-xs font-medium text-purple-900">
                  <option value="CONTRACT">{t("قرارداد")}</option>
                  <option value="POLICY">{t("بیمه‌نامه")}</option>
                  <option value="INVOICE">{t("فاکتور")}</option>
                  <option value="LETTER">{t("نامه")}</option>
                  <option value="ID_DOC">{t("مدرک شناسایی")}</option>
                  <option value="CERTIFICATE">{t("گواهی")}</option>
                  <option value="OTHER">{t("سایر")}</option>
                </select>
                <input type="file" name="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="text-xs text-secondary file:mr-2 file:rounded-full file:border-0 file:bg-tint file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-purple-900" />
                <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900">
                  {t("آپلود")}
                </button>
              </form>
              {account.documents.length === 0 ? (
                <Empty />
              ) : (
                <div className="space-y-2">
                  {account.documents.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium text-purple-900">{d.title}</p>
                        <span className="text-xs text-secondary">{DOCUMENT_TYPE_FA[d.type] ?? d.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {d.fileUrl && (
                          <a href={`/api/documents/${d.id}`} className="press flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium text-purple-900 hover:border-purple-600">
                            <DownloadSimple size={12} />
                            {t("دانلود")}
                          </a>
                        )}
                        <ConfirmDeleteForm
                          action={deleteDocument}
                          id={d.id}
                          message={t("حذف «{title}»؟ این عملیات قابل بازگشت نیست.", { title: d.title })}
                          hiddenFields={{ returnPath: self }}
                          className="press rounded-full border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-bg"
                        >
                          {t("حذف")}
                        </ConfirmDeleteForm>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {relatedLeads.length > 0 && (
            <Section title={t("لیدهای سایت ({n})", { n: relatedLeads.length })} note={t("بر اساس ایمیل تطبیق داده شده‌اند.")}>
              <div className="space-y-2">
                {relatedLeads.map((l) => (
                  <Link key={l.id} href={`/ops/leads/${l.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
                    <p className="font-medium text-purple-900">
                      {l.category ?? "—"} {l.serviceSlug ? `/ ${l.serviceSlug}` : ""}
                    </p>
                    <Badge>{LEAD_STATUS_FA[l.status] ?? l.status}</Badge>
                  </Link>
                ))}
              </div>
            </Section>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">{t("تسک‌ها")}</h2>
            {account && (
              <>
                <div className="mb-4">
                  <QuickAddTask returnPath={self} customerId={account.id} />
                </div>
                <TaskList tasks={account.customerTasks} returnPath={self} />
              </>
            )}
            {contact && (
              <div className={account ? "mt-5 border-t border-border pt-4" : ""}>
                <p className="mb-2 text-xs font-medium text-secondary">{t("باز در CRM قدیم ({n})", { n: openCrmTasks.length.toLocaleString(intl) })}</p>
                {openCrmTasks.length === 0 ? (
                  <Empty />
                ) : (
                  <ul className="space-y-2">
                    {openCrmTasks.slice(0, 15).map((task) => (
                      <li key={task.crmId} className="rounded-lg border border-border p-2.5 text-sm">
                        <Link href={`/ops/old-crm/task/${task.crmId}`} className="block hover:text-purple-600">
                          <span className="font-medium text-body">{shown(task.data, "subject") ?? t("تسک")}</span>
                          <span className="mt-0.5 block text-xs text-secondary">
                            {[shownDate(task.data, "scheduledend", false, intl) && t("موعد {date}", { date: shownDate(task.data, "scheduledend", false, intl) }), shown(task.data, "ownerid"), shown(task.data, "regardingobjectid")]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </Link>
                        {writes !== "off" && (
                          <div className="mt-2">
                            <CloseActivityButton entity="task" id={task.crmId} returnPath={self} dry={writes === "dry"} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {contact && (
            <div className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-sm font-bold text-purple-900">{t("امتیازها")}</h2>
              <p className="mt-1 text-2xl font-bold tabular-nums text-purple-900">{(totalPoints ?? 0).toLocaleString(intl)}</p>
              {points.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {points.slice(0, 8).map((p) => (
                    <PointRow key={p.crmId} r={p} />
                  ))}
                </ul>
              )}
            </div>
          )}

          {others.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-3 text-sm font-bold text-purple-900">{t("سایر سوابق در CRM قدیم")}</h2>
              <div className="space-y-4">
                {others.map(([entity, rows]) => (
                  <div key={entity}>
                    <p className="text-xs font-medium text-secondary">
                      {t(TABLE_LABELS[entity] ?? entity)} ({rows.length.toLocaleString(intl)})
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {rows.slice(0, 5).map((r) => (
                        <li key={r.crmId}>
                          <Link href={`/ops/old-crm/${entity}/${r.crmId}`} className="text-sm text-purple-900 hover:text-purple-600 hover:underline">
                            {displayName(entity, r.data)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {account && account.conversations.length > 0 && (
            <div className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-3 text-sm font-bold text-purple-900">{t("گفتگوهای اپ")}</h2>
              <ul className="space-y-1.5">
                {account.conversations.map((cv) => (
                  <li key={cv.id}>
                    <Link href={`/ops/conversations/${cv.id}`} className="text-sm text-purple-900 hover:text-purple-600 hover:underline">
                      {t("گفتگو")} · {cv.lastMessageAt.toLocaleDateString(intl, { calendar: "gregory" })}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {account && (
            <div className="rounded-2xl border border-border bg-white p-6">
              <h2 className="mb-4 text-sm font-bold text-purple-900">{t("فعالیت‌های سایت")}</h2>
              <ActivityTimeline entries={activityLogs} />
            </div>
          )}
        </div>
      </div>

      {contact && (
        <div className="mt-6">
          <CrmEditPanel entity="contact" id={contact.crmId} data={c} state={null} returnPath={self} folded />
        </div>
      )}
    </div>
  );
}

async function PointRow({ r }: { r: CrmRow }) {
  const { intl } = await getOpsI18n();
  const amount = r.data.new_point ?? r.data.new_points ?? r.data.new_amount;
  return (
    <li className="flex items-baseline justify-between gap-3">
      <Link href={`/ops/old-crm/new_points/${r.crmId}`} className="min-w-0 truncate text-body hover:text-purple-600 hover:underline">
        {displayName("new_points", r.data)}
      </Link>
      <span className="shrink-0 tabular-nums text-secondary">{typeof amount === "number" ? amount.toLocaleString(intl) : shownDate(r.data, "createdon", false, intl)}</span>
    </li>
  );
}

/** Tickets listed before "show all" — the notes box below shouldn't be thousands of pixels away (staff feedback). */
const TICKETS_SHOWN = 5;

/** A contract made on the website (not in the old CRM). */
async function SiteContract({ ct }: { ct: { id: string; provider: string; productName: string; category: string; status: string } }) {
  const { t } = await getOpsI18n();
  return (
    <div className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
      <div>
        <p className="font-medium text-purple-900">
          {ct.provider} — {ct.productName}
        </p>
        <p className="text-xs text-secondary">
          {t(ct.category)} · {t("ثبت‌شده در سایت")}
        </p>
      </div>
      <Badge tone={CONTRACT_STATUS_TONE[ct.status]}>{t(CONTRACT_STATUS_FA[ct.status] ?? ct.status)}</Badge>
    </div>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-6">
      <h2 className="text-sm font-bold text-purple-900">{title}</h2>
      {note && <p className="mb-3 mt-1 text-xs text-secondary">{note}</p>}
      <div className={note ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

async function Empty() {
  const { t } = await getOpsI18n();
  return <p className="text-sm text-secondary">{t("موردی وجود ندارد.")}</p>;
}
