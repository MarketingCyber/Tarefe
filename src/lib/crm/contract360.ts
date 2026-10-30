import { prisma } from "@/lib/db";
import { rowsReferencing, type CrmRow } from "@/lib/crm/customer360";

/**
 * Contract 360: one old-CRM contract (Dynamics opportunity) with everything filed on it — tickets, e-mails, calls,
 * tasks, appointments, notes, points, letters, the contracts it replaces or was replaced by — via crm_records.refs.
 */
export async function loadContract(id: string) {
  const contract = (await prisma.crmRecord.findFirst({
    where: { entity: "opportunity", crmId: { equals: id, mode: "insensitive" } },
    select: { entity: true, crmId: true, data: true, crmModifiedAt: true },
  })) as CrmRow | null;
  if (!contract) return null;

  const related: Record<string, CrmRow[]> = {};
  for (const r of await rowsReferencing([contract.crmId])) {
    if (r.crmId.toLowerCase() === contract.crmId.toLowerCase()) continue;
    (related[r.entity] ??= []).push(r);
  }
  return { contract, related };
}

export type Contract360 = NonNullable<Awaited<ReturnType<typeof loadContract>>>;
