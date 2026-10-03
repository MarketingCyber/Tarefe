import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/auth";
import { createEnergyTariff } from "@/lib/energy-tariff-actions";
import { EnergyTariffForm } from "@/components/crm/EnergyTariffForm";
import { canAccessContent } from "@/lib/permissions";

export default async function NewEnergyTariffPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const { error } = await searchParams;

  return (
    <div className="container-page max-w-2xl py-8">
      <Link href="/ops/energy-tariffs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-secondary hover:text-purple-600">
        <ArrowRight size={14} weight="bold" />
        بازگشت به تعرفه‌های برق و گاز
      </Link>
      <h1 className="text-2xl font-bold text-purple-900">تعرفه جدید</h1>
      <div className="mt-6">
        <EnergyTariffForm action={createEnergyTariff} error={error} submitLabel="ایجاد" />
      </div>
    </div>
  );
}
