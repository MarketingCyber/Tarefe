"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { CrmError } from "@/lib/dynamics/client";
import { addNote, assignRecord, closeActivity, closeLead, scheduleCall, updateLead, uploadFile, WriteRefused } from "@/lib/dynamics/write";
import { getOpsI18n } from "@/lib/ops-i18n/server";

/**
 * Write-back actions behind the old-CRM buttons in /ops (lib/dynamics/write.ts does the work). Pipeline staff only.
 * They return a result for the form instead of throwing, so an operator sees why Dynamics refused a change.
 */
export type WriteResult = { ok: boolean; message: string } | null;

/** Messages are written in Persian and returned in the staff member's CRM language (lib/ops-i18n). */
async function failure(error: unknown): Promise<{ ok: false; message: string }> {
  const { t } = await getOpsI18n();
  if (error instanceof WriteRefused) return { ok: false, message: t(error.message) };
  if (error instanceof CrmError) {
    return { ok: false, message: error.status === 0 ? t("CRM قدیم در دسترس نیست، کمی بعد دوباره امتحان کنید.") : t("CRM قدیم نپذیرفت: {detail}", { detail: error.message.slice(0, 200) }) };
  }
  return { ok: false, message: t("خطای غیرمنتظره؛ تغییری ثبت نشد.") };
}

/** Re-renders the page the form was on (its path without the query string). */
function refresh(formData: FormData) {
  const path = String(formData.get("returnPath") ?? "").split("?")[0];
  if (path.startsWith("/ops/")) revalidatePath(path);
}

export async function closeCrmActivity(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return { ok: false, message: t("دسترسی ندارید.") };
  try {
    await closeActivity(String(formData.get("entity")), String(formData.get("id")), { id: session.user.id, name: session.user.name ?? "staff" });
  } catch (error) {
    return failure(error);
  }
  refresh(formData);
  return { ok: true, message: t("بسته شد.") };
}

export async function addCrmNote(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return { ok: false, message: t("دسترسی ندارید.") };
  try {
    await addNote(String(formData.get("entity")), String(formData.get("id")), String(formData.get("text") ?? ""), {
      id: session.user.id,
      name: session.user.name ?? "staff",
    });
  } catch (error) {
    return failure(error);
  }
  refresh(formData);
  return { ok: true, message: t("یادداشت در CRM قدیم ثبت شد.") };
}

async function staffActor() {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return null;
  return { id: session.user.id, name: session.user.name ?? "staff" };
}

async function run(formData: FormData, ok: string, work: (actor: { id: string; name: string }) => Promise<void>): Promise<WriteResult> {
  const { t } = await getOpsI18n();
  const actor = await staffActor();
  if (!actor) return { ok: false, message: t("دسترسی ندارید.") };
  try {
    await work(actor);
  } catch (error) {
    return failure(error);
  }
  refresh(formData);
  return { ok: true, message: t(ok) };
}

const num = (v: FormDataEntryValue | null) => (v === null || v === "" ? undefined : Number(v));

/** Lead stage («مرحله») and / or follow-up reason («وضعیت»). */
export async function updateCrmLead(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  return run(formData, "در CRM قدیم ذخیره شد.", (actor) =>
    updateLead(String(formData.get("id")), { stage: num(formData.get("stage")), reason: num(formData.get("reason")) }, actor),
  );
}

export async function closeCrmLead(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  return run(formData, "سرنخ در CRM قدیم بسته شد.", (actor) =>
    closeLead(String(formData.get("id")), Number(formData.get("reason")), String(formData.get("explanation") ?? ""), actor),
  );
}

export async function assignCrmRecord(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  return run(formData, "واگذار شد.", (actor) => assignRecord(String(formData.get("entity")), String(formData.get("id")), String(formData.get("userId")), actor));
}

/** The date / time field is in the operator's own time zone; the browser sends its offset with it. */
export async function scheduleCrmCall(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  return run(formData, "تماس بعدی در CRM قدیم ثبت شد.", (actor) => {
    const local = String(formData.get("dueAt") ?? "");
    const offset = Number(formData.get("tzOffset") ?? 0); // minutes, as Date.getTimezoneOffset()
    const dueAt = new Date(Date.parse(`${local}:00Z`) + offset * 60_000);
    return scheduleCall(String(formData.get("entity")), String(formData.get("id")), { dueAt, ownerId: String(formData.get("ownerId")), subject: String(formData.get("subject") ?? "") }, actor);
  });
}

export async function uploadCrmFile(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  return run(formData, "فایل در CRM قدیم ثبت شد.", (actor) => {
    const file = formData.get("file");
    if (!(file instanceof File)) throw new WriteRefused("فایلی انتخاب نشده.");
    return uploadFile(String(formData.get("entity")), String(formData.get("id")), file, String(formData.get("note") ?? ""), actor);
  });
}

/** «اتصال به سرنخ دیگر»: `duplicate` is closed as a duplicate of `main` (lib/crm/lead-links.ts). */
export async function linkCrmLeads(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  return run(formData, "دو سرنخ به هم وصل شدند.", async (actor) => {
    const { linkLeads } = await import("@/lib/crm/lead-links");
    await linkLeads(String(formData.get("duplicate")), String(formData.get("main")), actor);
  });
}

const parseLocal = (formData: FormData, name: string) => {
  const local = String(formData.get(name) ?? "");
  if (!local) return null;
  const offset = Number(formData.get("tzOffset") ?? 0); // minutes, as Date.getTimezoneOffset()
  return new Date(Date.parse(`${local}:00Z`) + offset * 60_000);
};

/** «نتیجه تماس»: log the call and move the lead on (lib/dynamics/write.ts logCallResult). */
export async function callResultAction(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  const { t } = await getOpsI18n();
  const actor = await staffActor();
  if (!actor) return { ok: false, message: t("دسترسی ندارید.") };
  const { prisma } = await import("@/lib/db");
  const { logCallResult } = await import("@/lib/dynamics/write");
  const me = await prisma.user.findUnique({ where: { id: actor.id }, select: { crmUserId: true } });
  try {
    const done = await logCallResult(
      {
        entity: String(formData.get("entity")),
        id: String(formData.get("id")),
        result: String(formData.get("result")) as never,
        callId: (formData.get("callId") as string) || null,
        nextAt: parseLocal(formData, "nextAt"),
        note: String(formData.get("note") ?? ""),
      },
      { ...actor, crmUserId: me?.crmUserId },
    );
    refresh(formData);
    return { ok: true, message: done.nextScheduled ? t("ثبت شد؛ تماس بعدی هم ثبت شد.") : t("ثبت شد.") };
  } catch (error) {
    return failure(error);
  }
}

/** «تبدیل به قرارداد»: Dynamics' own Qualify; returns the new contract's page. */
export type QualifyResult = { ok: boolean; message: string; href?: string } | null;

export async function qualifyLeadAction(_prev: QualifyResult, formData: FormData): Promise<QualifyResult> {
  const { t } = await getOpsI18n();
  const actor = await staffActor();
  if (!actor) return { ok: false, message: t("دسترسی ندارید.") };
  const { qualifyLead } = await import("@/lib/dynamics/write");
  try {
    const done = await qualifyLead(String(formData.get("id")), actor);
    refresh(formData);
    return {
      ok: true,
      message: done.customer === "existing" ? t("قرارداد برای همین مشتری ساخته شد.") : t("قرارداد و مشتری جدید ساخته شدند."),
      href: done.contractId ? `/ops/contracts/${done.contractId}` : undefined,
    };
  } catch (error) {
    return failure(error);
  }
}

export type BulkResult = { ok: boolean; message: string; failed?: string[] } | null;

/** Bulk on selected leads: assign, set stage / follow-up, or close with a reason — one by one, at most 50. */
export async function bulkLeadsAction(_prev: BulkResult, formData: FormData): Promise<BulkResult> {
  const { t, intl } = await getOpsI18n();
  const actor = await staffActor();
  if (!actor) return { ok: false, message: t("دسترسی ندارید.") };
  const ids = formData.getAll("ids").map(String).slice(0, 50);
  const kind = String(formData.get("kind") ?? "");
  if (!ids.length) return { ok: false, message: t("سرنخی انتخاب نشده.") };
  const w = await import("@/lib/dynamics/write");
  const failed: string[] = [];
  for (const id of ids) {
    try {
      if (kind === "assign") await w.assignRecord("lead", id, String(formData.get("userId")), actor);
      else if (kind === "status") {
        const stage = formData.get("stage") ? Number(formData.get("stage")) : undefined;
        const reason = formData.get("reason") ? Number(formData.get("reason")) : undefined;
        await w.updateLead(id, { stage, reason }, actor);
      } else if (kind === "close") await w.closeLead(id, Number(formData.get("closeReason")), String(formData.get("explanation") ?? ""), actor);
      else return { ok: false, message: t("کار گروهی را انتخاب کنید.") };
    } catch (error) {
      failed.push(`${id.slice(0, 8)}: ${(await failure(error)).message}`);
    }
  }
  refresh(formData);
  const done = ids.length - failed.length;
  return { ok: failed.length === 0, message: t("{done} از {total} سرنخ انجام شد.", { done: done.toLocaleString(intl), total: ids.length.toLocaleString(intl) }), failed };
}
