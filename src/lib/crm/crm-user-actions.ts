"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAccessPipeline } from "@/lib/permissions";

/**
 * A staff member says who they are in the old CRM (or clears it). Only sets their own row, and only to a user that
 * exists in the mirror. It changes nothing but the default "mine" filter on the old-CRM work lists.
 */
export async function setMyCrmUser(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id || !canAccessPipeline(session.user.role)) return;
  const id = String(formData.get("crmUserId") ?? "").toLowerCase();
  if (id) {
    const exists = await prisma.crmRecord.findFirst({ where: { entity: "systemuser", crmId: { equals: id, mode: "insensitive" } }, select: { id: true } });
    if (!exists) return;
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { crmUserId: id || null } });
  revalidatePath("/ops/tasks");
}
