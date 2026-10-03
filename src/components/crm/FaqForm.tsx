const INPUT = "rounded-lg border border-border-strong bg-white px-3.5 py-2.5 text-sm text-purple-900 outline-none transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600/25";

/** Shared by /ops/faq/new and /ops/faq/[id] — same 6 fields (question+answer × fa/de/ru) either way. */
export function FaqForm({
  action,
  faq,
  error,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  faq?: { id: string; questionFa: string; questionDe: string; questionRu: string; answerFa: string; answerDe: string; answerRu: string; published: boolean };
  error?: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-6 rounded-2xl border border-border bg-white p-6">
      {faq && <input type="hidden" name="id" value={faq.id} />}

      {error === "missing_fa" && (
        <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
          پرسش و پاسخ فارسی الزامی است — آلمانی و روسی اختیاری‌اند.
        </p>
      )}

      <LocaleFields locale="fa" label="فارسی (fa) — الزامی" question={faq?.questionFa} answer={faq?.answerFa} required />
      <LocaleFields locale="de" label="آلمانی (de)" question={faq?.questionDe} answer={faq?.answerDe} />
      <LocaleFields locale="ru" label="روسی (ru)" question={faq?.questionRu} answer={faq?.answerRu} />

      <label className="flex items-center gap-2 text-sm font-medium text-purple-900">
        <input type="checkbox" name="published" defaultChecked={faq?.published ?? true} className="h-4 w-4 rounded border-border-strong" />
        منتشرشده
      </label>

      <button type="submit" className="press w-fit rounded-full bg-purple-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-purple-900">
        {submitLabel}
      </button>
    </form>
  );
}

function LocaleFields({ locale, label, question, answer, required }: { locale: "fa" | "de" | "ru"; label: string; question?: string; answer?: string; required?: boolean }) {
  const cap = locale[0].toUpperCase() + locale.slice(1);
  return (
    <fieldset className="grid gap-3 border-t border-border pt-5 first:border-0 first:pt-0">
      <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">{label}</legend>
      <div className="grid gap-1.5">
        <label htmlFor={`question${cap}`} className="text-xs font-semibold text-body">
          پرسش
        </label>
        <input id={`question${cap}`} name={`question${cap}`} defaultValue={question} required={required} className={INPUT} />
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={`answer${cap}`} className="text-xs font-semibold text-body">
          پاسخ
        </label>
        <textarea id={`answer${cap}`} name={`answer${cap}`} defaultValue={answer} required={required} rows={3} className={INPUT} />
      </div>
    </fieldset>
  );
}
