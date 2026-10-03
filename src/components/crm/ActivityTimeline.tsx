import { Clock } from "@phosphor-icons/react/dist/ssr";

export interface ActivityEntry {
  id: string;
  action: string;
  note: string | null;
  createdAt: Date;
  actor: { name: string } | null;
}

const EMPTY_LABEL: Record<"en" | "fa", string> = {
  en: "No activity yet.",
  fa: "هنوز فعالیتی ثبت نشده است.",
};
const SYSTEM_LABEL: Record<"en" | "fa", string> = { en: "System", fa: "سیستم" };

/**
 * One reusable timeline, per the Phase 2 spec ("Activity Timeline should be
 * one reusable component") — renders ActivityLog rows for any entity
 * (lead, contract, application, service_request). The log has been written
 * all along (see markContacted etc.); this is the first place it's
 * actually rendered.
 */
export function ActivityTimeline({ entries, locale = "en" }: { entries: ActivityEntry[]; locale?: "en" | "fa" }) {
  if (entries.length === 0) {
    return <p className="text-sm text-secondary">{EMPTY_LABEL[locale]}</p>;
  }

  return (
    <ol className="space-y-4" dir={locale === "fa" ? "rtl" : "ltr"}>
      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-3 ps-1">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-purple-600">
            <Clock size={12} weight="bold" />
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm text-body">{entry.note ?? entry.action}</p>
            <p className="font-latin mt-0.5 text-xs text-secondary">
              {entry.actor?.name ?? SYSTEM_LABEL[locale]} ·{" "}
              {entry.createdAt.toLocaleString(locale === "fa" ? "fa-IR" : "en-GB", { calendar: "gregory" })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
