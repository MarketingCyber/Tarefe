import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { serverVisits, type ServerVisits } from "@/lib/landing-report";
import {
  DEFAULT_FUNNEL,
  LEADS_KEY,
  breakdownFor,
  eventsAndPages,
  filterOptions,
  funnelFor,
  resolveRange,
  sessionWhere,
  sessionsCte,
  totalsFor,
  trendFor,
  type AnalyticsFilters,
  type BreakdownRow,
  type DateRange,
  type EventRow,
  type FilterOptions,
  type FunnelResult,
  type TotalsResult,
  type TrendKpi,
  type TrendResult,
} from "@/lib/analytics-report";

/**
 * Data for the redesigned /ops/analytics (2026-10-15 v2): the SAME engine as
 * the explorer (lib/analytics-report.ts), composed into the handful of views a
 * person actually wants — headline numbers with sparklines, one trend, "where
 * from", landing pages, devices, a funnel, events — plus a few plain-language
 * sentences derived from those numbers (never invented: every sentence below
 * is computed from the data it describes).
 */

/** The KPIs that get a tile + sparkline, in display order. The first is the hero. */
export const TILE_KPIS: TrendKpi[] = [LEADS_KEY, "sessions", "users", "conv_rate", "median_duration", "pages_per_session"];

const LOW_SAMPLE = 20; // a rate computed from fewer sessions than this is shown as indicative only

export interface Dashboard {
  filters: AnalyticsFilters;
  range: DateRange;
  previous: DateRange;
  totals: TotalsResult;
  /** null when the previous period has no tracked sessions (nothing to compare against). */
  previousTotals: TotalsResult | null;
  compareEmpty: boolean;
  tiles: { buckets: string[]; unit: TrendResult["unit"]; series: Partial<Record<TrendKpi, number[]>> };
  trend: TrendResult;
  sources: BreakdownRow[];
  landing: BreakdownRow[];
  devices: BreakdownRow[];
  funnel: FunnelResult;
  events: EventRow[];
  options: FilterOptions;
  trackedSince: string | null;
  lowSample: number;
  insights: string[];
  /** Cookie-free landing counter — everyone, not only visitors who accepted cookies. */
  server: ServerVisits;
  /** CRM leads total in range regardless of filters that the leads table cannot answer. */
  hasData: boolean;
}

const pct = (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`;
const int = (v: number) => Math.round(v).toLocaleString("en-US");

const CHANNEL_NAME: Record<string, string> = {
  "Organic Search": "Organic search",
  Social: "Social networks",
  Direct: "Direct",
  Referral: "Other websites (referral)",
  Paid: "Paid ads",
  Email: "Email",
  Other: "Other",
  "(not set)": "(not set)",
};

function buildInsights(d: Pick<Dashboard, "totals" | "previousTotals" | "sources" | "landing" | "devices" | "range" | "filters" | "server">): string[] {
  const out: string[] = [];
  const t = d.totals.values;
  const s = d.server;

  if (s.visits > 0) {
    let line = `${int(s.visits)} ${s.visits === 1 ? "visit" : "visits"} reached the site in this period (counted without cookies)`;
    if (s.paidVisits > 0) line += `, ${int(s.paidVisits)} from ads`;
    if (!s.ignoredFilters.length && t.sessions > 0) line += `. Cookie tracking saw ${pct(Math.min(1, t.sessions / s.visits), 0)} of them; the rest declined or ignored the cookie banner`;
    out.push(`${line}.`);
  }
  if (t.sessions === 0) return out;

  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
  let line = `In this period there were ${int(t.sessions)} ${plural(t.sessions, "visit", "visits")} from ${int(t.users)} ${plural(t.users, "visitor", "visitors")}`;
  if (t.submissions > 0) line += `; ${int(t.submissions)} ${plural(t.submissions, "visit", "visits")} ended with a submitted form (${pct(t.conv_rate)})`;
  else line += "; no form has been submitted yet";
  out.push(`${line}.`);

  if (d.previousTotals && d.previousTotals.values.sessions > 0) {
    const change = (t.sessions - d.previousTotals.values.sessions) / d.previousTotals.values.sessions;
    out.push(`Visits are ${Math.abs(change) < 0.005 ? "about the same as" : change > 0 ? `${(change * 100).toFixed(0)}% higher than` : `${Math.abs(change * 100).toFixed(0)}% lower than`} the previous period.`);
  }

  // Where from — only a statement when the top source is actually known.
  const known = d.sources.filter((r) => r.keys[0] !== "(not set)");
  const notSet = d.sources.find((r) => r.keys[0] === "(not set)");
  const total = d.sources.reduce((a, r) => a + (r.values.sessions ?? 0), 0);
  // (skipped when that same dimension is already filtered — "most visits came from X" would be circular)
  if (known.length && total > 0 && !d.filters.dims[d.filters.srcDim]) {
    const top = known[0];
    const label = d.filters.srcDim === "channel" ? (CHANNEL_NAME[top.keys[0]] ?? top.keys[0]) : top.keys[0];
    out.push(`Most visits came from "${label}" (${pct((top.values.sessions ?? 0) / total, 0)} of visits).`);
  }
  if (notSet && total > 0 && (notSet.values.sessions ?? 0) / total > 0.3) {
    out.push(`${pct((notSet.values.sessions ?? 0) / total, 0)} of visits have no recorded source. They are from before source tracking started, or the visitor had not yet accepted cookies. The share shrinks as new data comes in.`);
  }

  // Best landing page by conversion, only with enough traffic to mean something.
  const eligible = d.landing.filter((r) => (r.values.sessions ?? 0) >= 10 && (r.values.submissions ?? 0) > 0 && r.keys[0] !== "(not set)");
  if (eligible.length) {
    const best = [...eligible].sort((a, b) => (b.values.conv_rate ?? 0) - (a.values.conv_rate ?? 0))[0];
    out.push(`The best landing page for form submissions is "${best.keys[0]}" (${pct(best.values.conv_rate ?? 0)} of ${int(best.values.sessions ?? 0)} visits).`);
  }

  const devTotal = d.devices.reduce((a, r) => a + (r.values.sessions ?? 0), 0);
  const dev = d.devices.find((r) => r.keys[0] !== "(not set)");
  if (d.filters.devDim === "device" && !d.filters.dims.device && dev && devTotal > 0) {
    out.push(`Most visits were on ${dev.keys[0]} (${pct((dev.values.sessions ?? 0) / devTotal, 0)}).`);
  }
  return out;
}

export async function buildDashboard(f: AnalyticsFilters): Promise<Dashboard> {
  const { range, previous } = resolveRange(f);

  // Sparklines: no split, no compare — one tiny line per tile KPI.
  const tileFilters: AnalyticsFilters = { ...f, trendKpis: TILE_KPIS, trendSplit: "" };
  const mainKpi = f.trendKpis[0];

  // The trend card's optional split needs the top values first (the rest is bucketed as "Other").
  let topSplit: string[] | null = null;
  if (f.trendSplit) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      WITH ${sessionsCte(range, f.attribution)},
      filtered AS (SELECT * FROM sess WHERE ${sessionWhere(f)})
      SELECT ${Prisma.raw(`"${f.trendSplit}"`)} AS v, count(*) AS n FROM filtered GROUP BY 1 ORDER BY 2 DESC LIMIT 5`);
    topSplit = rows.map((r) => String(r.v));
    if (topSplit.length === 0) topSplit = null;
  }

  const common = { ...f, metrics: ["sessions" as const, "users" as const, "submissions" as const, "conv_rate" as const, "median_duration" as const] };

  const [totals, prevTotalsRaw, tileTrend, trend, sources, landing, devices, funnel, ep, options, since, server] = await Promise.all([
    totalsFor(f, range),
    f.compare ? totalsFor(f, previous) : Promise.resolve(null),
    trendFor(tileFilters, range, null, null),
    trendFor({ ...f, trendKpis: [mainKpi] }, range, f.compare ? previous : null, topSplit),
    breakdownFor({ ...common, groupBy: [f.srcDim], sort: "sessions", dir: "desc" }, range),
    breakdownFor({ ...common, groupBy: ["landing_group"], sort: "sessions", dir: "desc" }, range),
    breakdownFor({ ...common, groupBy: [f.devDim], sort: "sessions", dir: "desc" }, range),
    funnelFor({ ...f, funnelSteps: DEFAULT_FUNNEL }, range),
    eventsAndPages(f, range),
    filterOptions(f, range),
    prisma.$queryRaw<{ d: Date | null }[]>(Prisma.sql`SELECT min("createdAt") AS d FROM analytics_events WHERE "sessionId" IS NOT NULL`),
    serverVisits(f),
  ]);

  const previousTotals = prevTotalsRaw && prevTotalsRaw.values.sessions > 0 ? prevTotalsRaw : null;
  const tiles: Dashboard["tiles"] = { buckets: tileTrend.buckets, unit: tileTrend.unit, series: {} };
  for (const s of tileTrend.series) tiles.series[s.kpi] = s.values;

  const dash: Dashboard = {
    filters: f,
    range,
    previous,
    totals,
    previousTotals,
    compareEmpty: f.compare && !previousTotals,
    tiles,
    trend,
    sources,
    landing: landing.slice(0, 8),
    devices,
    funnel,
    events: ep.events,
    options,
    trackedSince: since[0]?.d ? since[0].d.toISOString().slice(0, 10) : null,
    lowSample: LOW_SAMPLE,
    insights: [],
    server,
    hasData: totals.values.sessions > 0,
  };
  dash.insights = buildInsights(dash);
  return dash;
}
