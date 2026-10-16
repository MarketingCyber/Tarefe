/**
 * Pure number formatting for the analytics UI — kept apart from the query
 * engine (analytics-report.ts) because client components (the hoverable
 * trend chart) need these and must never import the engine: it pulls in the
 * database client.
 */
export type ValueFormat = "int" | "decimal" | "percent" | "duration";

export function formatValue(format: ValueFormat, v: number): string {
  if (!Number.isFinite(v)) return "—";
  switch (format) {
    case "int":
      return Math.round(v).toLocaleString("en-US");
    case "decimal":
      return v.toFixed(2);
    case "percent":
      return `${(v * 100).toFixed(1)}%`;
    case "duration": {
      const s = Math.round(v);
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60);
      return `${m}m ${String(s % 60).padStart(2, "0")}s`;
    }
  }
}

/** Compact axis-tick form: 1,200 → 1.2K. Rates and durations keep their normal form (they are already short). */
export function formatTick(format: ValueFormat, v: number): string {
  if (format === "int" || format === "decimal") {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `${+(v / 1_000_000).toFixed(1)}M`;
    if (abs >= 10_000) return `${Math.round(v / 1000)}K`;
    if (abs >= 1_000) return `${+(v / 1000).toFixed(1)}K`;
    return format === "decimal" ? +v.toFixed(1) + "" : String(Math.round(v));
  }
  if (format === "percent") return `${+(v * 100).toFixed(1)}%`;
  return formatValue(format, v);
}
