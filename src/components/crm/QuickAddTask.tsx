import { createTask } from "@/lib/task-actions";
import { getOpsI18n } from "@/lib/ops-i18n/server";

/**
 * Compact task-creation form, embeddable wherever a task should link back
 * to a specific record — pass exactly one of leadId/contractId/
 * serviceRequestId/customerId (or none, for a free-standing task on
 * /ops/tasks). Defaults the assignee to whoever's creating it, since
 * "note to self" is the common case; reassigning is a follow-up action,
 * not blocking task creation on picking someone first.
 */
export async function QuickAddTask({
  returnPath,
  leadId,
  contractId,
  serviceRequestId,
  customerId,
}: {
  returnPath: string;
  leadId?: string;
  contractId?: string;
  serviceRequestId?: string;
  customerId?: string;
}) {
  const { t } = await getOpsI18n();
  return (
    <form action={createTask} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="returnPath" value={returnPath} />
      {leadId && <input type="hidden" name="leadId" value={leadId} />}
      {contractId && <input type="hidden" name="contractId" value={contractId} />}
      {serviceRequestId && <input type="hidden" name="serviceRequestId" value={serviceRequestId} />}
      {customerId && <input type="hidden" name="customerId" value={customerId} />}
      <input
        name="title"
        placeholder={t("تسک جدید…")}
        required
        className="min-w-[10rem] flex-1 rounded-lg border border-border-strong bg-white px-3 py-2 text-xs text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
      />
      <input
        type="date"
        name="dueAt"
        className="font-latin rounded-lg border border-border-strong bg-white px-2.5 py-2 text-xs text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25"
      />
      <select name="priority" defaultValue="NORMAL" className="rounded-lg border border-border-strong bg-white px-2 py-2 text-xs font-medium text-purple-900">
        <option value="LOW">{t("کم")}</option>
        <option value="NORMAL">{t("عادی")}</option>
        <option value="HIGH">{t("بالا")}</option>
        <option value="URGENT">{t("فوری")}</option>
      </select>
      <button type="submit" className="press rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white hover:bg-purple-900">
        {t("افزودن")}
      </button>
    </form>
  );
}
