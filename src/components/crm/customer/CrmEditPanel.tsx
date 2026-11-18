import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { CALL_RESULTS, LEAD_CLOSE_REASONS, LEAD_OPEN_REASONS, LEAD_STAGES, assignableUsers, writeMode } from "@/lib/dynamics/write";
import { personKeys } from "@/lib/dynamics/identity";
import { AssignForm, CallResultForm, CloseLeadForm, LeadStatusForm, QualifyLeadForm, ScheduleCallForm, UploadFileForm } from "@/components/crm/customer/CrmEditForms";

import { getOpsI18n } from "@/lib/ops-i18n/server";
/**
 * «ویرایش در CRM قدیم»: the edits staff can make on an old-CRM lead, customer, contract or ticket from /ops —
 * lead stage / follow-up / close (leads only), assign, next call, upload a file. Hidden when writing is off or the
 * viewer isn't pipeline staff. Every change goes to Dynamics first (lib/dynamics/write.ts).
 */
export async function CrmEditPanel({
  entity,
  id,
  data,
  state,
  returnPath,
  folded = false,
}: {
  entity: "lead" | "contact" | "opportunity" | "incident";
  id: string;
  data: Record<string, unknown>;
  state: number | null;
  returnPath: string;
  /** Closed by default behind its heading (customer / contract pages, where it isn't the main job; staff feedback 2026-11-18). */
  folded?: boolean;
}) {
  const { t } = await getOpsI18n();
  const mode = writeMode();
  const session = await auth();
  if (mode === "off" || !session?.user?.id || !canAccessPipeline(session.user.role)) return null;

  const [users, me] = await Promise.all([assignableUsers(), prisma.user.findUnique({ where: { id: session.user.id }, select: { crmUserId: true } })]);
  const dry = mode === "dry";
  const common = { entity, id, returnPath, dry };
  const ownerId = typeof data._ownerid_value === "string" ? data._ownerid_value.toLowerCase() : null;
  const myCrmId = me?.crmUserId?.toLowerCase() ?? null;
  const openLead = entity === "lead" && state === 0;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  // Lead → contract: whose contract it becomes (the lead's customer, else the one customer with its phone / e-mail).
  const customerName = openLead ? await leadCustomerName(data) : null;

  const title = (
    <>
      {t("ویرایش در CRM قدیم")}
      {dry ? t(" (آزمایشی — چیزی ارسال نمی‌شود)") : ""}
    </>
  );
  const body = (
    <>
      <p className="mt-1 text-xs text-secondary">{t("هر تغییر اول در CRM قدیم ثبت می‌شود و بعد اینجا نمایش داده می‌شود؛ نام شما در گزارش فعالیت می‌ماند.")}</p>

      <div className="mt-5 space-y-5 divide-y divide-border [&>*:not(:first-child)]:pt-5">
        <div>
          <p className="mb-2 text-xs font-medium text-secondary">{t("نتیجه تماس — بعد از هر تماس یک کلیک")}</p>
          <CallResultForm {...common} results={entity === "lead" ? CALL_RESULTS : CALL_RESULTS.filter(([r]) => r !== "wrong_number")} />
        </div>
        {openLead && (
          <LeadStatusForm {...common} stages={LEAD_STAGES} reasons={LEAD_OPEN_REASONS} stage={num(data.new_status)} reason={num(data.statuscode)} />
        )}
        <AssignForm {...common} users={users} ownerId={ownerId} />
        <ScheduleCallForm {...common} users={users} defaultOwnerId={myCrmId && users.some((u) => u.id === myCrmId) ? myCrmId : null} />
        <UploadFileForm {...common} />
        {openLead && (
          <div className="flex flex-wrap items-start gap-3">
            <QualifyLeadForm {...common} customerName={customerName} />
            <CloseLeadForm {...common} reasons={LEAD_CLOSE_REASONS} />
          </div>
        )}
      </div>
    </>
  );

  if (folded)
    return (
      <details className="group rounded-2xl border border-border bg-white p-6">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-sm font-bold text-purple-900">{title}</span>
            <span className="mt-0.5 block text-xs text-secondary">{t("نتیجه تماس، واگذاری، تماس بعدی، فایل")}</span>
          </span>
          <span className="shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-purple-900 group-open:hidden">{t("باز کردن")}</span>
          <span className="hidden shrink-0 rounded-full border border-border-strong px-3 py-1 text-xs font-medium text-purple-900 group-open:inline">{t("بستن")}</span>
        </summary>
        {body}
      </details>
    );

  return (
    <section aria-labelledby={`edit-${id}`} className="mt-6 rounded-2xl border border-border bg-white p-6">
      <h2 id={`edit-${id}`} className="text-sm font-bold text-purple-900">
        {title}
      </h2>
      {body}
    </section>
  );
}

async function leadCustomerName(data: Record<string, unknown>): Promise<string | null> {
  const F = "@OData.Community.Display.V1.FormattedValue";
  for (const k of ["_parentcontactid_value", "_customerid_value"]) if (typeof data[k] === "string") return String(data[`${k}${F}`] ?? "مشتری لید");
  for (const key of personKeys(data)) {
    const matches = await prisma.crmRecord.findMany({ where: { entity: "contact", deletedAt: null, refs: { has: key } }, select: { data: true }, take: 2 });
    if (matches.length === 1) return String((matches[0].data as Record<string, unknown>).fullname ?? "مشتری موجود");
  }
  return null;
}
