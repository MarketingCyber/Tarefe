import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { canAccessAnalytics } from "@/lib/permissions";
import { DIMENSIONS, LEADS_LABEL, METRICS, METRIC_KEYS, buildReport, formatValue, parseFilters } from "@/lib/analytics-report";

/**
 * CSV of the pivot table exactly as filtered on /ops/analytics (the page's own
 * "download" link carries the full query string). Same permission as the page.
 * UTF-8 with a BOM so Excel opens non-ASCII text correctly.
 */
export const dynamic = "force-dynamic";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(request: Request) {
  const session = await auth();
  if (!canAccessAnalytics(session?.user?.role)) return new NextResponse("Forbidden", { status: 403 });

  const params: Record<string, string | string[]> = {};
  for (const [k, v] of new URL(request.url).searchParams) {
    const prev = params[k];
    params[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
  }
  const filters = parseFilters(params);
  const report = await buildReport(filters);

  const metricCols = METRIC_KEYS.filter((k) => filters.metrics.includes(k));
  const showLeads = report.breakdown.some((r) => r.leads !== null);

  const header = [...filters.groupBy.map((d) => DIMENSIONS[d].label), ...metricCols.map((k) => METRICS[k].label), ...(showLeads ? [LEADS_LABEL] : [])];
  const rows = report.breakdown.map((r) => [
    ...r.keys,
    ...metricCols.map((k) => (r.values[k] === undefined ? "" : formatValue(METRICS[k].format, r.values[k] as number))),
    ...(showLeads ? [r.leads === null ? "" : r.leads] : []),
  ]);

  const csv = "﻿" + [header, ...rows].map((line) => line.map(cell).join(",")).join("\r\n") + "\r\n";
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="analytics-${report.range.from}_${report.range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
