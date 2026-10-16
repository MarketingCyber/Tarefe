import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { channelSql } from "@/lib/traffic-channel";

/**
 * Analytics explorer — the query layer behind /ops/analytics (2026-10-15).
 *
 * Everything is derived from two tables only: analytics_events (behaviour,
 * consent-gated) and leads (the CRM truth). Nothing is stored pre-aggregated,
 * so every number can be re-derived and every filter applies consistently.
 *
 * SESSIONS. The stored `sessionId` is really a VISITOR id (a random id kept in
 * localStorage forever). A real session is rebuilt here from the timestamps:
 * a visitor's events belong to one session until 30 minutes pass with no
 * event, then a new session starts (the Google Analytics convention). That is
 * what makes "average session duration" and "pages per session" meaningful.
 *
 * WHAT A SESSION'S SOURCE IS. Taken from the session's FIRST event: its
 * utm{Visit|Last|First}* fields as they were at that moment (the attribution
 * toggle; default "visit" = how THIS visit arrived). Sources without UTM are derived from the referrer client-side
 * (lib/analytics.ts), so "google / organic", "instagram / social" and
 * "(direct) / (none)" exist as real values.
 *
 * HONEST LIMITS (also shown in the UI):
 *  - Only visitors who accepted the cookie banner are tracked — this is a
 *    sample of traffic, not a census.
 *  - Duration is last-event minus first-event: a one-page visit with no later
 *    event has duration 0, and time spent on the LAST page is invisible.
 *  - "Leads (CRM)" counts the leads table regardless of tracking consent, so
 *    it can exceed tracked submissions; leads can only be broken down by
 *    dimensions the leads table actually stores (see DIMENSIONS[].leads).
 *
 * SECURITY. All user-controlled values go through Prisma's parameter binding.
 * Column / alias names that reach Prisma.raw come ONLY from the whitelists
 * below, never from the request.
 */

const TZ = "Europe/Berlin";
const MAX_GROUP_ROWS = 200;
const TREND_SPLIT_TOP = 5;
const FILTER_OPTION_LIMIT = 40;

// ============================================================ dimensions

export const DIMENSION_KEYS = ["channel", "source", "medium", "campaign", "content", "term", "landing", "landing_group", "device", "browser", "os", "locale", "category", "service", "visitor_type"] as const;
export type Dim = (typeof DIMENSION_KEYS)[number];

/** `leads`: the leads table stores this dimension, so CRM leads can be broken down by it. */
export const DIMENSIONS: Record<Dim, { label: string; leads: boolean }> = {
  channel: { label: "Channel", leads: true },
  source: { label: "Source", leads: true },
  medium: { label: "Medium", leads: true },
  campaign: { label: "Campaign", leads: true },
  content: { label: "Content", leads: true },
  term: { label: "Term", leads: true },
  landing: { label: "Landing page", leads: false },
  landing_group: { label: "Landing page (no language)", leads: false },
  device: { label: "Device", leads: false },
  browser: { label: "Browser", leads: false },
  os: { label: "Operating system", leads: false },
  locale: { label: "Language", leads: true },
  category: { label: "Service category", leads: true },
  service: { label: "Service", leads: true },
  visitor_type: { label: "New / returning", leads: false },
};

// ============================================================== metrics

export const METRIC_KEYS = [
  "sessions",
  "users",
  "pageviews",
  "pages_per_session",
  "avg_duration",
  "median_duration",
  "engagement_rate",
  "bounce_rate",
  "calc_sessions",
  "cta_sessions",
  "form_starts",
  "submissions",
  "conv_rate",
  "form_completion",
  "wa_clicks",
  "phone_clicks",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
import type { ValueFormat } from "./analytics-format";
export { formatValue } from "./analytics-format";
export type { ValueFormat } from "./analytics-format";

/** `sql` runs over the per-session `filtered` relation. */
export const METRICS: Record<MetricKey, { label: string; hint: string; format: ValueFormat; sql: string }> = {
  sessions: { label: "Sessions", hint: "Number of visits (30 minutes of inactivity starts a new session)", format: "int", sql: "count(*)" },
  users: { label: "Users", hint: "Distinct browsers", format: "int", sql: "count(distinct visitor)" },
  pageviews: { label: "Page views", hint: "Total page views", format: "int", sql: "coalesce(sum(pageviews), 0)" },
  pages_per_session: { label: "Pages / session", hint: "Average page views per session", format: "decimal", sql: "coalesce(avg(pageviews), 0)" },
  avg_duration: { label: "Avg. session duration", hint: "Time between the first and last event of a session. A few very long sessions pull the average up; the median is usually more realistic", format: "duration", sql: "coalesce(avg(duration_s), 0)" },
  median_duration: { label: "Median session duration", hint: "Half of sessions are shorter and half longer than this; not skewed by a few very long sessions", format: "duration", sql: "coalesce(percentile_cont(0.5) within group (order by duration_s), 0)" },
  engagement_rate: { label: "Engagement rate", hint: "Sessions with 2+ pages, 10+ seconds, or an action (search, form, click…)", format: "percent", sql: "coalesce(avg(engaged::int), 0)" },
  bounce_rate: { label: "Bounce rate", hint: "Sessions without any engagement", format: "percent", sql: "coalesce(1 - avg(engaged::int), 0)" },
  calc_sessions: { label: "Calculator used", hint: "Sessions that saw an electricity/gas calculator result", format: "int", sql: "count(*) filter (where used_calc)" },
  cta_sessions: { label: "Tariff button clicks", hint: "Sessions that clicked a tariff card button", format: "int", sql: "count(*) filter (where clicked_cta)" },
  form_starts: { label: "Form starts", hint: "Sessions that started the consultation form", format: "int", sql: "count(*) filter (where form_started)" },
  submissions: { label: "Form submissions (tracked)", hint: "Sessions that submitted the form (only visitors who accepted cookies)", format: "int", sql: "count(*) filter (where submitted)" },
  conv_rate: { label: "Conversion rate", hint: "Form submissions ÷ sessions", format: "percent", sql: "coalesce(count(*) filter (where submitted)::float8 / nullif(count(*), 0), 0)" },
  form_completion: { label: "Form completion", hint: "Form submissions ÷ form starts", format: "percent", sql: "coalesce(count(*) filter (where submitted)::float8 / nullif(count(*) filter (where form_started), 0), 0)" },
  wa_clicks: { label: "WhatsApp clicks", hint: "Sessions with a WhatsApp click", format: "int", sql: "count(*) filter (where wa)" },
  phone_clicks: { label: "Phone clicks", hint: "Sessions with a call click", format: "int", sql: "count(*) filter (where phone)" },
};

/** Leads from the CRM table — a different source of truth than tracked events, so it is a separate column. */
export const LEADS_KEY = "leads_crm" as const;
export const LEADS_LABEL = "Leads (CRM)";
export const LEADS_HINT = "Leads recorded in the CRM, independent of cookie consent";

export const DEFAULT_METRICS: MetricKey[] = ["sessions", "users", "pageviews", "pages_per_session", "avg_duration", "median_duration", "engagement_rate", "form_starts", "submissions", "conv_rate"];

// KPIs that can be drawn as trend lines (a subset of metrics + CRM leads).
export const TREND_KPIS = ["sessions", "users", "pageviews", "pages_per_session", "avg_duration", "median_duration", "engagement_rate", "calc_sessions", "form_starts", "submissions", "conv_rate", LEADS_KEY] as const;
export type TrendKpi = (typeof TREND_KPIS)[number];
export const DEFAULT_TREND_KPIS: TrendKpi[] = ["sessions", LEADS_KEY];

// ============================================================== funnel

export const FUNNEL_STEP_KEYS = ["sessions", "engaged", "viewed_service", "used_calc", "clicked_cta", "form_started", "submitted"] as const;
export type FunnelStepKey = (typeof FUNNEL_STEP_KEYS)[number];
export const FUNNEL_STEPS: Record<FunnelStepKey, { label: string; where: string }> = {
  sessions: { label: "Sessions", where: "true" },
  engaged: { label: "Engaged sessions", where: "engaged" },
  viewed_service: { label: "Viewed a service page", where: "viewed_service" },
  used_calc: { label: "Used the calculator", where: "used_calc" },
  clicked_cta: { label: "Clicked a tariff button", where: "clicked_cta" },
  form_started: { label: "Started the consultation form", where: "form_started" },
  submitted: { label: "Submitted the consultation form", where: "submitted" },
};
export const DEFAULT_FUNNEL: FunnelStepKey[] = ["sessions", "viewed_service", "used_calc", "clicked_cta", "form_started", "submitted"];

// ================================================================ filters

export const PRESETS = ["today", "yesterday", "7d", "14d", "30d", "90d", "mtd", "custom"] as const;
export type Preset = (typeof PRESETS)[number];
export const PRESET_LABEL: Record<Preset, string> = { today: "Today", yesterday: "Yesterday", "7d": "7 days", "14d": "14 days", "30d": "30 days", "90d": "90 days", mtd: "This month", custom: "Custom range" };

export interface AnalyticsFilters {
  preset: Preset;
  from: string; // YYYY-MM-DD (Berlin), inclusive — meaningful for preset "custom"
  to: string;
  compare: boolean;
  attribution: "visit" | "last" | "first";
  dims: Partial<Record<Dim, string>>;
  landingQ: string;
  events: string[];
  groupBy: Dim[];
  metrics: MetricKey[];
  sort: string;
  dir: "asc" | "desc";
  trendKpis: TrendKpi[];
  trendSplit: Dim | "";
  trendUnit: "auto" | "day" | "week" | "month";
  funnelSteps: FunnelStepKey[];
  funnelMode: "strict" | "open";
  /** Dashboard cards: which dimension the "where do visitors come from" / "what device" cards break down by. */
  srcDim: Dim;
  devDim: Dim;
  /** The collapsed "advanced" pivot section is open (its data is only computed then). */
  adv: boolean;
}

export const SRC_DIMS = ["channel", "source", "medium", "campaign", "content", "term"] as const satisfies readonly Dim[];
export const DEV_DIMS = ["device", "browser", "os", "locale"] as const satisfies readonly Dim[];

type RawParams = Record<string, string | string[] | undefined>;

function list(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
}
const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? "";
const pick = <T extends string>(all: readonly T[], values: string[]): T[] => values.filter((v): v is T => (all as readonly string[]).includes(v));
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function parseFilters(params: RawParams): AnalyticsFilters {
  const presetRaw = one(params.p);
  const preset: Preset = (PRESETS as readonly string[]).includes(presetRaw) ? (presetRaw as Preset) : "30d";

  const dims: Partial<Record<Dim, string>> = {};
  for (const d of DIMENSION_KEYS) {
    const v = one(params[`f_${d}`]).trim();
    if (v) dims[d] = v.slice(0, 200);
  }

  const groupBy = pick(DIMENSION_KEYS, list(params.gb)).filter((d, i, a) => a.indexOf(d) === i).slice(0, 3);
  const metrics = pick(METRIC_KEYS, list(params.m));
  // `kpi` (single) is the dashboard's trend selector; `k` (list) is the older multi-chart form — both land in trendKpis.
  const trendKpis = pick(TREND_KPIS, list(params.kpi).length ? list(params.kpi).slice(0, 1) : list(params.k));
  const srcRaw = one(params.src);
  const devRaw = one(params.dev);
  const funnelSteps = pick(FUNNEL_STEP_KEYS, list(params.fs));
  const split = one(params.split);
  const unit = one(params.unit);
  const sortRaw = one(params.sort);
  const validSorts: string[] = [...METRIC_KEYS, LEADS_KEY, ...DIMENSION_KEYS];

  return {
    preset,
    from: isDate(one(params.from)) ? one(params.from) : "",
    to: isDate(one(params.to)) ? one(params.to) : "",
    compare: one(params.cmp) === "1",
    attribution: one(params.attr) === "first" ? "first" : one(params.attr) === "last" ? "last" : "visit",
    dims,
    landingQ: one(params.lq).trim().slice(0, 100),
    events: list(params.ev).slice(0, 30),
    groupBy: groupBy.length ? groupBy : ["channel"],
    metrics: metrics.length ? metrics : DEFAULT_METRICS,
    sort: validSorts.includes(sortRaw) ? sortRaw : "sessions",
    dir: one(params.dir) === "asc" ? "asc" : "desc",
    trendKpis: trendKpis.length ? trendKpis : DEFAULT_TREND_KPIS,
    trendSplit: (DIMENSION_KEYS as readonly string[]).includes(split) ? (split as Dim) : "",
    trendUnit: (["day", "week", "month"] as const).find((u) => u === unit) ?? "auto",
    funnelSteps: funnelSteps.length ? funnelSteps : DEFAULT_FUNNEL,
    funnelMode: one(params.fm) === "strict" ? "strict" : "open",
    srcDim: (SRC_DIMS as readonly string[]).includes(srcRaw) ? (srcRaw as Dim) : "channel",
    devDim: (DEV_DIMS as readonly string[]).includes(devRaw) ? (devRaw as Dim) : "device",
    adv: one(params.adv) === "1",
  };
}

// ================================================================== dates

function todayBerlin(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}
function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

export interface DateRange {
  from: string; // inclusive
  to: string; // inclusive
  days: number;
}

export function resolveRange(f: AnalyticsFilters): { range: DateRange; previous: DateRange } {
  const today = todayBerlin();
  let from: string;
  let to = today;
  switch (f.preset) {
    case "today":
      from = today;
      break;
    case "yesterday":
      from = to = addDays(today, -1);
      break;
    case "7d":
      from = addDays(today, -6);
      break;
    case "14d":
      from = addDays(today, -13);
      break;
    case "90d":
      from = addDays(today, -89);
      break;
    case "mtd":
      from = `${today.slice(0, 7)}-01`;
      break;
    case "custom":
      from = f.from || addDays(today, -29);
      to = f.to || today;
      if (from > to) [from, to] = [to, from];
      break;
    default:
      from = addDays(today, -29);
  }
  const days = diffDays(from, to) + 1;
  return { range: { from, to, days }, previous: { from: addDays(from, -days), to: addDays(from, -1), days } };
}

/** SQL: Berlin-midnight of a date, as the naive-UTC timestamp Prisma stores. */
export const tsFrom = (d: string) => Prisma.sql`((${d}::date)::timestamp AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC'`;
export const tsToExclusive = (d: string) => Prisma.sql`(((${d}::date + 1))::timestamp AT TIME ZONE ${TZ}) AT TIME ZONE 'UTC'`;

// ================================================================ sessions

type Attribution = "visit" | "last" | "first";

/**
 * Column expression for one attribution field. "visit" is this visit's own
 * classification and falls back to the last-touch value for events recorded
 * before the visit columns existed (2026-10-16), so older data keeps its source.
 */
function attrCol(alias: "e" | "l", attribution: Attribution, field: "Source" | "Medium" | "Campaign" | "Term" | "Content"): string {
  if (attribution === "visit") return `COALESCE(NULLIF(${alias}."utmVisit${field}", ''), ${alias}."utmLast${field}")`;
  return `${alias}."${attribution === "first" ? "utmFirst" : "utmLast"}${field}"`;
}

// Case-insensitive on purpose (a hand-typed utm_medium=CPC must still count as Paid). The lists live in lib/traffic-channel.ts,
// shared with the CRM lead pages so both always agree.
const CHANNEL_SQL = channelSql("medium");

/** The CTE chain that rebuilds sessions inside [from, to] — ends in the unfiltered `sess` relation. */
export function sessionsCte(range: DateRange, attribution: Attribution): Prisma.Sql {
  const col = (n: "Source" | "Medium" | "Campaign" | "Term" | "Content") => Prisma.raw(attrCol("e", attribution, n));
  return Prisma.sql`
  ev AS (
    SELECT e.id, e."sessionId" AS visitor, e."createdAt" AS ts, e.name, e.path, e.locale::text AS locale, e.category, e.service,
           ${col("Source")} AS src, ${col("Medium")} AS med, ${col("Campaign")} AS camp, ${col("Content")} AS cont, ${col("Term")} AS term,
           e.device, e.browser, e.os,
           lag(e."createdAt") OVER (PARTITION BY e."sessionId" ORDER BY e."createdAt", e.id) AS prev_ts
    FROM analytics_events e
    WHERE e."sessionId" IS NOT NULL
      AND e."createdAt" >= ${tsFrom(range.from)} AND e."createdAt" < ${tsToExclusive(range.to)}
  ),
  numbered AS (
    SELECT ev.*, sum(CASE WHEN prev_ts IS NULL OR ts - prev_ts > interval '30 minutes' THEN 1 ELSE 0 END)
                   OVER (PARTITION BY visitor ORDER BY ts, id) AS visit_no
    FROM ev
  ),
  nid AS (
    SELECT numbered.*, visitor || '#' || visit_no AS sess_id FROM numbered
  ),
  raw AS (
    SELECT visitor, visit_no, visitor || '#' || visit_no AS sess_id,
      min(ts) AS started_at, max(ts) AS ended_at,
      count(*) FILTER (WHERE name = 'page_view') AS pageviews,
      array_agg(DISTINCT name) AS names,
      bool_or(name = 'page_view' AND path LIKE '%/services/%') AS viewed_service,
      bool_or(name = 'energy_calculator_used') AS used_calc,
      bool_or(name = 'tariff_cta_clicked') AS clicked_cta,
      bool_or(name = 'consultation_form_started') AS form_started,
      bool_or(name = 'consultation_submitted') AS submitted,
      bool_or(name = 'whatsapp_clicked') AS wa,
      bool_or(name = 'phone_clicked') AS phone,
      bool_or(name IN ('search','comparison_started','qualification_started','qualification_completed','consultation_form_started',
                       'consultation_submitted','whatsapp_clicked','phone_clicked','energy_calculator_used','tariff_cta_clicked')) AS interacted,
      (array_agg(path ORDER BY ts, id) FILTER (WHERE name = 'page_view'))[1] AS landing_path,
      (array_agg(src ORDER BY ts, id))[1] AS src,
      (array_agg(med ORDER BY ts, id))[1] AS med,
      (array_agg(camp ORDER BY ts, id))[1] AS camp,
      (array_agg(cont ORDER BY ts, id))[1] AS cont,
      (array_agg(term ORDER BY ts, id))[1] AS term,
      (array_agg(device ORDER BY ts, id) FILTER (WHERE device IS NOT NULL))[1] AS device,
      (array_agg(browser ORDER BY ts, id) FILTER (WHERE browser IS NOT NULL))[1] AS browser,
      (array_agg(os ORDER BY ts, id) FILTER (WHERE os IS NOT NULL))[1] AS os,
      (array_agg(locale ORDER BY ts, id) FILTER (WHERE locale IS NOT NULL))[1] AS locale,
      (array_agg(category ORDER BY ts, id) FILTER (WHERE category IS NOT NULL))[1] AS category,
      (array_agg(service ORDER BY ts, id) FILTER (WHERE service IS NOT NULL))[1] AS service
    FROM nid
    GROUP BY visitor, visit_no
  ),
  first_seen AS (
    SELECT "sessionId" AS visitor, min("createdAt") AS first_at FROM analytics_events WHERE "sessionId" IS NOT NULL GROUP BY 1
  ),
  base AS (
    SELECT r.sess_id, r.visitor, r.visit_no, r.started_at, r.ended_at,
      EXTRACT(EPOCH FROM (r.ended_at - r.started_at))::float8 AS duration_s,
      r.pageviews, r.names, r.viewed_service, r.used_calc, r.clicked_cta, r.form_started, r.submitted, r.wa, r.phone,
      (r.interacted OR r.pageviews >= 2 OR EXTRACT(EPOCH FROM (r.ended_at - r.started_at)) >= 10) AS engaged,
      COALESCE(NULLIF(r.src, ''), '(not set)') AS source,
      COALESCE(NULLIF(r.med, ''), '(not set)') AS medium,
      COALESCE(NULLIF(r.camp, ''), '(not set)') AS campaign,
      COALESCE(NULLIF(r.cont, ''), '(not set)') AS content,
      COALESCE(NULLIF(r.term, ''), '(not set)') AS term,
      COALESCE(r.landing_path, '(not set)') AS landing,
      COALESCE(regexp_replace(r.landing_path, '^/(fa|de|ru)(/|$)', '/'), '(not set)') AS landing_group,
      COALESCE(r.device, '(not set)') AS device,
      COALESCE(r.browser, '(not set)') AS browser,
      COALESCE(r.os, '(not set)') AS os,
      COALESCE(r.locale, '(not set)') AS locale,
      COALESCE(r.category, '(not set)') AS category,
      COALESCE(r.service, '(not set)') AS service,
      CASE WHEN fs.first_at >= r.started_at - interval '1 second' THEN 'new' ELSE 'returning' END AS visitor_type
    FROM raw r JOIN first_seen fs ON fs.visitor = r.visitor
  ),
  sess AS (
    SELECT base.*, ${Prisma.raw(CHANNEL_SQL)} AS channel FROM base
  )`;
}

/** WHERE over `sess` for the dimension / landing-text / event filters. Values are bound parameters. */
export function sessionWhere(f: AnalyticsFilters): Prisma.Sql {
  const parts: Prisma.Sql[] = [];
  for (const d of DIMENSION_KEYS) {
    const v = f.dims[d];
    if (v) parts.push(Prisma.sql`${Prisma.raw(`"${d}"`)} = ${v}`);
  }
  if (f.landingQ) parts.push(Prisma.sql`landing ILIKE ${`%${f.landingQ}%`}`);
  if (f.events.length) parts.push(Prisma.sql`names && ARRAY[${Prisma.join(f.events)}]::text[]`);
  return parts.length ? Prisma.join(parts, " AND ") : Prisma.sql`true`;
}

const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

// ============================================================ CRM leads

/** Lead-side SQL expression per dimension the leads table can answer; others return null. */
function leadDimExpr(dim: Dim, attribution: Attribution): string | null {
  const norm = (c: "Source" | "Medium" | "Campaign" | "Term" | "Content") => `COALESCE(NULLIF(${attrCol("l", attribution, c)}, ''), '(not set)')`;
  const medium = norm("Medium");
  switch (dim) {
    case "source": return norm("Source");
    case "medium": return medium;
    case "campaign": return norm("Campaign");
    case "content": return norm("Content");
    case "term": return norm("Term");
    case "channel":
      return channelSql(`(${medium})`);
    case "locale": return `COALESCE(l.locale::text, '(not set)')`;
    case "category": return `COALESCE(l.category, '(not set)')`;
    case "service": return `COALESCE(l."serviceSlug", '(not set)')`;
    default: return null;
  }
}

/** True when every active dimension filter can be applied to leads (so a CRM lead count is honest). */
function leadsAnswerable(f: AnalyticsFilters): boolean {
  if (f.landingQ || f.events.length) return false;
  return (Object.keys(f.dims) as Dim[]).every((d) => leadDimExpr(d, f.attribution) !== null);
}

function leadsWhere(f: AnalyticsFilters, range: DateRange): Prisma.Sql {
  const parts: Prisma.Sql[] = [Prisma.sql`l."createdAt" >= ${tsFrom(range.from)}`, Prisma.sql`l."createdAt" < ${tsToExclusive(range.to)}`];
  for (const d of Object.keys(f.dims) as Dim[]) {
    const expr = leadDimExpr(d, f.attribution);
    if (expr) parts.push(Prisma.sql`${Prisma.raw(expr)} = ${f.dims[d]!}`);
  }
  return Prisma.join(parts, " AND ");
}

// =============================================================== results

export interface TotalsResult {
  values: Record<MetricKey, number>;
  leads: number | null; // null = not answerable under the active filters
}

export interface BreakdownRow {
  keys: string[]; // one per group-by dimension
  values: Partial<Record<MetricKey, number>>;
  leads: number | null;
}

export interface TrendSeries {
  name: string;
  kpi: TrendKpi;
  values: number[];
  previous?: number[];
}
export interface TrendResult {
  unit: "day" | "week" | "month";
  buckets: string[];
  series: TrendSeries[];
  /** True when CRM leads were requested but cannot be drawn under the active filters / split. */
  leadsUnavailable: boolean;
}

export interface FunnelResult {
  steps: { key: FunnelStepKey; label: string; count: number; ofFirst: number; ofPrevious: number | null }[];
  mode: "strict" | "open";
}

export interface EventRow {
  name: string;
  events: number;
  sessions: number;
}
export interface PageRow {
  path: string;
  pageviews: number;
  sessions: number;
  entrances: number;
}

export interface FilterOptions {
  dims: Record<string, { value: string; sessions: number }[]>;
  events: string[];
}

export interface AnalyticsReport {
  filters: AnalyticsFilters;
  range: DateRange;
  previous: DateRange;
  totals: TotalsResult;
  previousTotals: TotalsResult | null;
  breakdown: BreakdownRow[];
  trend: TrendResult;
  funnel: FunnelResult;
  events: EventRow[];
  pages: PageRow[];
  options: FilterOptions;
  trackedSince: string | null;
}

const metricsSelect = (keys: readonly MetricKey[]): Prisma.Sql => Prisma.raw(keys.map((k) => `${METRICS[k].sql} AS "${k}"`).join(",\n      "));

export async function totalsFor(f: AnalyticsFilters, range: DateRange): Promise<TotalsResult> {
  const keys = METRIC_KEYS;
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    WITH ${sessionsCte(range, f.attribution)},
    filtered AS (SELECT * FROM sess WHERE ${sessionWhere(f)})
    SELECT ${metricsSelect(keys)} FROM filtered`);
  const row = rows[0] ?? {};
  const values = Object.fromEntries(keys.map((k) => [k, num(row[k])])) as Record<MetricKey, number>;

  let leads: number | null = null;
  if (leadsAnswerable(f)) {
    const r = await prisma.$queryRaw<{ n: bigint }[]>(Prisma.sql`SELECT count(*) AS n FROM leads l WHERE ${leadsWhere(f, range)}`);
    leads = num(r[0]?.n);
  }
  return { values, leads };
}

export async function breakdownFor(f: AnalyticsFilters, range: DateRange): Promise<BreakdownRow[]> {
  const dims = f.groupBy;
  const dimCols = Prisma.raw(dims.map((d) => `"${d}"`).join(", "));
  const metricKeys = [...new Set<MetricKey>([...f.metrics, ...(METRIC_KEYS as readonly MetricKey[]).filter((k) => k === f.sort)])];
  const sortKey = f.sort;
  const sortIsMetric = (METRIC_KEYS as readonly string[]).includes(sortKey);
  const sortIsDim = (DIMENSION_KEYS as readonly string[]).includes(sortKey) && dims.includes(sortKey as Dim);
  const orderBy = sortIsMetric
    ? Prisma.raw(`"${sortKey}" ${f.dir === "asc" ? "ASC" : "DESC"} NULLS LAST, "sessions" DESC`)
    : sortIsDim
      ? Prisma.raw(`"${sortKey}" ${f.dir === "asc" ? "ASC" : "DESC"}`)
      : Prisma.raw(`"sessions" DESC`);
  const selectKeys = [...new Set<MetricKey>([...metricKeys, "sessions"])];

  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    WITH ${sessionsCte(range, f.attribution)},
    filtered AS (SELECT * FROM sess WHERE ${sessionWhere(f)})
    SELECT ${dimCols}, ${metricsSelect(selectKeys)}
    FROM filtered
    GROUP BY ${dimCols}
    ORDER BY ${orderBy}
    LIMIT ${MAX_GROUP_ROWS}`);

  // CRM leads under the same grouping, when every group-by dim and filter is answerable from the leads table.
  const leadExprs = dims.map((d) => leadDimExpr(d, f.attribution));
  const leadsOk = leadsAnswerable(f) && leadExprs.every((x) => x !== null);
  const leadMap = new Map<string, number>();
  if (leadsOk) {
    const sel = Prisma.raw(leadExprs.map((x, i) => `${x} AS "g${i}"`).join(", "));
    const grp = Prisma.raw(leadExprs.map((_, i) => `"g${i}"`).join(", "));
    const lrows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      SELECT ${sel}, count(*) AS n FROM leads l WHERE ${leadsWhere(f, range)} GROUP BY ${grp}`);
    for (const r of lrows) leadMap.set(dims.map((_, i) => String(r[`g${i}`])).join("\u0001"), num(r.n));
  }

  const out: BreakdownRow[] = rows.map((r) => {
    const keys = dims.map((d) => String(r[d]));
    const values: Partial<Record<MetricKey, number>> = {};
    for (const k of selectKeys) values[k] = num(r[k]);
    return { keys, values, leads: leadsOk ? (leadMap.get(keys.join("\u0001")) ?? 0) : null };
  });

  // Groups that have CRM leads but no tracked sessions (e.g. visitors who never accepted cookies) would vanish
  // from a sessions-first query — add them so the CRM column is complete.
  if (leadsOk) {
    const seen = new Set(out.map((r) => r.keys.join("\u0001")));
    for (const [k, n] of leadMap) {
      if (!seen.has(k) && out.length < MAX_GROUP_ROWS) out.push({ keys: k.split("\u0001"), values: {}, leads: n });
    }
    if (sortKey === LEADS_KEY) out.sort((a, b) => (f.dir === "asc" ? 1 : -1) * ((a.leads ?? 0) - (b.leads ?? 0)));
  }
  return out;
}

function bucketList(range: DateRange, unit: "day" | "week" | "month"): string[] {
  const out: string[] = [];
  const start = new Date(`${range.from}T00:00:00Z`);
  const end = new Date(`${range.to}T00:00:00Z`);
  const d = new Date(start);
  if (unit === "week") d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); // Monday, matching Postgres date_trunc('week')
  if (unit === "month") d.setUTCDate(1);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    if (unit === "day") d.setUTCDate(d.getUTCDate() + 1);
    else if (unit === "week") d.setUTCDate(d.getUTCDate() + 7);
    else d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

export function pickUnit(f: AnalyticsFilters, days: number): "day" | "week" | "month" {
  if (f.trendUnit !== "auto") return f.trendUnit;
  return days <= 45 ? "day" : days <= 200 ? "week" : "month";
}

export async function trendFor(f: AnalyticsFilters, range: DateRange, previous: DateRange | null, topSplitValues: string[] | null): Promise<TrendResult> {
  const unit = pickUnit(f, range.days);
  const buckets = bucketList(range, unit);
  const sessionKpis = f.trendKpis.filter((k): k is Exclude<TrendKpi, "leads_crm"> => k !== LEADS_KEY);
  const wantLeads = f.trendKpis.includes(LEADS_KEY);
  const split = f.trendSplit && topSplitValues ? f.trendSplit : "";
  // With a split, only the first KPI is drawn (one line per split value) — several KPIs × several values is unreadable.
  const kpis = split ? f.trendKpis.slice(0, 1) : f.trendKpis;
  // `unit` is one of "day" | "week" | "month" (pickUnit) — never request text.
  const bucketExpr = (col: string) => Prisma.raw(`date_trunc('${unit}', (${col} AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')::date`);

  async function sessionSeries(r: DateRange): Promise<Map<string, Record<string, unknown>[]>> {
    const keys = [...new Set<MetricKey>(sessionKpis.filter((k) => kpis.includes(k)) as MetricKey[])];
    const out = new Map<string, Record<string, unknown>[]>();
    if (keys.length === 0) return out;
    const splitSel = split ? Prisma.sql`, CASE WHEN ${Prisma.raw(`"${split}"`)} IN (${Prisma.join(topSplitValues!)}) THEN ${Prisma.raw(`"${split}"`)} ELSE 'Other' END AS grp` : Prisma.sql`, 'all' AS grp`;
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      WITH ${sessionsCte(r, f.attribution)},
      filtered AS (SELECT * FROM sess WHERE ${sessionWhere(f)})
      SELECT ${bucketExpr("started_at")}::text AS bucket ${splitSel}, ${metricsSelect(keys)}
      FROM filtered GROUP BY 1, 2`);
    for (const row of rows) {
      const g = String(row.grp);
      (out.get(g) ?? out.set(g, []).get(g)!).push(row);
    }
    return out;
  }

  async function leadSeries(r: DateRange): Promise<Map<string, Map<string, number>> | null> {
    if (!wantLeads || !leadsAnswerable(f)) return null;
    const splitExpr = split ? leadDimExpr(split, f.attribution) : "'all'";
    if (!splitExpr) return null;
    const grpSel = split
      ? Prisma.sql`CASE WHEN (${Prisma.raw(splitExpr)}) IN (${Prisma.join(topSplitValues!)}) THEN (${Prisma.raw(splitExpr)}) ELSE 'Other' END`
      : Prisma.sql`'all'`;
    const rows = await prisma.$queryRaw<{ bucket: string; grp: string; n: bigint }[]>(Prisma.sql`
      SELECT ${bucketExpr('l."createdAt"')}::text AS bucket, ${grpSel} AS grp, count(*) AS n
      FROM leads l WHERE ${leadsWhere(f, r)} GROUP BY 1, 2`);
    const out = new Map<string, Map<string, number>>();
    for (const row of rows) (out.get(row.grp) ?? out.set(row.grp, new Map()).get(row.grp)!).set(row.bucket, num(row.n));
    return out;
  }

  const [cur, leadsCur] = await Promise.all([sessionSeries(range), leadSeries(range)]);
  const [prev, leadsPrev] = previous && !split ? await Promise.all([sessionSeries(previous), leadSeries(previous)]) : [null, null];

  const prevBuckets = previous ? bucketList(previous, unit) : [];
  const series: TrendSeries[] = [];
  const groups = split ? [...topSplitValues!, "Other"] : ["all"];

  const fill = (rows: Record<string, unknown>[] | undefined, kpi: MetricKey, list: string[]): number[] => {
    const m = new Map((rows ?? []).map((r) => [String(r.bucket), num(r[kpi])]));
    return list.map((b) => m.get(b) ?? 0);
  };

  for (const kpi of kpis) {
    for (const g of groups) {
      const name = split ? g : kpi === LEADS_KEY ? LEADS_LABEL : METRICS[kpi as MetricKey].label;
      if (kpi === LEADS_KEY) {
        if (!leadsCur) continue;
        const m = leadsCur.get(g);
        series.push({
          name,
          kpi,
          values: buckets.map((b) => m?.get(b) ?? 0),
          previous: leadsPrev ? prevBuckets.map((b) => leadsPrev.get(g)?.get(b) ?? 0) : undefined,
        });
      } else {
        const rows = cur.get(g);
        if (split && !rows) continue;
        series.push({
          name,
          kpi,
          values: fill(rows, kpi as MetricKey, buckets),
          previous: prev ? fill(prev.get(g), kpi as MetricKey, prevBuckets) : undefined,
        });
      }
    }
  }

  return { unit, buckets, series, leadsUnavailable: wantLeads && (!leadsCur || (!!split && !leadDimExpr(split, f.attribution))) };
}

export async function funnelFor(f: AnalyticsFilters, range: DateRange): Promise<FunnelResult> {
  const steps = f.funnelSteps;
  // open (default): each step counted on its own — a form can be started on /contact without ever seeing a service page.
  // strict: a session counts at step k only if it also met every earlier chosen step.
  const conds = steps.map((s, i) => (f.funnelMode === "strict" ? steps.slice(0, i + 1).map((x) => `(${FUNNEL_STEPS[x].where})`).join(" AND ") : FUNNEL_STEPS[s].where));
  const select = Prisma.raw(conds.map((c, i) => `count(*) FILTER (WHERE ${c}) AS "s${i}"`).join(", "));
  const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
    WITH ${sessionsCte(range, f.attribution)},
    filtered AS (SELECT * FROM sess WHERE ${sessionWhere(f)})
    SELECT ${select} FROM filtered`);
  const row = rows[0] ?? {};
  const counts = steps.map((_, i) => num(row[`s${i}`]));
  const first = counts[0] || 0;
  return {
    mode: f.funnelMode,
    steps: steps.map((key, i) => ({
      key,
      label: FUNNEL_STEPS[key].label,
      count: counts[i],
      ofFirst: first > 0 ? counts[i] / first : 0,
      ofPrevious: i === 0 ? null : counts[i - 1] > 0 ? counts[i] / counts[i - 1] : null,
    })),
  };
}

export async function eventsAndPages(f: AnalyticsFilters, range: DateRange): Promise<{ events: EventRow[]; pages: PageRow[] }> {
  // Events are counted INSIDE the filtered sessions, so every dimension filter applies exactly as it does to the KPIs.
  const filteredIds = Prisma.sql`(SELECT sess_id FROM sess WHERE ${sessionWhere(f)})`;
  const [events, pages] = await Promise.all([
    prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      WITH ${sessionsCte(range, f.attribution)}
      SELECT n.name, count(*) AS events, count(distinct n.sess_id) AS sessions
      FROM nid n WHERE n.sess_id IN ${filteredIds}
      GROUP BY n.name ORDER BY count(*) DESC`),
    prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      WITH ${sessionsCte(range, f.attribution)},
      fl AS (SELECT sess_id, landing FROM sess WHERE ${sessionWhere(f)}),
      pv AS (
        SELECT n.path, count(*) AS pageviews, count(distinct n.sess_id) AS sessions
        FROM nid n WHERE n.name = 'page_view' AND n.path IS NOT NULL AND n.sess_id IN (SELECT sess_id FROM fl)
        GROUP BY n.path
      ),
      ent AS (SELECT landing AS path, count(*) AS entrances FROM fl GROUP BY landing)
      SELECT pv.path, pv.pageviews, pv.sessions, coalesce(ent.entrances, 0) AS entrances
      FROM pv LEFT JOIN ent ON ent.path = pv.path ORDER BY pv.pageviews DESC LIMIT 30`),
  ]);
  return {
    events: events.map((r) => ({ name: String(r.name), events: num(r.events), sessions: num(r.sessions) })),
    pages: pages.map((r) => ({ path: String(r.path), pageviews: num(r.pageviews), sessions: num(r.sessions), entrances: num(r.entrances) })),
  };
}

export async function filterOptions(f: AnalyticsFilters, range: DateRange): Promise<FilterOptions> {
  // Options come from ALL sessions in the date range (no dimension filters), so a select never narrows to its own current value.
  const unions = DIMENSION_KEYS.map((d) => `SELECT '${d}' AS dim, "${d}" AS value, count(*) AS sessions FROM sess GROUP BY "${d}"`).join("\nUNION ALL\n");
  const [rows, names] = await Promise.all([
    prisma.$queryRaw<{ dim: string; value: string; sessions: bigint }[]>(Prisma.sql`
      WITH ${sessionsCte(range, f.attribution)}
      SELECT * FROM (${Prisma.raw(unions)}) x ORDER BY dim, sessions DESC`),
    prisma.$queryRaw<{ name: string }[]>(Prisma.sql`SELECT DISTINCT name FROM analytics_events WHERE "sessionId" IS NOT NULL ORDER BY 1`),
  ]);
  const dims: FilterOptions["dims"] = {};
  for (const r of rows) {
    const list = (dims[r.dim] ??= []);
    if (list.length < FILTER_OPTION_LIMIT) list.push({ value: String(r.value), sessions: num(r.sessions) });
  }
  return { dims, events: names.map((n) => n.name) };
}

export async function buildReport(f: AnalyticsFilters): Promise<AnalyticsReport> {
  const { range, previous } = resolveRange(f);

  // Top split values first (the trend needs them to bucket the rest as "Other").
  let topSplit: string[] | null = null;
  if (f.trendSplit) {
    const rows = await prisma.$queryRaw<Record<string, unknown>[]>(Prisma.sql`
      WITH ${sessionsCte(range, f.attribution)},
      filtered AS (SELECT * FROM sess WHERE ${sessionWhere(f)})
      SELECT ${Prisma.raw(`"${f.trendSplit}"`)} AS v, count(*) AS n FROM filtered GROUP BY 1 ORDER BY 2 DESC LIMIT ${TREND_SPLIT_TOP}`);
    topSplit = rows.map((r) => String(r.v));
    if (topSplit.length === 0) topSplit = null;
  }

  const [totals, previousTotals, breakdown, trend, funnel, ep, options, since] = await Promise.all([
    totalsFor(f, range),
    f.compare ? totalsFor(f, previous) : Promise.resolve(null),
    breakdownFor(f, range),
    trendFor(f, range, f.compare ? previous : null, topSplit),
    funnelFor(f, range),
    eventsAndPages(f, range),
    filterOptions(f, range),
    prisma.$queryRaw<{ d: Date | null }[]>(Prisma.sql`SELECT min("createdAt") AS d FROM analytics_events WHERE "sessionId" IS NOT NULL`),
  ]);

  return {
    filters: f,
    range,
    previous,
    totals,
    previousTotals,
    breakdown,
    trend,
    funnel,
    events: ep.events,
    pages: ep.pages,
    options,
    trackedSince: since[0]?.d ? since[0].d.toISOString().slice(0, 10) : null,
  };
}

// ============================================================= formatting

export function kpiFormat(kpi: TrendKpi): ValueFormat {
  return kpi === LEADS_KEY ? "int" : METRICS[kpi].format;
}

// ================================================================ links

/**
 * The querystring that reproduces `f` — used for every link on the page
 * (presets, sort headers, CSV export) so clicking one never resets the
 * other filters. `overrides` replaces or (when undefined) removes keys.
 */
export function filtersToQuery(f: AnalyticsFilters, overrides: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams();
  q.set("p", f.preset);
  if (f.preset === "custom") {
    if (f.from) q.set("from", f.from);
    if (f.to) q.set("to", f.to);
  }
  if (f.compare) q.set("cmp", "1");
  if (f.attribution !== "visit") q.set("attr", f.attribution);
  for (const [d, v] of Object.entries(f.dims)) if (v) q.set(`f_${d}`, v);
  if (f.landingQ) q.set("lq", f.landingQ);
  if (f.events.length) q.set("ev", f.events.join(","));
  // Only what differs from the defaults goes in the URL, so shared links stay short and readable.
  const base = parseFilters({});
  const setIfChanged = (key: string, value: string, def: string) => {
    if (value !== def) q.set(key, value);
  };
  setIfChanged("gb", f.groupBy.join(","), base.groupBy.join(","));
  setIfChanged("m", f.metrics.join(","), base.metrics.join(","));
  setIfChanged("sort", f.sort, base.sort);
  setIfChanged("dir", f.dir, base.dir);
  setIfChanged("k", f.trendKpis.join(","), base.trendKpis.join(","));
  if (f.trendSplit) q.set("split", f.trendSplit);
  if (f.trendUnit !== "auto") q.set("unit", f.trendUnit);
  setIfChanged("fs", f.funnelSteps.join(","), base.funnelSteps.join(","));
  if (f.funnelMode === "strict") q.set("fm", "strict");
  if (f.srcDim !== "channel") q.set("src", f.srcDim);
  if (f.devDim !== "device") q.set("dev", f.devDim);
  if (f.adv) q.set("adv", "1");
  for (const [k, v] of Object.entries(overrides)) {
    if (v === undefined) q.delete(k);
    else q.set(k, v);
  }
  return q.toString();
}

// ============================================================ web vitals

/** Core Web Vitals samples in the date range (the page computes p75 / "good" share from the metadata). */
export async function webVitalSamples(range: DateRange): Promise<{ metadata: unknown }[]> {
  return prisma.$queryRaw<{ metadata: unknown }[]>(Prisma.sql`
    SELECT metadata FROM analytics_events
    WHERE name = 'web_vital' AND "createdAt" >= ${tsFrom(range.from)} AND "createdAt" < ${tsToExclusive(range.to)}`);
}
