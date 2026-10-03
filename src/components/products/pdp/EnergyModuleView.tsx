import type { EnergyModule } from "@/lib/pdp-data";
import type { Locale } from "@/lib/taxonomy";

const LABELS: Record<Locale, Record<string, string>> = {
  fa: { workingPrice: "قیمت هر کیلووات‌ساعت", basePrice: "هزینه پایه سالانه", bonus: "بونوس نقدی", guarantee: "گارانتی قیمت", duration: "مدت قرارداد", months: "ماه" },
  de: { workingPrice: "Arbeitspreis pro kWh", basePrice: "Grundpreis pro Jahr", bonus: "Bonus", guarantee: "Preisgarantie", duration: "Vertragslaufzeit", months: "Monate" },
  ru: { workingPrice: "Цена за кВт·ч", basePrice: "Базовая цена в год", bonus: "Бонус", guarantee: "Гарантия цены", duration: "Срок договора", months: "мес." },
};

export function EnergyModuleView({ locale, module }: { locale: Locale; module: EnergyModule }) {
  const l = LABELS[locale];
  const rows = [
    { label: l.workingPrice, value: `${module.workingPriceCtPerKwh} ct` },
    { label: l.basePrice, value: `${module.basePriceEurPerYear} €` },
    { label: l.bonus, value: `${module.bonusEur} €` },
    { label: l.guarantee, value: `${module.priceGuaranteeMonths} ${l.months}` },
    { label: l.duration, value: `${module.contractDurationMonths} ${l.months}` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-border bg-white p-4">
          <p className="text-[11px] text-secondary">{row.label}</p>
          <p className="font-latin mt-1 text-lg font-bold text-purple-900">{row.value}</p>
        </div>
      ))}
    </div>
  );
}
