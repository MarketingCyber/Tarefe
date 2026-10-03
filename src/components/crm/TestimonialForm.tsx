const INPUT = "rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";

export interface TestimonialRecord {
  id: string;
  customerName: string;
  customerNameLatin: string | null;
  quoteFa: string;
  quoteDe: string | null;
  quoteRu: string | null;
  serviceLabel: string | null;
  serviceLabelDe: string | null;
  serviceLabelRu: string | null;
  rating: number | null;
  consentNote: string | null;
  published: boolean;
}

/** Shared by /ops/testimonials/new and /ops/testimonials/[id] — mirrors FaqForm's pattern. */
export function TestimonialForm({
  action,
  testimonial,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  testimonial?: TestimonialRecord;
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-6 rounded-2xl border border-border bg-white p-6">
      {testimonial && <input type="hidden" name="id" value={testimonial.id} />}

      {error === "missing_required" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          نام مشتری و نقل‌قول فارسی هر دو الزامی هستند.
        </p>
      )}

      <div className="rounded-lg bg-tint px-3.5 py-3 text-xs text-secondary">
        این فرم نام و حرف‌های یک شخص واقعی را در سایت عمومی منتشر می‌کند. فقط چیزی را وارد کن که یک مشتری واقعاً گفته، با اجازه او برای انتشار — نحوه
        گرفتن این اجازه را در یادداشت رضایت پایین ثبت کن.
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="customerName" className="text-xs font-semibold text-body">
          نام مشتری
        </label>
        <input id="customerName" name="customerName" defaultValue={testimonial?.customerName} required className={INPUT} />
      </div>

      <div className="grid gap-1.5">
        <label htmlFor="customerNameLatin" className="text-xs font-semibold text-body">
          نام به حروف لاتین (اختیاری — برای نسخه آلمانی و روسی سایت، مثلاً «Ali Mohammadi»)
        </label>
        <input id="customerNameLatin" name="customerNameLatin" defaultValue={testimonial?.customerNameLatin ?? ""} className={INPUT} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <label htmlFor="serviceLabel" className="text-xs font-semibold text-body">
            در چه موردی کمک کردیم — فارسی (اختیاری، مثلاً «بیمه خصوصی درمان (PKV)»)
          </label>
          <input id="serviceLabel" name="serviceLabel" defaultValue={testimonial?.serviceLabel ?? ""} className={INPUT} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="serviceLabelDe" className="text-xs font-semibold text-body">
            آلمانی (اختیاری — در غیر این صورت نسخه فارسی نمایش داده می‌شود)
          </label>
          <input id="serviceLabelDe" name="serviceLabelDe" defaultValue={testimonial?.serviceLabelDe ?? ""} className={INPUT} />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="serviceLabelRu" className="text-xs font-semibold text-body">
            روسی (اختیاری — در غیر این صورت نسخه فارسی نمایش داده می‌شود)
          </label>
          <input id="serviceLabelRu" name="serviceLabelRu" defaultValue={testimonial?.serviceLabelRu ?? ""} className={INPUT} />
        </div>
      </div>

      <fieldset className="grid gap-3 border-t border-border pt-5">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">فارسی (fa) — الزامی</legend>
        <textarea id="quoteFa" name="quoteFa" defaultValue={testimonial?.quoteFa} required rows={3} className={INPUT} placeholder="حرف‌های واقعی خودشان، همان‌طور که گفته شد" />
      </fieldset>

      <fieldset className="grid gap-3 border-t border-border pt-5">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">آلمانی (de) — اختیاری</legend>
        <textarea id="quoteDe" name="quoteDe" defaultValue={testimonial?.quoteDe ?? ""} rows={3} className={INPUT} />
      </fieldset>

      <fieldset className="grid gap-3 border-t border-border pt-5">
        <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">روسی (ru) — اختیاری</legend>
        <textarea id="quoteRu" name="quoteRu" defaultValue={testimonial?.quoteRu ?? ""} rows={3} className={INPUT} />
      </fieldset>

      <div className="grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label htmlFor="rating" className="text-xs font-semibold text-body">
            امتیاز (اختیاری — فقط اگر واقعاً امتیازی داده‌اند)
          </label>
          <select id="rating" name="rating" defaultValue={testimonial?.rating ?? ""} className={INPUT}>
            <option value="">بدون امتیاز</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} / 5
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium text-purple-900">
          <input type="checkbox" name="published" defaultChecked={testimonial?.published ?? true} className="h-4 w-4 rounded border-border-strong" />
          منتشرشده
        </label>
      </div>

      <div className="grid gap-1.5 border-t border-border pt-5">
        <label htmlFor="consentNote" className="text-xs font-semibold text-body">
          یادداشت رضایت (پیشنهادی) — چطور اجازه انتشار این نظر را گرفتی؟
        </label>
        <textarea
          id="consentNote"
          name="consentNote"
          defaultValue={testimonial?.consentNote ?? ""}
          rows={2}
          className={INPUT}
          placeholder='مثلاً «رضایت شفاهی از طریق واتساپ، ۱۴۰۴/۰۶/۰۸» یا «فرم رضایت امضاشده موجود است»'
        />
      </div>

      <button type="submit" className="press w-fit rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">
        {submitLabel}
      </button>
    </form>
  );
}
