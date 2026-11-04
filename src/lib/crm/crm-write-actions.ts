"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { canAccessPipeline } from "@/lib/permissions";
import { CrmError } from "@/lib/dynamics/client";
import { addNote, closeActivity, WriteRefused } from "@/lib/dynamics/write";

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
