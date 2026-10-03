"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";
import { trackServer } from "@/lib/analytics-server";
import { EVENT } from "@/lib/analytics";
import { canAccessPipeline } from "@/lib/permissions";

/**
 * Phase 8 "Application lifecycle" — closes a real, previously-flagged gap:
 * `Application` had a model and a read-only list page, but nothing anywhere
 * ever created or updated one (confirmed by grep before writing this file).
 * `/ops/contracts`'s cancellation-deadline bucketing round even noted this
 * explicitly: "contracts are only ever created once an application is
 * approved, and that flow isn't built as a UI action either."
 *
 * Deliberately scoped to applications that already belong to a registered
 * customer account. An Application can also carry a `leadId` for context,
 * but a Lead alone has no login/account — building self-service account
 * provisioning from a bare lead (invite email, password setup) is a real,
 * separate feature blocked on infrastructure this project doesn't have
 * (no SMTP/email provider configured, same gap as monitoring/error
 * tracking). So applications are only ever started from an existing
 * customer's Customer-360 page, where `customerId` is guaranteed — see
 * `createApplication` below, called from `/ops/customers/[id]`.
 */

async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canAccessPipeline(session.user.role)) return null;
  return session.user;
}

export async function createApplication(formData: FormData) {
  const user = await requireStaff();
  if (!user) return;

  const customerId = formData.get("customerId") as string;
  const provider = (formData.get("provider") as string)?.trim();
  const tariffName = (formData.get("tariffName") as string)?.trim();
  const category = (formData.get("category") as string)?.trim();
  const monthlyPrice = (formData.get("monthlyPrice") as string)?.trim() || null;
  const returnPath = formData.get("returnPath") as string;
  if (!customerId || !provider || !tariffName || !category) return;

  // Auto-assigned to whoever's starting it — unlike leads/tickets (which
  // arrive unassigned from a public form), an application only ever exists
  // because a staff member is actively working it with the customer right
  // now, so there's no separate "assign to me" step to model.
  const application = await prisma.application.create({
    data: { customerId, provider, tariffName, category, monthlyPrice, advisorId: user.id, status: "SUBMITTED" },
  });
  await prisma.activityLog.create({
    data: { entityType: "application", entityId: application.id, action: "created", note: `${provider} — ${tariffName} started by ${user.name}`, actorId: user.id },
  });
  await trackServer(EVENT.APPLICATION_CREATED, { userId: user.id, metadata: { applicationId: application.id, category, provider } });

  if (returnPath) revalidatePath(returnPath);
  revalidatePath("/ops/applications");
}

export async function updateApplicationStatus(formData: FormData) {
  const user = await requireStaff();
  if (!user) return;

  const applicationId = formData.get("applicationId") as string;
  const status = formData.get("status") as string;
  const application = await prisma.application.findUnique({ where: { id: applicationId }, include: { contract: { select: { id: true } } } });
  if (!application || application.customerId === null) return;

  await prisma.application.update({ where: { id: applicationId }, data: { status: status as typeof application.status } });
  await prisma.activityLog.create({
    data: { entityType: "application", entityId: applicationId, action: "status_changed", note: `Status changed to ${status}`, actorId: user.id },
  });

  if (status === "APPROVED" && application.status !== "APPROVED" && !application.contract) {
    const contract = await prisma.contract.create({
      data: {
        customerId: application.customerId,
        applicationId: application.id,
        provider: application.provider,
        productName: application.tariffName,
        category: application.category,
        priceMonthly: application.monthlyPrice,
        status: "ACTIVE",
      },
    });
    await notifyUser(
      application.customerId,
      "application_approved",
      "درخواست شما تایید شد",
      `درخواست شما برای ${application.provider} — ${application.tariffName} تایید شد و اکنون قرارداد فعال شماست.`,
    );
    // These are the two real "revenue" events of the whole funnel — see
    // 2026-08-31's key-events audit — fired together since an approval
    // always creates its contract in the same transaction as this code.
    await trackServer(EVENT.APPLICATION_APPROVED, { userId: user.id, metadata: { applicationId, category: application.category } });
    await trackServer(EVENT.CONTRACT_CREATED, { userId: user.id, metadata: { contractId: contract.id, applicationId, category: application.category, provider: application.provider } });
  } else if (application.customerId) {
    await notifyUser(application.customerId, "application_update", "به‌روزرسانی درخواست شما", `وضعیت درخواست ${application.provider} — ${application.tariffName} به‌روزرسانی شد.`);
  }

  revalidatePath(`/ops/applications/${applicationId}`);
  revalidatePath("/ops/applications");
  revalidatePath(`/ops/customers/${application.customerId}`);
}
