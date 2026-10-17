import { Quotes } from "@phosphor-icons/react/dist/ssr";
import type { Locale } from "@/lib/taxonomy";
import { Reveal } from "@/components/shared/Reveal";

/**
 * Real comments from our customers, shown on the dental page. Persian is what they wrote;
 * German and Russian are translations of those same comments. Names follow the project's
 * convention for non-Persian pages (see Testimonial.customerNameLatin in schema.prisma):
 * the Persian name written in Latin letters, shared by German and Russian. Emoji are the
 * customers' own and are kept. Order is the order we were given.
 */
type L = Record<Locale, string>;
const t = (fa: string, de: string, ru: string): L => ({ fa, de, ru });

const ITEMS: { name: L; quote: L }[] = [
  {
    name: t("مریم رضایی", "Maryam Rezaei", "Maryam Rezaei"),
    quote: t(
      "من از طریق تعرفه بیمه دندانپزشکی گرفتم و وقتی برای درمان دندونم مجبور شدم چند تا کار انجام بدم، تازه فهمیدم بیمه چقدر می‌تونه کمک‌کننده باشه. بخشی از هزینه‌هام تحت پوشش قرار گرفت و واقعاً فشار مالی رو کمتر کرد. ممنون از تعرفه 🙏🏻",
      "Ich habe über Tarefe eine Zahnzusatzversicherung abgeschlossen. Als bei mir mehrere Zahnbehandlungen anstanden, habe ich erst richtig gemerkt, wie hilfreich eine Versicherung sein kann. Ein Teil meiner Kosten wurde übernommen, und das hat den finanziellen Druck wirklich verringert. Danke, Tarefe 🙏🏻",
      "Я оформила стоматологическую страховку через Tarefe. Когда мне пришлось сделать несколько процедур для зубов, я по-настоящему поняла, насколько страховка может помочь. Часть расходов была покрыта, и это действительно снизило финансовую нагрузку. Спасибо, Tarefe 🙏🏻"
    ),
  },
  {
    name: t("علی احمدی", "Ali Ahmadi", "Ali Ahmadi"),
    quote: t(
      "چیزی که برای من خیلی خوب بود پشتیبانی تعرفه بود. کلی سوال داشتم و نمی‌دونستم کدوم بیمه بیشتر به دردم می‌خوره. تیم پشتیبانی خیلی با حوصله راهنمایی کردن و کمک کردن بهترین گزینه رو انتخاب کنم. 👌🏻",
      "Besonders gut fand ich den Support von Tarefe. Ich hatte viele Fragen und wusste nicht, welche Versicherung am besten zu mir passt. Das Support-Team hat mich sehr geduldig beraten und mir geholfen, die beste Option zu wählen. 👌🏻",
      "Для меня очень важной оказалась поддержка Tarefe. У меня было много вопросов, и я не знал, какая страховка подойдёт мне лучше всего. Команда поддержки терпеливо всё объяснила и помогла выбрать лучший вариант. 👌🏻"
    ),
  },
  {
    name: t("سارا محمدی", "Sara Mohammadi", "Sara Mohammadi"),
    quote: t(
      "من اول فکر می‌کردم برای استفاده از خدمات تعرفه باید هزینه جداگانه‌ای پرداخت کنم، ولی فهمیدم خدماتشون برای مشتری بدون هزینه‌ست. همین موضوع خیلی برام جالب بود و باعث شد با خیال راحت ازشون کمک بگیرم.",
      "Zuerst dachte ich, ich müsste für die Leistungen von Tarefe extra bezahlen, aber dann habe ich erfahren, dass sie für Kunden kostenlos sind. Das fand ich richtig gut, und deshalb habe ich mir ohne Bedenken Hilfe geholt.",
      "Сначала я думала, что за услуги Tarefe придётся платить отдельно, но потом узнала, что для клиентов они бесплатны. Меня это очень порадовало, и я спокойно обратилась к ним за помощью."
    ),
  },
  {
    name: t("امیرحسین کریمی", "Amirhossein Karimi", "Amirhossein Karimi"),
    quote: t(
      "تجربه من با تعرفه خیلی راحت‌تر از چیزی بود که فکر می‌کردم. اطلاعات بیمه‌ها رو گرفتم، سوال‌هام رو پرسیدم و بدون اینکه درگیر کلی مراحل و تماس مختلف بشم، تونستم گزینه مناسبم رو پیدا کنم. واقعاً کار رو راحت‌تر کردن.",
      "Meine Erfahrung mit Tarefe war viel einfacher, als ich dachte. Ich habe die Informationen zu den Versicherungen bekommen, meine Fragen gestellt und konnte meine passende Option finden, ohne mich durch viele Schritte und Telefonate kämpfen zu müssen. Sie haben es mir wirklich leichter gemacht.",
      "Мой опыт с Tarefe оказался намного проще, чем я думал. Я получил информацию о страховках, задал вопросы и нашёл подходящий вариант, не запутавшись в куче шагов и звонков. Они действительно всё упростили."
    ),
  },
  {
    name: t("نسترن موسوی", "Nastaran Mousavi", "Nastaran Mousavi"),
    quote: t(
      "به نظرم بهترین قسمت تعرفه اینه که می‌تونی گزینه‌های مختلف رو بررسی کنی و ببینی کدوم بیمه برای شرایط خودت مناسب‌تره. من برای هزینه‌های دندانپزشکی دنبال یه گزینه منطقی بودم و راهنمایی‌های تعرفه خیلی کمکم کرد. 🌷",
      "Das Beste an Tarefe ist meiner Meinung nach, dass man verschiedene Optionen prüfen und sehen kann, welche Versicherung zur eigenen Situation passt. Ich suchte für meine Zahnarztkosten eine vernünftige Lösung, und die Tipps von Tarefe haben mir sehr geholfen. 🌷",
      "По-моему, лучшее в Tarefe — можно сравнить разные варианты и увидеть, какая страховка подходит именно тебе. Я искала разумный вариант для расходов на стоматолога, и советы Tarefe очень помогли. 🌷"
    ),
  },
];

const COPY = {
  title: t("مشتریان ما چه می‌گویند", "Das sagen unsere Kunden", "Что говорят наши клиенты"),
  sub: t("تجربه‌های واقعی مشتریان بیمه دندان تعرفه.", "Echte Erfahrungen unserer Kunden mit der Zahnzusatzversicherung.", "Реальные отзывы клиентов о стоматологической страховке."),
  translated: t("", "Aus dem Persischen übersetzt", "Перевод с персидского"),
};

// A few fixed, calm tint pairs for the initials badge, cycled by position (same set as the homepage carousel).
const BADGE_TINTS = ["bg-purple-600/10 text-purple-600", "bg-yellow-500/15 text-purple-900", "bg-success-bg text-success"];

export function DentalTestimonials({ locale }: { locale: Locale }) {
  return (
    <section className="border-t border-border bg-tint py-14 md:py-16">
      <div className="container-page">
        <Reveal>
          <h2 className="text-xl font-bold text-purple-900 md:text-2xl">{COPY.title[locale]}</h2>
          <p className="mt-2 max-w-[56ch] text-sm text-secondary">{COPY.sub[locale]}</p>
        </Reveal>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {ITEMS.map((item, i) => {
            const name = item.name[locale];
            return (
              <Reveal key={item.name.fa} delay={Math.min(i * 0.06, 0.3)} className="h-full">
                <figure className="flex h-full flex-col gap-4 rounded-3xl border border-border bg-white p-6 shadow-card">
                  <Quotes size={30} weight="fill" className="text-yellow-500/70" aria-hidden />
                  <blockquote className="text-sm leading-relaxed text-body" dir={locale === "fa" ? "rtl" : "ltr"}>
                    {item.quote[locale]}
                  </blockquote>
                  <figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${BADGE_TINTS[i % BADGE_TINTS.length]}`} aria-hidden>
                      {name.trim().charAt(0)}
                    </span>
                    <span className="text-sm font-semibold text-purple-900">{name}</span>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>

        {locale !== "fa" && <p className="mt-2 text-xs text-secondary">{COPY.translated[locale]}</p>}
      </div>
    </section>
  );
}
