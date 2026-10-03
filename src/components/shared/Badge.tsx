export type BadgeTone = "neutral" | "purple" | "success" | "warning" | "danger";

const TONE_STYLE: Record<BadgeTone, string> = {
  neutral: "bg-tint text-body",
  purple: "bg-purple-600/10 text-purple-600",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

/**
 * Phase 2.3's "Badges" — every ops/CRM list and detail page (leads,
 * tickets, contracts, applications, customers, tasks) was hand-rolling the
 * identical `rounded-full px-2.5 py-0.5 text-[11px] font-medium ${...}`
 * pill with its own local color map (8 near-identical copies found before
 * this existed). What stays page-local is the *meaning* — which status
 * maps to which tone is business logic (e.g. "CANCELLED is a danger") —
 * this component only owns what a tone *looks like*.
 */
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TONE_STYLE[tone]}`}>{children}</span>;
}
