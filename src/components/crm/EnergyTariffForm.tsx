const INPUT = "rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";

export interface EnergyTariffRecord {
  id: string;
  kind: "ELECTRICITY" | "GAS";
  provider: string;
  name: string;
  workingPriceCtPerKwh: string | null;
  basePriceEurPerYear: string | null;
  bonusEur: string | null;
  priceGuaranteeMonths: number | null;
  contractDurationMonths: number | null;
  highlightFa: string | null;
  highlightDe: string | null;
  highlightRu: string | null;
  published: boolean;
}

/** Shared by /ops/energy-tariffs/new and /ops/energy-tariffs/[id] — mirrors FaqForm's/TestimonialForm's pattern. */
export function EnergyTariffForm({
  action,
  tariff,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  tariff?: EnergyTariffRecord;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-6 rounded-2xl border border-border bg-white p-6">
      {tariff && <input type="hidden" name="id" value={tariff.id} />}

      {error === "missing_required" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          نوع تعرفه، نام ارائه‌دهنده و نام تعرفه الزامی هستند.
        </p>
      )}

      <div className="rounded-lg bg-tint px-3.5 py-3 text-xs text-secondary">
        این فرم قیمت واقعی یک تعرفه برق یا گاز را در سایت عمومی منتشر می‌کند — فقط اعداد واقعی از تعرفه‌نامه ارائه‌دهنده را وارد کن، چون این اعداد
        مستقیماً برای مقایسه قیمت به کاربران نمایش داده می‌شوند.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="kind" className="text-xs font-semibold text-body">
            نوع
          </label>
          <select id="kind" name="kind" defaultValue={tariff?.kind ?? "ELECTRICITY"} className={INPUT}>
            <option value="ELECTRICITY">برق</option>
            <option value="GAS">گاز</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-purple-900">
          <input type="checkbox" name="published" defaultChecked={tariff?.published ?? true} className="h-4 w-4 rounded border-border-strong" />
          منتشرشده
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="provider" className="text-xs font-semibold text-body">
            نام ارائه‌دهنده (مثلاً «Vattenfall»)
          </label>
          <input id="provider" name="provider" defaultValue={tariff?.provider} required className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="name" className="text-xs font-semibold text-body">
            نام تعرفه (مثلاً «Naturstrom 12»)
          </label>
          <input id="name" name="name" defaultValue={tariff?.name} required className={`font-latin ${INPUT}`} />
        </div>
      </div>

      <fieldset className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">
          قیمت ثابت (اختیاری) — فقط برای تعرفه‌ای که هنوز جدول قیمت کد پستی برایش آپلود نشده؛ در غیر این صورت خالی بگذار و از بخش «جدول قیمت کد پستی»
          پایین همین صفحه استفاده کن
        </legend>
        <div className="grid gap-1.5">
          <label htmlFor="workingPriceCtPerKwh" className="text-xs font-semibold text-body">
            قیمت مصرف — Arbeitspreis (سنت/kWh)
          </label>
          <input id="workingPriceCtPerKwh" name="workingPriceCtPerKwh" defaultValue={tariff?.workingPriceCtPerKwh ?? ""} inputMode="decimal" className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="basePriceEurPerYear" className="text-xs font-semibold text-body">
            قیمت پایه سالانه — Grundpreis (€/سال)
          </label>
          <input id="basePriceEurPerYear" name="basePriceEurPerYear" defaultValue={tariff?.basePriceEurPerYear ?? ""} inputMode="decimal" className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="bonusEur" className="text-xs font-semibold text-body">
            بونوس نقدی (€، اختیاری)
          </label>
          <input id="bonusEur" name="bonusEur" defaultValue={tariff?.bonusEur ?? ""} inputMode="decimal" className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="priceGuaranteeMonths" className="text-xs font-semibold text-body">
            گارانتی قیمت (ماه، اختیاری)
          </label>
          <input id="priceGuaranteeMonths" name="priceGuaranteeMonths" defaultValue={tariff?.priceGuaranteeMonths ?? ""} inputMode="numeric" className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="contractDurationMonths" className="text-xs font-semibold text-body">
            مدت قرارداد (ماه، اختیاری)
          </label>
          <input id="contractDurationMonths" name="contractDurationMonths" defaultValue={tariff?.contractDurationMonths ?? ""} inputMode="numeric" className={`font-latin ${INPUT}`} />
        </div>
      </fieldset>

      <fieldset className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">
          نکته برجسته روی کارت (اختیاری، مثلاً «۱۰۰٪ انرژی تجدیدپذیر») — در غیر این صورت نسخه فارسی نمایش داده می‌شود
        </legend>
        <div className="grid gap-1.5">
          <label htmlFor="highlightFa" className="text-xs font-semibold text-body">
            فارسی
          </label>
          <input id="highlightFa" name="highlightFa" defaultValue={tariff?.highlightFa ?? ""} className={INPUT} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="highlightDe" className="text-xs font-semibold text-body">
            آلمانی
          </label>
          <input id="highlightDe" name="highlightDe" defaultValue={tariff?.highlightDe ?? ""} className={INPUT} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="highlightRu" className="text-xs font-semibold text-body">
            روسی
          </label>
          <input id="highlightRu" name="highlightRu" defaultValue={tariff?.highlightRu ?? ""} className={INPUT} />
        </div>
      </fieldset>

      <button type="submit" className="press w-fit rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">
        {submitLabel}
      </button>
    </form>
  );
}
