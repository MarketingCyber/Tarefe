import { CheckCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import type { DentalModule } from "@/lib/pdp-data";
import type { Locale } from "@/lib/taxonomy";

const LABELS: Record<Locale, Record<string, string>> = {
  fa: { coverage: "درصد پوشش", waiting: "دوره انتظار", implants: "ایمپلنت", crowns: "روکش دندان", zahnstaffel: "سقف پوشش به تفکیک سال", none: "بدون دوره انتظار", months: "ماه" },
  de: { coverage: "Erstattungsanteil", waiting: "Wartezeit", implants: "Implantate", crowns: "Kronen", zahnstaffel: "Zahnstaffel (Erstattungsgrenze pro Jahr)", none: "Keine Wartezeit", months: "Monate" },
  ru: { coverage: "Процент покрытия", waiting: "Период ожидания", implants: "Импланты", crowns: "Коронки", zahnstaffel: "Лимит покрытия по годам", none: "Без периода ожидания", months: "мес." },
};

export function DentalModuleView({ locale, module }: { locale: Locale; module: DentalModule }) {
  const l = LABELS[locale];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[11px] text-secondary">{l.coverage}</p>
          <p className="font-latin mt-1 text-lg font-bold text-purple-900">{module.coveragePercent}٪</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[11px] text-secondary">{l.waiting}</p>
          <p className="font-latin mt-1 text-lg font-bold text-purple-900">{module.waitingPeriodMonths === 0 ? l.none : `${module.waitingPeriodMonths} ${l.months}`}</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[11px] text-secondary">{l.implants}</p>
          {module.implantsCovered ? <CheckCircle size={20} weight="fill" className="mt-1 text-success" /> : <XCircle size={20} weight="fill" className="mt-1 text-secondary" />}
        </div>
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="text-[11px] text-secondary">{l.crowns}</p>
          {module.crownsCovered ? <CheckCircle size={20} weight="fill" className="mt-1 text-success" /> : <XCircle size={20} weight="fill" className="mt-1 text-secondary" />}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-purple-900">{l.zahnstaffel}</p>
        <div className="overflow-hidden rounded-xl border border-border">
          {module.zahnstaffel.map((tier, i) => (
            <div key={i} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i > 0 ? "border-t border-border" : ""}`}>
              <span className="text-body">{tier.period[locale]}</span>
              <span className="font-latin font-semibold text-purple-900">{tier.capPercent}٪</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
