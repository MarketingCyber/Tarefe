import { prisma } from "@/lib/db";
import { CRM_TABLES } from "@/lib/dynamics/sync";

/**
 * Reading the old-CRM mirror for /ops/old-crm: table names as operators know them, a record's display name, and
 * each field's value the way Dynamics shows it (its own Persian/German display text for choices and lookups).
 */
export const TABLE_LABELS: Record<string, string> = {
  contact: "مشتریان (شخص)",
  account: "شرکت‌ها",
  opportunity: "فرصت‌های فروش (قراردادها)",
  incident: "تیکت‌ها",
  lead: "سرنخ‌ها",
  task: "تسک‌ها",
  email: "ایمیل‌ها",
  phonecall: "تماس‌های تلفنی",
  appointment: "قرارهای ملاقات",
  systemuser: "کاربران CRM",
  annotation: "یادداشت‌ها و فایل‌ها",
  new_points: "امتیازات",
  new_children: "فرزند",
  new_customer_business: "بیزینس",
  new_gift_code: "کد هدیه",
  new_category: "کتگوری",
  new_contract_company: "پورتال بستن قرارداد",
  new_tarefe_leters: "نامه های تعرفه",
  new_generate_letter: "ایجاد نامه",
  new_receive_letter: "نامه رسیده",
  new_customer_sign: "امضای مشتری",
  new_message_template: "تمپلیت پیام",
  new_faq: "FAQ",
  new_counselor_info: "جزئیات مشاوره",
  new_notification: "نوتیفیکیشن (سایت)",
  new_upload_files: "آپلود فایل ها",
  new_campaign_customer: "مشتریان کمپین",
  new_finance_record: "تراکنش مالی",
  new_sitesetting: "تنظیمات سایت",
  new_control_task_run: "کنترل اجرای تسک ها",
  new_contact_opp_count_saver: "Contact Opp Count Saver",
  new_representative: "نماینده (استفاده نشود)",
  new_itempoursant: "آیتم پورسانت (استفاده نشود)",
  new_introducingfeess: "کارمزد معرفی (استفاده نشود)",
  new_opportunityformaklerfertrak: "Opportunity for Maklerfertrak",
  bs_whatsapp: "واتس‌اپ",
  bs_whatsappsetting: "تنظیمات واتس‌اپ",
  bsnotif_notification: "نوتیفیکیشن کارمندان",
  bsnotif_notificationsetting: "تنظیمات نوتیفیکیشن",
  bsfulm_fulmakht: "فولماخت",
};

export const isMirroredTable = (name: string) => CRM_TABLES.some((t) => t.name === name);

const F = "@OData.Community.Display.V1.FormattedValue";
const TARGET = "@Microsoft.Dynamics.CRM.lookuplogicalname";
type Data = Record<string, unknown>;

/** The name a record is known by in Dynamics. */
export function displayName(entity: string, data: Data): string {
  for (const key of ["fullname", "name", "title", "subject", "new_name", "bs_name", "bsnotif_name", "bsfulm_name", "filename"]) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  return `${TABLE_LABELS[entity] ?? entity} ${String(data[`${entity}id`] ?? data.activityid ?? "").slice(0, 8)}`;
}

export type FieldValue = { text: string; link?: { entity: string; id: string } } | null;

/** A field's value as Dynamics displays it; lookups also carry the record they point to. */
export function fieldValue(data: Data, name: string, type: string): FieldValue {
  const lookupKey = `_${name}_value`;
  if (["Lookup", "Customer", "Owner"].includes(type) || lookupKey in data) {
    const id = data[lookupKey];
    if (typeof id !== "string" || !id) return null;
    const target = data[lookupKey + TARGET];
    return { text: String(data[lookupKey + F] ?? id), link: typeof target === "string" && isMirroredTable(target) ? { entity: target, id } : undefined };
  }
  const raw = data[name];
  if (raw === null || raw === undefined || raw === "") return null;
  const formatted = data[name + F];
  if (formatted !== undefined) return { text: String(formatted) };
  if (typeof raw === "boolean") return { text: raw ? "بله" : "خیر" };
  // Dates without a display text: 1999-01-01T00:00:00 → 1999-01-01, others with the time (Berlin).
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) {
    if (/T00:00:00(Z)?$/.test(raw)) return { text: raw.slice(0, 10) };
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return { text: new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Berlin" }).format(d) };
  }
  return { text: String(raw) };
}

/** Records in other mirrored tables that point at this record (e.g. a customer's contracts, tickets, notes). */
export async function relatedRecords(crmId: string, limitPerTable = 50) {
  const rows = (await prisma.crmRecord.findMany({
    where: { deletedAt: null, refs: { has: crmId.toLowerCase() }, NOT: { crmId } },
    select: { entity: true, crmId: true, data: true, crmModifiedAt: true },
    orderBy: { crmModifiedAt: "desc" },
    take: 1000,
  })) as { entity: string; crmId: string; data: Data; crmModifiedAt: Date | null }[];
  const byTable: Record<string, typeof rows> = {};
  for (const r of rows) {
    const list = (byTable[r.entity] ??= []);
    if (list.length < limitPerTable) list.push(r);
  }
  return byTable;
}
