import type { QualificationConfig } from "../qualification-types";

// Dental supplement insurance has no hard eligibility gate like PKV — the
// real-world factor that matters is pre-existing/ongoing treatment, since
// most providers exclude or restrict coverage for a condition already
// being treated before the policy starts. This qualifier routes on that,
// not on inventing an eligibility rule that doesn't exist.
export const DENTAL_QUALIFICATION: QualificationConfig = {
  id: "dental",
  title: {
    fa: "بررسی شرایط بیمه دندان",
    de: "Zahnzusatzversicherung-Eignung prüfen",
    ru: "Проверка условий для стоматологической страховки",
  },
  questions: [
    {
      id: "current_dental_insurance",
      type: "radio",
      question: {
        fa: "آیا در حال حاضر بیمه تکمیلی دندان دارید؟",
        de: "Haben Sie derzeit eine Zahnzusatzversicherung?",
        ru: "Есть ли у вас сейчас дополнительная стоматологическая страховка?",
      },
      required: true,
      options: [
        { value: "yes", label: { fa: "بله", de: "Ja", ru: "Да" } },
        { value: "no", label: { fa: "خیر", de: "Nein", ru: "Нет" } },
      ],
    },
    {
      id: "ongoing_treatment",
      type: "radio",
      question: {
        fa: "آیا در حال حاضر درمان دندانپزشکی در حال انجام یا برنامه‌ریزی‌شده دارید؟ (مثل ایمپلنت یا روکش)",
        de: "Läuft aktuell eine zahnärztliche Behandlung oder ist eine geplant (z. B. Implantat, Krone)?",
        ru: "Проходите ли вы сейчас или планируете стоматологическое лечение (например, имплант, коронка)?",
      },
      helpText: {
        fa: "این پاسخ صرفا برای مشاوره دقیق‌تر استفاده می‌شود؛ بیشتر بیمه‌ها درمان‌های شروع‌شده قبل از قرارداد را با محدودیت پوشش می‌دهند.",
        de: "Dient nur einer präziseren Beratung — die meisten Tarife decken bereits begonnene Behandlungen nur eingeschränkt.",
        ru: "Нужно только для более точной консультации — большинство тарифов покрывают уже начатое лечение с ограничениями.",
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
      match: (a) => a.ongoing_treatment === "yes",
      result: "conditional",
      message: {
        fa: "چون درمان در حال انجام داری، پوشش برخی طرح‌ها برای همین مورد محدود خواهد بود. مشاور ما گزینه‌های واقع‌بینانه را برایت توضیح می‌دهد.",
        de: "Da bereits eine Behandlung läuft, ist die Deckung dafür bei manchen Tarifen eingeschränkt. Unser Berater erklärt Ihnen die realistischen Optionen.",
        ru: "Поскольку лечение уже началось, покрытие по некоторым тарифам будет ограничено именно для этого случая. Консультант расскажет о реалистичных вариантах.",
      },
    },
    {
      match: () => true,
      result: "eligible",
      message: {
        fa: "بدون درمان در حال انجام، برای اکثر طرح‌های بیمه دندان واجد شرایط هستی. مشاور ما بهترین گزینه را بر اساس بودجه‌ات پیشنهاد می‌دهد.",
        de: "Ohne laufende Behandlung erfüllen Sie die Voraussetzungen für die meisten Zahnzusatztarife. Unser Berater empfiehlt die passende Option für Ihr Budget.",
        ru: "Без текущего лечения вы соответствуете условиям большинства стоматологических тарифов. Консультант подберёт оптимальный вариант по бюджету.",
      },
    },
  ],
};
