import type { QualificationConfig } from "../qualification-types";

// Same statutory basis as electricity — the Energiewirtschaftsgesetz
// (EnWG) covers both Strom and Gas switching/cancellation, so the real
// factor that gates switching is identical: contract/cancellation status,
// not personal eligibility. See electricity.ts for the same reasoning.
export const GAS_QUALIFICATION: QualificationConfig = {
  id: "gas",
  title: {
    fa: "بررسی شرایط تعویض قرارداد گاز",
    de: "Wechselbereitschaft für Ihren Gasvertrag prüfen",
    ru: "Проверка условий для смены договора на газ",
  },
  questions: [
    {
      id: "current_contract",
      type: "radio",
      question: {
        fa: "وضعیت قرارداد گاز فعلی شما چگونه است؟",
        de: "Wie ist der Status Ihres aktuellen Gasvertrags?",
        ru: "Каков статус вашего текущего договора на газ?",
      },
      required: true,
      options: [
        { value: "no_contract", label: { fa: "قرارداد ندارم / تازه اسباب‌کشی کرده‌ام", de: "Kein Vertrag / gerade umgezogen", ru: "Нет договора / только переехал(а)" } },
        { value: "free_to_switch", label: { fa: "دوره تعهد تمام شده و می‌توانم تعویض کنم", de: "Mindestlaufzeit vorbei, ich kann wechseln", ru: "Минимальный срок прошёл, могу сменить" } },
        { value: "locked_in", label: { fa: "هنوز در دوره تعهد قرارداد هستم", de: "Ich bin noch in der Mindestlaufzeit", ru: "Всё ещё в минимальном сроке договора" } },
      ],
    },
    {
      id: "consumption_known",
      type: "radio",
      question: {
        fa: "آیا میزان مصرف سالانه گاز خود را می‌دانید (کیلووات‌ساعت)؟",
        de: "Kennen Sie Ihren jährlichen Gasverbrauch (kWh)?",
        ru: "Знаете ли вы своё годовое потребление газа (кВт·ч)?",
      },
      required: true,
      options: [
        { value: "yes", label: { fa: "بله", de: "Ja", ru: "Да" } },
        { value: "no", label: { fa: "خیر، نیاز به راهنمایی دارم", de: "Nein, ich brauche Hilfe", ru: "Нет, нужна помощь" } },
      ],
    },
  ],
  outcomes: [
    {
      match: (a) => a.current_contract === "locked_in",
      result: "conditional",
      message: {
        fa: "چون هنوز در دوره تعهد هستی، همین حالا نمی‌توانی تعویض کنی — اما می‌توانیم تاریخ دقیق مهلت فسخ را بررسی کنیم تا به‌موقع اقدام کنی.",
        de: "Da Sie noch in der Mindestlaufzeit sind, können Sie aktuell nicht wechseln — wir prüfen aber gerne die genaue Kündigungsfrist, damit Sie rechtzeitig handeln.",
        ru: "Поскольку вы всё ещё в минимальном сроке, сейчас сменить нельзя — но мы можем проверить точный срок расторжения, чтобы вы не пропустили момент.",
      },
    },
    {
      match: () => true,
      result: "eligible",
      message: {
        fa: "می‌توانی همین حالا برای تعویض قرارداد گاز اقدام کنی. مشاور ما بهترین تعرفه را بر اساس مصرف تو پیشنهاد می‌دهد.",
        de: "Sie können jetzt Ihren Gasvertrag wechseln. Unser Berater empfiehlt den passenden Tarif basierend auf Ihrem Verbrauch.",
        ru: "Вы можете сменить договор на газ уже сейчас. Консультант подберёт подходящий тариф на основе вашего потребления.",
      },
    },
  ],
};
