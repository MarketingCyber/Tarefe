import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleEnergyTariffPublished, deleteEnergyTariff, moveEnergyTariff } from "@/lib/energy-tariff-actions";
import { Badge } from "@/components/shared/Badge";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ConfirmDeleteForm } from "@/components/shared/ConfirmDeleteForm";
import { Lightning, ArrowUp, ArrowDown } from "@phosphor-icons/react/dist/ssr";
import { canAccessContent } from "@/lib/permissions";

import { getOpsI18n } from "@/lib/ops-i18n/server";
const KIND_LABEL: Record<"ELECTRICITY" | "GAS", string> = { ELECTRICITY: "برق", GAS: "گاز" };

/**
 * Phase 9's fourth CMS admin screen — real electricity/gas tariffs behind
 * the PLP comparison cards (EnergyTariffCards.tsx). Grouped by kind in the
 * UI since "move up/down" and "cheapest wins" both operate within one kind
 * at a time — a single flat list ordered by `order` across both kinds
 * would make the up/down arrows confusing (see moveEnergyTariff's own
 * kind-scoped sibling lookup).
 */
export default async function EnergyTariffsAdminPage() {
  const { t } = await getOpsI18n();
  const session = await auth();
  if (!canAccessContent(session?.user?.role)) redirect("/ops");

  const tariffs = await prisma.energyTariff.findMany({ orderBy: [{ kind: "asc" }, { order: "asc" }] });
  const priceRowCounts = await prisma.energyTariffPriceRow.groupBy({ by: ["tariffId"], _count: { _all: true } });
  const rowCountByTariffId = new Map(priceRowCounts.map((r) => [r.tariffId, r._count._all]));
  const electricity = tariffs.filter((t) => t.kind === "ELECTRICITY");
  const gas = tariffs.filter((t) => t.kind === "GAS");

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-purple-900">{t("تعرفه‌های برق و گاز")}</h1>
          <p className="mt-1 text-sm text-secondary">{t("در ماشین‌حساب مصرف صفحات برق و گاز، برای مقایسه قیمت واقعی نمایش داده می‌شود.")}</p>
        </div>
        <Link href="/ops/energy-tariffs/new" className="press shrink-0 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-900">
          {t("+ افزودن تعرفه")}
        </Link>
      </div>

      {tariffs.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Lightning}
            title={t("هنوز تعرفه‌ای ثبت نشده")}
            body={t("یکی اضافه کن تا ماشین‌حساب برق و گاز بتواند قیمت واقعی مقایسه کند.")}
            actionLabel={t("+ افزودن تعرفه")}
            actionHref="/ops/energy-tariffs/new"
          />
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          <TariffGroup title={t("برق")} items={electricity} rowCountByTariffId={rowCountByTariffId} />
          <TariffGroup title={t("گاز")} items={gas} rowCountByTariffId={rowCountByTariffId} />
        </div>
      )}
    </div>
  );
}

async function TariffGroup({
  title,
  items,
  rowCountByTariffId,
}: {
  title: string;
  items: Awaited<ReturnType<typeof prisma.energyTariff.findMany>>;
  rowCountByTariffId: Map<string, number>;
}) {
  const { t } = await getOpsI18n();
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-3 text-sm font-bold text-secondary">{title}</h2>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border bg-white p-4">
            <div className="mt-0.5 flex shrink-0 flex-col gap-1">
              <form action={moveEnergyTariff}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit" disabled={i === 0} className="press text-secondary hover:text-purple-600 disabled:opacity-20" aria-label={t("جابه‌جایی به بالا")}>
                  <ArrowUp size={14} weight="bold" />
                </button>
              </form>
              <form action={moveEnergyTariff}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="direction" value="down" />
                <button type="submit" disabled={i === items.length - 1} className="press text-secondary hover:text-purple-600 disabled:opacity-20" aria-label={t("جابه‌جایی به پایین")}>
                  <ArrowDown size={14} weight="bold" />
                </button>
              </form>
            </div>

            <div className="min-w-0 flex-1">
              <Link href={`/ops/energy-tariffs/${item.id}`} className="font-latin text-sm font-semibold text-purple-900 hover:text-purple-600 hover:underline">
                {item.provider} {item.name}
              </Link>
              <p className="font-latin mt-0.5 text-xs text-secondary">
                {(() => {
                  const rowCount = rowCountByTariffId.get(item.id) ?? 0;
                  if (rowCount > 0) return t("{n} ردیف قیمت کد پستی", { n: rowCount.toLocaleString("de-DE") });
                  if (item.workingPriceCtPerKwh && item.basePriceEurPerYear) {
                    return `${item.workingPriceCtPerKwh} ct/kWh · ${item.basePriceEurPerYear} ${t("€/سال")}${item.bonusEur ? ` · ${item.bonusEur}€ ${t("بونوس")}` : ""}`;
                  }
                  return t("بدون قیمت — نه ثابت، نه جدول کد پستی");
                })()}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge tone="neutral">{t(KIND_LABEL[item.kind])}</Badge>
              <Badge tone={item.published ? "success" : "neutral"}>{item.published ? t("منتشرشده") : t("پیش‌نویس")}</Badge>
              <form action={toggleEnergyTariffPublished}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="published" value={String(item.published)} />
                <button type="submit" className="press rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium text-purple-900 hover:border-purple-600">
                  {item.published ? t("لغو انتشار") : t("انتشار")}
                </button>
              </form>
              <ConfirmDeleteForm
                action={deleteEnergyTariff}
                id={item.id}
                message={t("حذف «{title}»؟ این عملیات قابل بازگشت نیست.", { title: `${item.provider} ${item.name}` })}
                className="press rounded-full border border-danger/40 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger-bg"
              >
                {t("حذف")}
              </ConfirmDeleteForm>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
