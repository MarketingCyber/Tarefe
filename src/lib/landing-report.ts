import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { channelSql } from "@/lib/traffic-channel";
import { resolveRange, tsFrom, tsToExclusive, type AnalyticsFilters, type DateRange, type Dim } from "@/lib/analytics-report";

/**
 * Report over the cookie-free landing counter (lib/landing-hits.ts).
 *
 * VISITS are rebuilt from the hits the same way the cookie-based report builds
 * sessions: a visitor's hits within 30 minutes of each other are one visit,
 * counted once, with the source of its first hit. `visitor` rotates daily, so
 * "visitors" means distinct people PER DAY summed over the range — a person who
 * returns on another day counts again (that is the price of not recognising
 * anyone across days).
 *
 * Only the dimensions this table stores can filter it; any other active filter
 * is reported back in `ignoredFilters` so the page can say so instead of
 * silently showing unfiltered numbers.
 *
 * SECURITY: every user-controlled value is a bound parameter; column
 * expressions that reach Prisma.raw come only from the whitelist below.
 */

const CHANNEL = channelSql("medium");

/** SQL expression per dimension this table can answer, evaluated over the `v` relation. */
const DIM_EXPR: Partial<Record<Dim, string>> = {
  channel: "channel",
  source: "source",
  medium: "medium",
  campaign: "COALESCE(campaign, '(not set)')",
  content: "COALESCE(content, '(not set)')",
  term: "COALESCE(term, '(not set)')",
  landing: "path",
  landing_group: "regexp_replace(path, '^/(fa|de|ru)(/|$)', '/')",
  device: "COALESCE(device, '(not set)')",
  browser: "COALESCE(browser, '(not set)')",
  os: "COALESCE(os, '(not set)')",
  locale: "COALESCE(locale::text, '(not set)')",
};

export interface ServerBreakdownRow {
  key: string;
  visits: number;
}

export interface ServerVisits {
  range: DateRange;
  visits: number;
  previousVisits: number;
  visitors: number;
  /** Visits arriving with a paid click id (Google Ads gclid / gbraid / wbraid …) or a paid medium. */
  paidVisits: number;
  daily: { buckets: string[]; values: number[] };
  sources: ServerBreakdownRow[];
  landing: ServerBreakdownRow[];
  devices: ServerBreakdownRow[];
  /** Active filters this table cannot answer (so the numbers above ignore them). */
  ignoredFilters: string[];
  firstHitAt: string | null;
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

function visitsCte(range: DateRange): Prisma.Sql {
  return Prisma.sql`
  h AS (
    SELECT lh.*, lag(lh."createdAt") OVER (PARTITION BY lh.visitor ORDER BY lh."createdAt") AS prev
    FROM landing_hits lh
    WHERE lh."createdAt" >= ${tsFrom(range.from)} AND lh."createdAt" < ${tsToExclusive(range.to)}
  ),
  v AS (
    SELECT h.*, ${Prisma.raw(CHANNEL)} AS channel FROM h
    WHERE prev IS NULL OR "createdAt" - prev > interval '30 minutes'
  )`;
}

function whereFor(f: AnalyticsFilters): { where: Prisma.Sql; ignored: string[] } {
  const parts: Prisma.Sql[] = [];
  const ignored: string[] = [];
  for (const [dim, value] of Object.entries(f.dims) as [Dim, string][]) {
    const expr = DIM_EXPR[dim];
    if (expr) parts.push(Prisma.sql`${Prisma.raw(expr)} = ${value}`);
    else ignored.push(dim);
  }
  if (f.landingQ) parts.push(Prisma.sql`path ILIKE ${`%${f.landingQ}%`}`);
  if (f.events.length) ignored.push("event");
  return { where: parts.length ? Prisma.sql`WHERE ${Prisma.join(parts, " AND ")}` : Prisma.empty, ignored };
}

function eachDay(range: DateRange): string[] {
  const out: string[] = [];
  const d = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  while (d <= end && out.length < 400) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Visits in an arbitrary range with the same filters — used to compare like with like against the cookie-based sessions. */
export async function serverVisitCount(f: AnalyticsFilters, range: DateRange): Promise<number> {
  const { where } = whereFor(f);
  const rows = await prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`
    WITH ${visitsCte(range)}
    SELECT count(*) AS n FROM v ${where}`);
  return num(rows[0]?.n);
}

export async function serverVisits(f: AnalyticsFilters): Promise<ServerVisits> {
  const { range, previous } = resolveRange(f);
  const { where, ignored } = whereFor(f);

  const breakdown = (dim: Dim, limit: number) => {
    const expr = DIM_EXPR[dim] ?? "source";
    return prisma.$queryRaw<{ k: string; n: bigint }[]>(Prisma.sql`
      WITH ${visitsCte(range)}
      SELECT ${Prisma.raw(expr)} AS k, count(*) AS n FROM v ${where} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}`);
  };

  const [totals, prevTotals, days, sources, landing, devices, first] = await Promise.all([
    prisma.$queryRaw<{ visits: bigint; visitors: bigint; paid: bigint }[]>(Prisma.sql`
      WITH ${visitsCte(range)}
      SELECT count(*) AS visits, count(DISTINCT visitor) AS visitors,
             count(*) FILTER (WHERE "clickId" IS NOT NULL OR channel = 'Paid') AS paid
      FROM v ${where}`),
    prisma.$queryRaw<{ visits: bigint }[]>(Prisma.sql`
      WITH ${visitsCte(previous)}
      SELECT count(*) AS visits FROM v ${where}`),
    prisma.$queryRaw<{ d: string; n: bigint }[]>(Prisma.sql`
      WITH ${visitsCte(range)}
      SELECT to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin'), 'YYYY-MM-DD') AS d, count(*) AS n
      FROM v ${where} GROUP BY 1`),
    breakdown(f.srcDim, 8),
    breakdown("landing_group", 8),
    breakdown(f.devDim, 6),
    prisma.$queryRaw<{ t: Date | null }[]>(Prisma.sql`SELECT min("createdAt") AS t FROM landing_hits`),
  ]);

  const byDay = new Map(days.map((r) => [r.d, num(r.n)]));
  const buckets = eachDay(range);
  const rows = (r: { k: string; n: bigint }[]) => r.map((x) => ({ key: x.k, visits: num(x.n) }));

  return {
    range,
    visits: num(totals[0]?.visits),
    previousVisits: num(prevTotals[0]?.visits),
    visitors: num(totals[0]?.visitors),
    paidVisits: num(totals[0]?.paid),
    daily: { buckets, values: buckets.map((b) => byDay.get(b) ?? 0) },
    sources: rows(sources),
    landing: rows(landing),
    devices: rows(devices),
    ignoredFilters: ignored,
    firstHitAt: first[0]?.t ? first[0].t.toISOString().slice(0, 10) : null,
  };
}

export interface LandingFunnelRow {
  kind: string;
  /** People who opened the landing page (landing_hits, the same counter as the visits section). */
  views: number;
  /** Distinct visitors per step (visitor hash rotates daily, so per-day people summed over the range). */
  steps: Record<"usage" | "results" | "tariff" | "form" | "submitted", number>;
  /** How many of the people who reached the first step arrived with an ad click id. */
  fromAds: number;
}

const EMPTY_STEPS = { usage: 0, results: 0, tariff: 0, form: 0, submitted: 0 };

/**
 * The Google Ads landing journey's step counts (cookie-free, api/landing-step):
 * how many people got past each screen. A step is counted once per visitor per day.
 */
export async function landingFunnel(f: AnalyticsFilters): Promise<LandingFunnelRow[]> {
  const { range } = resolveRange(f);
  const rows = await prisma.$queryRaw<{ kind: string; step: string; people: bigint; ads: bigint }[]>(Prisma.sql`
    SELECT kind, step,
           count(DISTINCT (visitor, to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD'))) AS people,
           count(DISTINCT (visitor, to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD'))) FILTER (WHERE ads) AS ads
    FROM landing_steps
    WHERE "createdAt" >= ${tsFrom(range.from)} AND "createdAt" < ${tsToExclusive(range.to)}
    GROUP BY kind, step`);
  const views = await prisma.$queryRaw<{ kind: string; people: bigint }[]>(Prisma.sql`
    SELECT substring(path from '/landing/(electricity|gas)$') AS kind,
           count(DISTINCT (visitor, to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD'))) AS people
    FROM landing_hits
    WHERE path ~ '/landing/(electricity|gas)$'
      AND "createdAt" >= ${tsFrom(range.from)} AND "createdAt" < ${tsToExclusive(range.to)}
    GROUP BY 1`);
  const byKind = new Map<string, LandingFunnelRow>();
  for (const v of views) byKind.set(v.kind, { kind: v.kind, views: Number(v.people), steps: { ...EMPTY_STEPS }, fromAds: 0 });
  for (const r of rows) {
    const row = byKind.get(r.kind) ?? { kind: r.kind, views: 0, steps: { ...EMPTY_STEPS }, fromAds: 0 };
    if (r.step in row.steps) row.steps[r.step as keyof LandingFunnelRow["steps"]] = Number(r.people);
    if (r.step === "usage") row.fromAds = Number(r.ads);
    byKind.set(r.kind, row);
  }
  return [...byKind.values()].sort((a, b) => a.kind.localeCompare(b.kind));
}
