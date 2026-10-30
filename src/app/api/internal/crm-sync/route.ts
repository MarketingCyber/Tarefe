import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { crmConfigured } from "@/lib/dynamics/client";
import { reconcileDeletions, syncAll, CRM_TABLES } from "@/lib/dynamics/sync";

/**
 * POST /api/internal/crm-sync — one round of the old-CRM mirror (lib/dynamics/sync.ts), called every minute by the
 * server's scheduler. Protected by CRM_SYNC_SECRET (Authorization: Bearer …); without it set, the route is off.
 * Query: ?tables=contact,opportunity to limit the round; ?reconcile=1 for the nightly deletion check.
 */
export const maxDuration = 120;

function authorized(request: Request) {
  const secret = process.env.CRM_SYNC_SECRET;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (!secret || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse(null, { status: 404 });
  if (!crmConfigured()) return NextResponse.json({ error: "Dynamics login not configured" }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const only = params.get("tables")?.split(",").filter(Boolean);
  if (params.get("reconcile") === "1") {
    const removed: Record<string, number> = {};
    for (const t of CRM_TABLES) if (!t.tracked && (!only || only.includes(t.name))) removed[t.name] = await reconcileDeletions(t.name).catch(() => -1);
    return NextResponse.json({ removed });
  }
  const results = await syncAll(Number(params.get("budget")) || 50_000, only);
  return NextResponse.json({ results });
}
