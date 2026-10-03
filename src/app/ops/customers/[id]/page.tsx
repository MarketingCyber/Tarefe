import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { ActivityTimeline } from "@/components/crm/ActivityTimeline";
import { TaskList } from "@/components/crm/TaskList";
import { QuickAddTask } from "@/components/crm/QuickAddTask";
import { Badge, type BadgeTone } from "@/components/shared/Badge";
import { ConfirmDeleteForm } from "@/components/shared/ConfirmDeleteForm";
import { uploadDocument, deleteDocument } from "@/lib/document-actions";
import { createApplication } from "@/lib/application-actions";
import { DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { CONTRACT_STATUS_FA, APPLICATION_STATUS_FA, TICKET_STATUS_FA, LEAD_STATUS_FA, DOCUMENT_TYPE_FA } from "@/lib/status-labels";

const CONTRACT_STATUS_TONE: Record<string, BadgeTone> = {
  ACTIVE: "success",
  PENDING: "warning",
  EXPIRING: "warning",
  CANCELLED: "danger",
};

/**
 * Phase 8.2 "Customer 360" — one profile pulling together everything this
 * customer has, so an advisor doesn't have to cross-reference four
 * separate list pages by hand. Contracts/Applications/Documents/Tickets
 * are real foreign-key relations. Leads are matched by email instead
 * (Lead has no customerId — it's a pre-account record captured before
 * anyone necessarily has one — see prisma/schema.prisma's Lead comment),
 * labeled as such rather than presented as an equally-strict link.
 */
export default async function CustomerDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ docError?: string }> }) {
  const session = await auth();
  if (!canAccessPipeline(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { docError } = await searchParams;

  const customer = await prisma.user.findUnique({
    where: { id },
    include: {
      contracts: { orderBy: { createdAt: "desc" } },
      applications: { orderBy: { createdAt: "desc" }, include: { advisor: { select: { name: true } } } },
      documents: { orderBy: { uploadedAt: "desc" } },
      serviceRequests: { orderBy: { createdAt: "desc" }, include: { advisor: { select: { name: true } } } },
      customerTasks: {
        orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }],
        include: { assignee: { select: { name: true } } },
      },
    },
  });
  if (!customer || customer.role !== "CUSTOMER") notFound();

  const relatedLeads = await prisma.lead.findMany({
    where: { email: { equals: customer.email, mode: "insensitive" } },
    orderBy: { createdAt: "desc" },
  });

  const leadIds = relatedLeads.map((l) => l.id);
  const ticketIds = customer.serviceRequests.map((t) => t.id);
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

  return (
    <div className="container-page py-8">
      <Link href="/ops/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به مشتریان
      </Link>

      <div className="rounded-2xl border border-border bg-white p-6">
        <h1 className="text-xl font-bold text-purple-900">{customer.name}</h1>
        <p className="font-latin mt-1 text-sm text-secondary">
          {customer.email} · {customer.phone ?? "—"}
        </p>
        <p className="mt-1 text-xs text-secondary">
          عضویت از {customer.createdAt.toLocaleDateString("fa-IR", { calendar: "gregory" })} · {customer.locale.toUpperCase()}
        </p>
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2 space-y-6">
          <Section title={`قراردادها (${customer.contracts.length})`}>
            {customer.contracts.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {customer.contracts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium text-purple-900">
                        {c.provider} — {c.productName}
                      </p>
                      <p className="text-xs text-secondary">{c.category}</p>
                    </div>
                    <Badge tone={CONTRACT_STATUS_TONE[c.status]}>{CONTRACT_STATUS_FA[c.status] ?? c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title={`درخواست‌ها (${customer.applications.length})`}>
            <form action={createApplication} className="mb-4 grid gap-2 rounded-xl border border-dashed border-border-strong p-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <input type="hidden" name="customerId" value={customer.id} />
              <input type="hidden" name="returnPath" value={`/ops/customers/${customer.id}`} />
              <input name="provider" placeholder="ارائه‌دهنده" required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
              <input name="tariffName" placeholder="نام تعرفه / پلن" required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
              <input name="category" placeholder="دسته‌بندی" required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
              <input name="monthlyPrice" placeholder="یورو/ماه (اختیاری)" className="w-28 rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
              <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900">
                شروع درخواست
              </button>
            </form>

            {customer.applications.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {customer.applications.map((a) => (
                  <Link key={a.id} href={`/ops/applications/${a.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
                    <div>
                      <p className="font-medium text-purple-900">
                        {a.provider} — {a.tariffName}
                      </p>
                      <p className="text-xs text-secondary">{a.advisor ? `مشاور: ${a.advisor.name}` : "بدون مشاور"}</p>
                    </div>
                    <Badge>{APPLICATION_STATUS_FA[a.status] ?? a.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title={`تیکت‌ها (${customer.serviceRequests.length})`}>
            {customer.serviceRequests.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {customer.serviceRequests.map((t) => (
                  <Link key={t.id} href={`/ops/tickets/${t.id}`} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm transition-colors hover:border-purple-600">
                    <div>
                      <p className="font-medium text-purple-900">{t.subject}</p>
                      <p className="text-xs text-secondary">{t.advisor ? `مشاور: ${t.advisor.name}` : "بدون مشاور"}</p>
                    </div>
                    <Badge>{TICKET_STATUS_FA[t.status] ?? t.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Section>

          <Section title={`مدارک (${customer.documents.length})`}>
            {docError && (
              <p role="alert" className="mb-3 rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
                {docError === "missing_fields" ? "عنوان و فایل هر دو الزامی هستند." : `آپلود ناموفق بود: ${decodeURIComponent(docError)}`}
              </p>
            )}

            <form action={uploadDocument} className="mb-4 grid gap-2 rounded-xl border border-dashed border-border-strong p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input type="hidden" name="ownerId" value={customer.id} />
              <input type="hidden" name="returnPath" value={`/ops/customers/${customer.id}`} />
              <input name="title" placeholder="عنوان مدرک" required className="rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none focus:border-purple-600" />
              <select name="type" defaultValue="OTHER" className="rounded-lg border border-border-strong bg-white px-2 py-2 text-xs font-medium text-purple-900">
                <option value="CONTRACT">قرارداد</option>
                <option value="POLICY">بیمه‌نامه</option>
                <option value="INVOICE">فاکتور</option>
                <option value="LETTER">نامه</option>
                <option value="ID_DOC">مدرک شناسایی</option>
                <option value="CERTIFICATE">گواهی</option>
                <option value="OTHER">سایر</option>
              </select>
              <input type="file" name="file" required accept="application/pdf,image/jpeg,image/png,image/webp" className="text-xs text-secondary file:mr-2 file:rounded-full file:border-0 file:bg-tint file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-purple-900" />
              <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900">
                آپلود
              </button>
            </form>

            {customer.documents.length === 0 ? (
              <Empty />
            ) : (
              <div className="space-y-2">
                {customer.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <div>
                      <p className="font-medium text-purple-900">{d.title}</p>
                      <span className="text-xs text-secondary">{DOCUMENT_TYPE_FA[d.type] ?? d.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {d.fileUrl && (
                        <a href={`/api/documents/${d.id}`} className="press flex items-center gap-1 rounded-full border border-border-strong px-2.5 py-1 text-xs font-medium text-purple-900 hover:border-purple-600">
                          <DownloadSimple size={12} />
                          دانلود
                        </a>
                      )}
                      <ConfirmDeleteForm
                        action={deleteDocument}
                        id={d.id}
                        message={`حذف «${d.title}»؟ این عملیات قابل بازگشت نیست.`}
                        hiddenFields={{ returnPath: `/ops/customers/${customer.id}` }}
                        className="press rounded-full border border-danger/40 px-2.5 py-1 text-xs font-medium text-danger hover:bg-danger-bg"
                      >
                        حذف
                      </ConfirmDeleteForm>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {relatedLeads.length > 0 && (
            <Section title={`لیدهای مرتبط (${relatedLeads.length})`} note="بر اساس ایمیل تطبیق داده شده‌اند — تا زمانی که حساب کاربری وجود نداشته باشد، لیدها به آن متصل نیستند.">
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
            <h2 className="mb-4 text-sm font-bold text-purple-900">تسک‌ها</h2>
            <div className="mb-4">
              <QuickAddTask returnPath={`/ops/customers/${customer.id}`} customerId={customer.id} />
            </div>
            <TaskList tasks={customer.customerTasks} returnPath={`/ops/customers/${customer.id}`} />
          </div>

          <div className="rounded-2xl border border-border bg-white p-6">
            <h2 className="mb-4 text-sm font-bold text-purple-900">فعالیت‌ها</h2>
            <ActivityTimeline entries={activityLogs} locale="fa" />
          </div>
        </div>
      </div>
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

function Empty() {
  return <p className="text-sm text-secondary">موردی وجود ندارد.</p>;
}
