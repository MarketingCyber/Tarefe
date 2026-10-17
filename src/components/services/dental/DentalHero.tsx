import { ArrowRight, CheckCircle, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { Reveal } from "@/components/shared/Reveal";
import { InsuranceSlider, type SliderCopy } from "./InsuranceSlider";

/**
 * The dental page's hero: "with dental insurance vs without", a before / after slider.
 * A missing front tooth, and the same smile with it implanted — the point being that an
 * implant is just ONE of the things the insurance pays for, so the other covered services
 * sit beside it. No prices are quoted: what is paid and after which waiting period depends on the tariff.
 *
 * Phone order: heading → slider → the rest, so the slider is on the first screen.
 * Desktop: text on one side, the slider spanning both rows on the other.
 */
type L = Record<Locale, string>;
const t = (fa: string, de: string, ru: string): L => ({ fa, de, ru });

const COPY = {
  title: t("با بیمه دندان، لبخندت کامل می‌ماند", "Mit Zahnzusatzversicherung bleibt Ihr Lächeln komplett", "Со страховкой улыбка остаётся полной"),
  body: t(
    "ایمپلنت فقط یکی از خدماتی است که بیمه تکمیلی دندان پوشش می‌دهد. نوار را بکش و خودت تفاوت را ببین.",
    "Ein Implantat ist nur eine der Leistungen, die eine Zahnzusatzversicherung übernimmt. Ziehen Sie den Regler und sehen Sie den Unterschied.",
    "Имплант — лишь одна из услуг, которые покрывает дополнительная стоматологическая страховка. Потяните ползунок и посмотрите разницу."
  ),
  alsoCovers: t("بیمه این‌ها را هم پوشش می‌دهد", "Außerdem übernimmt sie", "Также покрывает"),
  covered: [
    t("روکش و پروتز", "Zahnersatz und Kronen", "Коронки и протезы"),
    t("جرم‌گیری سالانه", "Professionelle Zahnreinigung", "Ежегодную чистку"),
    t("درمان ریشه", "Wurzelbehandlung", "Лечение корней"),
  ],
  slider: {
    without: t("بدون بیمه", "Ohne Versicherung", "Без страховки"),
    with: t("با بیمه", "Mit Versicherung", "Со страховкой"),
    withoutAlt: t("لبخند با یک دندان جلوی از دست رفته", "Lächeln mit einer Zahnlücke vorne", "Улыбка с отсутствующим передним зубом"),
    withAlt: t("همان لبخند با دندان ایمپلنت‌شده", "Dasselbe Lächeln mit implantiertem Zahn", "Та же улыбка с имплантированным зубом"),
    drag: t("بکش", "Ziehen", "Потяните"),
    captionWithout: t("بدون بیمه: هزینه ایمپلنت را خودت می‌پردازی.", "Ohne Versicherung zahlen Sie das Implantat selbst.", "Без страховки имплант вы оплачиваете сами."),
    captionWith: t("با بیمه: ایمپلنت در چارچوب تعرفه پوشش داده می‌شود.", "Mit Versicherung wird das Implantat im Rahmen des Tarifs übernommen.", "Со страховкой имплант покрывается в рамках тарифа."),
    sliderLabel: t("مقایسه بدون بیمه و با بیمه", "Vergleich ohne und mit Versicherung", "Сравнение без страховки и со страховкой"),
  },
};

export function DentalHero({ locale, dict, formId }: { locale: Locale; dict: Dictionary; formId: string }) {
  const s = COPY.slider;
  const slider: SliderCopy = {
    without: s.without[locale],
    with: s.with[locale],
    withoutAlt: s.withoutAlt[locale],
    withAlt: s.withAlt[locale],
    drag: s.drag[locale],
    captionWithout: s.captionWithout[locale],
    captionWith: s.captionWith[locale],
    sliderLabel: s.sliderLabel[locale],
  };

  return (
    <section className="border-b border-border bg-tint">
      <div className="container-page grid gap-x-16 gap-y-10 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:grid-rows-[1fr_auto]">
        <Reveal className="lg:col-start-1 lg:row-start-1 lg:self-end">
          <h1 className="max-w-[20ch] text-balance text-3xl font-extrabold leading-tight text-purple-900 md:text-4xl lg:text-[2.6rem]">{COPY.title[locale]}</h1>
          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-secondary">{COPY.body[locale]}</p>
        </Reveal>

        <Reveal delay={0.1} className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <InsuranceSlider copy={slider} />
        </Reveal>

        <Reveal delay={0.05} className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <div>
            <p className="text-xs font-semibold text-secondary">{COPY.alsoCovers[locale]}</p>
            <ul className="mt-3 flex flex-wrap gap-2.5">
              {COPY.covered.map((c) => (
                <li key={c.fa} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-sm font-semibold text-purple-900">
                  <CheckCircle size={16} weight="fill" className="text-success" aria-hidden />
                  {c[locale]}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <ConsultationCtaLink href={`#${formId}`} className="press inline-flex min-h-12 items-center gap-2 rounded-full bg-purple-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
              {dict.cta.freeConsultation}
              <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
            </ConsultationCtaLink>
            <a href="https://wa.me/4915224318691" target="_blank" rel="noopener noreferrer" className="press inline-flex min-h-12 items-center gap-2 rounded-full border border-border-strong bg-white px-6 text-sm font-semibold text-purple-900">
              <WhatsappLogo size={16} weight="fill" />
              {dict.cta.whatsappConsultation}
            </a>
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-sm font-semibold text-purple-900">
            <CheckCircle size={16} weight="fill" className="shrink-0 text-success" aria-hidden />
            {dict.cta.freeClaim}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
