import { prisma } from "./db";

/**
 * In-app notifications only. The Notification model and Phase 2 spec both
 * name email/WhatsApp/push as channels too, but those need real provider
 * credentials this project doesn't have configured (SMTP/Resend for email,
 * WhatsApp Business API, web-push VAPID keys) — faking a "sent" state
 * without an actual delivery mechanism would be exactly the kind of
 * fabrication ruled out for this project. This delivers the one channel
 * that's honestly real right now; the other channels are a real follow-up
 * once those credentials exist, not a UI gap.
 *
 * `dedupeKey` is for the rule-based engine (scripts/run-notification-rules.ts)
 * only — pass it when the same logical notification could otherwise be
 * recreated on every scheduled run (e.g. "this contract's deadline is
 * approaching"), and this silently no-ops if one with that key already
 * exists for this user. Omit it for one-off, manually-triggered
 * notifications (a ticket reply, a status change) — nothing re-runs those,
 * so there's nothing to dedupe.
 */
export async function notifyUser(userId: string, type: string, title: string, body: string, dedupeKey?: string) {
  if (dedupeKey) {
    const existing = await prisma.notification.findUnique({ where: { userId_dedupeKey: { userId, dedupeKey } } });
    if (existing) return;
  }
  await prisma.notification.create({ data: { userId, type, title, body, dedupeKey } });
}

/**
 * Tells staff about a customer's request or message: the assigned operator, or — while nobody is assigned — every
 * active CRM staff member (ADMIN / ADVISOR / LEAD_MANAGER), so a new request never goes unseen.
 */
export async function notifyStaff(advisorId: string | null | undefined, type: string, title: string, body: string) {
  if (advisorId) return notifyUser(advisorId, type, title, body);
  const staff = await prisma.user.findMany({ where: { active: true, role: { in: ["ADMIN", "ADVISOR", "LEAD_MANAGER"] } }, select: { id: true } });
  if (staff.length) await prisma.notification.createMany({ data: staff.map((s) => ({ userId: s.id, type, title, body })) });
}

/**
 * E-mails a customer that something happened on their request (a reply, a status change), with a link to it — the
 * portal bell alone is missed by anyone not signed in. The message itself stays behind the login. Best effort:
 * skipped quietly while outgoing e-mail isn't configured on the server (EMAIL_PROVIDER), never fails the action.
 */
export async function emailCustomer(userId: string, subject: string, lines: string[], path: string) {
  if (!process.env.EMAIL_PROVIDER || process.env.EMAIL_PROVIDER === "console") return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, role: true } });
    if (!user?.email || user.role !== "CUSTOMER") return;
    const { sendEmail } = await import("./email");
    const text = [user.name ? `سلام ${user.name}،` : "سلام،", "", ...lines, "", `https://tarefe.de${path}`, "", "تعرفه — همه خدمات ما رایگان است."].join("\n");
    await sendEmail({ to: user.email, subject, text });
  } catch (error) {
    console.error("customer e-mail failed:", error instanceof Error ? error.message : error);
  }
}
