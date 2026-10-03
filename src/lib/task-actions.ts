"use server";

import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { prisma } from "./db";
import { isStaffRole } from "./permissions";

/**
 * Shared Server Actions for Task (Phase 8.4), used from /ops/tasks, the
 * lead detail page, and the ticket detail page — one place for the
 * role-check + write logic rather than re-implementing it per page, the
 * way updateStatus/assignToMe/addNote already work per-entity on the lead
 * detail page (see src/app/ops/leads/[id]/page.tsx).
 *
 * isStaffRole, not canAccessPipeline — tasks are cross-functional (a
 * CONTENT_EDITOR can be assigned "write a new guide about X" just as
 * easily as an advisor gets "follow up with lead Y"), and /ops/tasks
 * itself is open to every staff role. The lead/ticket detail pages this
 * also gets called from are already pipeline-gated one level up, so a
 * CONTENT_EDITOR never reaches their QuickAddTask button in the first
 * place — this doesn't need to re-check that here.
 */
async function requireStaff() {
  const session = await auth();
  if (!session?.user || !isStaffRole(session.user.role)) return null;
  return session;
}

export async function createTask(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const title = (formData.get("title") as string)?.trim();
  if (!title) return;

  const dueAtRaw = formData.get("dueAt") as string;
  const priority = (formData.get("priority") as string) || "NORMAL";
  const assigneeId = (formData.get("assigneeId") as string) || null;
  const leadId = (formData.get("leadId") as string) || null;
  const contractId = (formData.get("contractId") as string) || null;
  const serviceRequestId = (formData.get("serviceRequestId") as string) || null;
  const customerId = (formData.get("customerId") as string) || null;
  const returnPath = (formData.get("returnPath") as string) || "/ops/tasks";

  await prisma.task.create({
    data: {
      title,
      dueAt: dueAtRaw ? new Date(dueAtRaw) : null,
      priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
      assigneeId: assigneeId || session.user.id,
      createdById: session.user.id,
      leadId,
      contractId,
      serviceRequestId,
      customerId,
    },
  });

  revalidatePath(returnPath);
}

export async function toggleTaskStatus(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const taskId = formData.get("taskId") as string;
  const nextStatus = formData.get("nextStatus") as "OPEN" | "DONE";
  const returnPath = (formData.get("returnPath") as string) || "/ops/tasks";

  await prisma.task.update({ where: { id: taskId }, data: { status: nextStatus } });
  revalidatePath(returnPath);
}
