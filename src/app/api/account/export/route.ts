import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GDPR Art. 15 (right of access) — a real export of everything this
 * account actually has, not a placeholder. Safe to make fully self-service
 * and instant: reading and packaging existing data doesn't touch the
 * retention-period question that makes deletion (see the account/delete
 * route) something staff need to review instead.
 *
 * `force-dynamic` + the explicit `Cache-Control` below are NOT
 * belt-and-suspenders here — this route was actually caught serving a
 * stale, cached response (another user's real export data, from an
 * earlier authenticated request) to a later completely unauthenticated
 * request to this same URL, found via a real Playwright test failure and
 * confirmed with a direct reproduction (`last-modified` present, body's
 * `exportedAt` minutes stale) before this fix. GET Route Handlers in this
 * Next.js version aren't cached *by default* per the installed docs, but
 * this one was — this route has no per-user URL segment (unlike
 * `/api/documents/[id]`, which already set the same header), so a cache
 * keyed on the bare URL alone serves whoever hits it next, regardless of
 * their own session. Every GET route handler in this codebase was
 * re-audited after finding this; the rest either don't exist (POST-only)
 * or already set this same header (`/api/documents/[id]`).
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = session.user.id;

  const [user, contracts, applications, serviceRequests, documents, notifications] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, phone: true, locale: true, role: true, createdAt: true } }),
    prisma.contract.findMany({ where: { customerId: userId } }),
    prisma.application.findMany({ where: { customerId: userId } }),
    prisma.serviceRequest.findMany({ where: { customerId: userId }, include: { messages: true } }),
    prisma.document.findMany({ where: { ownerId: userId }, select: { id: true, title: true, type: true, fileUrl: true, uploadedAt: true, contractId: true } }),
    prisma.notification.findMany({ where: { userId } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    profile: user,
    contracts,
    applications,
    serviceRequests,
    documents,
    notifications,
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="tarefe-data-export-${userId}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
