// Phase 8/11 — "Smart Notifications": rule-based, not AI-based (no LLM API
// credentials are configured for the live app to call, and there's no
// honest way to fake one). Runs hourly via cron (see scripts/README.md),
// evaluating a small, fixed set of real business rules against existing
// data — the same category of thing the plan's 11.1 examples describe
// ("Lead not contacted → Reminder", "Contract deadline approaching →
// Customer notification", "Application stalled → Advisor notification").
//
// Self-contained (own PrismaClient/adapter, not importing from src/lib/db
// or src/lib/notifications), matching prisma/seed.ts's established
// pattern for standalone tsx scripts — path aliases (`@/...`) aren't
// reliably resolved outside the Next.js build for a plain `tsx` run.
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const LEAD_STALE_HOURS = 24;
const UNASSIGNED_LEAD_STALE_HOURS = 4;
const CONTRACT_DEADLINE_WARNING_DAYS = 14;
const TICKET_SLA_BREACH_HOURS = 24; // must match src/lib/sla.ts's TICKET_SLA_BREACH_HOURS — duplicated for the same standalone-script reason as everything else here
const APPLICATION_STALLED_HOURS = 72; // longer than the ticket SLA — a provider genuinely can take days to review, unlike a support reply

/** Dedupe-aware notify — mirrors src/lib/notifications.ts's notifyUser(), duplicated here rather than imported (see file header on why). */
async function notify(userId: string, type: string, title: string, body: string, dedupeKey: string) {
  const existing = await prisma.notification.findUnique({ where: { userId_dedupeKey: { userId, dedupeKey } } });
  if (existing) return false;
  await prisma.notification.create({ data: { userId, type, title, body, dedupeKey } });
  return true;
}

async function ruleStaleAssignedLeads() {
  const cutoff = new Date(Date.now() - LEAD_STALE_HOURS * 60 * 60 * 1000);
  const leads = await prisma.lead.findMany({
    where: { status: "NEW", assignedAdvisorId: { not: null }, createdAt: { lt: cutoff } },
    select: { id: true, name: true, assignedAdvisorId: true },
  });
  let sent = 0;
  for (const lead of leads) {
    const created = await notify(
      lead.assignedAdvisorId!,
      "lead_stale",
      "Lead needs follow-up",
      `"${lead.name}" was assigned to you and is still marked New after ${LEAD_STALE_HOURS}h.`,
      `lead_stale:${lead.id}`,
    );
    if (created) sent++;
  }
  return sent;
}

async function ruleUnassignedStaleLeads() {
  const cutoff = new Date(Date.now() - UNASSIGNED_LEAD_STALE_HOURS * 60 * 60 * 1000);
  const [leads, admins] = await Promise.all([
    prisma.lead.findMany({ where: { status: "NEW", assignedAdvisorId: null, createdAt: { lt: cutoff } }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } }),
  ]);
  let sent = 0;
  for (const lead of leads) {
    for (const admin of admins) {
      const created = await notify(
        admin.id,
        "lead_unassigned_stale",
        "Unassigned lead needs attention",
        `"${lead.name}" has been unassigned for over ${UNASSIGNED_LEAD_STALE_HOURS}h.`,
        `lead_unassigned_stale:${lead.id}`,
      );
      if (created) sent++;
    }
  }
  return sent;
}

async function ruleContractDeadlinesApproaching() {
  const warningDate = new Date(Date.now() + CONTRACT_DEADLINE_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const contracts = await prisma.contract.findMany({
    where: { status: "ACTIVE", cancellationDeadline: { not: null, gte: new Date(), lte: warningDate } },
    select: { id: true, provider: true, productName: true, customerId: true, cancellationDeadline: true },
  });
  let sent = 0;
  for (const contract of contracts) {
    const created = await notify(
      contract.customerId,
      "contract_deadline",
      "Contract deadline approaching",
      `Your ${contract.provider} ${contract.productName} contract has a cancellation deadline on ${contract.cancellationDeadline!.toLocaleDateString("en-GB")}.`,
      `contract_deadline:${contract.id}`,
    );
    if (created) sent++;
  }
  return sent;
}

async function ruleOverdueTasks() {
  const tasks = await prisma.task.findMany({
    where: { status: "OPEN", dueAt: { lt: new Date() }, assigneeId: { not: null } },
    select: { id: true, title: true, assigneeId: true },
  });
  let sent = 0;
  for (const task of tasks) {
    const created = await notify(task.assigneeId!, "task_overdue", "Task overdue", `"${task.title}" is now overdue.`, `task_overdue:${task.id}`);
    if (created) sent++;
  }
  return sent;
}

/**
 * Mirrors src/lib/sla.ts's computeTicketSla (duplicated, same reason as
 * everything else in this file) — "waiting on us" means the most recent
 * message came from the customer (or there are no messages yet at all).
 * dedupeKey includes the last message's id (or "none") rather than just
 * the ticket id: if a customer sends a new message after we've already
 * been notified once, that resets the wait, and a fresh breach later
 * should notify again — using the ticket id alone would permanently
 * silence a ticket after its first breach.
 */
async function ruleTicketSlaBreaches() {
  const tickets = await prisma.serviceRequest.findMany({
    where: { status: { not: "COMPLETED" } },
    select: {
      id: true,
      subject: true,
      advisorId: true,
      createdAt: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, createdAt: true, sender: { select: { role: true } } } },
    },
  });

  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });

  let sent = 0;
  for (const ticket of tickets) {
    const lastMessage = ticket.messages[0];
    const waitingOnUs = !lastMessage || lastMessage.sender.role === "CUSTOMER";
    if (!waitingOnUs) continue;

    const since = lastMessage ? lastMessage.createdAt : ticket.createdAt;
    const hoursWaiting = (Date.now() - since.getTime()) / 3_600_000;
    if (hoursWaiting <= TICKET_SLA_BREACH_HOURS) continue;

    const dedupeKey = `ticket_sla:${ticket.id}:${lastMessage?.id ?? "none"}`;
    const title = "Ticket waiting for a reply";
    const body = `"${ticket.subject}" has been waiting ${Math.round(hoursWaiting)}h for a reply.`;

    const recipients = ticket.advisorId ? [ticket.advisorId] : admins.map((a) => a.id);
    for (const userId of recipients) {
      const created = await notify(userId, "ticket_sla_breach", title, body, dedupeKey);
      if (created) sent++;
    }
  }
  return sent;
}

/**
 * "Application stalled" — the plan's own 11.1 example. Only fires for
 * SUBMITTED/PROVIDER_REVIEW applications (DRAFT hasn't been sent anywhere
 * yet; APPROVED/REJECTED/CANCELLED are finished) whose `updatedAt` hasn't
 * moved in APPLICATION_STALLED_HOURS. dedupeKey includes the updatedAt
 * timestamp itself, not just the application id — same reasoning as the
 * ticket-SLA rule's message-id suffix: once staff touch the application
 * (even just to re-save the same status), updatedAt changes, the old key
 * stops matching, and a fresh stall later correctly notifies again.
 */
async function ruleStalledApplications() {
  const cutoff = new Date(Date.now() - APPLICATION_STALLED_HOURS * 60 * 60 * 1000);
  const applications = await prisma.application.findMany({
    where: { status: { in: ["SUBMITTED", "PROVIDER_REVIEW"] }, updatedAt: { lt: cutoff } },
    select: { id: true, provider: true, tariffName: true, advisorId: true, updatedAt: true },
  });
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });

  let sent = 0;
  for (const application of applications) {
    const dedupeKey = `application_stalled:${application.id}:${application.updatedAt.toISOString()}`;
    const title = "Application stalled";
    const body = `"${application.provider} — ${application.tariffName}" hasn't moved in over ${APPLICATION_STALLED_HOURS}h.`;
    const recipients = application.advisorId ? [application.advisorId] : admins.map((a) => a.id);
    for (const userId of recipients) {
      const created = await notify(userId, "application_stalled", title, body, dedupeKey);
      if (created) sent++;
    }
  }
  return sent;
}

async function main() {
  const results = {
    staleAssignedLeads: await ruleStaleAssignedLeads(),
    unassignedStaleLeads: await ruleUnassignedStaleLeads(),
    contractDeadlines: await ruleContractDeadlinesApproaching(),
    overdueTasks: await ruleOverdueTasks(),
    ticketSlaBreaches: await ruleTicketSlaBreaches(),
    stalledApplications: await ruleStalledApplications(),
  };
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  console.log(`[${new Date().toISOString()}] Notification rules run:`, results, `(${total} new notifications)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
