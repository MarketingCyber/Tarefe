import { Clock } from "@phosphor-icons/react/dist/ssr";

import { getOpsI18n } from "@/lib/ops-i18n/server";
export interface ActivityEntry {
  id: string;
  action: string;
  note: string | null;
  createdAt: Date;
  actor: { name: string } | null;
}


/**
 * One reusable timeline, per the Phase 2 spec ("Activity Timeline should be
 * one reusable component") — renders ActivityLog rows for any entity
 * (lead, contract, application, service_request). The log has been written
 * all along (see markContacted etc.); this is the first place it's
 * actually rendered.
 */
/** Staff pages only — follows the CRM language switch (fa / en / de). */
export async function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  const { t, intl } = await getOpsI18n();
  if (entries.length === 0) {
    return <p className="text-sm text-secondary">{t("هنوز فعالیتی ثبت نشده است.")}</p>;
  }

  return (
    <ol className="space-y-4">
      {entries.map((entry) => (
        <li key={entry.id} className="relative flex gap-3 ps-1">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-purple-600">
            <Clock size={12} weight="bold" />
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <p className="text-sm text-body">{entry.note ?? entry.action}</p>
            <p className="font-latin mt-0.5 text-xs text-secondary">
              {entry.actor?.name ?? t("سیستم")} ·{" "}
              {entry.createdAt.toLocaleString(intl, { calendar: "gregory" })}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
