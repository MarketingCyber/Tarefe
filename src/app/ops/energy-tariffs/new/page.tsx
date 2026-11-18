import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createEnergyTariff } from "@/lib/energy-tariff-actions";
import { EnergyTariffForm } from "@/components/crm/EnergyTariffForm";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
import { BackLink } from "@/components/crm/BackLink";
export default async function NewEnergyTariffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { error } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-8">
      <BackLink fallback="/ops/energy-tariffs" />
      <h1 className="text-2xl font-bold text-purple-900">{t("تعرفه جدید")}</h1>
      <div className="mt-6">
        <EnergyTariffForm action={createEnergyTariff} error={error} submitLabel={t("ایجاد")} />
      </div>
    </div>
  );
}
