import { prisma } from "@/lib/db";
import type { Action, Automation } from "@/lib/automations/shadow";

/**
 * Dynamics' Vertragsende reminder, found while testing the Kündigungsfrist one: on a contract's end date
 * (new_dateend) "System Administrator" creates a task "Sonstig-Vertragsende " — «قرارداد مربوطه تاریخ اتمامش رسید.
 * لطفا برسی کن …» (check whether it ended or was renewed, and update it) — about the contract, for its customer,
 * owned by the contract's owner. Unlike the Kündigungsfrist task it leaves the task's customer field empty (all 221
 * checked in the first 30 days), so the customer isn't compared. Seen on Won and active contracts (state 1 / 0).
 */

export const vertragsende: Automation = {
  key: "vertragsende",
  label: "یادآوری پایان قرارداد (Vertragsende)",
  description: "روز پایان هر قرارداد (تاریخ اتمام)، یک تسک «Sonstig-Vertragsende» برای مسئول قرارداد، تا بررسی کند قرارداد تمام شده یا تمدید شده.",
  planFromHour: 5,
  checkFromHour: 7,
  compare: ["ownerId"],

  async plan(day: string): Promise<Action[]> {
    const rows = await prisma.$queryRaw<{ crmId: string; data: Record<string, unknown>; state: number | null }[]>`
      SELECT "crmId", data, state FROM crm_records
      WHERE entity = 'opportunity' AND "deletedAt" IS NULL AND state IN (0, 1) AND data->>'new_dateend' IS NOT NULL
        AND ((data->>'new_dateend')::timestamptz AT TIME ZONE 'Europe/Berlin')::date = ${day}::date`;
    return rows.map((r) => ({
      key: r.crmId.toLowerCase(),
      name: String(r.data.name ?? "").trim() || "قرارداد",
      fields: {
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
        AND data->>'description' LIKE '%تاریخ اتمامش رسید%'
        AND ((data->>'createdon')::timestamptz AT TIME ZONE 'Europe/Berlin')::date = ${day}::date`;
    return rows.map((r) => ({
      key: lower(r.data._regardingobjectid_value) ?? r.crmId,
      name: String(r.data["_regardingobjectid_value@OData.Community.Display.V1.FormattedValue"] ?? r.data.subject ?? "").trim(),
      fields: { ownerId: lower(r.data._ownerid_value), customerId: lower(r.data._new_customer_value), taskId: r.crmId.toLowerCase() },
    }));
  },
};

function lower(v: unknown): string | null {
  return typeof v === "string" ? v.toLowerCase() : null;
}
