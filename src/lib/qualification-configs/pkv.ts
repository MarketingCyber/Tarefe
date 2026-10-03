import type { QualificationConfig } from "../qualification-types";

// PKV eligibility in Germany hinges on real, specific rules (self-employed:
// generally eligible any time; employees: only above the statutory income
// threshold, which changes yearly — kept generic here as "above the
// threshold" rather than a hardcoded number that will go stale and be
// wrong for whoever reads it later).
export const PKV_QUALIFICATION: QualificationConfig = {
  id: "pkv",
  title: {
    fa: "بررسی شرایط بیمه خصوصی درمان (PKV)",
    de: "PKV-Eignung prüfen",
    ru: "Проверка права на PKV",
  },
  questions: [
    {
      id: "employment",
      type: "radio",
      question: {
        fa: "وضعیت شغلی شما چیست؟",
        de: "Wie ist Ihr Beschäftigungsstatus?",
        ru: "Каков ваш статус занятости?",
      },
      required: true,
      options: [
        { value: "self_employed", label: { fa: "فریلنسر / خوداشتغال", de: "Selbstständig / Freiberuflich", ru: "Самозанятый / фрилансер" } },
        { value: "employee", label: { fa: "کارمند", de: "Angestellt", ru: "Наёмный сотрудник" } },
        { value: "student", label: { fa: "دانشجو", de: "Student", ru: "Студент" } },
      ],
    },
    {
      id: "income_above_threshold",
      type: "radio",
      showIf: (a) => a.employment === "employee",
      question: {
        fa: "آیا درآمد ناخالص سالانه شما از سقف بیمه اجباری بیشتر است؟",
        de: "Liegt Ihr Bruttojahreseinkommen über der Versicherungspflichtgrenze?",
        ru: "Превышает ли ваш годовой доход брутто порог обязательного страхования?",
      },
      helpText: {
        fa: "این سقف هر سال توسط دولت آلمان به‌روزرسانی می‌شود؛ مشاور ما رقم دقیق سال جاری را با شما در میان می‌گذارد.",
        de: "Diese Grenze wird jährlich von der Bundesregierung aktualisiert; unser Berater nennt Ihnen den aktuellen Wert.",
        ru: "Этот порог ежегодно обновляется правительством Германии; консультант сообщит вам актуальное значение.",
      },
      required: true,
      options: [
        { value: "yes", label: { fa: "بله", de: "Ja", ru: "Да" } },
        { value: "no", label: { fa: "خیر / مطمئن نیستم", de: "Nein / Nicht sicher", ru: "Нет / не уверен(а)" } },
      ],
    },
    {
      id: "current_insurance",
      type: "radio",
      question: {
        fa: "در حال حاضر چه بیمه‌ای دارید؟",
        de: "Wie sind Sie aktuell versichert?",
        ru: "Как вы застрахованы сейчас?",
      },
      required: true,
      options: [
        { value: "gkv", label: { fa: "بیمه دولتی (GKV)", de: "Gesetzlich (GKV)", ru: "Государственная (GKV)" } },
        { value: "pkv", label: { fa: "بیمه خصوصی (PKV)", de: "Privat (PKV)", ru: "Частная (PKV)" } },
        { value: "none", label: { fa: "بیمه ندارم / تازه به آلمان آمده‌ام", de: "Keine / neu in Deutschland", ru: "Нет страховки / недавно приехал(а)" } },
      ],
    },
  ],
  outcomes: [
    {
      match: (a) => a.employment === "employee" && a.income_above_threshold === "no",
      result: "not-eligible",
      message: {
        fa: "با اطلاعات فعلی، احتمالا هنوز واجد شرایط PKV نیستید — اما این رقم سالانه تغییر می‌کند و استثناهایی هم وجود دارد. مشاور ما دقیق بررسی می‌کند.",
        de: "Nach aktuellem Stand erfüllen Sie die PKV-Voraussetzungen wahrscheinlich noch nicht — die Grenze ändert sich jährlich und es gibt Ausnahmen. Unser Berater prüft das genau.",
        ru: "По текущим данным вы, вероятно, пока не соответствуете условиям PKV — порог меняется ежегодно, и есть исключения. Консультант проверит точно.",
      },
    },
    {
      match: (a) => a.employment === "self_employed" || (a.employment === "employee" && a.income_above_threshold === "yes"),
      result: "eligible",
      message: {
        fa: "بر اساس پاسخ‌های شما، احتمالا واجد شرایط PKV هستید. مشاور ما تعرفه‌های دقیق را برایتان مقایسه می‌کند.",
        de: "Nach Ihren Angaben erfüllen Sie voraussichtlich die PKV-Voraussetzungen. Unser Berater vergleicht die passenden Tarife für Sie.",
        ru: "По вашим ответам вы, вероятно, соответствуете условиям PKV. Консультант подберёт для вас подходящие тарифы.",
      },
    },
    {
      match: () => true,
      result: "conditional",
      message: {
        fa: "شرایط شما نیاز به بررسی دقیق‌تر دارد. مشاور ما با شما تماس می‌گیرد تا گزینه‌های مناسب را بررسی کند.",
        de: "Ihre Situation braucht eine genauere Prüfung. Unser Berater meldet sich, um die passenden Optionen zu besprechen.",
        ru: "Ваша ситуация требует более детальной проверки. Консультант свяжется с вами для обсуждения подходящих вариантов.",
      },
    },
  ],
};
