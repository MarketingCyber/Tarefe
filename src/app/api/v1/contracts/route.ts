import { prisma } from "@/lib/db";
import { ok, requireUser } from "@/lib/app-api";
import { serializeContract } from "@/lib/app-conversations";

/** The customer's contracts, plus the total monthly payment (shown at the top of the Contracts screen). */
export async function GET(request: Request) {
  const user = await requireUser(request);
  if (user instanceof Response) return user;

  const contracts = await prisma.contract.findMany({
    where: { customerId: user.id, status: { not: "CANCELLED" } },
    orderBy: [{ cancellationDeadline: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
  });
  const items = contracts.map((c) => serializeContract(c, user.locale));
  const monthlyTotal = contracts
    .filter((c) => c.status === "ACTIVE" || c.status === "EXPIRING")
    .reduce((sum, c) => sum + (Number.parseFloat((c.priceMonthly ?? "").replace(",", ".")) || 0), 0);

  return ok({ contracts: items, monthlyTotal: Math.round(monthlyTotal * 100) / 100 });
}
