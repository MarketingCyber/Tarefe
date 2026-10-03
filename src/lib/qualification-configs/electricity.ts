import type { QualificationConfig } from "../qualification-types";

// Electricity switching in Germany hinges on contract/cancellation status,
// not personal eligibility — this qualifier routes on that real factor
// (still in a minimum term vs free to switch) rather than asking anything
// that doesn't actually change what an advisor can offer.
export const ELECTRICITY_QUALIFICATION: QualificationConfig = {
  id: "electricity",
  title: {
    fa: "بررسی شرایط تعویض قرارداد برق",
    de: "Wechselbereitschaft für Ihren Stromvertrag prüfen",
    ru: "Проверка условий для смены договора на электричество",
  },
  questions: [
    {
      id: "current_contract",
      type: "radio",
      question: {
        fa: "وضعیت قرارداد برق فعلی شما چگونه است؟",
        de: "Wie ist der Status Ihres aktuellen Stromvertrags?",
        ru: "Каков статус вашего текущего договора на электричество?",
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
        fa: "آیا میزان مصرف سالانه برق خود را می‌دانید (کیلووات‌ساعت)؟",
        de: "Kennen Sie Ihren jährlichen Stromverbrauch (kWh)?",
        ru: "Знаете ли вы своё годовое потребление электроэнергии (кВт·ч)?",
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
        fa: "می‌توانی همین حالا برای تعویض قرارداد برق اقدام کنی. مشاور ما بهترین تعرفه را بر اساس مصرف تو پیشنهاد می‌دهد.",
        de: "Sie können jetzt Ihren Stromvertrag wechseln. Unser Berater empfiehlt den passenden Tarif basierend auf Ihrem Verbrauch.",
        ru: "Вы можете сменить договор на электричество уже сейчас. Консультант подберёт подходящий тариф на основе вашего потребления.",
      },
    },
  ],
};
