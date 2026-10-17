import type { Locale } from "./taxonomy";
import type { LandingKind } from "./landing-estimates";

/**
 * Words on the Google Ads landing journey. Deliberately SHORT — the page is a
 * guided path with a lot of white space, one idea per screen — so every string
 * here earns its place. Persian is the master (informal "تو", the site's tone);
 * German and Russian say the same thing. The two promises every screen leans on:
 * everything is free, and a mother-language companion handles the contract and
 * paperwork. "Near you" is meant as "by your side by phone and WhatsApp in your
 * language" — never as in-person help, which we have not promised anywhere.
 */
type LT = Record<Locale, string>;
const t = (fa: string, de: string, ru: string): LT => ({ fa, de, ru });

export const LANDING_COPY = {
  h1: {
    electricity: t("ارزان‌ترین تعرفه برق خانه‌ات را پیدا کن", "Finden Sie den günstigsten Stromtarif für Ihr Zuhause", "Найдите самый выгодный тариф на электричество"),
    gas: t("ارزان‌ترین تعرفه گاز خانه‌ات را پیدا کن", "Finden Sie den günstigsten Gastarif für Ihr Zuhause", "Найдите самый выгодный тариф на газ"),
  } satisfies Record<LandingKind, LT>,
  sub: t(
    "همه خدمات ما رایگان است. همراه فارسی‌زبانت هستیم و کارهای قرارداد و کاغذبازی را انجام می‌دهیم.",
    "Alle unsere Leistungen sind kostenlos. Wir begleiten Sie in Ihrer Sprache und erledigen Verträge und Papierkram.",
    "Все наши услуги бесплатны. Мы рядом на вашем языке и берём на себя договоры и бумаги."
  ),
  steps: {
    usage: t("مصرف", "Verbrauch", "Потребление"),
    results: t("تعرفه‌ها", "Tarife", "Тарифы"),
    request: t("درخواست", "Anfrage", "Заявка"),
  },
  stepOf: (n: number, locale: Locale) =>
    locale === "fa" ? `مرحله ${n.toLocaleString("fa-IR")} از ۳` : locale === "de" ? `Schritt ${n} von 3` : `Шаг ${n} из 3`,

  usageQuestion: {
    electricity: t("خانه‌ات چند نفره است؟", "Wie viele Personen leben im Haushalt?", "Сколько человек живёт дома?"),
    gas: t("خانه‌ات چند متر است؟", "Wie groß ist Ihre Wohnung?", "Какая у вас площадь жилья?"),
  } satisfies Record<LandingKind, LT>,
  usageNote: (kwh: string, locale: Locale) =>
    locale === "fa" ? `برآورد کم: حدود ${kwh} کیلووات‌ساعت در سال` : locale === "de" ? `Niedrig geschätzt: ca. ${kwh} kWh pro Jahr` : `Скромная оценка: около ${kwh} кВт·ч в год`,
  plzLabel: t("کد پستی", "Postleitzahl", "Почтовый индекс"),
  plzError: t("کد پستی ۵ رقمی را وارد کن.", "Bitte eine 5-stellige PLZ eingeben.", "Введите 5-значный индекс."),
  showTariffs: t("تعرفه‌ها را نشان بده", "Tarife anzeigen", "Показать тарифы"),
  chips: [t("رایگان", "Kostenlos", "Бесплатно"), t("مشاور فارسی", "Beratung in Ihrer Sprache", "Консультация на вашем языке"), t("بدون تعهد", "Unverbindlich", "Без обязательств")],

  resultsTitle: t("بهترین گزینه‌ها برای تو", "Ihre besten Optionen", "Лучшие варианты для вас"),
  searching: t("داریم تعرفه‌ها را برایت پیدا می‌کنیم…", "Wir suchen Ihre Tarife …", "Ищем тарифы для вас …"),
  cheapest: t("ارزان‌ترین", "Günstigster Tarif", "Самый выгодный"),
  perMonth: t("تقریباً در ماه", "ca. pro Monat", "примерно в месяц"),
  perMonthShort: t("در ماه", "pro Monat", "в месяц"),
  bonus: (eur: string, locale: Locale) => (locale === "fa" ? `${eur} یورو بونوس` : locale === "de" ? `${eur} € Bonus` : `Бонус ${eur} €`),
  guarantee: t("قیمت ثابت در تمام مدت قرارداد", "Preisgarantie während der Vertragslaufzeit", "Цена фиксирована на весь срок договора"),
  guaranteeMonths: (m: number, locale: Locale) => (locale === "fa" ? `قیمت ثابت ${m.toLocaleString("fa-IR")} ماه` : locale === "de" ? `${m} Monate Preisgarantie` : `Цена фиксирована ${m} мес.`),
  continueWith: t("ادامه با این تعرفه", "Weiter mit diesem Tarif", "Продолжить с этим тарифом"),
  continueBest: t("ادامه با بهترین گزینه", "Weiter mit der besten Option", "Продолжить с лучшим вариантом"),
  choose: t("انتخاب", "Wählen", "Выбрать"),
  basedOn: (kwh: string, locale: Locale) =>
    locale === "fa" ? `بر اساس ${kwh} کیلووات‌ساعت در سال (برآورد کم)` : locale === "de" ? `Basis: ${kwh} kWh pro Jahr (niedrig geschätzt)` : `Расчёт на ${kwh} кВт·ч в год (скромная оценка)`,
  change: t("تغییر", "Ändern", "Изменить"),
  noTariffsTitle: t("برای این کد پستی هنوز تعرفه‌ای نمایش نمی‌دهیم", "Für diese PLZ zeigen wir noch keine Tarife", "Для этого индекса тарифов пока нет"),
  noTariffsBody: t("ولی مشاور فارسی‌زبان ما رایگان برایت گزینه پیدا می‌کند.", "Unser Berater findet kostenlos eine Option für Sie.", "Наш консультант бесплатно подберёт вариант."),
  lookupError: t("نشد تعرفه‌ها را بگیریم. دوباره امتحان کن.", "Die Tarife konnten nicht geladen werden. Bitte erneut versuchen.", "Не удалось загрузить тарифы. Попробуйте ещё раз."),
  retry: t("تلاش دوباره", "Erneut versuchen", "Повторить"),

  requestTitle: t("درخواست مشاوره رایگان با تیم تعرفه", "Kostenlose Beratung vom Tarefe-Team anfragen", "Бесплатная консультация от команды Tarefe"),
  perks: [
    t("قیمت تضمینی", "Preisgarantie", "Гарантия цены"),
    t("ارزان‌ترین تعرفه", "Günstigster Tarif", "Самый выгодный тариф"),
    t("پشتیبانی فارسی", "Beratung auf Persisch", "Поддержка на вашем языке"),
    t("انجام کارهای اداری", "Wir erledigen die Formalitäten", "Оформление документов берём на себя"),
  ],
  yourTariff: t("تعرفه انتخابی", "Gewählter Tarif", "Выбранный тариф"),
  submit: t("درخواست مشاوره رایگان", "Kostenlose Beratung anfragen", "Запросить бесплатную консультацию"),
  promise: t(
    "رایگان. مشاور فارسی‌زبان ما ظرف حدود ۳ ساعت کاری تماس می‌گیرد و کارهای قرارداد و کاغذبازی را انجام می‌دهد.",
    "Kostenlos. Ein Berater in Ihrer Sprache meldet sich innerhalb von etwa 3 Werktagsstunden und erledigt Vertrag und Papierkram.",
    "Бесплатно. Консультант на вашем языке свяжется в течение примерно 3 рабочих часов и займётся договором и бумагами."
  ),

  doneTitle: t("درخواستت ثبت شد", "Ihre Anfrage ist eingegangen", "Ваша заявка принята"),
  doneBody: t("مشاور فارسی‌زبانت ظرف حدود ۳ ساعت کاری با تو تماس می‌گیرد.", "Ihr Berater meldet sich innerhalb von etwa 3 Werktagsstunden.", "Ваш консультант свяжется в течение примерно 3 рабочих часов."),
  next: [
    t("تماس مشاور", "Anruf Ihres Beraters", "Звонок консультанта"),
    t("درخواست و Kündigung قرارداد قبلی", "Antrag und Kündigung des alten Vertrags", "Заявка и Kündigung старого договора"),
    t("شروع قرارداد جدید", "Start des neuen Vertrags", "Старт нового договора"),
  ],
  whatsapp: t("پیام در واتساپ", "Per WhatsApp schreiben", "Написать в WhatsApp"),

  ihk: t("مشاوران رسمی با تأییدیه IHK", "Zertifizierte Berater (IHK)", "Сертифицированные консультанты (IHK)"),
  back: t("بازگشت", "Zurück", "Назад"),
};

export function pick(lt: LT, locale: Locale): string {
  return lt[locale];
}
