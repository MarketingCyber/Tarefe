"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";
import { linkCustomer, unlinkCustomer } from "@/lib/crm/customer-link";

/**
 * Staff link / unlink a website or app account and its old-CRM customer (Customer 360 page). Pipeline staff only;
 * each change is in the activity log under the person who made it.
 */
export type LinkResult = { ok: boolean; message: string } | null;

async function staff() {
  const session = await auth();
  return session?.user?.id && canAccessPipeline(session.user.role) ? session.user : null;
}

export async function linkCustomerAction(_prev: LinkResult, formData: FormData): Promise<LinkResult> {
  const user = await staff();
  if (!user) return { ok: false, message: "دسترسی ندارید." };
  const accountId = String(formData.get("accountId") ?? "");
  const contactRef = String(formData.get("contact") ?? "").trim();
  if (!accountId || !contactRef) return { ok: false, message: "شماره مشتری یا شناسه CRM را وارد کنید." };
  try {
    const contactId = await linkCustomer(accountId, contactRef);
    await prisma.activityLog.create({ data: { actorId: user.id, entityType: "customer_link", entityId: accountId, action: "linked", note: `Linked to old-CRM contact ${contactId}` } });
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.message === "not_found" ? "مشتری‌ای با این شماره در CRM قدیم پیدا نشد." : "وصل نشد؛ دوباره امتحان کنید." };
  }
  revalidatePath(String(formData.get("returnPath") ?? "/ops/customers").split("?")[0]);
  return { ok: true, message: "وصل شد." };
}

export async function unlinkCustomerAction(_prev: LinkResult, formData: FormData): Promise<LinkResult> {
  const user = await staff();
  if (!user) return { ok: false, message: "دسترسی ندارید." };
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return { ok: false, message: "حساب نامعتبر است." };
  await unlinkCustomer(accountId);
  await prisma.activityLog.create({ data: { actorId: user.id, entityType: "customer_link", entityId: accountId, action: "unlinked", note: "Unlinked from the old-CRM contact" } });
  revalidatePath(String(formData.get("returnPath") ?? "/ops/customers").split("?")[0]);
  return { ok: true, message: "جدا شد." };
}
