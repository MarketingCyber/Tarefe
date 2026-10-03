"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "./auth";
import { prisma } from "./db";
import { canAccessContent } from "./permissions";

/** Same content-role-check pattern as every other content mutation (see faq-actions.ts). */
async function requireStaff() {
  const session = await auth();
  if (!session?.user || !canAccessContent(session.user.role)) return null;
  return session;
}

function fieldsFrom(formData: FormData) {
  const priceGuaranteeRaw = (formData.get("priceGuaranteeMonths") as string)?.trim();
  const contractDurationRaw = (formData.get("contractDurationMonths") as string)?.trim();
  return {
    kind: formData.get("kind") as "ELECTRICITY" | "GAS",
    provider: (formData.get("provider") as string)?.trim() ?? "",
    name: (formData.get("name") as string)?.trim() ?? "",
    workingPriceCtPerKwh: (formData.get("workingPriceCtPerKwh") as string)?.trim() || null,
    basePriceEurPerYear: (formData.get("basePriceEurPerYear") as string)?.trim() || null,
    bonusEur: (formData.get("bonusEur") as string)?.trim() || null,
    priceGuaranteeMonths: priceGuaranteeRaw ? Number(priceGuaranteeRaw) : null,
    contractDurationMonths: contractDurationRaw ? Number(contractDurationRaw) : null,
    highlightFa: (formData.get("highlightFa") as string)?.trim() || null,
    highlightDe: (formData.get("highlightDe") as string)?.trim() || null,
    highlightRu: (formData.get("highlightRu") as string)?.trim() || null,
    published: formData.get("published") === "on",
  };
}

export async function createEnergyTariff(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const fields = fieldsFrom(formData);
  // Price fields are now optional — a tariff can be created "bare" and get
  // its real prices from a bulk PLZ-grid upload afterward (see
  // EnergyTariffPriceRow / replaceEnergyTariffPriceRows below). Only
  // identity fields are required at creation time.
  if (!fields.provider || !fields.name) {
    redirect("/ops/energy-tariffs/new?error=missing_required");
  }

  const maxOrder = await prisma.energyTariff.aggregate({ where: { kind: fields.kind }, _max: { order: true } });
  await prisma.energyTariff.create({ data: { ...fields, order: (maxOrder._max.order ?? -1) + 1 } });

  revalidatePath("/ops/energy-tariffs");
  revalidateEnergyPublicPages();
  redirect("/ops/energy-tariffs");
}

export async function updateEnergyTariff(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const fields = fieldsFrom(formData);
  if (!fields.provider || !fields.name) {
    redirect(`/ops/energy-tariffs/${id}?error=missing_required`);
  }

  await prisma.energyTariff.update({ where: { id }, data: fields });

  revalidatePath("/ops/energy-tariffs");
  revalidateEnergyPublicPages();
  redirect("/ops/energy-tariffs");
}

export async function deleteEnergyTariff(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  await prisma.energyTariff.delete({ where: { id } });
  revalidatePath("/ops/energy-tariffs");
  revalidateEnergyPublicPages();
}

export async function toggleEnergyTariffPublished(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;
  const id = formData.get("id") as string;
  const published = formData.get("published") === "true";
  await prisma.energyTariff.update({ where: { id }, data: { published: !published } });
  revalidatePath("/ops/energy-tariffs");
  revalidateEnergyPublicPages();
}

/** Swaps `order` with the adjacent item within the same kind — same pattern as faq-actions.ts's moveFaq. */
export async function moveEnergyTariff(formData: FormData) {
  const session = await requireStaff();
  if (!session) return;

  const id = formData.get("id") as string;
  const direction = formData.get("direction") as "up" | "down";

  const current = await prisma.energyTariff.findUnique({ where: { id } });
  if (!current) return;

  const siblings = await prisma.energyTariff.findMany({ where: { kind: current.kind }, orderBy: { order: "asc" }, select: { id: true, order: true } });
  const index = siblings.findIndex((t) => t.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= siblings.length) return;

  const swapWith = siblings[swapIndex];
  await prisma.$transaction([
    prisma.energyTariff.update({ where: { id: current.id }, data: { order: swapWith.order } }),
    prisma.energyTariff.update({ where: { id: swapWith.id }, data: { order: current.order } }),
  ]);

  revalidatePath("/ops/energy-tariffs");
}

function revalidateEnergyPublicPages() {
  for (const locale of ["fa", "de", "ru"]) {
    revalidatePath(`/${locale}/services/energy/electricity`);
    revalidatePath(`/${locale}/services/energy/gas`);
  }
}
