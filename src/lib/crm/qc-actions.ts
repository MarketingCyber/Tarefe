"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isStaffRole } from "@/lib/permissions";
import { notifyUser } from "@/lib/notifications";

/**
 * «گزارش مشکل»: staff report a problem from any CRM page (QC during the parallel run); /ops/qc lists them. Any staff
 * member can report; any staff member can mark one fixed / not a bug with an answer (the reporter is notified).
 */
export type QcResult = { ok: boolean; message: string } | null;

export async function reportProblem(_prev: QcResult, formData: FormData): Promise<QcResult> {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) return { ok: false, message: "دسترسی ندارید." };
  const note = String(formData.get("note") ?? "").trim().slice(0, 4000);
  const path = String(formData.get("path") ?? "").slice(0, 500);
  if (!note) return { ok: false, message: "مشکل را بنویسید." };
  await prisma.qcReport.create({ data: { note, path: path.startsWith("/ops") ? path : "/ops", createdById: session.user.id } });
  revalidatePath("/ops/qc");
  return { ok: true, message: "ثبت شد، ممنون. پیگیری در «گزارش‌های مشکل»." };
}

export async function resolveProblem(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !isStaffRole(session.user.role)) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!["open", "fixed", "not_a_bug"].includes(status)) return;
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 2000) || null;
  const report = await prisma.qcReport.update({ where: { id }, data: { status, answer, resolvedAt: status === "open" ? null : new Date() } });
  await prisma.activityLog.create({ data: { actorId: session.user.id, entityType: "qc_report", entityId: id, action: `qc_${status}`, note: answer ?? "" } });
  if (status !== "open" && report.createdById !== session.user.id) {
    await notifyUser(report.createdById, "qc_resolved", status === "fixed" ? "مشکلی که گزارش دادید رفع شد" : "گزارش شما بررسی شد", (answer ?? report.note).slice(0, 140));
  }
  revalidatePath("/ops/qc");
}
