import type { Locale } from "./taxonomy";

/**
 * Real comments from our customers (provided by the site owner, 2026-10-22). Persian is what they
 * wrote; German and Russian are translations of those same comments. Names follow the project's
 * convention for non-Persian pages (see Testimonial.customerNameLatin in schema.prisma): the Persian
 * name written in Latin letters, shared by German and Russian. Emoji are the customers' own and are
 * kept. Each comment has a short headline. Order is the order we were given.
 *
 * Used by the dental page directly and loaded into the Testimonial table (scripts/load-customer-comments.ts)
 * for the homepage and the electricity / gas pages.
 */
type L = Record<Locale, string>;
const t = (fa: string, de: string, ru: string): L => ({ fa, de, ru });

export const CUSTOMER_COMMENTS: { id: string; title: L; name: L; quote: L }[] = [
  {
    id: "comment-1",
    title: t("پوشش هزینه‌های دندانپزشکی", "Übernahme der Zahnarztkosten", "Покрытие стоматологических расходов"),
    name: t("مریم رضایی", "Maryam Rezaei", "Maryam Rezaei"),
    quote: t(
      "من از طریق تعرفه بیمه دندانپزشکی گرفتم و وقتی برای درمان دندونم مجبور شدم چند تا کار انجام بدم، تازه فهمیدم بیمه چقدر می‌تونه کمک‌کننده باشه. بخشی از هزینه‌هام تحت پوشش قرار گرفت و واقعاً فشار مالی رو کمتر کرد. ممنون از تعرفه 🙏🏻",
      "Ich habe über Tarefe eine Zahnzusatzversicherung abgeschlossen. Als bei mir mehrere Zahnbehandlungen anstanden, habe ich erst richtig gemerkt, wie hilfreich eine Versicherung sein kann. Ein Teil meiner Kosten wurde übernommen, und das hat den finanziellen Druck wirklich verringert. Danke, Tarefe 🙏🏻",
      "Я оформила стоматологическую страховку через Tarefe. Когда мне пришлось сделать несколько процедур для зубов, я по-настоящему поняла, насколько страховка может помочь. Часть расходов была покрыта, и это действительно снизило финансовую нагрузку. Спасибо, Tarefe 🙏🏻"
    ),
  },
  {
    id: "comment-2",
    title: t("پشتیبانی و راهنمایی", "Support und Beratung", "Поддержка и консультации"),
    name: t("علی احمدی", "Ali Ahmadi", "Ali Ahmadi"),
    quote: t(
      "چیزی که برای من خیلی خوب بود پشتیبانی تعرفه بود. کلی سوال داشتم و نمی‌دونستم کدوم بیمه بیشتر به دردم می‌خوره. تیم پشتیبانی خیلی با حوصله راهنمایی کردن و کمک کردن بهترین گزینه رو انتخاب کنم. 👌🏻",
      "Besonders gut fand ich den Support von Tarefe. Ich hatte viele Fragen und wusste nicht, welche Versicherung am besten zu mir passt. Das Support-Team hat mich sehr geduldig beraten und mir geholfen, die beste Option zu wählen. 👌🏻",
      "Для меня очень важной оказалась поддержка Tarefe. У меня было много вопросов, и я не знал, какая страховка подойдёт мне лучше всего. Команда поддержки терпеливо всё объяснила и помогла выбрать лучший вариант. 👌🏻"
    ),
  },
  {
    id: "comment-3",
    title: t("بدون هزینه برای مشتری", "Kostenlos für Kunden", "Бесплатно для клиентов"),
    name: t("سارا محمدی", "Sara Mohammadi", "Sara Mohammadi"),
    quote: t(
      "من اول فکر می‌کردم برای استفاده از خدمات تعرفه باید هزینه جداگانه‌ای پرداخت کنم، ولی فهمیدم خدماتشون برای مشتری بدون هزینه‌ست. همین موضوع خیلی برام جالب بود و باعث شد با خیال راحت ازشون کمک بگیرم.",
      "Zuerst dachte ich, ich müsste für die Leistungen von Tarefe extra bezahlen, aber dann habe ich erfahren, dass sie für Kunden kostenlos sind. Das fand ich richtig gut, und deshalb habe ich mir ohne Bedenken Hilfe geholt.",
      "Сначала я думала, что за услуги Tarefe придётся платить отдельно, но потом узнала, что для клиентов они бесплатны. Меня это очень порадовало, и я спокойно обратилась к ним за помощью."
    ),
  },
  {
    id: "comment-4",
    title: t("ساده و بدون دردسر", "Einfach und unkompliziert", "Просто и без хлопот"),
    name: t("امیرحسین کریمی", "Amirhossein Karimi", "Amirhossein Karimi"),
    quote: t(
      "تجربه من با تعرفه خیلی راحت‌تر از چیزی بود که فکر می‌کردم. اطلاعات بیمه‌ها رو گرفتم، سوال‌هام رو پرسیدم و بدون اینکه درگیر کلی مراحل و تماس مختلف بشم، تونستم گزینه مناسبم رو پیدا کنم. واقعاً کار رو راحت‌تر کردن.",
      "Meine Erfahrung mit Tarefe war viel einfacher, als ich dachte. Ich habe die Informationen zu den Versicherungen bekommen, meine Fragen gestellt und konnte meine passende Option finden, ohne mich durch viele Schritte und Telefonate kämpfen zu müssen. Sie haben es mir wirklich leichter gemacht.",
      "Мой опыт с Tarefe оказался намного проще, чем я думал. Я получил информацию о страховках, задал вопросы и нашёл подходящий вариант, не запутавшись в куче шагов и звонков. Они действительно всё упростили."
    ),
  },
  {
    id: "comment-5",
    title: t("ارزش خرید و مقایسه گزینه‌ها", "Preis-Leistung und Vergleich der Optionen", "Выгода и сравнение вариантов"),
    name: t("نسترن موسوی", "Nastaran Mousavi", "Nastaran Mousavi"),
    quote: t(
      "به نظرم بهترین قسمت تعرفه اینه که می‌تونی گزینه‌های مختلف رو بررسی کنی و ببینی کدوم بیمه برای شرایط خودت مناسب‌تره. من برای هزینه‌های دندانپزشکی دنبال یه گزینه منطقی بودم و راهنمایی‌های تعرفه خیلی کمکم کرد. 🌷",
      "Das Beste an Tarefe ist meiner Meinung nach, dass man verschiedene Optionen prüfen und sehen kann, welche Versicherung zur eigenen Situation passt. Ich suchte für meine Zahnarztkosten eine vernünftige Lösung, und die Tipps von Tarefe haben mir sehr geholfen. 🌷",
      "По-моему, лучшее в Tarefe — можно сравнить разные варианты и увидеть, какая страховка подходит именно тебе. Я искала разумный вариант для расходов на стоматолога, и советы Tarefe очень помогли. 🌷"
    ),
  },
];
