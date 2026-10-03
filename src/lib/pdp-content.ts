import type { LocalizedText } from "./taxonomy";

/**
 * Editorial content for PDPs — deliberately separate from pdp-data.ts's
 * KNOWN_TARIFFS (real provider/price data for 2 products). This file is
 * about explaining a *category* of insurance/energy/telecom product in
 * German terms, not about any one company's plan, so it applies whether
 * or not a real tariff exists for the specific pdpSlug being viewed.
 *
 * Every fact here is a general, publicly-documented structural feature of
 * how these product categories work in Germany (e.g. "PKV lets you choose
 * whether Chefarztbehandlung is included" is true of the category, not a
 * specific insurer's claim) — never a specific percentage, discount, or
 * price, which is exactly the kind of thing this project has a standing
 * rule against fabricating. Where a real number exists (Barmenia's 100%
 * implant coverage, Vattenfall's tariff structure), PdpView pulls it from
 * pdp-data.ts and labels it as that provider's own plan, not a category-
 * wide fact.
 *
 * Keyed by the same path segments the URL uses: `${category}/${subcategory}`
 * for a collapsed subcategory (e.g. "energy/electricity"), or
 * `${category}/${subcategory}/${productType}` otherwise (e.g.
 * "insurance/health/pkv"). Only the highest-traffic, best-understood
 * products have bespoke content so far (PKV, GKV, dental, electricity,
 * gas) — everything else falls back to PdpView's own generic section
 * built from the taxonomy's existing title/description, so no page is
 * empty, but the depth here is real work still to do product by product.
 */
export interface PdpBenefit {
  title: LocalizedText;
  body: LocalizedText;
}

export interface PdpCoverageGroup {
  title: LocalizedText;
  items: LocalizedText[];
}

export interface PdpContent {
  /** The German industry term, shown next to the plain-language title (e.g. "Private Krankenversicherung (PKV)"). */
  germanTerm?: string;
  whatItIs: LocalizedText;
  benefits: PdpBenefit[];
  /** Omitted for products with no meaningfully itemizable coverage list (e.g. roadside assistance, bicycle insurance) — the accordion section just doesn't render. */
  coverageGroups?: PdpCoverageGroup[];
  goodFitFor: LocalizedText[];
  /** Shows EnergyConsumptionCalculator instead of the coverage accordion — only electricity/gas have real per-kWh math to run. */
  hasCalculator?: boolean;
}

const t = (fa: string, de: string, ru: string): LocalizedText => ({ fa, de, ru });

export const PDP_CONTENT: Record<string, PdpContent> = {
  "insurance/health/pkv": {
    germanTerm: "Private Krankenversicherung (PKV)",
    whatItIs: t(
      "بیمه خصوصی درمان، جایگزین بیمه پایه دولتی است — نه اجباری بلکه یک گزینه، برای فریلنسرها، صاحبان مشاغل آزاد و کارمندانی که از سقف درآمد بیمه اجباری عبور کرده‌اند. برخلاف GKV، حق بیمه بر اساس سن و سلامت شما محاسبه می‌شود، نه درصدی از حقوق.",
      "Die private Krankenversicherung ist eine Alternative zur gesetzlichen Krankenversicherung — keine Pflicht, sondern eine Option für Selbstständige, Freiberufler und Angestellte über der Versicherungspflichtgrenze. Anders als bei der GKV richtet sich der Beitrag nach Alter und Gesundheitszustand, nicht nach einem Prozentsatz des Gehalts.",
      "Частная медицинская страховка — альтернатива государственной, доступная (но не обязательная) для самозанятых, лиц свободных профессий и сотрудников, превысивших порог обязательного страхования. В отличие от GKV, взнос рассчитывается по возрасту и состоянию здоровья, а не по проценту от зарплаты."
    ),
    benefits: [
      { title: t("پوشش گسترده‌تر", "Umfassenderer Schutz", "Более широкое покрытие"), body: t("دسترسی به خدمات و درمان‌هایی که در GKV معمولا شامل نمی‌شوند.", "Zugang zu Leistungen, die in der GKV meist nicht enthalten sind.", "Доступ к услугам, которые обычно не входят в GKV.") },
      { title: t("تعرفه متناسب با نیاز", "Tarif nach eigenem Bedarf", "Тариф под ваши потребности"), body: t("خودت انتخاب می‌کنی چه پوششی بخری، نه یک بسته ثابت برای همه.", "Sie wählen selbst, welchen Schutz Sie einkaufen — kein Einheitspaket für alle.", "Вы сами выбираете покрытие — нет единого пакета для всех.") },
      { title: t("نوبت‌دهی و امکانات بیشتر", "Schnellere Termine, mehr Auswahl", "Больше возможностей и записи"), body: t("در بسیاری از تعرفه‌ها امکان انتخاب پزشک متخصص یا اتاق خصوصی وجود دارد.", "Viele Tarife ermöglichen die Wahl von Chefarzt oder Einbettzimmer.", "Многие тарифы позволяют выбрать лечащего врача или отдельную палату.") },
      { title: t("مزایای متفاوت برای افراد واجد شرایط", "Unterschiedliche Vorteile je nach Profil", "Разные преимущества в зависимости от профиля"), body: t("شرایط دقیق بستگی به سن، شغل و سلامت فعلی‌ات دارد — مشاور ما این را با تو بررسی می‌کند.", "Die genauen Konditionen hängen von Alter, Beruf und Gesundheitszustand ab — unser Berater prüft das mit Ihnen.", "Точные условия зависят от возраста, профессии и здоровья — наш консультант разберёт это с вами.") },
    ],
    coverageGroups: [
      {
        title: t("درمان و پزشک", "Behandlung & Arzt", "Лечение и врач"),
        items: [t("Zahnbehandlung — درمان و روکش دندان", "Zahnbehandlung", "Zahnbehandlung — лечение зубов"), t("Chefarzt — درمان توسط پزشک ارشد", "Chefarztbehandlung", "Chefarzt — лечение у главврача"), t("Sehhilfen — عینک و لنز", "Sehhilfen", "Sehhilfen — очки и линзы")],
      },
      {
        title: t("بستری و بیمارستان", "Krankenhaus", "Стационар"),
        items: [t("Krankenhaus — بستری در بیمارستان", "Stationäre Behandlung", "Krankenhaus — стационарное лечение"), t("Einbettzimmer — اتاق یک‌نفره", "Einbettzimmer", "Einbettzimmer — одноместная палата")],
      },
    ],
    goodFitFor: [
      t("فریلنسرها و صاحبان مشاغل آزاد (Selbstständig)", "Selbstständige und Freiberufler", "Самозанятые и лица свободных профессий"),
      t("کارمندانی با درآمد بالای سقف بیمه اجباری", "Angestellte über der Versicherungspflichtgrenze", "Сотрудники выше порога обязательного страхования"),
      t("کسانی که پوشش درمانی گسترده‌تری می‌خواهند", "Wer umfassenderen medizinischen Schutz möchte", "Те, кому нужна более широкая медицинская защита"),
      t("کسانی که می‌خواهند گزینه‌های مختلف را مقایسه کنند", "Wer verschiedene Optionen vergleichen möchte", "Те, кто хочет сравнить разные варианты"),
    ],
  },
  "insurance/health/gkv": {
    germanTerm: "Gesetzliche Krankenversicherung (GKV)",
    whatItIs: t(
      "بیمه پایه دولتی، برای اکثر کارمندان در آلمان اجباری است. حق بیمه درصدی ثابت از حقوق است، نه بر اساس سن یا سلامت — و همسر/فرزندان بدون درآمد معمولا رایگان تحت پوشش قرار می‌گیرند.",
      "Die gesetzliche Krankenversicherung ist für die meisten Angestellten in Deutschland Pflicht. Der Beitrag ist ein fester Prozentsatz des Gehalts — unabhängig von Alter oder Gesundheitszustand — und Ehepartner/Kinder ohne eigenes Einkommen sind meist beitragsfrei mitversichert.",
      "Государственное медицинское страхование обязательно для большинства сотрудников в Германии. Взнос — фиксированный процент от зарплаты, независимо от возраста или здоровья, а супруг(а)/дети без дохода обычно застрахованы бесплатно."
    ),
    benefits: [
      { title: t("هزینه قابل پیش‌بینی", "Planbare Kosten", "Предсказуемые расходы"), body: t("حق بیمه درصدی ثابت از حقوق است، نه رقمی که با سن بالا می‌رود.", "Der Beitrag ist ein fester Prozentsatz des Gehalts, nicht ein mit dem Alter steigender Betrag.", "Взнос — фиксированный процент от зарплаты, не растущий с возрастом.") },
      { title: t("پوشش رایگان خانواده", "Kostenlose Familienmitversicherung", "Бесплатное семейное страхование"), body: t("همسر و فرزندان بدون درآمد معمولا نیازی به بیمه جداگانه ندارند.", "Ehepartner und Kinder ohne eigenes Einkommen benötigen meist keine eigene Versicherung.", "Супруг(а) и дети без дохода обычно не нуждаются в отдельной страховке.") },
      { title: t("پذیرش بدون بررسی سلامت", "Aufnahme ohne Gesundheitsprüfung", "Приём без проверки здоровья"), body: t("بیماری قبلی یا سن بالا دلیل رد شدن یا حق بیمه بالاتر نیست.", "Vorerkrankungen oder hohes Alter führen nicht zu Ablehnung oder höheren Beiträgen.", "Прежние заболевания или возраст не приводят к отказу или повышению взноса.") },
    ],
    coverageGroups: [
      {
        title: t("خدمات پایه", "Standardleistungen", "Базовые услуги"),
        items: [t("ویزیت پزشک عمومی و متخصص", "Haus- und Facharztbesuche", "Приём терапевта и специалиста"), t("بستری در بیمارستان", "Stationäre Krankenhausbehandlung", "Стационарное лечение"), t("داروهای تجویزی", "Verschreibungspflichtige Medikamente", "Рецептурные лекарства"), t("چکاپ‌های پیشگیرانه دوره‌ای", "Regelmäßige Vorsorgeuntersuchungen", "Регулярные профилактические осмотры")],
      },
    ],
    goodFitFor: [
      t("اکثر کارمندان با قرارداد کاری رسمی", "Die meisten Angestellten mit regulärem Arbeitsvertrag", "Большинство сотрудников с официальным трудовым договором"),
      t("خانواده‌هایی که می‌خواهند همسر/فرزند را رایگان بیمه کنند", "Familien, die Partner/Kinder beitragsfrei mitversichern möchten", "Семьи, желающие бесплатно застраховать супруга/детей"),
      t("کسانی که هزینه ثابت و قابل پیش‌بینی می‌خواهند", "Wer feste, planbare Kosten bevorzugt", "Те, кто предпочитает фиксированные расходы"),
    ],
  },
  "insurance/health/dental": {
    germanTerm: "Zahnzusatzversicherung",
    whatItIs: t(
      "بیمه پایه دولتی (GKV) فقط بخشی از هزینه‌های دندانپزشکی — به‌خصوص ایمپلنت، روکش و پروتز — را پوشش می‌دهد. بیمه تکمیلی دندان این شکاف را پر می‌کند.",
      "Die gesetzliche Krankenversicherung übernimmt nur einen Teil der Zahnarztkosten — insbesondere bei Implantaten, Kronen und Zahnersatz. Eine Zahnzusatzversicherung schließt diese Lücke.",
      "Государственная страховка покрывает лишь часть стоматологических расходов — особенно имплантов, коронок и протезов. Дополнительная стоматологическая страховка закрывает этот пробел."
    ),
    benefits: [
      { title: t("پوشش ایمپلنت و پروتز", "Implantat- und Zahnersatz-Schutz", "Покрытие имплантов и протезов"), body: t("بخش عمده هزینه‌هایی که GKV پوشش نمی‌دهد.", "Der größte Kostenblock, den die GKV nicht abdeckt.", "Основная статья расходов, не покрываемая GKV.") },
      { title: t("جرم‌گیری و پیشگیری", "Prophylaxe", "Профилактика"), body: t("بسیاری از تعرفه‌ها هزینه جرم‌گیری سالانه را هم شامل می‌شوند.", "Viele Tarife übernehmen auch die jährliche professionelle Zahnreinigung.", "Многие тарифы также покрывают ежегодную профессиональную чистку.") },
      { title: t("بدون دوره انتظار طولانی", "Ohne lange Wartezeit (je nach Tarif)", "Без долгого периода ожидания (в зависимости от тарифа)"), body: t("برخی تعرفه‌ها از روز اول فعال هستند — به شرطی که هنوز درمانی در دست انجام نباشد.", "Manche Tarife gelten ab dem ersten Tag — sofern keine Behandlung bereits läuft.", "Некоторые тарифы действуют с первого дня, если лечение ещё не начато.") },
    ],
    coverageGroups: [
      {
        title: t("پوشش‌های اصلی", "Hauptleistungen", "Основные покрытия"),
        items: [t("ایمپلنت (Implantate)", "Implantate", "Импланты (Implantate)"), t("روکش و پروتز (Zahnersatz)", "Zahnersatz", "Коронки и протезы (Zahnersatz)"), t("جرم‌گیری سالانه (Prophylaxe)", "Prophylaxe", "Ежегодная чистка (Prophylaxe)"), t("درمان ریشه (Wurzelbehandlung)", "Wurzelbehandlung", "Лечение корневых каналов (Wurzelbehandlung)")],
      },
    ],
    goodFitFor: [
      t("کسانی که به ایمپلنت یا روکش نیاز دارند یا در آینده نزدیک نیاز خواهند داشت", "Wer Implantate oder Zahnersatz benötigt oder demnächst benötigen wird", "Те, кому нужны или скоро понадобятся импланты или протезы"),
      t("کسانی که می‌خواهند جرم‌گیری سالانه رایگان باشد", "Wer die jährliche Prophylaxe kostenfrei haben möchte", "Те, кто хочет бесплатную ежегодную чистку"),
      t("خانواده‌هایی که هزینه دندانپزشکی فرزندان را هم می‌خواهند پوشش دهند", "Familien, die auch die Zahnkosten ihrer Kinder absichern möchten", "Семьи, желающие также застраховать стоматологию детей"),
    ],
  },
  "energy/electricity": {
    whatItIs: t(
      "قرارداد برق خانگی از دو بخش تشکیل می‌شود: هزینه پایه سالانه (Grundpreis) و قیمت هر کیلووات‌ساعت مصرفی (Arbeitspreis). تعویض قرارداد بدون قطعی برق انجام می‌شود — تامین برق هرگز متوقف نمی‌شود، فقط شرکت تامین‌کننده عوض می‌شود.",
      "Ein Stromvertrag besteht aus zwei Teilen: dem jährlichen Grundpreis und dem Arbeitspreis pro verbrauchter Kilowattstunde. Der Anbieterwechsel erfolgt ohne Versorgungsunterbrechung — der Strom fließt weiter, nur der Lieferant ändert sich.",
      "Тариф на электричество состоит из двух частей: годовой базовой платы (Grundpreis) и цены за киловатт-час (Arbeitspreis). Смена поставщика происходит без перебоев в подаче — электричество не отключается, меняется только поставщик."
    ),
    benefits: [
      { title: t("گارانتی قیمت", "Preisgarantie", "Гарантия цены"), body: t("قیمت ثابت برای دوره‌ای مشخص، بدون افزایش ناگهانی.", "Fester Preis für einen bestimmten Zeitraum, ohne plötzliche Erhöhung.", "Фиксированная цена на определённый период, без внезапного повышения.") },
      { title: t("انرژی سبز", "Ökostrom", "Зелёная энергия"), body: t("گزینه‌های تولید ۱۰۰٪ از منابع تجدیدپذیر معمولا بدون هزینه اضافه.", "100 % Ökostrom-Optionen meist ohne Mehrkosten.", "Опции 100% возобновляемой энергии обычно без доплаты.") },
      { title: t("پاداش ورودی مشتری جدید", "Neukundenbonus", "Бонус для нового клиента"), body: t("بسیاری از شرکت‌ها به مشتری جدید پاداش نقدی یک‌باره می‌دهند.", "Viele Anbieter zahlen Neukunden einen einmaligen Bonus.", "Многие поставщики выплачивают новым клиентам разовый бонус.") },
    ],
    coverageGroups: [],
    goodFitFor: [
      t("کسانی که هنوز روی تعرفه پایه/محلی (Grundversorgung) هستند و بیشتر از حد معمول پرداخت می‌کنند", "Wer noch in der Grundversorgung ist und mehr als üblich zahlt", "Те, кто всё ещё на базовом тарифе и переплачивает"),
      t("کسانی که می‌خواهند قیمت ثابت و قابل پیش‌بینی داشته باشند", "Wer einen festen, planbaren Preis möchte", "Те, кто хочет фиксированную предсказуемую цену"),
      t("کسانی که ترجیح می‌دهند از انرژی تجدیدپذیر استفاده کنند", "Wer erneuerbare Energie bevorzugt", "Те, кто предпочитает возобновляемую энергию"),
    ],
    hasCalculator: true,
  },
  "energy/gas": {
    whatItIs: t(
      "قرارداد گاز طبیعی هم مثل برق از هزینه پایه سالانه و قیمت هر کیلووات‌ساعت تشکیل می‌شود. مصرف گاز به متراژ خانه و نوع گرمایش بستگی دارد، نه فقط تعداد افراد.",
      "Ein Gasvertrag besteht wie Strom aus Grundpreis und Arbeitspreis pro Kilowattstunde. Der Gasverbrauch hängt von der Wohnfläche und der Heizungsart ab, nicht nur von der Personenzahl.",
      "Договор на газ, как и на электричество, состоит из базовой платы и цены за киловатт-час. Расход газа зависит от площади жилья и типа отопления, а не только от количества жильцов."
    ),
    benefits: [
      { title: t("گارانتی قیمت", "Preisgarantie", "Гарантия цены"), body: t("قیمت ثابت در برابر نوسانات بازار انرژی.", "Fester Preis gegen Schwankungen am Energiemarkt.", "Фиксированная цена, защита от колебаний рынка.") },
      { title: t("بدون قطعی حین تعویض", "Kein Versorgungsunterbrechung beim Wechsel", "Без перебоев при смене поставщика"), body: t("گرمایش خانه در طول تعویض شرکت هرگز قطع نمی‌شود.", "Die Heizung läuft während des Anbieterwechsels ununterbrochen weiter.", "Отопление дома не прерывается во время смены поставщика.") },
    ],
    coverageGroups: [],
    goodFitFor: [
      t("کسانی که هنوز روی تعرفه پایه/محلی هستند", "Wer noch in der Grundversorgung ist", "Те, кто всё ещё на базовом тарифе"),
      t("کسانی که می‌خواهند هزینه گرمایش زمستان را از قبل بدانند", "Wer die Heizkosten im Winter im Voraus kennen möchte", "Те, кто хочет заранее знать расходы на отопление зимой"),
    ],
    hasCalculator: true,
  },

  // --- Insurance / Home ---------------------------------------------------
  "insurance/home/household-contents": {
    germanTerm: "Hausratversicherung",
    whatItIs: t(
      "بیمه وسایل منزل، اثاثیه، لوازم الکترونیکی و لباس داخل خانه‌ات را در برابر آتش‌سوزی، سرقت، آب‌گرفتگی و طوفان پوشش می‌دهد — جدا از خود ساختمان، که بیمه ساختمان مسکونی آن را پوشش می‌دهد.",
      "Die Hausratversicherung schützt Möbel, Elektronik und Kleidung in Ihrer Wohnung vor Feuer, Einbruch, Leitungswasser und Sturm — getrennt vom Gebäude selbst, das die Wohngebäudeversicherung abdeckt.",
      "Страхование домашнего имущества защищает мебель, технику и одежду в вашей квартире от пожара, кражи, повреждения водой и бури — отдельно от самого здания, которое покрывает страхование жилого здания."
    ),
    benefits: [
      { title: t("جبران به قیمت روز", "Ersatz zum Neuwert", "Возмещение по текущей стоимости"), body: t("معمولا هزینه خرید مجدد را پرداخت می‌کند، نه ارزش مستهلک‌شده فعلی.", "In der Regel wird der Wiederbeschaffungspreis erstattet, nicht der aktuelle Zeitwert.", "Обычно возмещается стоимость нового приобретения, а не текущая амортизированная.") },
      { title: t("پوشش سرقت با ورود اجباری", "Schutz bei Einbruchdiebstahl", "Защита при краже со взломом"), body: t("خسارت ناشی از سرقت با شکستن قفل یا در معمولا جزو پوشش اصلی است.", "Schäden durch Einbruch mit Aufbrechen von Schloss oder Tür sind meist im Grundschutz enthalten.", "Ущерб от кражи со взломом замка или двери обычно входит в базовую защиту.") },
      { title: t("پوشش شکستن شیشه", "Glasbruch oft inklusive", "Часто включено разбитие стекла"), body: t("بسیاری از تعرفه‌ها شکستن شیشه پنجره و درب را هم اضافه می‌کنند.", "Viele Tarife ergänzen den Schutz um Glasbruch bei Fenstern und Türen.", "Многие тарифы дополнительно покрывают разбитие оконного и дверного стекла.") },
    ],
    coverageGroups: [
      { title: t("خطرات اصلی پوشش داده‌شده", "Abgedeckte Grundgefahren", "Основные покрываемые риски"), items: [t("آتش‌سوزی (Feuer)", "Feuer", "Пожар (Feuer)"), t("آب‌گرفتگی از لوله (Leitungswasser)", "Leitungswasser", "Повреждение водой из труб (Leitungswasser)"), t("طوفان و تگرگ (Sturm/Hagel)", "Sturm/Hagel", "Буря и град (Sturm/Hagel)"), t("سرقت با ورود اجباری (Einbruchdiebstahl)", "Einbruchdiebstahl", "Кража со взломом (Einbruchdiebstahl)")] },
    ],
    goodFitFor: [
      t("مستاجران و صاحب‌خانه‌هایی با اثاثیه و لوازم برقی ارزشمند", "Mieter und Eigentümer mit wertvollem Hausrat", "Арендаторы и владельцы с ценным домашним имуществом"),
      t("کسانی که تازه به آپارتمان جدید نقل مکان کرده‌اند", "Wer gerade in eine neue Wohnung gezogen ist", "Те, кто недавно переехал в новую квартиру"),
    ],
  },
  "insurance/home/residential-building": {
    germanTerm: "Wohngebäudeversicherung",
    whatItIs: t(
      "بیمه ساختمان مسکونی خود سازه خانه — دیوارها، سقف، تاسیسات ثابت — را در برابر آتش‌سوزی، طوفان و آب‌گرفتگی پوشش می‌دهد. برای صاحب‌خانه‌هاست، نه مستاجران، و بانک‌ها معمولا برای وام مسکن آن را الزامی می‌دانند.",
      "Die Wohngebäudeversicherung schützt die Bausubstanz selbst — Wände, Dach, fest verbaute Anlagen — vor Feuer, Sturm und Leitungswasser. Sie richtet sich an Eigentümer, nicht an Mieter, und wird von Banken bei einer Baufinanzierung meist vorausgesetzt.",
      "Страхование жилого здания защищает саму конструкцию дома — стены, крышу, встроенные системы — от пожара, бури и повреждения водой. Оно предназначено для владельцев, а не арендаторов, и банки обычно требуют его для ипотеки."
    ),
    benefits: [
      { title: t("حفاظت از بزرگ‌ترین سرمایه‌ات", "Schutz Ihres größten Vermögenswerts", "Защита вашего самого крупного актива"), body: t("خانه معمولا گران‌ترین دارایی یک خانواده است.", "Das Haus ist meist der wertvollste Besitz einer Familie.", "Дом обычно самый ценный актив семьи.") },
      { title: t("اغلب الزام وام مسکن", "Meist Voraussetzung für Baufinanzierung", "Часто обязательно для ипотеки"), body: t("بانک‌ها برای اعطای وام مسکن این بیمه را می‌خواهند.", "Banken verlangen diese Versicherung für die Vergabe einer Baufinanzierung.", "Банки требуют эту страховку для выдачи ипотеки.") },
      { title: t("قابل ترکیب با بیمه حوادث طبیعی", "Kombinierbar mit Elementarschutz", "Можно объединить со страхованием от стихийных бедствий"), body: t("پوشش سیل و زلزله را می‌توان به‌عنوان افزونه اضافه کرد.", "Hochwasser- und Erdbebenschutz lässt sich als Zusatz ergänzen.", "Защиту от наводнения и землетрясения можно добавить как опцию.") },
    ],
    coverageGroups: [
      { title: t("خطرات اصلی پوشش داده‌شده", "Abgedeckte Grundgefahren", "Основные покрываемые риски"), items: [t("آتش‌سوزی و انفجار", "Feuer und Explosion", "Пожар и взрыв"), t("طوفان و تگرگ", "Sturm und Hagel", "Буря и град"), t("آب‌گرفتگی از لوله‌کشی", "Leitungswasser", "Повреждение от труб")] },
    ],
    goodFitFor: [t("صاحب‌خانه‌ها، به‌خصوص با وام مسکن فعال", "Eigentümer, insbesondere mit laufender Baufinanzierung", "Владельцы, особенно с активной ипотекой")],
  },
  "insurance/home/elementar": {
    germanTerm: "Elementarschadenversicherung",
    whatItIs: t(
      "این بیمه سیل، آب‌گرفتگی شدید و زلزله را پوشش می‌دهد — خطراتی که در بیمه استاندارد خانه یا ساختمان معمولا جزو پوشش پایه نیستند و باید جداگانه اضافه شوند.",
      "Diese Versicherung deckt Hochwasser, Starkregen und Erdbeben ab — Risiken, die in der Standard-Hausrat- oder Wohngebäudeversicherung meist nicht automatisch enthalten sind und separat ergänzt werden müssen.",
      "Эта страховка покрывает наводнение, сильные дожди и землетрясения — риски, которые обычно не включены в стандартную страховку дома или здания и требуют отдельного добавления."
    ),
    benefits: [
      { title: t("پر کردن یک شکاف واقعی", "Schließt eine echte Lücke", "Закрывает реальный пробел"), body: t("بسیاری تا زمان وقوع خسارت متوجه نمی‌شوند که این پوشش را ندارند.", "Viele merken erst nach einem Schaden, dass dieser Schutz fehlt.", "Многие узнают об отсутствии этой защиты только после ущерба.") },
      { title: t("اهمیت رو به افزایش", "Zunehmend relevant", "Растущая актуальность"), body: t("با افزایش سیل‌های شدید در سال‌های اخیر، اهمیت این پوشش بیشتر شده.", "Mit häufigeren Starkregenereignissen wird dieser Schutz immer wichtiger.", "С учащением сильных дождей эта защита становится всё важнее.") },
    ],
    goodFitFor: [t("کسانی که در مناطق مستعد سیل زندگی می‌کنند", "Wer in hochwassergefährdeten Gebieten lebt", "Те, кто живёт в зонах риска наводнений"), t("کسانی که می‌خواهند پوشش کامل‌تری داشته باشند", "Wer einen vollständigeren Schutz möchte", "Те, кто хочет более полную защиту")],
  },
  "insurance/home/rent-deposit-guarantee": {
    germanTerm: "Mietkautionsversicherung",
    whatItIs: t(
      "به‌جای پرداخت نقدی ودیعه اجاره (معمولا سه ماه اجاره)، یک ضمانت‌نامه ماهانه به صاحب‌خانه ارائه می‌شود — صاحب‌خانه همان تضمین را دارد، ولی پول تو قفل نمی‌شود.",
      "Statt der Barkaution (meist drei Monatsmieten) erhält der Vermieter eine monatliche Bürgschaft — er hat dieselbe Sicherheit, aber Ihr Geld bleibt frei verfügbar.",
      "Вместо наличного залога (обычно три месячные арендные платы) арендодатель получает ежемесячную гарантию — та же защита, но ваши деньги остаются свободными."
    ),
    benefits: [
      { title: t("آزاد کردن نقدینگی", "Liquidität bleibt frei", "Ликвидность остаётся свободной"), body: t("نیازی نیست چند ماه اجاره را یکجا کنار بگذاری.", "Sie müssen nicht mehrere Monatsmieten auf einmal zurücklegen.", "Не нужно откладывать несколько месячных плат сразу.") },
      { title: t("بدون پرداخت یکباره سنگین", "Keine große Einmalzahlung", "Без крупного разового платежа"), body: t("به‌جای مبلغ بزرگ، فقط هزینه ماهانه کوچکی پرداخت می‌کنی.", "Statt eines großen Betrags zahlen Sie nur eine kleine monatliche Gebühr.", "Вместо крупной суммы вы платите лишь небольшой ежемесячный взнос.") },
    ],
    goodFitFor: [t("تازه‌واردین به آلمان با پس‌انداز محدود", "Neuankömmlinge in Deutschland mit begrenzten Ersparnissen", "Новоприбывшие в Германию с ограниченными сбережениями"), t("هرکسی که نمی‌خواهد نقدینگی‌اش هنگام جابه‌جایی قفل شود", "Wer beim Umzug keine Liquidität binden möchte", "Все, кто не хочет замораживать средства при переезде")],
  },

  // --- Insurance / Pets ----------------------------------------------------
  "insurance/pets/dog-liability": {
    germanTerm: "Hundehaftpflichtversicherung",
    whatItIs: t(
      "خسارتی که سگ تو به افراد یا اموال دیگران وارد می‌کند را پوشش می‌دهد — در چند ایالت آلمان (Bundesland) قانونا اجباری است.",
      "Diese Versicherung deckt Schäden, die Ihr Hund Dritten oder deren Eigentum zufügt — in mehreren Bundesländern gesetzlich vorgeschrieben.",
      "Эта страховка покрывает ущерб, который ваша собака причиняет третьим лицам или их имуществу — в нескольких федеральных землях обязательна по закону."
    ),
    benefits: [
      { title: t("در برخی ایالت‌ها اجباری", "In manchen Bundesländern Pflicht", "В некоторых землях обязательна"), body: t("بدون آن ممکن است اصلا اجازه نگهداری سگ نداشته باشی.", "Ohne sie dürfen Sie in manchen Bundesländern gar keinen Hund halten.", "Без неё в некоторых землях нельзя вообще держать собаку.") },
      { title: t("پوشش خسارت‌های سنگین", "Schutz vor hohen Schadenssummen", "Защита от крупных сумм ущерба"), body: t("مثلا اگر سگ باعث تصادف رانندگی شود، هزینه‌ها می‌تواند بسیار زیاد باشد.", "Verursacht der Hund etwa einen Verkehrsunfall, können die Kosten sehr hoch ausfallen.", "Если собака, например, станет причиной ДТП, расходы могут быть очень высокими.") },
    ],
    coverageGroups: [{ title: t("پوشش‌های اصلی", "Hauptleistungen", "Основные покрытия"), items: [t("خسارت جانی به دیگران", "Personenschäden Dritter", "Вред здоровью третьих лиц"), t("خسارت مالی به دیگران", "Sachschäden Dritter", "Материальный ущерб третьим лицам"), t("هزینه دفاع حقوقی", "Abwehr unberechtigter Ansprüche", "Расходы на юридическую защиту")] }],
    goodFitFor: [t("تمام صاحبان سگ (در برخی ایالت‌ها اجباری)", "Alle Hundehalter (in manchen Bundesländern Pflicht)", "Все владельцы собак (обязательно в некоторых землях)")],
  },
  "insurance/pets/dog-health": {
    germanTerm: "Hundekrankenversicherung",
    whatItIs: t(
      "هزینه‌های دامپزشکی برای بیماری و حوادث سگ را پوشش می‌دهد — هزینه جراحی یا درمان تخصصی در آلمان می‌تواند به‌سرعت بالا برود.",
      "Diese Versicherung übernimmt Tierarztkosten bei Krankheit und Unfällen — Operationen oder Spezialbehandlungen können in Deutschland schnell teuer werden.",
      "Эта страховка покрывает ветеринарные расходы при болезни и несчастных случаях — операции и специализированное лечение в Германии могут быстро подорожать."
    ),
    benefits: [
      { title: t("هزینه قابل پیش‌بینی", "Planbare Kosten", "Предсказуемые расходы"), body: t("به‌جای یک قبض ناگهانی سنگین، هزینه ماهانه ثابت داری.", "Statt einer plötzlichen hohen Rechnung zahlen Sie einen festen Monatsbeitrag.", "Вместо внезапного крупного счёта — фиксированный ежемесячный взнос.") },
      { title: t("برخی تعرفه‌ها مراقبت‌های روتین را هم پوشش می‌دهند", "Manche Tarife decken auch Vorsorge ab", "Некоторые тарифы покрывают и профилактику"), body: t("واکسیناسیون و چکاپ سالانه گاهی جزو پوشش است.", "Impfungen und Jahrescheck sind teils inklusive.", "Прививки и ежегодный осмотр иногда включены.") },
    ],
    goodFitFor: [t("صاحبان سگ‌های جوان یا نژادهای خاص با ریسک بیماری بیشتر", "Halter junger Hunde oder Rassen mit erhöhtem Risiko", "Владельцы молодых собак или пород с повышенным риском"), t("کسانی که می‌خواهند از یک قبض دامپزشکی سنگین در امان باشند", "Wer eine hohe Tierarztrechnung vermeiden möchte", "Те, кто хочет избежать крупного ветеринарного счёта")],
  },
  "insurance/pets/cat": {
    germanTerm: "Katzenversicherung",
    whatItIs: t(
      "هزینه‌های دامپزشکی و مسئولیت مدنی مربوط به گربه‌ات را پوشش می‌دهد — به‌خصوص برای گربه‌هایی که بیرون از خانه هم رفت‌وآمد دارند و ریسک حادثه بیشتری دارند.",
      "Diese Versicherung deckt Tierarztkosten und Haftpflichtschäden Ihrer Katze ab — besonders relevant für Freigänger mit höherem Unfallrisiko.",
      "Эта страховка покрывает ветеринарные расходы и ответственность за вашу кошку — особенно актуально для гуляющих кошек с повышенным риском несчастных случаев."
    ),
    benefits: [
      { title: t("پوشش گربه‌های آزاد در بیرون", "Schutz für Freigänger", "Защита для гуляющих кошек"), body: t("گربه‌هایی که بیرون می‌روند بیشتر در معرض حادثه و دعوا هستند.", "Freigänger sind häufiger Unfällen und Revierkämpfen ausgesetzt.", "Гуляющие кошки чаще подвержены травмам и дракам.") },
      { title: t("هزینه قابل پیش‌بینی درمان", "Planbare Behandlungskosten", "Предсказуемые расходы на лечение"), body: t("به‌جای پرداخت یکباره، هزینه‌ات ثابت و از قبل مشخص است.", "Statt einer Einmalzahlung zahlen Sie einen festen, planbaren Betrag.", "Вместо разового платежа — фиксированная предсказуемая сумма.") },
    ],
    goodFitFor: [t("گربه‌های آزاد در بیرون از خانه", "Freigänger-Katzen", "Гуляющие на улице кошки"), t("کسانی که می‌خواهند هزینه‌های دامپزشکی را پیش‌بینی‌پذیر کنند", "Wer Tierarztkosten planbar machen möchte", "Те, кто хочет сделать ветеринарные расходы предсказуемыми")],
  },

  // --- Insurance / Liability & legal ---------------------------------------
  "insurance/liability-legal/personal-liability": {
    germanTerm: "Privathaftpflichtversicherung",
    whatItIs: t(
      "خسارت‌هایی که ناخواسته به دیگران یا اموال آن‌ها وارد می‌کنی را پوشش می‌دهد — مثلا شکستن چیزی در خانه دوست یا آسیب رساندن به کسی به‌طور اتفاقی. یکی از پرتوصیه‌ترین بیمه‌ها در آلمان است.",
      "Diese Versicherung deckt Schäden ab, die Sie unabsichtlich anderen Personen oder deren Eigentum zufügen — etwa etwas bei Freunden kaputtmachen oder jemanden versehentlich verletzen. Eine der meistempfohlenen Versicherungen in Deutschland.",
      "Эта страховка покрывает ущерб, непреднамеренно причинённый вами другим людям или их имуществу — например, что-то сломать у друзей или случайно кого-то травмировать. Одна из самых рекомендуемых страховок в Германии."
    ),
    benefits: [
      { title: t("پوشش بسیار گسترده زندگی روزمره", "Sehr breiter Alltagsschutz", "Очень широкая защита в повседневной жизни"), body: t("تقریبا هر خسارت ناخواسته‌ای به دیگران را پوشش می‌دهد.", "Deckt fast jeden unabsichtlichen Schaden gegenüber Dritten ab.", "Покрывает почти любой непреднамеренный ущерб третьим лицам.") },
      { title: t("هزینه بسیار پایین نسبت به پوشش", "Sehr günstig im Verhältnis zum Schutz", "Очень доступна по цене за такую защиту"), body: t("یکی از ارزان‌ترین بیمه‌ها با بیشترین بازدهی حفاظتی.", "Eine der günstigsten Versicherungen mit dem größten Schutzeffekt.", "Одна из самых доступных страховок с наибольшей защитой.") },
      { title: t("معمولا شامل خانواده هم می‌شود", "Meist auch für die Familie", "Обычно распространяется и на семью"), body: t("همسر و فرزندان اغلب بدون هزینه اضافه تحت پوشش هستند.", "Partner und Kinder sind oft ohne Mehrkosten mitversichert.", "Партнёр и дети часто застрахованы без доплаты.") },
    ],
    goodFitFor: [t("تقریبا هرکسی که در آلمان زندگی می‌کند — یکی از پایه‌ای‌ترین بیمه‌های توصیه‌شده", "Praktisch jeder in Deutschland — eine der grundlegendsten empfohlenen Versicherungen", "Практически каждый в Германии — одна из самых базовых рекомендуемых страховок")],
  },
  "insurance/liability-legal/service-liability": {
    germanTerm: "Diensthaftpflichtversicherung",
    whatItIs: t(
      "خسارت‌هایی که کارمندان دولت (Beamte) حین انجام وظیفه ممکن است مسئول آن باشند را پوشش می‌دهد — مسئولیت آن‌ها با کارمندان بخش خصوصی متفاوت است.",
      "Diese Versicherung deckt Schäden ab, für die Beamte im Rahmen ihrer dienstlichen Tätigkeit haften können — ihre Haftung unterscheidet sich von der Angestellter im Privatsektor.",
      "Эта страховка покрывает ущерб, за который могут нести ответственность госслужащие при исполнении обязанностей — их ответственность отличается от сотрудников частного сектора."
    ),
    benefits: [{ title: t("متناسب با شرایط حقوقی خاص کارمندان دولت", "Zugeschnitten auf die besondere Rechtslage von Beamten", "Учитывает особый правовой статус госслужащих"), body: t("پوشش استاندارد مسئولیت مدنی این حالت خاص را پوشش نمی‌دهد.", "Der Standard-Privathaftpflichtschutz deckt diesen Sonderfall nicht ab.", "Стандартная личная ответственность не покрывает этот особый случай.") }],
    goodFitFor: [t("کارمندان دولت (Beamte) و بخش عمومی", "Beamte und Angestellte im öffentlichen Dienst", "Госслужащие и сотрудники госсектора")],
  },
  "insurance/liability-legal/legal-protection": {
    germanTerm: "Rechtsschutzversicherung",
    whatItIs: t(
      "هزینه وکیل و دادرسی در دعاوی حقوقی را پوشش می‌دهد — بسته به تعرفه می‌تواند حوزه‌های کاری، اجاره، یا رانندگی را پوشش دهد.",
      "Diese Versicherung übernimmt Anwalts- und Gerichtskosten bei Rechtsstreitigkeiten — je nach Tarif für Arbeitsrecht, Mietrecht oder Verkehrsrecht.",
      "Эта страховка покрывает расходы на адвоката и суд в юридических спорах — в зависимости от тарифа: трудовое право, аренда или дорожное право."
    ),
    benefits: [
      { title: t("امکان‌پذیر کردن اقدام حقوقی", "Macht rechtliches Vorgehen finanziell möglich", "Делает судебные действия финансово возможными"), body: t("بدون این پوشش، هزینه دادگاه می‌تواند مانع دفاع از حق تو شود.", "Ohne diesen Schutz können Gerichtskosten von der Durchsetzung Ihres Rechts abhalten.", "Без этой защиты судебные расходы могут помешать отстоять свои права.") },
      { title: t("پوشش چند حوزه زندگی", "Deckt mehrere Lebensbereiche ab", "Покрывает несколько сфер жизни"), body: t("بسته به تعرفه، کار، اجاره و رانندگی را می‌توان ترکیب کرد.", "Je nach Tarif lassen sich Beruf, Miete und Verkehr kombinieren.", "В зависимости от тарифа можно объединить работу, аренду и вождение.") },
    ],
    coverageGroups: [{ title: t("حوزه‌های رایج پوشش", "Häufige Schutzbereiche", "Распространённые области защиты"), items: [t("حقوق کار (Arbeitsrecht)", "Arbeitsrecht", "Трудовое право (Arbeitsrecht)"), t("حقوق اجاره (Mietrecht)", "Mietrecht", "Право аренды (Mietrecht)"), t("حقوق رانندگی (Verkehrsrecht)", "Verkehrsrecht", "Дорожное право (Verkehrsrecht)")] }],
    goodFitFor: [t("مستاجرانی که نگران اختلاف با صاحب‌خانه هستند", "Mieter mit Sorge vor Streit mit dem Vermieter", "Арендаторы, опасающиеся споров с арендодателем"), t("کارمندان و رانندگان", "Angestellte und Autofahrer", "Сотрудники и водители")],
  },

  // --- Insurance / Health supplements --------------------------------------
  "insurance/health/health-supplement": {
    germanTerm: "Krankenzusatzversicherung",
    whatItIs: t(
      "پوشش‌های مشخصی که بیمه پایه دولتی (GKV) کامل پوشش نمی‌دهد را اضافه می‌کند — مثلا دندان، بستری یا طب سنتی — بدون نیاز به تعویض کامل به PKV.",
      "Diese Versicherung ergänzt gezielt Leistungen, die die gesetzliche Krankenversicherung nicht vollständig abdeckt — etwa Zahn, Krankenhaus oder Heilpraktiker — ohne komplett zur PKV zu wechseln.",
      "Эта страховка точечно дополняет услуги, не полностью покрываемые государственной страховкой — например, стоматологию, стационар или натуропатию — без полного перехода на PKV."
    ),
    benefits: [
      { title: t("پر کردن شکاف مشخص، بدون تعویض کامل بیمه", "Gezielte Lücke schließen, ohne komplett zu wechseln", "Точечное закрытие пробела без полной смены страховки"), body: t("همچنان روی GKV می‌مانی و فقط پوشش‌های خاص را اضافه می‌کنی.", "Sie bleiben in der GKV und ergänzen nur gezielt fehlende Leistungen.", "Вы остаётесь на GKV, лишь добавляя нужные покрытия.") },
    ],
    goodFitFor: [t("اعضای GKV که می‌خواهند شکاف‌های خاصی را بدون تعویض کامل بیمه پر کنند", "GKV-Mitglieder, die gezielte Lücken ohne Vollwechsel schließen möchten", "Члены GKV, желающие закрыть конкретные пробелы без полной смены")],
  },
  "insurance/health/hospital-allowance": {
    germanTerm: "Krankenhaustagegeld",
    whatItIs: t(
      "برای هر روز بستری در بیمارستان، یک مبلغ نقدی ثابت پرداخت می‌کند — پولی که هر جور بخواهی می‌توانی خرج کنی، برخلاف بیمه درمانی معمولی که فقط هزینه پزشکی را می‌دهد.",
      "Diese Versicherung zahlt für jeden Tag im Krankenhaus einen festen Bargeldbetrag — frei verwendbar, anders als die reguläre Krankenversicherung, die nur medizinische Kosten übernimmt.",
      "Эта страховка выплачивает фиксированную сумму наличными за каждый день в больнице — деньги можно тратить как угодно, в отличие от обычной страховки, покрывающей только медицинские расходы."
    ),
    benefits: [
      { title: t("پول آزاد و بدون محدودیت", "Frei verfügbares Geld", "Свободные средства без ограничений"), body: t("می‌توانی برایش از کمک در خانه تا جبران کاهش درآمد استفاده کنی.", "Nutzbar für Haushaltshilfe bis hin zum Ausgleich von Einkommensausfall.", "Можно использовать на помощь по дому или компенсацию потери дохода.") },
      { title: t("مفید برای فریلنسرها", "Besonders für Selbstständige nützlich", "Особенно полезно для самозанятых"), body: t("فریلنسرها معمولا حقوق دوران بیماری از کارفرما ندارند.", "Selbstständige haben in der Regel keine Lohnfortzahlung im Krankheitsfall.", "У самозанятых обычно нет оплаты больничного от работодателя.") },
    ],
    goodFitFor: [t("فریلنسرها و صاحبان مشاغل آزاد", "Selbstständige und Freiberufler", "Самозанятые и лица свободных профессий"), t("هرکسی که می‌خواهد یک ذخیره مالی اضافه هنگام بستری داشته باشد", "Wer bei einem Krankenhausaufenthalt ein finanzielles Polster möchte", "Те, кто хочет финансовую подушку при госпитализации")],
  },
  "insurance/health/naturopath-glasses": {
    germanTerm: "Heilpraktiker- und Brillenzusatzversicherung",
    whatItIs: t(
      "هزینه‌های طب سنتی (Heilpraktiker)، هومیوپاتی و عینک/لنز را پوشش می‌دهد — مواردی که در بیمه پایه دولتی معمولا شامل نمی‌شوند یا خیلی محدود پوشش داده می‌شوند.",
      "Diese Versicherung übernimmt Kosten für Heilpraktiker, Homöopathie und Brillen/Kontaktlinsen — Leistungen, die die gesetzliche Krankenversicherung meist nicht oder nur sehr begrenzt abdeckt.",
      "Эта страховка покрывает расходы на натуропатов, гомеопатию и очки/линзы — услуги, которые государственная страховка обычно не покрывает или покрывает очень ограниченно."
    ),
    benefits: [
      { title: t("پوشش طب جایگزین", "Abdeckung alternativer Medizin", "Покрытие альтернативной медицины"), body: t("هزینه‌های Heilpraktiker و هومیوپاتی که GKV معمولا رد می‌کند.", "Kosten für Heilpraktiker und Homöopathie, die die GKV meist ablehnt.", "Расходы на натуропатов и гомеопатию, обычно отклоняемые GKV.") },
      { title: t("کمک‌هزینه منظم عینک", "Regelmäßiger Zuschuss für Brillen", "Регулярная компенсация на очки"), body: t("خرید عینک یا لنز جدید هر چند سال یک‌بار پوشش داده می‌شود.", "Der Kauf neuer Brillen oder Linsen wird alle paar Jahre bezuschusst.", "Покупка новых очков или линз субсидируется раз в несколько лет.") },
    ],
    goodFitFor: [t("کسانی که از طب سنتی و هومیوپاتی استفاده می‌کنند", "Wer Heilpraktiker oder Homöopathie nutzt", "Те, кто пользуется натуропатией или гомеопатией"), t("کسانی که مرتب به عینک یا لنز جدید نیاز دارند", "Wer regelmäßig neue Brillen oder Linsen benötigt", "Те, кому регулярно нужны новые очки или линзы")],
  },

  // --- Insurance / Risk & provision ----------------------------------------
  "insurance/risk-provision/term-life": {
    germanTerm: "Risikolebensversicherung",
    whatItIs: t(
      "اگر در طول مدت قرارداد فوت کنی، یک مبلغ یکجا به خانواده‌ات پرداخت می‌شود — بدون بخش پس‌انداز، فقط پوشش خالص، که همین آن را نسبتا ارزان می‌کند.",
      "Stirbt die versicherte Person während der Laufzeit, erhält die Familie eine Einmalzahlung — ohne Sparanteil, nur reiner Schutz, was die Versicherung vergleichsweise günstig macht.",
      "Если застрахованный умирает в течение срока действия, семья получает единовременную выплату — без накопительной части, только чистая защита, что делает страховку сравнительно доступной."
    ),
    benefits: [
      { title: t("محافظت مالی خانواده", "Finanzielle Absicherung der Familie", "Финансовая защита семьи"), body: t("خانواده‌ات با درآمد از دست‌رفته تنها نمی‌ماند.", "Ihre Familie steht bei Einkommensverlust nicht allein da.", "Ваша семья не останется одна при потере дохода.") },
      { title: t("اغلب الزام وام مسکن", "Oft von Banken bei Baufinanzierung verlangt", "Часто требуется банками для ипотеки"), body: t("بانک‌ها معمولا برای اعطای وام مسکن این بیمه را می‌خواهند.", "Banken setzen diese Versicherung meist für eine Baufinanzierung voraus.", "Банки обычно требуют эту страховку для ипотеки.") },
      { title: t("قیمت پایین نسبت به مبلغ پوشش", "Günstig im Verhältnis zur Versicherungssumme", "Доступна по цене относительно суммы покрытия"), body: t("چون بخش پس‌انداز ندارد، هزینه‌اش نسبت به مبلغ پوشش پایین است.", "Ohne Sparanteil ist der Beitrag im Verhältnis zur Deckungssumme niedrig.", "Без накопительной части взнос низкий относительно суммы покрытия.") },
    ],
    goodFitFor: [t("کسانی با وام مسکن فعال", "Wer eine laufende Baufinanzierung hat", "Те, у кого есть действующая ипотека"), t("والدین و هرکسی که درآمدش خانواده را تامین می‌کند", "Eltern und alle, deren Einkommen die Familie trägt", "Родители и все, чей доход содержит семью")],
  },
  "insurance/risk-provision/accident": {
    germanTerm: "Unfallversicherung",
    whatItIs: t(
      "ازکارافتادگی دائم ناشی از حوادث زندگی روزمره و اوقات فراغت را پوشش می‌دهد — برخلاف بیمه درمانی که فقط هزینه درمان را می‌دهد، این یکی برای پیامدهای بلندمدت حادثه پرداخت می‌کند.",
      "Diese Versicherung deckt dauerhafte Invalidität durch Unfälle im Alltag und in der Freizeit ab — anders als die Krankenversicherung, die nur Behandlungskosten übernimmt, zahlt sie für langfristige Unfallfolgen.",
      "Эта страховка покрывает постоянную инвалидность из-за несчастных случаев в быту и на отдыхе — в отличие от медстраховки, покрывающей лишь лечение, она выплачивает за долгосрочные последствия."
    ),
    benefits: [
      { title: t("پوشش ۲۴ ساعته زندگی", "Rund-um-die-Uhr-Schutz", "Круглосуточная защита"), body: t("چه در خانه، چه در ورزش، چه در تعطیلات — نه فقط محل کار.", "Ob zu Hause, beim Sport oder im Urlaub — nicht nur am Arbeitsplatz.", "Дома, на спорте или в отпуске — не только на работе.") },
      { title: t("مکمل بیمه ازکارافتادگی شغلی", "Ergänzung zur Berufsunfähigkeit", "Дополнение к страхованию нетрудоспособности"), body: t("حوادث فقط بخشی از دلایل ازکارافتادگی هستند؛ این پوشش مکمل آن است.", "Unfälle sind nur ein Teil der Ursachen für Erwerbsunfähigkeit — diese Versicherung ergänzt das.", "Несчастные случаи — лишь часть причин потери трудоспособности, эта страховка дополняет защиту.") },
    ],
    goodFitFor: [t("افراد فعال از نظر ورزشی", "Sportlich aktive Menschen", "Спортивно активные люди"), t("هرکسی که می‌خواهد در برابر پیامدهای بلندمدت حادثه محافظت داشته باشد", "Wer sich gegen langfristige Unfallfolgen absichern möchte", "Те, кто хочет защититься от долгосрочных последствий травм")],
  },
  "insurance/risk-provision/occupational-disability": {
    germanTerm: "Berufsunfähigkeitsversicherung",
    whatItIs: t(
      "اگر به‌دلیل بیماری یا آسیب دیگر نتوانی شغل فعلی‌ات را انجام دهی، درآمد ماهانه پرداخت می‌کند. حمایت دولتی از ازکارافتادگی در آلمان بسیار محدود است، پس این پوشش عملا جای آن را می‌گیرد.",
      "Diese Versicherung zahlt eine monatliche Rente, wenn Sie Ihren aktuellen Beruf krankheits- oder unfallbedingt nicht mehr ausüben können. Die staatliche Erwerbsminderungsrente ist in Deutschland sehr begrenzt, weshalb diese Versicherung praktisch an ihre Stelle tritt.",
      "Эта страховка выплачивает ежемесячный доход, если вы больше не можете выполнять свою текущую работу из-за болезни или травмы. Государственная пенсия по нетрудоспособности в Германии очень ограничена, поэтому эта страховка фактически заменяет её."
    ),
    benefits: [
      { title: t("محافظت از بزرگ‌ترین دارایی‌ات: توانایی کار کردن", "Schützt Ihr größtes Kapital: Ihre Arbeitskraft", "Защищает ваш главный актив — способность работать"), body: t("درآمد آینده‌ات معمولا ارزشمندتر از هر دارایی دیگری است.", "Ihr zukünftiges Einkommen ist meist wertvoller als jeder andere Besitz.", "Ваш будущий доход обычно ценнее любого другого имущества.") },
      { title: t("ارزان‌تر در سنین جوانی", "Günstiger in jungen Jahren", "Дешевле в молодом возрасте"), body: t("هرچه زودتر و سالم‌تر ثبت‌نام کنی، هزینه ماهانه کمتری خواهی داشت.", "Je früher und gesünder Sie abschließen, desto niedriger der Monatsbeitrag.", "Чем раньше и здоровее вы оформите полис, тем ниже ежемесячный взнос.") },
      { title: t("تعریف مبتنی بر شغل خودت", "Bezug auf Ihren konkreten Beruf", "Привязка к вашей конкретной профессии"), body: t("پرداخت بر اساس ناتوانی در همان شغل مشخص تو تعریف می‌شود، نه یک تعریف عمومی.", "Die Leistung bezieht sich auf Ihren konkreten Beruf, nicht auf eine allgemeine Definition.", "Выплата зависит от вашей конкретной профессии, а не общего определения.") },
    ],
    goodFitFor: [t("هرکسی که درآمدش به توانایی کار کردنش وابسته است", "Jeder, dessen Einkommen von der Arbeitsfähigkeit abhängt", "Каждый, чей доход зависит от способности работать"), t("افراد در ابتدای مسیر شغلی (هزینه پایین‌تر)", "Berufseinsteiger (niedrigere Kosten)", "Начинающие карьеру (более низкая стоимость)")],
  },
  "insurance/risk-provision/basic-disability": {
    germanTerm: "Grundfähigkeitsversicherung",
    whatItIs: t(
      "جایگزینی ساده‌تر و ارزان‌تر برای بیمه ازکارافتادگی شغلی — به‌جای تمرکز بر شغل خاص تو، بر از دست دادن توانایی‌های پایه مثل دیدن، شنیدن یا راه رفتن تمرکز دارد.",
      "Eine einfachere, günstigere Alternative zur Berufsunfähigkeitsversicherung — statt auf Ihren konkreten Beruf bezieht sie sich auf den Verlust von Grundfähigkeiten wie Sehen, Hören oder Gehen.",
      "Более простая и доступная альтернатива страхованию от нетрудоспособности — вместо конкретной профессии она ориентирована на потерю базовых способностей: зрения, слуха, ходьбы."
    ),
    benefits: [
      { title: t("قابل دسترس‌تر", "Leichter zugänglich", "Более доступна"), body: t("برای مشاغل یا شرایط سلامتی که واجد شرایط بیمه ازکارافتادگی شغلی نیستند، گزینه بهتری است.", "Für Berufe oder Gesundheitszustände, die für eine BU-Versicherung nicht infrage kommen, oft die bessere Option.", "Лучший вариант для профессий или состояний здоровья, не подходящих под страхование от профнепригодности.") },
      { title: t("هزینه پایین‌تر", "Niedrigere Kosten", "Более низкая стоимость"), body: t("معمولا ارزان‌تر از بیمه ازکارافتادگی شغلی است.", "In der Regel günstiger als die Berufsunfähigkeitsversicherung.", "Обычно дешевле страхования от профнепригодности.") },
    ],
    goodFitFor: [t("کسانی که به‌دلیل شغل یا سلامت نمی‌توانند بیمه ازکارافتادگی شغلی بگیرند", "Wer aus beruflichen oder gesundheitlichen Gründen keine BU-Versicherung bekommt", "Те, кто не может оформить страхование от профнепригодности по профессии или здоровью")],
  },
  "insurance/risk-provision/death-benefit": {
    germanTerm: "Sterbegeldversicherung",
    whatItIs: t(
      "هزینه‌های مراسم تشییع و کفن‌ودفن را پوشش می‌دهد — یک مبلغ مشخص که به خانواده پرداخت می‌شود تا نیازی به پرداخت این هزینه‌ها از جیب نداشته باشند.",
      "Diese Versicherung deckt die Kosten für Bestattung und Beerdigung ab — ein fester Betrag wird an die Angehörigen ausgezahlt, damit diese Kosten nicht aus eigener Tasche getragen werden müssen.",
      "Эта страховка покрывает расходы на похороны и погребение — фиксированная сумма выплачивается родственникам, чтобы им не пришлось платить из своего кармана."
    ),
    benefits: [{ title: t("سبک کردن بار مالی خانواده", "Entlastet die Familie finanziell", "Снимает финансовую нагрузку с семьи"), body: t("هزینه مراسم در آلمان می‌تواند غیرمنتظره سنگین باشد.", "Bestattungskosten in Deutschland können überraschend hoch ausfallen.", "Расходы на похороны в Германии могут оказаться неожиданно высокими.") }],
    goodFitFor: [t("افراد مسن‌تر که می‌خواهند این موضوع را از پیش حل کنند", "Ältere Menschen, die dies im Voraus regeln möchten", "Пожилые люди, желающие решить этот вопрос заранее")],
  },

  // --- Insurance / Vehicles -------------------------------------------------
  "insurance/vehicles/car": {
    germanTerm: "Kfz-Versicherung",
    whatItIs: t(
      "بیمه خودرو در آلمان سه سطح دارد: شخص ثالث (Haftpflicht، قانونا اجباری)، بدنه جزئی (Teilkasko: سرقت، شکستن شیشه، بلایای طبیعی) و بدنه کامل (Vollkasko: شامل تصادف با تقصیر خودت هم می‌شود).",
      "Die Kfz-Versicherung in Deutschland hat drei Stufen: Haftpflicht (gesetzlich vorgeschrieben), Teilkasko (Diebstahl, Glasbruch, Naturgefahren) und Vollkasko (deckt zusätzlich selbst verschuldete Unfälle ab).",
      "Автострахование в Германии имеет три уровня: обязательная ответственность (Haftpflicht), частичное КАСКО (кража, разбитие стекла, стихийные бедствия) и полное КАСКО (включая ДТП по своей вине)."
    ),
    benefits: [
      { title: t("شخص ثالث قانونا اجباری است", "Haftpflicht ist gesetzlich Pflicht", "Ответственность обязательна по закону"), body: t("بدون آن اصلا اجازه رانندگی نداری.", "Ohne sie dürfen Sie gar nicht fahren.", "Без неё вообще нельзя ездить.") },
      { title: t("بدنه کامل اغلب الزام وام خودرو", "Vollkasko oft bei Finanzierung Pflicht", "Полное КАСКО часто обязательно при кредите"), body: t("بانک‌ها برای خودروهای قسطی معمولا Vollkasko می‌خواهند.", "Banken verlangen bei finanzierten Fahrzeugen meist Vollkasko.", "Банки обычно требуют полное КАСКО для авто в кредит.") },
      { title: t("پاداش بدون خسارت", "Schadenfreiheitsrabatt", "Скидка за безаварийную езду"), body: t("هرچه سال‌های بدون خسارت بیشتر باشد، حق بیمه پایین‌تر می‌آید.", "Je mehr unfallfreie Jahre, desto niedriger der Beitrag.", "Чем больше лет без аварий, тем ниже взнос.") },
    ],
    coverageGroups: [
      { title: t("سه سطح پوشش", "Die drei Schutzstufen", "Три уровня защиты"), items: [t("شخص ثالث (Haftpflicht) — اجباری", "Haftpflicht — Pflicht", "Ответственность (Haftpflicht) — обязательна"), t("بدنه جزئی (Teilkasko) — سرقت، شیشه، بلایای طبیعی", "Teilkasko — Diebstahl, Glasbruch, Naturgefahren", "Частичное КАСКО — кража, стекло, стихийные бедствия"), t("بدنه کامل (Vollkasko) — شامل تصادف با تقصیر خودت", "Vollkasko — inkl. selbstverschuldeter Unfälle", "Полное КАСКО — включая ДТП по своей вине")] },
    ],
    goodFitFor: [t("همه صاحبان خودرو (شخص ثالث اجباری است)", "Alle Fahrzeughalter (Haftpflicht ist Pflicht)", "Все владельцы авто (ответственность обязательна)"), t("خودروهای نو یا قسطی (اغلب نیاز به Vollkasko)", "Neue oder finanzierte Fahrzeuge (meist Vollkasko nötig)", "Новые или кредитные авто (обычно нужно полное КАСКО)")],
  },
  "insurance/vehicles/roadside-assistance": {
    germanTerm: "Schutzbrief/Automobilclub",
    whatItIs: t(
      "کمک هنگام خرابی خودرو، تصادف یا اتمام سوخت در جاده — شامل یدک‌کش، وسیله جایگزین و گاهی هزینه هتل در سفرهای طولانی.",
      "Hilfe bei Panne, Unfall oder Kraftstoffmangel unterwegs — inklusive Abschleppen, Ersatzmobilität und bei längeren Fahrten teils Hotelkosten.",
      "Помощь при поломке, аварии или нехватке топлива в пути — включая эвакуацию, замену транспорта и иногда расходы на гостиницу при дальних поездках."
    ),
    benefits: [
      { title: t("آرامش خاطر در جاده", "Sicherheit unterwegs", "Спокойствие в дороге"), body: t("در صورت خرابی، فقط یک تماس تا کمک فاصله داری.", "Bei einer Panne sind Sie nur einen Anruf von Hilfe entfernt.", "При поломке помощь всего в одном звонке.") },
      { title: t("مفید برای سفرهای طولانی", "Nützlich auf langen Strecken", "Полезно для дальних поездок"), body: t("برای رانندگان پرمسافت یا خودروهای قدیمی‌تر ارزش بیشتری دارد.", "Besonders wertvoll für Vielfahrer oder ältere Fahrzeuge.", "Особенно ценно для активных водителей или старых авто.") },
    ],
    goodFitFor: [t("رانندگان پرمسافت", "Vielfahrer", "Активные водители"), t("صاحبان خودروهای قدیمی‌تر", "Halter älterer Fahrzeuge", "Владельцы старых автомобилей")],
  },
  "insurance/vehicles/bicycle": {
    germanTerm: "Fahrradversicherung",
    whatItIs: t(
      "پوشش سرقت و خرابی برای دوچرخه و دوچرخه برقی — بیمه اثاثیه منزل معمولا سقف پایینی برای دوچرخه دارد یا سرقت بیرون از خانه را پوشش نمی‌دهد، پس یک بیمه جدا لازم است.",
      "Diese Versicherung deckt Diebstahl und Schäden für Fahrrad und E-Bike ab — die Hausratversicherung hat für Fahrräder meist eine niedrige Obergrenze oder deckt Diebstahl außer Haus gar nicht ab.",
      "Эта страховка покрывает кражу и повреждения велосипеда и электровелосипеда — страхование имущества обычно имеет низкий лимит для велосипедов или не покрывает кражу вне дома."
    ),
    benefits: [
      { title: t("اهمیت بیشتر برای دوچرخه‌های برقی گران", "Besonders relevant bei teuren E-Bikes", "Особенно актуально для дорогих электровелосипедов"), body: t("قیمت دوچرخه برقی می‌تواند به‌اندازه یک موتورسیکلت باشد.", "E-Bikes können preislich einem Motorrad entsprechen.", "Цена электровелосипеда может быть сравнима с мотоциклом.") },
      { title: t("پوشش سرقت بیرون از خانه", "Diebstahlschutz außer Haus", "Защита от кражи вне дома"), body: t("برخلاف بیمه اثاثیه، سرقت از پارکینگ عمومی را هم پوشش می‌دهد.", "Anders als die Hausratversicherung auch bei Diebstahl aus öffentlichen Fahrradständern.", "В отличие от страхования имущества, покрывает кражу с общественной стоянки.") },
    ],
    goodFitFor: [t("صاحبان دوچرخه برقی", "E-Bike-Besitzer", "Владельцы электровелосипедов"), t("کسانی که دوچرخه را مرتب بیرون از خانه پارک می‌کنند", "Wer sein Fahrrad regelmäßig außer Haus abstellt", "Те, кто регулярно оставляет велосипед вне дома")],
  },

  // --- Insurance / Travel ----------------------------------------------------
  "insurance/travel": {
    germanTerm: "Reiseversicherung",
    whatItIs: t(
      "لغو سفر، تاخیر پرواز، گم‌شدن چمدان و هزینه‌های پزشکی اضطراری در خارج از کشور را پوشش می‌دهد — برای سفر خارج از اتحادیه اروپا، بیمه درمانی معمولی معمولا اعتباری ندارد.",
      "Diese Versicherung deckt Reiserücktritt, Flugverspätung, Gepäckverlust und medizinische Notfälle im Ausland ab — bei Reisen außerhalb der EU gilt die normale Krankenversicherung meist nicht.",
      "Эта страховка покрывает отмену поездки, задержку рейса, потерю багажа и экстренную медицинскую помощь за границей — при поездках вне ЕС обычная медстраховка обычно не действует."
    ),
    benefits: [
      { title: t("پوشش پزشکی خارج از اتحادیه اروپا", "Medizinischer Schutz außerhalb der EU", "Медицинская защита вне ЕС"), body: t("بیمه سلامت آلمانی‌ات معمولا خارج از اروپا اعتبار ندارد.", "Ihre deutsche Krankenversicherung gilt meist nicht außerhalb Europas.", "Ваша немецкая медстраховка обычно не действует вне Европы.") },
      { title: t("جبران هزینه سفرهای لغوشده", "Erstattung bei Reiserücktritt", "Возмещение при отмене поездки"), body: t("اگر به‌دلیل بیماری یا اورژانس نتوانی سفر کنی، هزینه از بین نمی‌رود.", "Können Sie krankheits- oder notfallbedingt nicht reisen, ist das Geld nicht verloren.", "Если из-за болезни или ЧС поездка отменяется, деньги не пропадают.") },
    ],
    coverageGroups: [{ title: t("پوشش‌های اصلی", "Hauptleistungen", "Основные покрытия"), items: [t("لغو سفر (Reiserücktritt)", "Reiserücktritt", "Отмена поездки (Reiserücktritt)"), t("تاخیر پرواز (Verspätung)", "Verspätung", "Задержка рейса (Verspätung)"), t("گم‌شدن چمدان (Gepäck)", "Gepäck", "Потеря багажа (Gepäck)"), t("هزینه پزشکی اضطراری خارج از کشور", "Medizinischer Notfall im Ausland", "Экстренная медпомощь за границей")] }],
    goodFitFor: [t("هرکسی که خارج از اتحادیه اروپا سفر می‌کند", "Wer außerhalb der EU reist", "Все, кто путешествует вне ЕС"), t("کسانی که سفرهای غیرقابل استرداد رزرو می‌کنند", "Wer nicht erstattungsfähige Reisen bucht", "Те, кто бронирует невозвратные поездки")],
  },

  // --- Retirement -------------------------------------------------------------
  "retirement/private-pension": {
    whatItIs: t(
      "یک طرح پس‌انداز خصوصی که در دوران کاری‌ات پرداخت می‌کنی و از سن بازنشستگی، یک درآمد ماهانه تضمینی و مادام‌العمر دریافت می‌کنی — نمی‌تواند تمام شود، هرچقدر هم عمر کنی.",
      "Ein privater Sparplan: Sie zahlen während des Berufslebens ein und erhalten ab dem Rentenalter eine garantierte, lebenslange monatliche Auszahlung — sie kann nicht ausgehen, egal wie alt Sie werden.",
      "Частный накопительный план: вы вносите средства в течение трудовой жизни и с пенсионного возраста получаете гарантированную пожизненную ежемесячную выплату — она не может закончиться, сколько бы вы ни прожили."
    ),
    benefits: [
      { title: t("درآمد تضمینی مادام‌العمر", "Lebenslang garantierte Auszahlung", "Гарантированная пожизненная выплата"), body: t("برخلاف پس‌انداز معمولی، هرگز تمام نمی‌شود.", "Anders als normales Sparen kann sie nie aufgebraucht werden.", "В отличие от обычных накоплений, она никогда не заканчивается.") },
      { title: t("مکمل بازنشستگی دولتی", "Ergänzung zur gesetzlichen Rente", "Дополнение к государственной пенсии"), body: t("بازنشستگی دولتی به‌تنهایی معمولا کافی نیست.", "Die gesetzliche Rente allein reicht meist nicht aus.", "Государственной пенсии обычно недостаточно.") },
    ],
    goodFitFor: [t("هرکسی که می‌خواهد بازنشستگی دولتی را تکمیل کند", "Wer die gesetzliche Rente ergänzen möchte", "Те, кто хочет дополнить государственную пенсию"), t("کسانی که به بازنشستگی از طریق کارفرما دسترسی ندارند", "Wer keinen Zugang zu einer betrieblichen Altersvorsorge hat", "Те, у кого нет доступа к корпоративной пенсии")],
  },
  "retirement/riester": {
    germanTerm: "Riester-Rente",
    whatItIs: t(
      "یک طرح بازنشستگی با یارانه مستقیم دولت — دولت مبلغی ثابت (Zulage) به حساب تو اضافه می‌کند، به‌علاوه امکان مزایای مالیاتی، مخصوص کارمندانی که در بیمه بازنشستگی اجباری هستند.",
      "Ein Altersvorsorgeplan mit direkter staatlicher Zulage — der Staat zahlt einen festen Betrag auf Ihr Konto, zusätzlich mögliche Steuervorteile, für gesetzlich Rentenversicherte.",
      "Пенсионный план с прямой государственной субсидией — государство добавляет фиксированную сумму на ваш счёт, плюс возможные налоговые льготы, для застрахованных в обязательной пенсионной системе."
    ),
    benefits: [
      { title: t("پول مستقیم از دولت", "Direktes Geld vom Staat", "Прямые деньги от государства"), body: t("یارانه سالانه بدون توجه به مبلغی که خودت پرداخت می‌کنی اضافه می‌شود.", "Die jährliche Zulage kommt unabhängig von Ihrem eigenen Beitrag hinzu.", "Ежегодная субсидия добавляется независимо от вашего взноса.") },
      { title: t("یارانه اضافه برای هر فرزند", "Zusätzliche Zulage pro Kind", "Дополнительная субсидия на ребёнка"), body: t("خانواده‌ها یارانه بیشتری نسبت به افراد مجرد دریافت می‌کنند.", "Familien erhalten pro Kind eine höhere Zulage als Alleinstehende.", "Семьи получают более высокую субсидию на ребёнка, чем одинокие.") },
    ],
    goodFitFor: [t("کارمندانی که در بیمه بازنشستگی دولتی هستند", "Angestellte in der gesetzlichen Rentenversicherung", "Сотрудники в государственной пенсионной системе"), t("والدین (یارانه اضافه برای فرزند)", "Eltern (zusätzliche Kinderzulage)", "Родители (дополнительная субсидия на детей)")],
  },
  "retirement/ruerup": {
    germanTerm: "Rürup-Rente (Basisrente)",
    whatItIs: t(
      "یک طرح بازنشستگی خصوصی با مزایای مالیاتی قابل توجه در دوران پرداخت — طراحی‌شده مخصوصا برای فریلنسرها و صاحبان مشاغل آزادی که به Riester دسترسی ندارند.",
      "Ein privater Altersvorsorgeplan mit erheblichen Steuervorteilen in der Einzahlungsphase — speziell für Selbstständige und Freiberufler ohne Zugang zur Riester-Rente konzipiert.",
      "Частный пенсионный план со значительными налоговыми льготами на этапе взносов — разработан специально для самозанятых и лиц свободных профессий без доступа к Riester."
    ),
    benefits: [
      { title: t("کاهش مالیاتی قابل توجه", "Erhebliche Steuerersparnis", "Значительная налоговая экономия"), body: t("بخش بزرگی از حق بیمه از درآمد مشمول مالیات کسر می‌شود.", "Ein großer Teil der Beiträge ist von der Steuer absetzbar.", "Большая часть взносов вычитается из налогооблагаемого дохода.") },
      { title: t("محافظت‌شده در برابر برداشت زودهنگام", "Geschützt vor vorzeitigem Zugriff", "Защищена от преждевременного изъятия"), body: t("پول قبل از بازنشستگی قابل برداشت نیست — یعنی واقعا برای بازنشستگی می‌ماند.", "Das Geld ist vor dem Ruhestand nicht verfügbar — es bleibt wirklich für die Rente.", "Деньги недоступны до пенсии — они действительно остаются на пенсию.") },
    ],
    goodFitFor: [t("فریلنسرها و صاحبان مشاغل آزاد بدون دسترسی به Riester", "Selbstständige und Freiberufler ohne Riester-Zugang", "Самозанятые без доступа к Riester"), t("افراد با درآمد بالا که به‌دنبال صرفه‌جویی مالیاتی هستند", "Gutverdiener auf der Suche nach Steuerersparnis", "Высокооплачиваемые в поиске налоговой экономии")],
  },
  "retirement/bav": {
    germanTerm: "Betriebliche Altersvorsorge (bAV)",
    whatItIs: t(
      "یک طرح بازنشستگی از طریق کارفرما — حق بیمه مستقیما از حقوق ناخالص (پیش از مالیات و بیمه اجتماعی) کسر می‌شود و در بسیاری موارد کارفرما هم مبلغی به آن اضافه می‌کند.",
      "Ein Altersvorsorgeplan über den Arbeitgeber — die Beiträge werden direkt vom Bruttogehalt (vor Steuern und Sozialabgaben) abgezogen, und der Arbeitgeber steuert in vielen Fällen einen Zuschuss bei.",
      "Пенсионный план через работодателя — взносы вычитаются напрямую из зарплаты до вычета налогов и соцвзносов, и во многих случаях работодатель добавляет свою часть."
    ),
    benefits: [
      { title: t("صرفه‌جویی مالیاتی و بیمه اجتماعی", "Steuer- und Sozialabgabenersparnis", "Экономия на налогах и соцвзносах"), body: t("حق بیمه پیش از کسر مالیات و بیمه از حقوق برداشته می‌شود.", "Der Beitrag wird vor Steuer- und Sozialabzug vom Gehalt genommen.", "Взнос вычитается из зарплаты до налогов и соцотчислений.") },
      { title: t("مشارکت مالی کارفرما", "Finanzieller Zuschuss des Arbeitgebers", "Финансовое участие работодателя"), body: t("در بسیاری موارد کارفرما بخشی از حق بیمه را هم پرداخت می‌کند.", "In vielen Fällen zahlt der Arbeitgeber einen Teil des Beitrags mit.", "Во многих случаях работодатель доплачивает часть взноса.") },
    ],
    goodFitFor: [t("کارمندانی که کارفرمایشان bAV ارائه می‌دهد", "Angestellte, deren Arbeitgeber bAV anbietet", "Сотрудники, чей работодатель предлагает bAV")],
  },

  // --- Communication -----------------------------------------------------------
  "communication/mobile/contract": {
    germanTerm: "Vertragstarif",
    whatItIs: t(
      "قرارداد سیم‌کارت، معمولا ۲۴ ماهه، با حجم اینترنت و مکالمه ثابت هرماه — می‌تواند شامل گوشی هم باشد و معمولا کم‌هزینه‌ترین گزینه به‌ازای هر گیگابایت است.",
      "Ein SIM-Vertrag, meist mit 24-monatiger Laufzeit, mit festem monatlichem Datenvolumen und Freiminuten — oft inklusive Gerät und meist die günstigste Option pro Gigabyte.",
      "Контрактная SIM-карта, обычно на 24 месяца, с фиксированным ежемесячным трафиком и минутами — может включать устройство и обычно самый выгодный вариант за гигабайт."
    ),
    benefits: [
      { title: t("کم‌هزینه‌ترین به‌ازای هر گیگابایت", "Meist günstigster Preis pro GB", "Обычно самая выгодная цена за ГБ"), body: t("تعرفه‌های قراردادی معمولا از پیش‌پرداخت ارزان‌تر تمام می‌شوند.", "Vertragstarife sind meist günstiger als Prepaid pro Gigabyte.", "Контрактные тарифы обычно дешевле предоплаченных за ГБ.") },
      { title: t("امکان دریافت گوشی همراه با قرارداد", "Gerät im Vertrag möglich", "Возможность включить устройство"), body: t("هزینه گوشی جدید در اقساط ماهانه پخش می‌شود.", "Die Kosten für ein neues Gerät verteilen sich auf die Monatsraten.", "Стоимость нового устройства распределяется по ежемесячным платежам.") },
    ],
    goodFitFor: [t("کسانی که کم‌هزینه‌ترین قیمت هر گیگابایت را می‌خواهند", "Wer den günstigsten Preis pro GB möchte", "Те, кто хочет самую выгодную цену за ГБ"), t("کسانی که می‌خواهند گوشی جدید همراه قرارداد بگیرند", "Wer ein neues Gerät im Vertrag möchte", "Те, кто хочет новое устройство в контракте")],
  },
  "communication/mobile/postpaid": {
    germanTerm: "Postpaid ohne Vertragsbindung",
    whatItIs: t(
      "صورت‌حساب ماهانه مثل قرارداد، ولی بدون دوره تعهد طولانی‌مدت — می‌توانی با اطلاع کوتاه فسخ کنی، برخلاف قرارداد ۲۴ ماهه.",
      "Monatliche Abrechnung wie bei einem Vertrag, aber ohne lange Mindestlaufzeit — kurzfristig kündbar, anders als beim 24-Monats-Vertrag.",
      "Ежемесячный счёт как по контракту, но без долгого минимального срока — можно расторгнуть с коротким уведомлением, в отличие от 24-месячного контракта."
    ),
    benefits: [
      { title: t("انعطاف بدون تعهد طولانی", "Flexibilität ohne lange Bindung", "Гибкость без долгих обязательств"), body: t("راحتی صورت‌حساب ماهانه را داری بدون قفل‌شدن در یک قرارداد بلندمدت.", "Sie haben den Komfort der Monatsabrechnung ohne langfristige Bindung.", "У вас удобство месячного счёта без долгосрочных обязательств.") },
      { title: t("مناسب برای شرایط نامشخص", "Passend bei unklaren Plänen", "Подходит при неопределённых планах"), body: t("اگر مطمئن نیستی چقدر در آلمان می‌مانی، این گزینه ریسک کمتری دارد.", "Wenn Sie nicht sicher sind, wie lange Sie in Deutschland bleiben, ist dies risikoärmer.", "Если вы не уверены, как долго останетесь в Германии, это менее рискованно.") },
    ],
    goodFitFor: [t("کسانی که راحتی قرارداد را می‌خواهند بدون قفل‌شدن طولانی‌مدت", "Wer den Komfort eines Vertrags ohne lange Bindung möchte", "Те, кто хочет удобство контракта без долгих обязательств"), t("کسانی که مطمئن نیستند چه مدت در آلمان می‌مانند", "Wer unsicher ist, wie lange er in Deutschland bleibt", "Те, кто не уверен в сроке пребывания в Германии")],
  },
  "communication/mobile/prepaid": {
    germanTerm: "Prepaid-Tarif",
    whatItIs: t(
      "شارژ اعتباری بدون قرارداد و بدون بررسی اعتبار بانکی (Schufa) — فقط هر چقدر لازم داری شارژ می‌کنی، بدون تعهد و بدون ریسک صورت‌حساب غیرمنتظره.",
      "Guthabenbasiert, ohne Vertrag und ohne Schufa-Prüfung — Sie laden nur so viel auf, wie Sie brauchen, ohne Bindung und ohne Risiko einer Überraschungsrechnung.",
      "Предоплата без договора и без проверки кредитной истории (Schufa) — вы пополняете счёт по мере необходимости, без обязательств и риска неожиданного счёта."
    ),
    benefits: [
      { title: t("بدون نیاز به سابقه اعتباری آلمان", "Keine deutsche Bonitätshistorie nötig", "Не нужна немецкая кредитная история"), body: t("مناسب برای تازه‌واردینی که هنوز سابقه Schufa ندارند.", "Ideal für Neuankömmlinge ohne Schufa-Historie.", "Идеально для новоприбывших без истории Schufa.") },
      { title: t("بدون ریسک صورت‌حساب غیرمنتظره", "Kein Risiko einer Überraschungsrechnung", "Без риска неожиданного счёта"), body: t("فقط همان مقداری که شارژ کرده‌ای مصرف می‌شود.", "Sie verbrauchen nur, was Sie aufgeladen haben.", "Вы тратите только то, что пополнили.") },
    ],
    goodFitFor: [t("تازه‌واردین به آلمان بدون سابقه بانکی", "Neuankömmlinge in Deutschland ohne Bankhistorie", "Новоприбывшие в Германию без банковской истории"), t("هرکسی که تعهد صفر می‌خواهد", "Wer keinerlei Bindung möchte", "Все, кто хочет нулевые обязательства")],
  },
  "communication/internet/fiber": {
    germanTerm: "Glasfaser-Internet",
    whatItIs: t(
      "سریع‌ترین نوع اتصال اینترنت خانگی در آلمان، مستقیما از طریق کابل فیبر نوری — پایدارترین گزینه برای تماس تصویری، استریم و دورکاری.",
      "Die schnellste Art des Heimanschlusses in Deutschland, direkt über Glasfaserkabel — die stabilste Option für Videocalls, Streaming und Homeoffice.",
      "Самый быстрый вид домашнего подключения в Германии, напрямую через оптоволоконный кабель — самый стабильный вариант для видеозвонков, стриминга и удалённой работы."
    ),
    benefits: [
      { title: t("بالاترین سرعت موجود", "Höchste verfügbare Geschwindigkeit", "Максимальная доступная скорость"), body: t("برای خانه‌های با چند دستگاه متصل همزمان مناسب‌ترین گزینه.", "Für Haushalte mit vielen gleichzeitig verbundenen Geräten die beste Wahl.", "Лучший выбор для домов со множеством одновременно подключённых устройств.") },
      { title: t("پایداری بالا", "Hohe Stabilität", "Высокая стабильность"), body: t("کمترین افت سرعت در ساعات پرترافیک نسبت به DSL و کابل.", "Geringster Geschwindigkeitsabfall zu Stoßzeiten im Vergleich zu DSL und Kabel.", "Наименьшее падение скорости в часы пик по сравнению с DSL и кабелем.") },
    ],
    goodFitFor: [t("دورکارها و کسانی که مرتب تماس تصویری دارند", "Homeoffice-Nutzer und häufige Videotelefonierer", "Удалённые работники и те, кто часто на видеозвонках"), t("خانه‌های با چند دستگاه متصل همزمان", "Haushalte mit vielen gleichzeitigen Geräten", "Дома со множеством одновременных устройств")],
  },
  "communication/internet/dsl": {
    germanTerm: "DSL-Internet",
    whatItIs: t(
      "پرکاربردترین نوع اتصال اینترنت در آلمان، از طریق خط تلفن ثابت موجود در اکثر ساختمان‌ها — نیازی به کابل‌کشی جدید ندارد.",
      "Der am weitesten verbreitete Internetanschluss in Deutschland, über die vorhandene Telefonleitung der meisten Gebäude — keine neue Verkabelung nötig.",
      "Самый распространённый вид интернет-подключения в Германии — через существующую телефонную линию большинства зданий, без новой прокладки кабеля."
    ),
    benefits: [
      { title: t("در دسترس‌ترین گزینه", "Am weitesten verfügbar", "Наиболее доступный вариант"), body: t("در تقریبا هر ساختمانی در آلمان از قبل موجود است.", "In fast jedem Gebäude in Deutschland bereits vorhanden.", "Уже доступен почти в каждом здании Германии.") },
      { title: t("نصب سریع", "Schnelle Einrichtung", "Быстрая установка"), body: t("چون از خط تلفن موجود استفاده می‌کند، نصب سریع‌تر انجام می‌شود.", "Da die vorhandene Telefonleitung genutzt wird, geht die Einrichtung schneller.", "Поскольку используется существующая линия, установка проходит быстрее.") },
    ],
    goodFitFor: [t("اکثر خانه‌ها، به‌خصوص در ساختمان‌های بدون فیبر", "Die meisten Haushalte, besonders in Gebäuden ohne Glasfaser", "Большинство домов, особенно в зданиях без оптоволокна")],
  },
  "communication/internet/cable": {
    germanTerm: "Kabel-Internet",
    whatItIs: t(
      "اتصال از طریق شبکه کابل تلویزیونی موجود در ساختمان — معمولا سرعت بالاتری نسبت به DSL در همان منطقه ارائه می‌دهد.",
      "Anschluss über das vorhandene TV-Kabelnetz des Gebäudes — bietet meist höhere Geschwindigkeiten als DSL in derselben Region.",
      "Подключение через существующую кабельную ТВ-сеть здания — обычно предлагает более высокую скорость, чем DSL в том же районе."
    ),
    benefits: [
      { title: t("سرعت بالاتر از DSL", "Schneller als DSL", "Быстрее DSL"), body: t("در بیشتر مناطق سرعت محسوس بالاتری نسبت به DSL دارد.", "In den meisten Regionen spürbar schneller als DSL.", "В большинстве регионов заметно быстрее DSL.") },
      { title: t("از کابل TV موجود استفاده می‌کند", "Nutzt vorhandenes TV-Kabel", "Использует существующий ТВ-кабель"), body: t("نیازی به کابل‌کشی جدید در ساختمان‌های دارای کابل تلویزیون نیست.", "In Gebäuden mit TV-Kabel keine neue Verkabelung nötig.", "В зданиях с ТВ-кабелем новая проводка не нужна.") },
    ],
    goodFitFor: [t("ساختمان‌های دارای کابل‌کشی تلویزیون موجود", "Gebäude mit vorhandener TV-Verkabelung", "Здания с существующей ТВ-проводкой")],
  },
  "communication/internet/5g-home": {
    germanTerm: "5G Homespot",
    whatItIs: t(
      "اینترنت خانگی بی‌سیم از طریق یک روتر 5G — بدون نیاز به کابل‌کشی، نصب سریع و آماده استفاده در همان روز.",
      "Kabelloses Heiminternet über einen 5G-Router — ohne Verkabelung, schnelle Einrichtung, noch am selben Tag nutzbar.",
      "Беспроводной домашний интернет через 5G-роутер — без прокладки кабеля, быстрая настройка, готов к использованию в тот же день."
    ),
    benefits: [
      { title: t("بدون نیاز به کابل‌کشی", "Keine Verkabelung nötig", "Без прокладки кабеля"), body: t("فقط روتر را وصل می‌کنی و آماده است.", "Router anschließen, fertig.", "Подключаете роутер — и готово.") },
      { title: t("گزینه‌ای برای مناطق بدون فیبر قوی", "Option ohne starke Glasfaser/DSL-Abdeckung", "Вариант для мест без сильного покрытия оптоволокна/DSL"), body: t("جایی که فیبر یا DSL قوی موجود نیست، جایگزین سریعی است.", "Wo keine starke Glasfaser- oder DSL-Abdeckung besteht, eine schnelle Alternative.", "Там, где нет сильного покрытия оптоволокна или DSL, — быстрая альтернатива.") },
    ],
    goodFitFor: [t("مناطق بدون فیبر یا DSL قوی", "Regionen ohne starke Glasfaser/DSL-Abdeckung", "Регионы без сильного покрытия оптоволокна/DSL"), t("مستاجرانی که مرتب جابه‌جا می‌شوند", "Mieter, die häufig umziehen", "Арендаторы, часто переезжающие")],
  },
};

/** Looks up bespoke content by the same path segments the URL uses. */
export function getPdpContent(categorySlug: string, subcategorySlug: string, productTypeSlug: string): PdpContent | undefined {
  const key = productTypeSlug ? `${categorySlug}/${subcategorySlug}/${productTypeSlug}` : `${categorySlug}/${subcategorySlug}`;
  return PDP_CONTENT[key];
}

// The rest of this file is the universal, category-agnostic content
// shared by both service page templates that render a product — PlpView
// (what real visitors reach from every nav link on the site) and PdpView
// (the deeper page for one specific, real, named tariff — reachable today
// only for the 2 products in pdp-data.ts's KNOWN_TARIFFS, and not linked
// from anywhere yet). Keeping "why Tarefe," the process, "why not DIY,"
// and the FAQ in one place means both pages tell the same story instead
// of two components drifting into slightly different claims over time.

/** 06 — sells Tarefe itself, not the product. Same on every page: the reason to go through Tarefe has nothing to do with which category someone landed on. */
export const WHY_TAREFE = [
  { key: "compare", title: t("مقایسه بین ارائه‌دهندگان", "Anbietervergleich", "Сравнение поставщиков"), body: t("گزینه‌های مختلف را بررسی می‌کنیم تا فقط به یک شرکت محدود نباشی.", "Wir prüfen verschiedene Optionen, damit Sie nicht auf einen Anbieter beschränkt sind.", "Мы рассматриваем разные варианты, чтобы вы не были ограничены одним поставщиком.") },
  { key: "human", title: t("مشاوره فارسی و انسانی", "Persönliche Beratung in Ihrer Sprache", "Живая консультация на вашем языке"), body: t("اگر اصطلاحات و قوانین آلمانی گیج‌کننده است، یک مشاور واقعی همراهت است.", "Wenn deutsche Begriffe und Regeln verwirrend sind, begleitet Sie ein echter Berater.", "Если немецкие термины и правила запутывают, рядом настоящий консультант.") },
  { key: "dedicated", title: t("یک مشاور برای خودت", "Ein persönlicher Berater", "Личный консультант"), body: t("از بررسی شرایط تا انتخاب و ثبت قرارداد، همان یک نفر همراه توست.", "Von der Bedarfsprüfung bis zum Vertragsabschluss begleitet Sie dieselbe Person.", "От анализа ситуации до заключения договора — один и тот же человек рядом.") },
  { key: "admin", title: t("انجام کارهای اداری", "Erledigung der Formalitäten", "Оформление формальностей"), body: t("فرم‌ها، مدارک، پیگیری و مراحل قرارداد را ساده‌تر می‌کنیم.", "Wir vereinfachen Formulare, Unterlagen und den Vertragsprozess.", "Мы упрощаем формы, документы и весь процесс оформления.") },
  { key: "support", title: t("پشتیبانی بعد از قرارداد", "Support nach Vertragsabschluss", "Поддержка после заключения договора"), body: t("کار ما با ثبت قرارداد تمام نمی‌شود.", "Unsere Arbeit endet nicht mit der Vertragsunterschrift.", "Наша работа не заканчивается подписанием договора.") },
];

/** 07 — the process, ending in ongoing support, matching 06/08. */
export const PROCESS_STEPS = [
  t("فرم را پر می‌کنی", "Sie füllen das Formular aus", "Вы заполняете форму"),
  t("مشاور با تو تماس می‌گیرد", "Ein Berater kontaktiert Sie", "Консультант связывается с вами"),
  t("شرایطت بررسی می‌شود", "Ihre Situation wird geprüft", "Ваша ситуация анализируется"),
  t("گزینه‌های مناسب مقایسه می‌شوند", "Passende Optionen werden verglichen", "Сравниваются подходящие варианты"),
  t("انتخاب و ثبت قرارداد", "Auswahl und Vertragsabschluss", "Выбор и оформление договора"),
  t("پشتیبانی بعد از قرارداد", "Support nach Vertragsabschluss", "Поддержка после договора"),
];

/** 08 — the real differentiator from a bare comparison table: everything a comparison SITE stops doing the moment it shows a price. */
export const WHY_NOT_DIY = [
  t("مقایسه گزینه‌های مختلف برایت", "Vergleich der Optionen für Sie", "Сравнение вариантов за вас"),
  t("توضیح تفاوت تعرفه‌ها به زبان ساده", "Erklärung der Tarifunterschiede in einfachen Worten", "Объяснение различий тарифов простыми словами"),
  t("کمک در بررسی مدارک", "Unterstützung bei den Unterlagen", "Помощь с документами"),
  t("پیگیری مراحل قرارداد", "Nachverfolgung des Vertragsprozesses", "Сопровождение процесса оформления"),
  t("پشتیبانی فارسی در تمام مسیر", "Support in Ihrer Sprache auf dem gesamten Weg", "Поддержка на вашем языке на всём пути"),
];

export const PDP_FAQ_ITEMS = [
  { q: t("آیا من واجد شرایط هستم؟", "Erfülle ich die Voraussetzungen?", "Подхожу ли я по условиям?"), a: t("این دقیقا همان چیزی است که مشاور در تماس اول با تو بررسی می‌کند — رایگان و بدون تعهد.", "Genau das prüft der Berater im ersten Gespräch mit Ihnen — kostenlos und unverbindlich.", "Именно это консультант проверит при первом звонке — бесплатно и ни к чему не обязывает.") },
  { q: t("آیا می‌توانم از قرارداد فعلی‌ام تغییر کنم؟", "Kann ich von meinem aktuellen Vertrag wechseln?", "Могу ли я перейти с текущего договора?"), a: t("در اکثر موارد بله. مشاور بررسی می‌کند که فسخ قرارداد فعلی‌ات چه زمانی ممکن است و کل روند را برایت انجام می‌دهد.", "In den meisten Fällen ja. Der Berater prüft, wann die Kündigung Ihres aktuellen Vertrags möglich ist, und übernimmt den gesamten Prozess.", "В большинстве случаев да. Консультант проверит, когда возможно расторжение текущего договора, и возьмёт на себя весь процесс.") },
  { q: t("روند کار چقدر زمان می‌برد؟", "Wie lange dauert der Prozess?", "Сколько занимает процесс?"), a: t("مشاور معمولا ظرف کمتر از سه ساعت کاری تماس می‌گیرد؛ مدت کل تا ثبت قرارداد به شرایط خودت بستگی دارد.", "Der Berater meldet sich in der Regel innerhalb von drei Werktagsstunden; die Gesamtdauer bis zum Vertragsabschluss hängt von Ihrer Situation ab.", "Консультант обычно связывается в течение трёх рабочих часов; общий срок до заключения договора зависит от вашей ситуации.") },
  { q: t("چه مدارکی لازم است؟", "Welche Unterlagen werden benötigt?", "Какие документы нужны?"), a: t("بستگی به نوع سرویس دارد — مشاور دقیقا می‌گوید چه چیزی لازم است و در جمع‌آوری آن هم کمک می‌کند.", "Das hängt von der Art der Leistung ab — der Berater sagt Ihnen genau, was benötigt wird, und hilft beim Zusammenstellen.", "Это зависит от вида услуги — консультант точно скажет, что нужно, и поможет всё собрать.") },
  { q: t("آیا تعرفه در انتخاب شرکت به من کمک می‌کند؟", "Hilft Tarefe mir bei der Wahl des Anbieters?", "Помогает ли Tarefe выбрать поставщика?"), a: t("بله، دقیقا همین کار ماست — گزینه‌های مختلف را با هم مقایسه و تفاوت‌ها را برایت شفاف توضیح می‌دهیم.", "Ja, genau das ist unsere Aufgabe — wir vergleichen die Optionen und erklären Ihnen die Unterschiede klar und deutlich.", "Да, это именно наша задача — мы сравниваем варианты и ясно объясняем различия.") },
  { q: t("بعد از ثبت قرارداد هم پشتیبانی دارید؟", "Gibt es auch nach Vertragsabschluss Support?", "Есть ли поддержка после заключения договора?"), a: t("بله. برای فاکتورها، خسارت‌ها و یادآوری موعد فسخ همیشه در کنارت هستیم.", "Ja. Bei Rechnungen, Schadensfällen und Kündigungsfristen begleiten wir Sie weiterhin.", "Да. Мы продолжаем сопровождать вас по вопросам счетов, страховых случаев и сроков расторжения.") },
  { q: t("آیا واقعا رایگان است؟", "Ist das wirklich kostenlos?", "Это действительно бесплатно?"), a: t("بله. تعرفه از طریق کمیسیون شرکت‌های طرف قرارداد تامین مالی می‌شود، نه از شما.", "Ja. Tarefe finanziert sich über Provisionen der Partnerunternehmen, nicht über Sie.", "Да. Tarefe финансируется за счёт комиссии партнёров, а не за счёт вас.") },
];
