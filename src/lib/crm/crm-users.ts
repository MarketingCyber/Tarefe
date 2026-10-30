import { prisma } from "@/lib/db";

export type CrmUser = { id: string; name: string; email: string | null; disabled: boolean };

/** The old CRM's users (Dynamics systemusers from the mirror), for owner filters; system accounts left out. */
export async function crmUsers(): Promise<CrmUser[]> {
  const rows = await prisma.crmRecord.findMany({ where: { entity: "systemuser", deletedAt: null }, select: { crmId: true, data: true } });
  return rows
    .map((r) => {
      const d = r.data as Record<string, unknown>;
      return {
        id: r.crmId.toLowerCase(),
        name: String(d.fullname ?? "").trim() || "—",
        email: typeof d.internalemailaddress === "string" ? d.internalemailaddress.trim().toLowerCase() : null,
        disabled: d.isdisabled === true,
      };
    })
    .filter((u) => !["SYSTEM", "INTEGRATION"].includes(u.name))
    .sort((a, b) => Number(a.disabled) - Number(b.disabled) || a.name.localeCompare(b.name));
}

/** A staff member's old-CRM user: the one they chose, else the one with their e-mail address. */
export function crmUserOf(staff: { email: string; crmUserId: string | null }, users: CrmUser[]): CrmUser | null {
  if (staff.crmUserId) return users.find((u) => u.id === staff.crmUserId) ?? null;
  return users.find((u) => u.email === staff.email.toLowerCase()) ?? null;
}
