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
