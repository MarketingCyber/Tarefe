import { prisma } from "@/lib/db";
import { rowsReferencing, type CrmRow } from "@/lib/crm/customer360";

/**
 * One old-CRM record (a contract = Dynamics opportunity, a ticket = incident …) with everything filed on it —
 * tickets, e-mails, calls, tasks, appointments, notes, points, letters, related contracts — via crm_records.refs.
 * Used by Contract 360 (/ops/contracts/[id]) and the old-CRM ticket view (/ops/tickets/[id]).
 */
export async function loadWithRelated(entity: string, id: string) {
  const record = (await prisma.crmRecord.findFirst({
    where: { entity, crmId: { equals: id, mode: "insensitive" } },
    select: { entity: true, crmId: true, data: true, crmModifiedAt: true },
  })) as CrmRow | null;
  if (!record) return null;

  const related: Record<string, CrmRow[]> = {};
  for (const r of await rowsReferencing([record.crmId])) {
    if (r.crmId.toLowerCase() === record.crmId.toLowerCase()) continue;
    (related[r.entity] ??= []).push(r);
  }
  return { record, related };
}
