import type { QualificationConfig } from "../qualification-types";

/**
 * Real, verified mechanism (checked 2026-08-28 against FONIC/Verti-style
 * consumer guides): a standard German postpaid/contract SIM requires a
 * SCHUFA credit check, because the provider bills monthly after the fact.
 * Prepaid needs only ID + a German address — no credit history. This is
 * exactly the gap newcomers without German SCHUFA history hit, and it's
 * the one real factor that decides which of contract/prepaid is actually
 * available to someone, not a matter of preference. Routes to the prepaid
 * PLP when the answer suggests a contract application would likely fail.
 */
export const MOBILE_CONTRACT_QUALIFICATION: QualificationConfig = {
  id: "mobile-contract",
  title: {
    fa: "بررسی شرایط دریافت سیم‌کارت قراردادی",
    de: "Eignung für einen Mobilfunkvertrag prüfen",
    ru: "Проверка условий для контрактной SIM-карты",
  },
  questions: [
    {
      id: "time_in_germany",
      type: "radio",
      question: {
        fa: "چند وقت است در آلمان زندگی می‌کنی؟",
        de: "Wie lange leben Sie schon in Deutschland?",
        ru: "Как долго вы живёте в Германии?",
      },
      helpText: {
        fa: "سیم‌کارت قراردادی نیاز به بررسی اعتبار (SCHUFA) دارد؛ سیم‌کارت اعتباری این بررسی را ندارد.",
        de: "Ein Mobilfunkvertrag erfordert eine SCHUFA-Bonitätsprüfung; ein Prepaid-Tarif nicht.",
        ru: "Контрактная SIM-карта требует проверки кредитоспособности (SCHUFA); предоплаченная — нет.",
      },
      required: true,
      options: [
        { value: "under_6m", label: { fa: "کمتر از ۶ ماه", de: "Weniger als 6 Monate", ru: "Меньше 6 месяцев" } },
        { value: "over_6m", label: { fa: "بیش از ۶ ماه، حساب بانکی و اجاره‌نامه دارم", de: "Mehr als 6 Monate, mit Bankkonto und Mietvertrag", ru: "Более 6 месяцев, есть счёт в банке и договор аренды" } },
      ],
    },
    {
      id: "prior_schufa_issue",
      type: "radio",
      question: {
        fa: "آیا تا به‌حال قرارداد آلمانی (اجاره، اینترنت، برق) رد شده یا مشکلی با پرداخت داشته‌ای؟",
        de: "Wurde schon einmal ein deutscher Vertrag (Miete, Internet, Strom) abgelehnt oder gab es Zahlungsprobleme?",
        ru: "Отклоняли ли вам когда-нибудь немецкий договор (аренда, интернет, электричество) или были проблемы с оплатой?",
      },
      required: true,
      options: [
        { value: "yes", label: { fa: "بله", de: "Ja", ru: "Да" } },
        { value: "no", label: { fa: "خیر", de: "Nein", ru: "Нет" } },
      ],
    },
  ],
  outcomes: [
    {
      match: (a) => a.time_in_germany === "under_6m" || a.prior_schufa_issue === "yes",
      result: "conditional",
      message: {
        fa: "با این سابقه، احتمال رد شدن درخواست قرارداد بالاست — چون هنوز سابقه اعتباری (SCHUFA) کافی در آلمان نداری. سیم‌کارت اعتباری (بدون بررسی اعتبار) گزینه مطمئن‌تری برای شروع است؛ می‌توانی بعداً که سابقه اعتباری‌ات قوی‌تر شد به قرارداد تغییر بدهی.",
        de: "Mit diesem Hintergrund ist eine Vertragsablehnung wahrscheinlich, da noch keine ausreichende SCHUFA-Historie in Deutschland besteht. Ein Prepaid-Tarif (ohne Bonitätsprüfung) ist der sicherere Einstieg — ein späterer Wechsel zum Vertrag ist möglich, sobald Ihre Bonität aufgebaut ist.",
        ru: "С такой историей вероятен отказ по контракту — пока недостаточно кредитной истории (SCHUFA) в Германии. Предоплаченная SIM-карта (без проверки кредитоспособности) — более надёжный старт; позже можно перейти на контракт, когда появится кредитная история.",
      },
      ctaHref: "/services/communication/mobile/prepaid",
      ctaLabel: { fa: "مشاهده سیم‌کارت اعتباری", de: "Prepaid-Tarife ansehen", ru: "Смотреть предоплаченные тарифы" },
    },
    {
      match: () => true,
      result: "eligible",
      message: {
        fa: "با این شرایط، احتمال تایید قرارداد بالاست. مشاور ما بهترین گزینه را بر اساس نیاز تو پیشنهاد می‌دهد.",
        de: "Mit diesen Voraussetzungen ist eine Vertragsgenehmigung wahrscheinlich. Unser Berater empfiehlt die passende Option für Ihren Bedarf.",
        ru: "С такими условиями вероятность одобрения контракта высока. Консультант подберёт подходящий вариант под ваши нужды.",
      },
    },
  ],
};
