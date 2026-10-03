/**
 * Server-side counterpart to src/lib/analytics.ts's track() — for CRM
 * lifecycle events fired from inside a Server Action (MFA toggle, lead
 * status change, application/contract/ticket/document mutations), which
 * have no browser session or UTM store to read at all, only the acting
 * staff member's own userId. Deliberately a SEPARATE file from
 * analytics.ts: that module is imported by client components too (see its
 * own top comment), and importing `prisma` there would drag server-only
 * code (pg driver) into the client bundle.
 */
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { EventName } from "./analytics";

export async function trackServer(name: EventName, opts: { userId?: string; metadata?: Record<string, unknown> } = {}) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        userId: opts.userId ?? null,
        metadata: opts.metadata as unknown as Prisma.InputJsonValue | undefined,
      },
    });
  } catch {
    // A real mutation (MFA toggled, contract created, ...) already
    // succeeded by the time this runs — a logging failure must never
    // surface as an error for an action that actually worked.
  }
}
