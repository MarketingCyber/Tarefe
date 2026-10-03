import { formatGuideSources, type GuideSource } from "@/lib/guide-body";

const INPUT = "rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";

export interface GuideRecord {
  id: string;
  slug: string;
  titleFa: string;
  titleDe: string | null;
  titleRu: string | null;
  excerptFa: string;
  excerptDe: string | null;
  excerptRu: string | null;
  bodyFa: string;
  bodyDe: string | null;
  bodyRu: string | null;
  relatedCategory: string | null;
  relatedSubcategory: string | null;
  relatedProductType: string | null;
  verifiedAt: Date | null;
  sources: unknown;
  published: boolean;
}

const ERROR_LABEL: Record<string, string> = {
  missing_required: "اسلاگ و عنوان/خلاصه/متن فارسی همگی الزامی‌اند.",
  slug_taken: "این اسلاگ قبلاً برای راهنمای دیگری استفاده شده.",
};

/** Shared by /ops/guides/new and /ops/guides/[id] — mirrors FaqForm/TestimonialForm's pattern, just more fields. */
export function GuideForm({
  action,
  guide,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  guide?: GuideRecord;
  error?: string;
  submitLabel: string;
}) {
  const sourcesText = guide?.sources ? formatGuideSources(guide.sources as GuideSource[]) : "";
  const verifiedAtValue = guide?.verifiedAt ? new Date(guide.verifiedAt).toISOString().slice(0, 10) : "";

  return (
    <form action={action} className="grid gap-6 rounded-2xl border border-border bg-white p-6">
      {guide && <input type="hidden" name="id" value={guide.id} />}

      {error && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          {ERROR_LABEL[error] ?? "مشکلی پیش آمد."}
        </p>
      )}

      <div className="grid gap-1.5">
        <label htmlFor="slug" className="text-xs font-semibold text-body">
          اسلاگ (آدرس — مثلاً «pkv-vs-gkv»){guide && " — تغییر این مورد لینک‌های موجود به این راهنما را می‌شکند"}
        </label>
        <input id="slug" name="slug" defaultValue={guide?.slug} required disabled={!!guide} className={`font-latin ${INPUT} ${guide ? "opacity-60" : ""}`} />
      </div>

      <LocaleTitleExcerpt locale="fa" label="فارسی (fa) — الزامی" title={guide?.titleFa} excerpt={guide?.excerptFa} required />
      <LocaleTitleExcerpt locale="de" label="آلمانی (de) — اختیاری، در صورت خالی بودن از فارسی استفاده می‌شود" title={guide?.titleDe ?? ""} excerpt={guide?.excerptDe ?? ""} />
      <LocaleTitleExcerpt locale="ru" label="روسی (ru) — اختیاری، در صورت خالی بودن از فارسی استفاده می‌شود" title={guide?.titleRu ?? ""} excerpt={guide?.excerptRu ?? ""} />

      <BodyField locale="fa" label="متن (fa) — الزامی" value={guide?.bodyFa} required />
      <BodyField locale="de" label="متن (de) — اختیاری، در صورت خالی بودن از فارسی استفاده می‌شود" value={guide?.bodyDe ?? ""} />
      <BodyField locale="ru" label="متن (ru) — اختیاری، در صورت خالی بودن از فارسی استفاده می‌شود" value={guide?.bodyRu ?? ""} />

      <fieldset className="grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">خدمت مرتبط (اختیاری — لینک «دریافت مشاوره» را فعال می‌کند)</legend>
        <div className="grid gap-1.5">
          <label htmlFor="relatedCategory" className="text-xs font-semibold text-body">
            اسلاگ دسته‌بندی
          </label>
          <input id="relatedCategory" name="relatedCategory" defaultValue={guide?.relatedCategory ?? ""} placeholder="insurance" className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="relatedSubcategory" className="text-xs font-semibold text-body">
            اسلاگ زیردسته
          </label>
          <input id="relatedSubcategory" name="relatedSubcategory" defaultValue={guide?.relatedSubcategory ?? ""} placeholder="health" className={`font-latin ${INPUT}`} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="relatedProductType" className="text-xs font-semibold text-body">
            اسلاگ نوع محصول
          </label>
          <input id="relatedProductType" name="relatedProductType" defaultValue={guide?.relatedProductType ?? ""} placeholder="pkv" className={`font-latin ${INPUT}`} />
        </div>
      </fieldset>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="verifiedAt" className="text-xs font-semibold text-body">
            تاریخ آخرین راستی‌آزمایی (برای خواننده نمایش داده می‌شود)
          </label>
          <input id="verifiedAt" name="verifiedAt" type="date" defaultValue={verifiedAtValue} className={`font-latin ${INPUT}`} />
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-purple-900">
          <input type="checkbox" name="published" defaultChecked={guide?.published ?? true} className="h-4 w-4 rounded border-border-strong" />
          منتشرشده
        </label>
      </div>

      <div className="grid gap-1.5 border-t border-border pt-5">
        <label htmlFor="sourcesText" className="text-xs font-semibold text-body">
          منابع (اختیاری، هر خط یک مورد: <span className="font-latin">Label | https://url</span>)
        </label>
        <textarea id="sourcesText" name="sourcesText" defaultValue={sourcesText} rows={3} className={`font-latin ${INPUT}`} placeholder={"Verivox — Kündigungsfrist Strom | https://www.verivox.de/..."} />
      </div>

      <button type="submit" className="press w-fit rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">
        {submitLabel}
      </button>
    </form>
  );
}

function LocaleTitleExcerpt({ locale, label, title, excerpt, required }: { locale: "fa" | "de" | "ru"; label: string; title?: string; excerpt?: string; required?: boolean }) {
  const cap = locale[0].toUpperCase() + locale.slice(1);
  return (
    <fieldset className="grid gap-3 border-t border-border pt-5 first:border-0 first:pt-0">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">{label}</legend>
      <div className="grid gap-1.5">
        <label htmlFor={`title${cap}`} className="text-xs font-semibold text-body">
          عنوان
        </label>
        <input id={`title${cap}`} name={`title${cap}`} defaultValue={title} required={required} className={INPUT} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`excerpt${cap}`} className="text-xs font-semibold text-body">
          خلاصه (یک جمله، روی کارت‌ها نمایش داده می‌شود)
        </label>
        <textarea id={`excerpt${cap}`} name={`excerpt${cap}`} defaultValue={excerpt} required={required} rows={2} className={INPUT} />
      </div>
    </fieldset>
  );
}

function BodyField({ locale, label, value, required }: { locale: "fa" | "de" | "ru"; label: string; value?: string; required?: boolean }) {
  const cap = locale[0].toUpperCase() + locale.slice(1);
  return (
    <fieldset className="grid gap-2 border-t border-border pt-5">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">{label}</legend>
      <p className="text-[11px] text-secondary">
        هر بخش جدید را با خطی که با <span className="font-latin">&quot;## &quot;</span> شروع می‌شود آغاز کن؛ پاراگراف‌ها را با یک خط خالی از هم جدا کن. فقط متن ساده — بدون HTML.
      </p>
      <textarea id={`body${cap}`} name={`body${cap}`} defaultValue={value} required={required} rows={10} className={`${INPUT} font-mono`} />
    </fieldset>
  );
}
