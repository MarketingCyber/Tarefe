import { Scales, ChatCircleText, FileText, Bell, ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { FlipCard } from "@/components/shared/FlipCard";

const FLIP_HINT: Record<Locale, string> = {
  fa: "برای توضیحات لمس کن",
  de: "Für Details tippen",
  ru: "Нажмите для подробностей",
};

const REASONS = (locale: Locale) => [
  {
    icon: Scales,
    title: { fa: "مقایسه گزینه‌های مختلف", de: "Unabhängiger Vergleich", ru: "Независимое сравнение" }[locale],
    body: { fa: "بررسی بی‌طرفانه بین ده‌ها شرکت معتبر، بدون تعصب روی برندی خاص.", de: "Objektiver Vergleich zwischen Dutzenden renommierten Anbietern, ohne Bevorzugung.", ru: "Объективное сравнение десятков надёжных поставщиков без предпочтений." }[locale],
  },
  {
    icon: ChatCircleText,
    title: { fa: "مشاور فارسی", de: "Beratung in Ihrer Sprache", ru: "Консультация на вашем языке" }[locale],
    body: { fa: "توضیح کامل تفاوت‌های فنی و حقوقی به زبان مادری شما.", de: "Vollständige Erklärung technischer und rechtlicher Unterschiede in Ihrer Sprache.", ru: "Полное объяснение технических и юридических различий на вашем языке." }[locale],
  },
  {
    icon: FileText,
    title: { fa: "ثبت قرارداد", de: "Vertragsabschluss", ru: "Оформление договора" }[locale],
    body: { fa: "انجام تمام مراحل ثبت آنلاین و پر کردن فرم‌ها بدون اتلاف وقت.", de: "Alle Online-Schritte und Formulare übernehmen wir für Sie.", ru: "Мы берём на себя все онлайн-этапы и заполнение форм." }[locale],
  },
  {
    icon: Bell,
    title: { fa: "پشتیبانی بعد از قرارداد", de: "Support nach Vertragsabschluss", ru: "Поддержка после подписания" }[locale],
    body: { fa: "پیگیری خسارت‌ها و سوالات فاکتور در تمام طول قرارداد، به‌همراه یادآوری موعد فسخ.", de: "Wir begleiten Sie bei Schäden, Rechnungen und erinnern rechtzeitig an Kündigungsfristen.", ru: "Мы сопровождаем вас по вопросам ущерба, счетов и сроков расторжения." }[locale],
  },
];

export function WhyTarefe({ locale, dict }: { locale: Locale; dict: Dictionary }) {
  return (
    <section className="border-t border-border bg-tint py-16 md:py-24">
      <div className="container-page grid gap-10 md:grid-cols-2 md:gap-16">
        <div>
          <h2 className="max-w-[18ch] text-2xl font-bold text-purple-900 md:text-3xl">{dict.home.whyTitle}</h2>
          <p className="mt-3 max-w-[42ch] text-sm text-secondary md:text-base">{dict.home.whySubtitle}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {REASONS(locale).map((reason) => {
            const Icon = reason.icon;
            return (
              <FlipCard
                key={reason.title}
                className="h-full"
                flipHint={FLIP_HINT[locale]}
                front={
                  <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-card-hover">
                    {/* The flip invitation: a standalone corner chip (not
                        just small print) so the card visibly reads as
                        "there's something behind this" at a glance, not
                        only on close reading. */}
                    <span className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-purple-600 text-white shadow-card">
                      <ArrowsClockwise size={13} weight="bold" />
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                      <Icon size={18} weight="duotone" />
                    </span>
                    <p className="pe-6 text-sm font-semibold text-purple-900">{reason.title}</p>
                    <p className="mt-auto flex items-center gap-1.5 text-[11px] font-medium text-purple-600">
                      <ArrowsClockwise size={12} weight="bold" />
                      {FLIP_HINT[locale]}
                    </p>
                  </div>
                }
                back={
                  <div className="relative flex h-full flex-col gap-3 rounded-2xl border border-purple-600/25 bg-purple-600/5 p-4">
                    {/* Same corner badge as the front, same position — but
                        inverted (white on purple → purple on white) so the
                        pair reads as "flip forward" / "flip back" without
                        needing a text label at all. This also removes the
                        bottom hint row that was overflowing past the
                        card's height on longer reasons — the back face no
                        longer needs room for anything after the body text. */}
                    <span className="absolute end-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-purple-600/25 bg-white text-purple-600 shadow-card">
                      <ArrowsClockwise size={13} weight="bold" />
                    </span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                      <Icon size={18} weight="duotone" />
                    </span>
                    <p className="pe-6 text-xs leading-relaxed text-secondary">{reason.body}</p>
                  </div>
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
