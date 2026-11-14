"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";

/**
 * Staff record that a referral's 10 € voucher was sent (or undo a mistaken click) on /ops/referrals. Pipeline staff
 * only, logged under the person. Only a «due» referral can be marked sent; undo puts it back to «due» and the next
 * check re-evaluates it.
 */
async function staff() {
  const session = await auth();
  return session?.user?.id && canAccessPipeline(session.user.role) ? session.user : null;
}

export async function markVoucherSent(formData: FormData) {
  const user = await staff();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const done = await prisma.referral.updateMany({ where: { id, status: "due" }, data: { status: "sent", voucherSentAt: new Date(), voucherSentById: user.id } });
  if (done.count) await prisma.activityLog.create({ data: { actorId: user.id, entityType: "referral", entityId: id, action: "voucher_sent", note: "10 € referral voucher sent" } });
  revalidatePath("/ops/referrals");
}

export async function undoVoucherSent(formData: FormData) {
  const user = await staff();
  if (!user) return;
  const id = String(formData.get("id") ?? "");
  const done = await prisma.referral.updateMany({ where: { id, status: "sent" }, data: { status: "due", voucherSentAt: null, voucherSentById: null } });
  if (done.count) await prisma.activityLog.create({ data: { actorId: user.id, entityType: "referral", entityId: id, action: "voucher_unsent", note: "Voucher marked as not sent" } });
  revalidatePath("/ops/referrals");
}
