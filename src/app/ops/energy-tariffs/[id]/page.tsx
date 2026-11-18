import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEnergyTariff } from "@/lib/energy-tariff-actions";
import { EnergyTariffForm } from "@/components/crm/EnergyTariffForm";
import { EnergyTariffPriceImport } from "@/components/crm/EnergyTariffPriceImport";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function EditEnergyTariffPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { error } = await searchParams;
  const tariff = await prisma.energyTariff.findUnique({ where: { id } });
  if (!tariff) notFound();
  const priceRowCount = await prisma.energyTariffPriceRow.count({ where: { tariffId: id } });

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/energy-tariffs" />
      <h1 className="text-2xl font-bold text-purple-900">{t("ویرایش تعرفه")}</h1>
      <div className="mt-6">
        <EnergyTariffForm action={updateEnergyTariff} tariff={tariff} error={error} submitLabel={t("ذخیره تغییرات")} />
      </div>
      <div className="mt-6">
        <EnergyTariffPriceImport tariffId={id} currentRowCount={priceRowCount} />
      </div>
    </div>
  );
}
