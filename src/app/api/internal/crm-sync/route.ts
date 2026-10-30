import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { crmConfigured } from "@/lib/dynamics/client";
import { backfillRefs, checkMirror, purgeSecretFields, reconcileDeletions, syncAll, syncFieldLabels, syncForms, CRM_TABLES } from "@/lib/dynamics/sync";

/**
 * POST /api/internal/crm-sync — one round of the old-CRM mirror (lib/dynamics/sync.ts), called every minute by the
 * server's scheduler. Protected by CRM_SYNC_SECRET (Authorization: Bearer …); without it set, the route is off.
 * Query: ?tables=contact,opportunity to limit the round; ?reconcile=1 for the nightly deletion check followed by the
 * reconciliation report (counts + field-by-field sample per table, saved in crm_checks); ?check=1 for the report alone;
 * ?refs=1 only indexes records copied before crm_records.refs existed (normal rounds also do it with spare time);
 * ?purge=1 removes secret fields (passwords, API keys, tokens) from records copied before they were filtered out;
 * ?labels=1 to refresh the field labels (crm_fields) and form layouts (crm_forms).
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
  if (params.get("labels") === "1") return NextResponse.json({ fields: await syncFieldLabels(), forms: await syncForms() });
  if (params.get("reconcile") === "1") {
    const removed: Record<string, number> = {};
    for (const t of CRM_TABLES) if (!t.tracked && (!only || only.includes(t.name))) removed[t.name] = await reconcileDeletions(t.name).catch(() => -1);
    return NextResponse.json({ removed, checks: await checkMirror(20, only) });
  }
  if (params.get("refs") === "1") return NextResponse.json({ indexed: await backfillRefs(Date.now() + (Number(params.get("budget")) || 50_000)) });
  if (params.get("purge") === "1") return NextResponse.json({ cleaned: await purgeSecretFields() });
  if (params.get("check") === "1") return NextResponse.json({ checks: await checkMirror(Number(params.get("sample")) || 20, only) });
  const results = await syncAll(Number(params.get("budget")) || 50_000, only);
  return NextResponse.json({ results });
}
