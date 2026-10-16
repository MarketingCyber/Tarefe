/**
 * One definition of "which marketing channel is this?", used by BOTH the
 * analytics SQL (analytics-report.ts builds its CASE expression from these
 * lists) and the CRM lead pages (channelOf) — so a lead and the dashboard can
 * never disagree about whether something is Paid, Organic or Direct.
 *
 * The channel is decided by the MEDIUM only, case-insensitively. The client
 * (lib/analytics.ts) always stamps a medium: a UTM medium if the link had one,
 * "cpc" for a Google Ads click id, "organic" / "social" / "referral" from the
 * referrer, and "(none)" for a direct visit.
 */
export const CHANNEL_MEDIUMS: readonly (readonly [channel: string, mediums: readonly string[]])[] = [
  ["Direct", ["(none)"]],
  ["Organic Search", ["organic"]],
  ["Social", ["social", "social-network", "sm", "organic-social"]],
  ["Paid", ["cpc", "ppc", "paid", "paidsearch", "paid-search", "paid-social", "paidsocial", "paid_social", "display", "cpm", "cpv", "banner", "sem", "retargeting"]],
  ["Email", ["email", "e-mail", "newsletter"]],
  ["Referral", ["referral"]],
];

export const NOT_SET = "(not set)";

/** Channel for a medium value. Empty / missing medium → "(not set)"; an unrecognised medium → "Other". */
export function channelOf(medium: string | null | undefined): string {
  const m = (medium ?? "").trim().toLowerCase();
  if (!m || m === NOT_SET) return NOT_SET;
  for (const [channel, mediums] of CHANNEL_MEDIUMS) if (mediums.includes(m)) return channel;
  return "Other";
}

/** SQL CASE expression equivalent to channelOf() over a medium column / expression (values are fixed literals, never user input). */
export function channelSql(mediumExpr: string): string {
  const whens = CHANNEL_MEDIUMS.map(([channel, mediums]) => `  WHEN lower(${mediumExpr}) IN (${mediums.map((x) => `'${x}'`).join(", ")}) THEN '${channel}'`).join("\n");
  return `CASE\n  WHEN lower(${mediumExpr}) = '${NOT_SET}' THEN '${NOT_SET}'\n${whens}\n  ELSE 'Other' END`;
}
