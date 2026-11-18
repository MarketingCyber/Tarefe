import { cache } from "react";
import { prisma } from "@/lib/db";
import type { T } from "@/lib/ops-i18n/core";

/**
 * Lead score («امتیاز سرنخ»): an estimate of how likely an open lead is to become a contract, learned from the old
 * CRM's own history (no hand-made weights): the conversion rate of leads from the same source («منبع») and for the
 * same contract type («نوع قرارداد») over the last 12 months, each smoothed towards the overall rate so a source with
 * few leads doesn't swing it. Then adjusted for what operators see on the lead: contact details complete, how old it
 * is, and how many unanswered call attempts it already had. Shown as a percentage with its reasons, never as a fact.
 */

const F = "@OData.Community.Display.V1.FormattedValue";
const SMOOTHING = 10; // leads' worth of the overall rate mixed into each group's rate
type Data = Record<string, unknown>;
type Rates = { overall: number; bySource: Map<string, number>; byType: Map<string, number>; sample: number };

/** Conversion rates of the last 12 months, once per request. */
export const conversionRates = cache(async (): Promise<Rates> => {
  const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
  const rows = await prisma.$queryRaw<{ source: string | null; type: string | null; n: bigint; won: bigint }[]>`
    SELECT data->>${`leadsourcecode${F}`} AS source, data->>${`_new_type_value${F}`} AS type,
           count(*) AS n, count(*) FILTER (WHERE state = 1) AS won
    FROM crm_records WHERE entity = 'lead' AND "deletedAt" IS NULL AND state IN (1, 2) AND data->>'createdon' >= ${since}
    GROUP BY 1, 2`;
  const total = rows.reduce((a, r) => a + Number(r.n), 0);
  const won = rows.reduce((a, r) => a + Number(r.won), 0);
  const overall = total ? won / total : 0.2;
  const group = (key: "source" | "type") => {
    const sums = new Map<string, { n: number; won: number }>();
    for (const r of rows) {
      const k = r[key] ?? "—";
      const s = sums.get(k) ?? { n: 0, won: 0 };
      s.n += Number(r.n);
      s.won += Number(r.won);
      sums.set(k, s);
    }
    return new Map([...sums].map(([k, s]) => [k, (s.won + overall * SMOOTHING) / (s.n + SMOOTHING)]));
  };
  return { overall, bySource: group("source"), byType: group("type"), sample: total };
});

/** One reason behind a score: a Persian template (translated by the CRM language switch) and its values. */
export type ScoreReason = { fa: string; vars?: Record<string, string | number> };
export type LeadScore = { score: number; tier: "hot" | "warm" | "cold"; reasons: ScoreReason[] };

/** A reason as text in the staff member's CRM language (numbers formatted with `intl`). */
export function reasonText(r: ScoreReason, t: T, intl: string): string {
  const vars = Object.fromEntries(Object.entries(r.vars ?? {}).map(([k, v]) => [k, typeof v === "number" ? v.toLocaleString(intl) : t(v)]));
  return t(r.fa, vars);
}
export const TIER_FA = { hot: "داغ", warm: "خوب", cold: "سرد" } as const;


/** Score of one open lead. `attempts` = unanswered calls already logged. */
export function scoreLead(d: Data, rates: Rates, attempts = 0): LeadScore {
  const reasons: ScoreReason[] = [];
  const source = String(d[`leadsourcecode${F}`] ?? "—");
  const type = String(d[`_new_type_value${F}`] ?? "—");
  const ps = rates.bySource.get(source) ?? rates.overall;
  const pt = rates.byType.get(type) ?? rates.overall;
  let p = rates.overall > 0 ? (ps * pt) / rates.overall : 0;
  reasons.push({ fa: "منبع «{source}»: {p}٪ تبدیل", vars: { source, p: Math.round(ps * 100) } }, { fa: "نوع «{type}»: {p}٪ تبدیل", vars: { type, p: Math.round(pt * 100) } });

  const hasPhone = typeof d.mobilephone === "string" || typeof d.telephone1 === "string";
  const hasEmail = typeof d.emailaddress1 === "string";
  if (hasPhone && hasEmail) {
    p *= 1.1;
    reasons.push({ fa: "موبایل و ایمیل کامل" });
  } else if (!hasPhone) {
    p *= 0.6;
    reasons.push({ fa: "بدون شماره تماس" });
  }
  const ageDays = typeof d.createdon === "string" ? (Date.now() - Date.parse(d.createdon)) / 86_400_000 : 0;
  if (ageDays > 90) {
    p *= 0.4;
    reasons.push({ fa: "بیش از ۳ ماه پیش ثبت شده" });
  } else if (ageDays > 30) {
    p *= 0.7;
    reasons.push({ fa: "بیش از یک ماه پیش ثبت شده" });
  }
  if (attempts > 0) {
    p *= 0.85 ** attempts;
    reasons.push({ fa: "{n} تماس بی‌پاسخ", vars: { n: attempts } });
  }

  const score = Math.max(1, Math.min(95, Math.round(p * 100)));
  const tier = p >= rates.overall * 1.5 ? "hot" : p >= rates.overall * 0.8 ? "warm" : "cold";
  return { score, tier, reasons };
}
