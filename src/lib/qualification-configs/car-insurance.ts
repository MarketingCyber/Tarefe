import type { QualificationConfig } from "../qualification-types";

/**
 * Real, verified mechanism (checked 2026-08-28 against Verivox/Verti-style
 * consumer guides): a foreign no-claims record (Schadenfreiheitsklasse)
 * can generally be carried over into the German Kfz-Versicherung system
 * only when it comes from another EU/EEA country (EU + Norway/Iceland/
 * Liechtenstein), with a translated certificate from the prior insurer.
 * A record from outside the EU/EEA — the common case for this audience —
 * typically does not transfer, meaning someone with years of accident-free
 * driving elsewhere still starts at Germany's standard entry class. This
 * is genuinely non-obvious and worth surfacing before someone assumes
 * their driving history abroad will lower their German premium.
 */
export const CAR_INSURANCE_QUALIFICATION: QualificationConfig = {
  id: "car-insurance",
  title: {
    fa: "بررسی سابقه رانندگی برای بیمه خودرو",
    de: "Fahrhistorie für die Kfz-Versicherung prüfen",
    ru: "Проверка водительского стажа для автостраховки",
  },
  questions: [
    {
      id: "prior_insurance_country",
      type: "radio",
      question: {
        fa: "بیمه خودروی قبلی‌ات (اگر داشتی) در کدام کشور بود؟",
        de: "In welchem Land hatten Sie Ihre vorherige Kfz-Versicherung (falls vorhanden)?",
        ru: "В какой стране была ваша предыдущая автостраховка (если была)?",
      },
      required: true,
      options: [
        { value: "none", label: { fa: "بیمه خودرو قبلی نداشتم", de: "Ich hatte keine vorherige Kfz-Versicherung", ru: "У меня не было предыдущей автостраховки" } },
        { value: "eu_eea", label: { fa: "یکی از کشورهای اتحادیه اروپا، نروژ، ایسلند یا لیختن‌اشتاین", de: "EU-Land, Norwegen, Island oder Liechtenstein", ru: "Страна ЕС, Норвегия, Исландия или Лихтенштейн" } },
        { value: "outside_eu", label: { fa: "کشوری خارج از اتحادیه اروپا/منطقه اقتصادی اروپا", de: "Land außerhalb der EU/des EWR", ru: "Страна за пределами ЕС/ЕЭЗ" } },
      ],
    },
  ],
  outcomes: [
    {
      match: (a) => a.prior_insurance_country === "eu_eea",
      result: "eligible",
      message: {
        fa: "خبر خوب: سابقه بدون خسارت تو از یک کشور اتحادیه اروپا/EWR معمولاً قابل انتقال به سیستم آلمان است و می‌تواند حق بیمه‌ات را پایین بیاورد — با گواهی رسمی و ترجمه‌شده از بیمه قبلی.",
        de: "Gute Nachricht: Ihre schadenfreie Fahrhistorie aus einem EU-/EWR-Land kann in der Regel ins deutsche System übernommen werden und Ihren Beitrag senken — mit einer offiziellen, übersetzten Bescheinigung Ihrer vorherigen Versicherung.",
        ru: "Хорошая новость: ваш безаварийный стаж из страны ЕС/ЕЭЗ обычно можно перенести в немецкую систему, что снизит взнос — с официальной переведённой справкой от предыдущей страховой.",
      },
    },
    {
      match: (a) => a.prior_insurance_country === "outside_eu",
      result: "conditional",
      message: {
        fa: "این نکته مهمی است: سابقه بیمه خودرو از خارج از اتحادیه اروپا/EWR معمولاً در سیستم آلمان پذیرفته نمی‌شود — یعنی حتی با سال‌ها رانندگی بدون خسارت، معمولاً از رده‌بندی پایه شروع می‌کنی. این تقصیر تو نیست؛ فقط بهتر است از قبل بدانی تا غافلگیر نشوی.",
        de: "Wichtiger Hinweis: Eine Fahrhistorie von außerhalb der EU/des EWR wird im deutschen System in der Regel nicht anerkannt — das heißt, auch mit jahrelanger unfallfreier Fahrpraxis starten Sie meist in der Grundeinstufung. Das liegt nicht an Ihnen — es ist nur gut, das vorher zu wissen.",
        ru: "Важный момент: водительский стаж за пределами ЕС/ЕЭЗ обычно не признаётся в немецкой системе — то есть даже с многолетним безаварийным стажем вы, как правило, начинаете с базового класса. Это не ваша вина — просто лучше знать об этом заранее.",
      },
    },
    {
      match: () => true,
      result: "eligible",
      message: {
        fa: "چون سابقه بیمه قبلی نداشتی، از رده‌بندی استاندارد شروع می‌کنی — طبیعی و رایج برای اولین قرارداد بیمه خودرو در آلمان است.",
        de: "Da keine vorherige Versicherung bestand, starten Sie in der Standardeinstufung — üblich für den ersten Kfz-Versicherungsvertrag in Deutschland.",
        ru: "Поскольку предыдущей страховки не было, вы начинаете со стандартного класса — это обычная практика для первого договора автостраховки в Германии.",
      },
    },
  ],
};
