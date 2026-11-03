import { prisma } from "@/lib/db";
import type { Action, Automation } from "@/lib/automations/shadow";

/**
 * Dynamics' Kündigungsfrist reminder, as measured from 4,000+ of the tasks it created (2024-02 → today): every day at
 * 06:00 Berlin, "System Administrator" creates one task per contract (opportunity) whose cancellation deadline
 * (new_datelaqve) is that day — about the contract, for its customer, owned by the contract's owner, priority Normal:
 *  - stage «Aktuell T»: "Sonstig-Kündigungsfrist " — «امروز موعد لغو این قرارداد می باشد.» / "Heute ist der Termin …"
 *  - stage «Aktuell»:   "Sonstig-Kündigungsfrist-Aktuell " — «موعد لغو قرارداد اکتول رسید» / "Der Kündigungstermin …"
 * Active contracts (state 0) nearly always get one; for "Won" ones (state 1) it isn't clear yet — they're planned too,
 * and the daily comparison shows which of them Dynamics really picks.
 */

const VARIANT_AKTUELL = "aktuell";
const VARIANT_T = "aktuell-t";

type Row = { crmId: string; data: Record<string, unknown>; state: number | null };

export const kuendigungsfrist: Automation = {
  key: "kuendigungsfrist",
  label: "یادآوری مهلت لغو (Kündigungsfrist)",
  description: "هر روز ساعت ۶ صبح، برای هر قرارداد فعالی که مهلت لغوش امروز است، یک تسک «Sonstig-Kündigungsfrist» برای مسئول قرارداد.",
  planFromHour: 5,
  checkFromHour: 7,
  compare: ["variant", "ownerId", "customerId"],

  async plan(day: string): Promise<Action[]> {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT "crmId", data, state FROM crm_records
      WHERE entity = 'opportunity' AND "deletedAt" IS NULL AND state IN (0, 1)
        AND ("dueAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Europe/Berlin')::date = ${day}::date`;
    return rows.map((r) => ({
      key: r.crmId.toLowerCase(),
      name: String(r.data.name ?? "").trim() || "قرارداد",
      fields: {
        variant: r.data["new_step@OData.Community.Display.V1.FormattedValue"] === "Aktuell" ? VARIANT_AKTUELL : VARIANT_T,
        ownerId: lower(r.data._ownerid_value),
        customerId: lower(r.data._customerid_value),
        state: r.state,
        step: (r.data["new_step@OData.Community.Display.V1.FormattedValue"] as string) ?? null,
      },
    }));
  },

  async actual(day: string): Promise<Action[]> {
    const rows = await prisma.$queryRaw<{ crmId: string; data: Record<string, unknown> }[]>`
      SELECT "crmId", data FROM crm_records
      WHERE entity = 'task' AND "deletedAt" IS NULL AND (data->>'isworkflowcreated')::boolean
        AND data->>'_regardingobjectid_value@Microsoft.Dynamics.CRM.lookuplogicalname' = 'opportunity'
        -- Its two fixed texts only: the Vertragsende task (lib/automations/vertragsende.ts) mentions Kündigung too.
        AND (data->>'description' LIKE '%Termin für die Kündigung%' OR data->>'description' LIKE '%Kündigungstermin des aktuellen%')
        AND ((data->>'createdon')::timestamptz AT TIME ZONE 'Europe/Berlin')::date = ${day}::date`;
    return rows.map((r) => ({
      key: lower(r.data._regardingobjectid_value) ?? r.crmId,
      name: String(r.data["_regardingobjectid_value@OData.Community.Display.V1.FormattedValue"] ?? r.data.subject ?? "").trim(),
      fields: {
        // The description is never edited by operators (the subject often is), so it tells the variant.
        variant: String(r.data.description ?? "").includes("اکتول") ? VARIANT_AKTUELL : VARIANT_T,
        ownerId: lower(r.data._ownerid_value),
        customerId: lower(r.data._new_customer_value),
        taskId: r.crmId.toLowerCase(),
      },
    }));
  },
};

function lower(v: unknown): string | null {
  return typeof v === "string" ? v.toLowerCase() : null;
}
