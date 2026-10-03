import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEnergyTariff } from "@/lib/energy-tariff-actions";
import { EnergyTariffForm } from "@/components/crm/EnergyTariffForm";
import { EnergyTariffPriceImport } from "@/components/crm/EnergyTariffPriceImport";
import { canAccessContent } from "@/lib/permissions";

export default async function EditEnergyTariffPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { id } = await params;
  const { error } = await searchParams;
  const tariff = await prisma.energyTariff.findUnique({ where: { id } });
  if (!tariff) notFound();
  const priceRowCount = await prisma.energyTariffPriceRow.count({ where: { tariffId: id } });

  return (
    <div className="container-page max-w-2xl py-8">
      <Link href="/ops/energy-tariffs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به تعرفه‌های برق و گاز
      </Link>
      <h1 className="text-2xl font-bold text-purple-900">ویرایش تعرفه</h1>
      <div className="mt-6">
        <EnergyTariffForm action={updateEnergyTariff} tariff={tariff} error={error} submitLabel="ذخیره تغییرات" />
      </div>
      <div className="mt-6">
        <EnergyTariffPriceImport tariffId={id} currentRowCount={priceRowCount} />
      </div>
    </div>
  );
}
