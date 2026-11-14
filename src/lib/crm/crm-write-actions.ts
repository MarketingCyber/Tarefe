"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { CrmError } from "@/lib/dynamics/client";
import { addNote, assignRecord, closeActivity, closeLead, scheduleCall, updateLead, uploadFile, WriteRefused } from "@/lib/dynamics/write";

/**
 * Write-back actions behind the old-CRM buttons in /ops (lib/dynamics/write.ts does the work). Pipeline staff only.
 * They return a result for the form instead of throwing, so an operator sees why Dynamics refused a change.
 */
export type WriteResult = { ok: boolean; message: string } | null;

function failure(error: unknown): WriteResult {
  if (error instanceof WriteRefused) return { ok: false, message: error.message };
  if (error instanceof CrmError) {
    return { ok: false, message: error.status === 0 ? "CRM قدیم در دسترس نیست، کمی بعد دوباره امتحان کنید." : `CRM قدیم نپذیرفت: ${error.message.slice(0, 200)}` };
  }
  return { ok: false, message: "خطای غیرمنتظره؛ تغییری ثبت نشد." };
}

/** Re-renders the page the form was on (its path without the query string). */
function refresh(formData: FormData) {
  const path = String(formData.get("returnPath") ?? "").split("?")[0];
  if (path.startsWith("/ops/")) revalidatePath(path);
}

export async function closeCrmActivity(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return { ok: false, message: "دسترسی ندارید." };
  try {
    await closeActivity(String(formData.get("entity")), String(formData.get("id")), { id: session.user.id, name: session.user.name ?? "staff" });
  } catch (error) {
    return failure(error);
  }
  refresh(formData);
  return { ok: true, message: "بسته شد." };
}

export async function addCrmNote(_prev: WriteResult, formData: FormData): Promise<WriteResult> {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return { ok: false, message: "دسترسی ندارید." };
  try {
    await addNote(String(formData.get("entity")), String(formData.get("id")), String(formData.get("text") ?? ""), {
      id: session.user.id,
      name: session.user.name ?? "staff",
    });
  } catch (error) {
    return failure(error);
  }
  refresh(formData);
  return { ok: true, message: "یادداشت در CRM قدیم ثبت شد." };
}

async function staffActor() {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return null;
  return { id: session.user.id, name: session.user.name ?? "staff" };
}

async function run(formData: FormData, ok: string, work: (actor: { id: string; name: string }) => Promise<void>): Promise<WriteResult> {
  const actor = await staffActor();
  if (!actor) return { ok: false, message: "دسترسی ندارید." };
  try {
    await work(actor);
  } catch (error) {
    return failure(error);
  }
  refresh(formData);
  return { ok: true, message: ok };
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
