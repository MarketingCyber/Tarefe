/**
 * Shared Farsi label maps for the Ops panel's status enums (Prisma's own
 * enum values stay in English — these are display-only, keyed by the exact
 * enum string). One place per enum so every list/detail page that renders
 * the same status badge says the same thing, rather than each page
 * inventing its own wording independently.
 *
 * Convention (per the "language should be Farsi, but specific/technical
 * words in their everyday Finglish form" brief): ordinary words are
 * translated normally; CRM/support jargon that Persian speakers actually
 * say in its loanword form (لید, تیکت, تسک) keeps that form rather than a
 * stiffer formal-Persian equivalent.
 */

export const LEAD_STATUS_FA: Record<string, string> = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته‌شده",
  QUALIFIED: "واجد شرایط",
  CONSULTATION_SCHEDULED: "مشاوره برنامه‌ریزی‌شده",
  APPLICATION_STARTED: "درخواست شروع‌شده",
  APPLICATION_SUBMITTED: "درخواست ارسال‌شده",
  CONTRACT_ACTIVE: "قرارداد فعال",
  LOST: "از دست رفته",
};

export const APPLICATION_STATUS_FA: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SUBMITTED: "ارسال‌شده",
  PROVIDER_REVIEW: "بررسی توسط ارائه‌دهنده",
  APPROVED: "تاییدشده",
  REJECTED: "ردشده",
  CANCELLED: "لغوشده",
};

export const CONTRACT_STATUS_FA: Record<string, string> = {
  ACTIVE: "فعال",
  PENDING: "در انتظار",
  EXPIRING: "رو به اتمام",
  CANCELLED: "لغوشده",
};

export const TICKET_STATUS_FA: Record<string, string> = {
  RECEIVED: "دریافت‌شده",
  UNDER_REVIEW: "در حال بررسی",
  SENT_TO_PROVIDER: "ارسال‌شده به ارائه‌دهنده",
  PROVIDER_PROCESSING: "در حال پردازش",
  COMPLETED: "تکمیل‌شده",
};

export const PRIORITY_FA: Record<string, string> = {
  LOW: "کم",
  NORMAL: "عادی",
  HIGH: "بالا",
  URGENT: "فوری",
};

export const TASK_STATUS_FA: Record<string, string> = {
  OPEN: "باز",
  DONE: "انجام‌شده",
};

export const DOCUMENT_TYPE_FA: Record<string, string> = {
  CONTRACT: "قرارداد",
  POLICY: "بیمه‌نامه",
  INVOICE: "فاکتور",
  LETTER: "نامه",
  ID_DOC: "مدرک شناسایی",
  CERTIFICATE: "گواهی",
  OTHER: "سایر",
};

export const ROLE_FA: Record<string, string> = {
  CUSTOMER: "مشتری",
  ADVISOR: "مشاور",
  ADMIN: "ادمین",
  LEAD_MANAGER: "مسئول لیدها",
  CONTENT_EDITOR: "مدیر محتوا",
  ANALYST: "تحلیل‌گر",
};
