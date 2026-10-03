/**
 * Tarefe canonical taxonomy — the single source of truth for the site's
 * information architecture, URL structure, navigation, breadcrumbs, and
 * sitemap generation.
 *
 * Reconciled 2026-08-28 from:
 *  - fa.tarefe.de's live WordPress `service` post type (45 services,
 *    tagged Sach/KV/LV/Energy/Communication — the real German
 *    insurance-broker classification)
 *  - the VPS prototype's src/data/taxonomyData.ts (deeper telecom
 *    productType metadata — Communication's DSL/Kabel/Glasfaser/5G and
 *    SIM contract/prepaid/postpaid, promoted to real productTypes in
 *    Phase 3 once there was enough content to justify the extra URL depth)
 *
 * URL depth rule (see the Phase 1 grill): a subcategory with exactly one
 * productType collapses to a 2-segment PLP (services/{category}/{subcategory}/);
 * a subcategory with multiple productTypes needs the third segment
 * (services/{category}/{subcategory}/{productType}/).
 */

import { KNOWN_TARIFFS } from "./pdp-data";

export type Locale = "fa" | "de" | "ru";
export const LOCALES: Locale[] = ["fa", "de", "ru"];
export const DEFAULT_LOCALE: Locale = "fa";

export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  fa: "rtl",
  de: "ltr",
  ru: "ltr",
};

export interface LocalizedText {
  fa: string;
  de: string;
  ru: string;
}

/** True German/Russian per-item translation has not been produced yet — flags a stub for content review. */
export interface ProductAudience {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
}

export interface ProductType {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  /** e.g. audience-specific landing pages under PKV (self-employed, high-income-employees) */
  audiences?: ProductAudience[];
}

export interface Subcategory {
  slug: string;
  /** German insurance-industry classification code, kept for internal/admin reference. */
  classification?: "Sach" | "KV" | "LV";
  title: LocalizedText;
  description: LocalizedText;
  productTypes: ProductType[];
}

export interface Category {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  icon: string;
  /** Gates a category out of nav, sitemap, and routing while still present in the architecture — not currently used by any category, kept for the next one that needs a soft-launch period. */
  published: boolean;
  subcategories: Subcategory[];
}

const t = (fa: string, de: string, ru: string): LocalizedText => ({ fa, de, ru });

export const TAXONOMY: Category[] = [
  {
    slug: "insurance",
    published: true,
    icon: "shield",
    title: t("بیمه", "Versicherung", "Страхование"),
    description: t(
      "درمان، دندان، خانه، حیوان خانگی، خودرو، مسئولیت مدنی و سفر؛ همه‌چیز برای اطمینان خاطر شما در آلمان.",
      "Kranken-, Zahn-, Haus-, Tier-, Kfz-, Haftpflicht- und Reiseversicherung — alles für Ihre Sicherheit in Deutschland.",
      "Медицинское, стоматологическое, домашнее страхование, страхование питомцев, автомобиля, ответственности и путешествий — всё для вашей безопасности в Германии."
    ),
    // Restructured 2026-09-04 from the client's real category list
    // (screenshots of the reference app) — replaces the previous
    // health/life/property 3-way split. Retirement/pension products moved
    // out entirely to their own top-level "retirement" category below;
    // items not present in the reference list (business insurance,
    // electronics/phone/glass, caravan/truck/trailer, general/home
    // emergency assistance, income-replacement) were dropped rather than
    // kept unlisted, per direct instruction — not silently preserved.
    subcategories: [
      {
        slug: "home",
        title: t("بیمه خانه و مسکن", "Haus & Wohnung", "Страхование дома и жилья"),
        description: t(
          "پوشش اثاثیه، ساختمان و خطرات طبیعی برای محل زندگی شما.",
          "Schutz für Hausrat, Gebäude und Naturgefahren rund um Ihr Zuhause.",
          "Защита имущества, здания и природных рисков для вашего жилья."
        ),
        productTypes: [
          { slug: "household-contents", title: t("بیمه وسایل منزل", "Hausratversicherung", "Страхование домашнего имущества"), description: t("پوشش سرقت و خسارت برای اثاثیه و وسایل خانه.", "Schutz für Möbel und Hausrat vor Diebstahl und Schäden.", "Защита мебели и домашнего имущества от кражи и повреждений.") },
          { slug: "residential-building", title: t("بیمه ساختمان مسکونی", "Wohngebäudeversicherung", "Страхование жилого здания"), description: t("پوشش آتش‌سوزی، طوفان و آب‌گرفتگی برای ساختمان.", "Schutz vor Feuer, Sturm und Leitungswasser für Ihr Gebäude.", "Защита здания от пожара, бури и повреждения водой.") },
          { slug: "elementar", title: t("بیمه حوادث طبیعی", "Elementarversicherung", "Страхование от стихийных бедствий"), description: t("پوشش خسارت سیل، زلزله و دیگر بلایای طبیعی که در بیمه معمولی نیست.", "Deckt Schäden durch Hochwasser, Erdbeben und andere Naturgefahren ab, die in der Standardversicherung nicht enthalten sind.", "Покрывает ущерб от наводнения, землетрясения и других стихийных бедствий, не входящих в стандартную страховку.") },
          { slug: "rent-deposit-guarantee", title: t("بیمه تضمین ودیعه اجاره", "Mietkautionsversicherung", "Гарантия арендного депозита"), description: t("جایگزین سپرده نقدی اجاره با یک ضمانت‌نامه ماهانه.", "Ersetzt die Bareinlage der Mietkaution durch eine monatliche Bürgschaft.", "Заменяет наличный залог за аренду ежемесячной гарантией.") },
        ],
      },
      {
        slug: "pets",
        title: t("بیمه حیوانات خانگی", "Tierversicherungen", "Страхование домашних животных"),
        description: t(
          "پوشش سلامت و مسئولیت مدنی برای سگ و گربه شما.",
          "Gesundheits- und Haftpflichtschutz für Ihren Hund oder Ihre Katze.",
          "Защита здоровья и ответственности для вашей собаки или кошки."
        ),
        productTypes: [
          { slug: "dog-liability", title: t("بیمه مسئولیت مدنی سگ", "Hundehaftpflichtversicherung", "Страхование ответственности владельца собаки"), description: t("جبران خسارتی که سگ شما ممکن است به دیگران یا اموال آن‌ها وارد کند.", "Deckt Schäden ab, die Ihr Hund Dritten oder deren Eigentum zufügen könnte.", "Покрывает ущерб, который ваша собака может причинить третьим лицам или их имуществу.") },
          { slug: "dog-health", title: t("بیمه سلامت سگ", "Hundekrankenversicherung", "Страхование здоровья собаки"), description: t("پوشش هزینه‌های دامپزشکی برای بیماری و حوادث سگ شما.", "Übernimmt Tierarztkosten bei Krankheit und Unfällen Ihres Hundes.", "Покрывает ветеринарные расходы при болезни и несчастных случаях с вашей собакой.") },
          { slug: "cat", title: t("بیمه گربه", "Katzenversicherung", "Страхование кошек"), description: t("پوشش هزینه‌های دامپزشکی و مسئولیت مدنی برای گربه شما.", "Deckt Tierarztkosten und Haftpflichtschäden für Ihre Katze ab.", "Покрывает ветеринарные расходы и ответственность за вашу кошку.") },
        ],
      },
      {
        slug: "liability-legal",
        title: t("بیمه مسئولیت مدنی و حقوقی", "Haftpflicht & Recht", "Страхование ответственности и правовая защита"),
        description: t(
          "جبران خسارت به دیگران و پوشش هزینه‌های حقوقی در دعاوی.",
          "Deckt Schäden gegenüber Dritten und Kosten bei Rechtsstreitigkeiten ab.",
          "Покрывает ущерб третьим лицам и расходы в юридических спорах."
        ),
        productTypes: [
          { slug: "personal-liability", title: t("بیمه مسئولیت مدنی", "Privathaftpflichtversicherung", "Личное страхование ответственности"), description: t("جبران خسارت‌هایی که ناخواسته به دیگران وارد می‌کنید.", "Deckt Schäden ab, die Sie unabsichtlich anderen zufügen.", "Покрывает ущерб, непреднамеренно причинённый другим.") },
          { slug: "service-liability", title: t("بیمه مسئولیت مدنی کارکنان دولت", "Diensthaftpflichtversicherung", "Страхование ответственности государственных служащих"), description: t("پوشش خسارت‌هایی که کارمندان دولت حین انجام وظیفه ممکن است مسئول آن باشند.", "Schutz für Beamte und Angestellte im öffentlichen Dienst bei Schäden, die sie im Rahmen ihrer dienstlichen Tätigkeit verursachen.", "Защита государственных служащих от ответственности за ущерб, причинённый при исполнении служебных обязанностей.") },
          { slug: "legal-protection", title: t("بیمه حقوقی و وکیل", "Rechtsschutzversicherung", "Страхование юридической защиты"), description: t("پوشش هزینه وکیل و دادرسی در دعاوی حقوقی.", "Übernimmt Anwalts- und Gerichtskosten bei Rechtsstreitigkeiten.", "Покрывает расходы на адвоката и суд в юридических спорах.") },
        ],
      },
      {
        slug: "health",
        title: t("بیمه سلامت", "Krankenversicherung", "Медицинское страхование"),
        description: t(
          "بیمه درمانی خصوصی و دولتی، دندان، و کمک‌هزینه‌های تکمیلی.",
          "Private und gesetzliche Krankenversicherung, Zahn- und Zusatzleistungen.",
          "Частное и государственное медицинское страхование, стоматология и дополнительные услуги."
        ),
        productTypes: [
          {
            slug: "pkv",
            title: t("بیمه خصوصی درمان (PKV)", "Private Krankenversicherung (PKV)", "Частная медицинская страховка (PKV)"),
            description: t(
              "پوشش درمانی خصوصی با نوبت‌دهی سریع‌تر و اتاق یک‌نفره، مخصوص فریلنسرها و کارمندان پردرآمد.",
              "Private Krankenversicherung mit schnelleren Terminen und Einzelzimmer — für Selbstständige und Gutverdiener.",
              "Частная медицинская страховка с быстрым приёмом и отдельной палатой — для самозанятых и высокооплачиваемых сотрудников."
            ),
            audiences: [
              {
                slug: "self-employed",
                title: t("PKV برای فریلنسرها", "PKV für Selbstständige", "PKV для самозанятых"),
                description: t(
                  "شرایط و نرخ‌های PKV مخصوص فریلنسرها و صاحبان کسب‌وکار.",
                  "PKV-Konditionen speziell für Selbstständige und Unternehmer.",
                  "Условия PKV специально для самозанятых и предпринимателей."
                ),
              },
              {
                slug: "high-income-employees",
                title: t("PKV برای کارمندان پردرآمد", "PKV für Gutverdiener", "PKV для высокооплачиваемых сотрудников"),
                description: t(
                  "شرایط PKV برای کارمندانی که از سقف درآمد بیمه دولتی عبور کرده‌اند.",
                  "PKV-Konditionen für Angestellte über der Versicherungspflichtgrenze.",
                  "Условия PKV для сотрудников, превышающих порог обязательного страхования."
                ),
              },
            ],
          },
          {
            slug: "gkv",
            title: t("بیمه پایه دولتی (GKV)", "Gesetzliche Krankenkassen", "Государственные страховые кассы (GKV)"),
            description: t(
              "بیمه درمانی اجباری دولتی، مناسب اکثر کارمندان و خانواده‌ها.",
              "Gesetzliche Krankenversicherung — die Standardlösung für die meisten Angestellten und Familien.",
              "Обязательное государственное медицинское страхование — стандартное решение для большинства сотрудников и семей."
            ),
          },
          {
            slug: "health-supplement",
            title: t("بیمه تکمیلی درمان", "Krankenzusatzversicherung", "Дополнительное медицинское страхование"),
            description: t(
              "پوشش تکمیلی برای خدماتی که بیمه پایه دولتی کامل پوشش نمی‌دهد.",
              "Zusätzlicher Schutz für Leistungen, die die gesetzliche Krankenversicherung nicht vollständig abdeckt.",
              "Дополнительная защита для услуг, не полностью покрываемых государственной медицинской страховкой."
            ),
          },
          {
            slug: "dental",
            title: t("بیمه دندان", "Zahnzusatzversicherung", "Стоматологическая страховка"),
            description: t(
              "پوشش ۱۰۰٪ ایمپلنت و جرم‌گیری، بدون دوره انتظار طولانی.",
              "100 % Kostenübernahme für Implantate und Prophylaxe, ohne lange Wartezeit.",
              "100% покрытие имплантов и профилактики без длительного периода ожидания."
            ),
          },
          {
            slug: "hospital-allowance",
            title: t("بیمه تکمیلی کمک‌هزینه بستری", "Krankenhauszusatzversicherung", "Дополнительное больничное пособие"),
            description: t(
              "مبلغ نقدی روزانه هنگام بستری در بیمارستان.",
              "Tägliches Krankenhaustagegeld bei stationärem Aufenthalt.",
              "Ежедневное пособие при стационарном лечении."
            ),
          },
          {
            slug: "naturopath-glasses",
            title: t("بیمه تکمیلی طب سنتی و عینک", "Heilpraktiker- und Brillenzusatzversicherung", "Дополнительная страховка на натуропатию и очки"),
            description: t(
              "کمک‌هزینه برای طب سنتی، هومیوپاتی، عینک و لنز.",
              "Zuschuss für Heilpraktiker, Homöopathie, Brillen und Kontaktlinsen.",
              "Компенсация услуг натуропатов, гомеопатии, очков и контактных линз."
            ),
          },
        ],
      },
      {
        slug: "risk-provision",
        title: t("ریسک و پیشگیری", "Risiko & Vorsorge", "Риски и защита"),
        description: t(
          "پوشش مالی در برابر فوت زودهنگام، حوادث و ازکارافتادگی.",
          "Finanzieller Schutz bei frühem Tod, Unfällen und Erwerbsunfähigkeit.",
          "Финансовая защита на случай ранней смерти, несчастных случаев и потери трудоспособности."
        ),
        productTypes: [
          { slug: "term-life", title: t("بیمه عمر و فوت", "Risikolebensversicherung", "Страхование жизни на случай смерти"), description: t("پشتیبانی مالی خانواده شما در صورت فوت زودهنگام.", "Finanzielle Absicherung Ihrer Familie im Todesfall.", "Финансовая защита вашей семьи в случае смерти.") },
          { slug: "accident", title: t("بیمه حوادث", "Unfallversicherung", "Страхование от несчастных случаев"), description: t("پوشش مالی برای حوادث در زندگی روزمره و اوقات فراغت.", "Finanzieller Schutz bei Unfällen im Alltag und in der Freizeit.", "Финансовая защита при несчастных случаях в быту и на отдыхе.") },
          { slug: "occupational-disability", title: t("بیمه ازکارافتادگی شغلی", "Berufsunfähigkeitsversicherung", "Страхование от профессиональной нетрудоспособности"), description: t("پوشش مالی در صورت ناتوانی از ادامه شغل فعلی.", "Finanzielle Absicherung, falls Sie Ihren Beruf nicht mehr ausüben können.", "Финансовая защита, если вы больше не можете работать по профессии.") },
          { slug: "basic-disability", title: t("بیمه ناتوانی اساسی", "Grundfähigkeitsversicherung", "Страхование базовой трудоспособности"), description: t("پوشش ساده‌تر و ارزان‌تر برای از دست دادن توانایی‌های پایه.", "Einfacherer, günstigerer Schutz beim Verlust von Grundfähigkeiten.", "Более простая и доступная защита при утрате базовых способностей.") },
          { slug: "death-benefit", title: t("بیمه هزینه کفن و دفن", "Sterbegeldversicherung", "Страхование на случай смерти (ритуальные расходы)"), description: t("پوشش هزینه‌های مراسم تشییع و کفن و دفن برای خانواده شما.", "Deckt die Kosten für Bestattung und Beerdigung für Ihre Angehörigen ab.", "Покрывает расходы на похороны и погребение для ваших близких.") },
        ],
      },
      {
        slug: "vehicles",
        title: t("بیمه خودرو و وسایل نقلیه", "Auto & Fahrzeuge", "Страхование автомобиля и транспорта"),
        description: t(
          "بیمه شخص ثالث، کمک جاده‌ای و پوشش دوچرخه برای وسایل نقلیه شما.",
          "Kfz-Haftpflicht, Pannenhilfe und Fahrradschutz für Ihre Fahrzeuge.",
          "ОСАГО, помощь на дороге и защита велосипеда для вашего транспорта."
        ),
        productTypes: [
          { slug: "car", title: t("بیمه خودرو", "Kfz-Versicherung", "Автострахование"), description: t("بیمه شخص ثالث، بدنه و سرقت برای خودروی شما.", "Haftpflicht, Teil- und Vollkasko für Ihr Fahrzeug.", "ОСАГО и КАСКО для вашего автомобиля.") },
          { slug: "roadside-assistance", title: t("کمک جاده‌ای و باشگاه خودرو", "Schutzbrief/Automobilclub", "Помощь на дороге / автоклуб"), description: t("کمک در صورت خرابی خودرو، تصادف یا خالی شدن سوخت در جاده.", "Hilfe bei Panne, Unfall oder Kraftstoffmangel unterwegs.", "Помощь при поломке, аварии или нехватке топлива в дороге.") },
          { slug: "bicycle", title: t("بیمه دوچرخه", "Fahrradversicherung", "Страхование велосипеда"), description: t("پوشش سرقت و خرابی برای دوچرخه و دوچرخه برقی.", "Diebstahl- und Schadenschutz für Fahrrad und E-Bike.", "Защита от кражи и поломок для велосипеда и электровелосипеда.") },
        ],
      },
      {
        slug: "travel",
        title: t("بیمه سفر", "Reiseversicherung", "Страхование путешествий"),
        description: t(
          "پوشش لغو سفر، تاخیر پرواز و گم‌شدن چمدان.",
          "Schutz bei Reiserücktritt, Flugverspätung und Gepäckverlust.",
          "Защита при отмене поездки, задержке рейса и потере багажа."
        ),
        productTypes: [
          {
            slug: "",
            title: t("بیمه سفر", "Reiseversicherung", "Страхование путешествий"),
            description: t(
              "پوشش لغو سفر، تاخیر پرواز و گم‌شدن چمدان.",
              "Schutz bei Reiserücktritt, Flugverspätung und Gepäckverlust.",
              "Защита при отмене поездки, задержке рейса и потере багажа."
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "retirement",
    published: true,
    icon: "piggy-bank",
    title: t("بازنشستگی", "Altersvorsorge", "Пенсионное обеспечение"),
    description: t(
      "طرح‌های بازنشستگی خصوصی و دولتی برای آینده مالی شما در آلمان.",
      "Private und staatlich geförderte Altersvorsorgepläne für Ihre finanzielle Zukunft in Deutschland.",
      "Частные и государственно поддерживаемые пенсионные планы для вашего финансового будущего в Германии."
    ),
    // Each of the 4 is a single collapsed-subcategory page, same shape as
    // Energy's electricity/gas — deliberately no price/tariff comparison
    // here (see productTypes' own comment): unlike a real published
    // electricity or dental tariff, a meaningful pension "price" depends
    // on age, income, tax bracket and years to retirement — presenting a
    // comparison table would mean either inventing numbers or a
    // calculation this project doesn't have the actuarial basis to run
    // honestly. These render as plain informational pages (hero +
    // consultation CTA) via PlpView's own existing behavior: no
    // compare-data.ts entry, no qualification-registry entry, so neither
    // section renders — not a special case, just the natural result of
    // not wiring one.
    subcategories: [
      {
        slug: "private-pension",
        title: t("بازنشستگی خصوصی", "Private Rentenversicherung", "Частная пенсия"),
        description: t(
          "پس‌انداز بازنشستگی خصوصی با پرداخت ماهانه مادام‌العمر بعد از بازنشستگی.",
          "Private Altersvorsorge mit lebenslanger monatlicher Auszahlung nach Renteneintritt.",
          "Частные пенсионные накопления с пожизненной ежемесячной выплатой после выхода на пенсию."
        ),
        productTypes: [
          {
            slug: "",
            title: t("بازنشستگی خصوصی", "Private Rentenversicherung", "Частная пенсия"),
            description: t(
              "پس‌انداز بازنشستگی خصوصی با پرداخت ماهانه مادام‌العمر بعد از بازنشستگی.",
              "Private Altersvorsorge mit lebenslanger monatlicher Auszahlung nach Renteneintritt.",
              "Частные пенсионные накопления с пожизненной ежемесячной выплатой после выхода на пенсию."
            ),
          },
        ],
      },
      {
        slug: "riester",
        title: t("بازنشستگی ریشتر (با یارانه دولتی)", "Riester-Rente", "Riester-пенсия (с государственной поддержкой)"),
        description: t(
          "طرح بازنشستگی با یارانه مستقیم دولت و مزایای مالیاتی، مخصوص کارمندان بیمه‌پرداز.",
          "Staatlich geförderte Altersvorsorge mit direkter Zulage und Steuervorteilen für gesetzlich Rentenversicherte.",
          "Пенсионный план с прямой государственной субсидией и налоговыми льготами для застрахованных сотрудников."
        ),
        productTypes: [
          {
            slug: "",
            title: t("بازنشستگی ریشتر (با یارانه دولتی)", "Riester-Rente", "Riester-пенсия (с государственной поддержкой)"),
            description: t(
              "طرح بازنشستگی با یارانه مستقیم دولت و مزایای مالیاتی، مخصوص کارمندان بیمه‌پرداز.",
              "Staatlich geförderte Altersvorsorge mit direkter Zulage und Steuervorteilen für gesetzlich Rentenversicherte.",
              "Пенсионный план с прямой государственной субсидией и налоговыми льготами для застрахованных сотрудников."
            ),
          },
        ],
      },
      {
        slug: "ruerup",
        title: t("بازنشستگی روروپ (بازنشستگی پایه)", "Rürup-Rente (Basisrente)", "Пенсия Rürup (базовая пенсия)"),
        description: t(
          "طرح بازنشستگی خصوصی با مزایای مالیاتی، مناسب فریلنسرها و صاحبان مشاغل آزاد.",
          "Private Altersvorsorge mit Steuervorteilen — ideal für Selbstständige und Freiberufler.",
          "Частная пенсия с налоговыми льготами — подходит для самозанятых и лиц свободных профессий."
        ),
        productTypes: [
          {
            slug: "",
            title: t("بازنشستگی روروپ (بازنشستگی پایه)", "Rürup-Rente (Basisrente)", "Пенсия Rürup (базовая пенсия)"),
            description: t(
              "طرح بازنشستگی خصوصی با مزایای مالیاتی، مناسب فریلنسرها و صاحبان مشاغل آزاد.",
              "Private Altersvorsorge mit Steuervorteilen — ideal für Selbstständige und Freiberufler.",
              "Частная пенсия с налоговыми льготами — подходит для самозанятых и лиц свободных профессий."
            ),
          },
        ],
      },
      {
        slug: "bav",
        title: t("بازنشستگی شغلی (bAV)", "Betriebliche Altersvorsorge (bAV)", "Корпоративная пенсия (bAV)"),
        description: t(
          "طرح بازنشستگی از طریق کارفرما، اغلب با مشارکت مالی کارفرما.",
          "Altersvorsorge über den Arbeitgeber, häufig mit finanzieller Beteiligung des Arbeitgebers.",
          "Пенсионный план через работодателя, часто с финансовым участием работодателя."
        ),
        productTypes: [
          {
            slug: "",
            title: t("بازنشستگی شغلی (bAV)", "Betriebliche Altersvorsorge (bAV)", "Корпоративная пенсия (bAV)"),
            description: t(
              "طرح بازنشستگی از طریق کارفرما، اغلب با مشارکت مالی کارفرما.",
              "Altersvorsorge über den Arbeitgeber, häufig mit finanzieller Beteiligung des Arbeitgebers.",
              "Пенсионный план через работодателя, часто с финансовым участием работодателя."
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "energy",
    published: true,
    icon: "bolt",
    title: t("انرژی", "Energie", "Энергия"),
    description: t(
      "برق و گاز سبز با گارانتی قیمت و پاداش نقدی برای خانه شما در آلمان.",
      "Ökostrom und Erdgas mit Preisgarantie und Neukundenbonus für Ihr Zuhause.",
      "Зелёное электричество и газ с гарантией цены и бонусом для нового клиента."
    ),
    subcategories: [
      {
        slug: "electricity",
        title: t("برق", "Strom", "Электричество"),
        description: t(
          "تعرفه‌های برق سبز با گارانتی قیمت تا ۲۴ ماه و پاداش نقدی ورودی.",
          "Ökostrom-Tarife mit bis zu 24 Monaten Preisgarantie und Wechselbonus.",
          "Тарифы на зелёную электроэнергию с гарантией цены до 24 месяцев и бонусом при переходе."
        ),
        productTypes: [
          {
            slug: "",
            title: t("تعرفه‌های برق", "Stromtarife", "Тарифы на электричество"),
            description: t(
              "مقایسه تعرفه‌های برق سبز از ارائه‌دهندگان معتبر آلمانی.",
              "Vergleichen Sie Ökostrom-Tarife renommierter deutscher Anbieter.",
              "Сравните тарифы на зелёную электроэнергию от надёжных немецких поставщиков."
            ),
          },
        ],
      },
      {
        slug: "gas",
        title: t("گاز", "Gas", "Газ"),
        description: t(
          "تعرفه‌های گاز طبیعی با انتقال بدون قطعی و پاداش نقدی.",
          "Erdgastarife mit unterbrechungsfreiem Wechsel und Neukundenbonus.",
          "Тарифы на природный газ с бесперебойным переходом и бонусом."
        ),
        productTypes: [
          {
            slug: "",
            title: t("تعرفه‌های گاز", "Gastarife", "Тарифы на газ"),
            description: t(
              "مقایسه تعرفه‌های گاز طبیعی از ارائه‌دهندگان معتبر آلمانی.",
              "Vergleichen Sie Erdgastarife renommierter deutscher Anbieter.",
              "Сравните тарифы на природный газ от надёжных немецких поставщиков."
            ),
          },
        ],
      },
    ],
  },
  {
    slug: "communication",
    // Unpublished 2026-09-13 — internet/phone services removed from the
    // site per direct instruction. Gates the category out of nav, sitemap,
    // and routing (resolveServicesPath returns not-found, allServicePaths
    // skips it — see this interface's own doc comment) while the data,
    // PDP content, and qualification wizards stay intact underneath, the
    // same mechanism already reserved for exactly this ("Finance").
    published: false,
    icon: "wifi",
    title: t("اینترنت و موبایل", "Internet und Mobilfunk", "Интернет и мобильная связь"),
    description: t(
      "اینترنت پرسرعت و سیم‌کارت موبایل با بهترین شرایط برای فارسی‌زبانان مقیم آلمان.",
      "Highspeed-Internet und Mobilfunk zu den besten Konditionen.",
      "Высокоскоростной интернет и мобильная связь на лучших условиях."
    ),
    subcategories: [
      {
        slug: "mobile",
        title: t("سیم‌کارت و موبایل", "SIM & Mobilfunk", "SIM-карта и мобильная связь"),
        description: t(
          "تعرفه‌های موبایل و 5G با اینترنت و مکالمه نامحدود.",
          "Mobilfunk- und 5G-Tarife mit Allnet-Flat und unbegrenztem Datenvolumen.",
          "Тарифы мобильной связи и 5G с безлимитным интернетом и звонками."
        ),
        // Promoted from futureChildren to real productTypes for Phase 3 — see
        // taxonomy header comment: "only become public navigation levels when
        // sufficient products/content exist."
        productTypes: [
          {
            slug: "contract",
            title: t("تعرفه قراردادی", "Vertragstarif", "Контрактный тариф"),
            description: t(
              "سیم‌کارت با قرارداد معمولاً ۲۴ ماهه، شامل دستگاه یا بدون آن، با حجم اینترنت و مکالمه ثابت هرماه.",
              "SIM-Karte mit meist 24-monatiger Vertragsbindung, mit oder ohne Gerät, mit festem monatlichem Datenvolumen.",
              "SIM-карта с договором обычно на 24 месяца, с устройством или без, с фиксированным ежемесячным трафиком."
            ),
          },
          {
            slug: "postpaid",
            title: t("سیم‌کارت دائمی بدون تعهد", "Postpaid ohne Vertragsbindung", "Постоплата без обязательств"),
            description: t(
              "سیم‌کارت با صورت‌حساب ماهانه ولی بدون دوره تعهد طولانی‌مدت — قابل فسخ با اطلاع کوتاه.",
              "SIM-Karte mit monatlicher Rechnung, aber ohne lange Mindestlaufzeit — kurzfristig kündbar.",
              "SIM-карта с ежемесячным счётом, но без длительного минимального срока — можно расторгнуть в короткий срок."
            ),
          },
          {
            slug: "prepaid",
            title: t("سیم‌کارت اعتباری", "Prepaid-Tarif", "Предоплаченная SIM-карта"),
            description: t(
              "شارژ اعتباری بدون قرارداد و بدون بررسی اعتبار — مناسب تازه‌واردین بدون سابقه بانکی آلمان.",
              "Guthabenbasiert, ohne Vertrag und ohne Bonitätsprüfung — ideal für Neuankömmlinge ohne deutsche Bankhistorie.",
              "Предоплата без договора и без проверки кредитной истории — подходит новоприбывшим без немецкой банковской истории."
            ),
          },
        ],
      },
      {
        slug: "internet",
        title: t("اینترنت خانگی", "Internet", "Домашний интернет"),
        description: t(
          "اینترنت فیبر نوری، DSL و کابلی با سرعت تا ۱۰۰۰ مگابیت.",
          "Glasfaser-, DSL- und Kabel-Internet mit bis zu 1000 Mbit/s.",
          "Оптоволоконный, DSL и кабельный интернет со скоростью до 1000 Мбит/с."
        ),
        productTypes: [
          {
            slug: "fiber",
            title: t("اینترنت فیبر نوری", "Glasfaser-Internet", "Оптоволоконный интернет"),
            description: t(
              "سریع‌ترین نوع اتصال اینترنت خانگی در آلمان، با پایداری بالا برای دورکاری و استریم.",
              "Die schnellste Art des Heimanschlusses in Deutschland, mit hoher Stabilität für Homeoffice und Streaming.",
              "Самый быстрый вид домашнего подключения в Германии, со стабильной скоростью для удалённой работы и стриминга."
            ),
          },
          {
            slug: "dsl",
            title: t("اینترنت DSL", "DSL-Internet", "DSL-интернет"),
            description: t(
              "پرکاربردترین نوع اتصال اینترنت در آلمان، از طریق خط تلفن ثابت موجود در اکثر ساختمان‌ها.",
              "Der am weitesten verbreitete Internetanschluss in Deutschland, über die vorhandene Telefonleitung der meisten Gebäude.",
              "Самый распространённый вид интернет-подключения в Германии — через существующую телефонную линию в большинстве зданий."
            ),
          },
          {
            slug: "cable",
            title: t("اینترنت کابلی", "Kabel-Internet", "Кабельный интернет"),
            description: t(
              "اتصال از طریق شبکه کابل تلویزیونی ساختمان — معمولاً سرعت بالاتر از DSL در همان منطقه.",
              "Anschluss über das TV-Kabelnetz des Gebäudes — meist höhere Geschwindigkeiten als DSL in derselben Region.",
              "Подключение через кабельную ТВ-сеть здания — обычно более высокая скорость, чем DSL, в том же районе."
            ),
          },
          {
            slug: "5g-home",
            title: t("اینترنت خانگی ۵G", "5G Homespot", "Домашний 5G-интернет"),
            description: t(
              "اینترنت خانگی بدون نیاز به سیم‌کشی، از طریق روتر 5G — گزینه‌ای سریع برای مناطق بدون فیبر یا DSL قوی.",
              "Kabelloses Heiminternet über einen 5G-Router — eine schnelle Option für Regionen ohne Glasfaser oder starkes DSL.",
              "Домашний интернет без проводки через 5G-роутер — быстрый вариант для районов без оптоволокна или сильного DSL."
            ),
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers used by routing, breadcrumbs, nav, and sitemap generation.
// ---------------------------------------------------------------------------

export function getCategory(slug: string): Category | undefined {
  return TAXONOMY.find((c) => c.slug === slug);
}

export function getSubcategory(categorySlug: string, subSlug: string): Subcategory | undefined {
  return getCategory(categorySlug)?.subcategories.find((s) => s.slug === subSlug);
}

export function getProductType(categorySlug: string, subSlug: string, productSlug: string): ProductType | undefined {
  return getSubcategory(categorySlug, subSlug)?.productTypes.find((p) => p.slug === productSlug);
}

/** True when a subcategory has a single, unnamed productType — meaning the subcategory page itself is the PLP (2-segment URL). */
export function isCollapsedSubcategory(sub: Subcategory): boolean {
  return sub.productTypes.length === 1 && sub.productTypes[0].slug === "";
}

/**
 * Resolves a /services/[...slug] catch-all into a typed route match.
 * Segment shapes:
 *   [category]
 *   [category, subcategory]                          (PLP if collapsed subcategory)
 *   [category, subcategory, productType]              (PLP if not collapsed) OR (PDP if collapsed + slug given)
 *   [category, subcategory, productType, audienceOrPdpSlug]
 */
export type TaxonomyMatch =
  | { type: "category"; category: Category }
  | { type: "subcategory"; category: Category; subcategory: Subcategory }
  | { type: "plp"; category: Category; subcategory: Subcategory; productType: ProductType }
  | { type: "audience"; category: Category; subcategory: Subcategory; productType: ProductType; audience: ProductAudience }
  | { type: "pdp"; category: Category; subcategory: Subcategory; productType: ProductType; pdpSlug: string }
  | { type: "not-found" };

export function resolveServicesPath(segments: string[]): TaxonomyMatch {
  const [categorySlug, subSlug, thirdSlug, fourthSlug] = segments;

  const category = categorySlug ? getCategory(categorySlug) : undefined;
  if (!category || !category.published) return { type: "not-found" };
  if (!subSlug) return { type: "category", category };

  const subcategory = getSubcategory(category.slug, subSlug);
  if (!subcategory) return { type: "not-found" };

  const collapsed = isCollapsedSubcategory(subcategory);

  if (collapsed) {
    const productType = subcategory.productTypes[0];
    if (!thirdSlug) return { type: "plp", category, subcategory, productType };
    // collapsed subcategory + one more segment = PDP (e.g. /energy/electricity/[tariff-slug])
    return { type: "pdp", category, subcategory, productType, pdpSlug: thirdSlug };
  }

  if (!thirdSlug) return { type: "subcategory", category, subcategory };

  const productType = getProductType(category.slug, subcategory.slug, thirdSlug);
  if (!productType) return { type: "not-found" };

  if (!fourthSlug) return { type: "plp", category, subcategory, productType };

  const audience = productType.audiences?.find((a) => a.slug === fourthSlug);
  if (audience) return { type: "audience", category, subcategory, productType, audience };

  return { type: "pdp", category, subcategory, productType, pdpSlug: fourthSlug };
}

/** Every /services/... path in the taxonomy, as segment arrays — used by generateStaticParams and the sitemap. */
export function allServicePaths(): string[][] {
  const paths: string[][] = [];
  for (const category of TAXONOMY) {
    if (!category.published) continue;
    paths.push([category.slug]);
    for (const sub of category.subcategories) {
      const collapsed = isCollapsedSubcategory(sub);
      if (collapsed) {
        paths.push([category.slug, sub.slug]);
        continue;
      }
      paths.push([category.slug, sub.slug]);
      for (const pt of sub.productTypes) {
        paths.push([category.slug, sub.slug, pt.slug]);
        for (const aud of pt.audiences ?? []) {
          paths.push([category.slug, sub.slug, pt.slug, aud.slug]);
        }
      }
    }
  }
  return paths;
}

export interface BreadcrumbItem {
  label: string;
  href: string;
}

export function breadcrumbsFor(locale: Locale, match: TaxonomyMatch): BreadcrumbItem[] {
  const base = (segments: string[]) => `/${locale}/services/${segments.join("/")}`;
  const crumbs: BreadcrumbItem[] = [{ label: byLocale(locale, HOME_LABEL), href: `/${locale}` }];
  if (match.type === "not-found") return crumbs;

  crumbs.push({ label: byLocale(locale, SERVICES_LABEL), href: `/${locale}/services` });
  crumbs.push({ label: byLocale(locale, match.category.title), href: base([match.category.slug]) });

  if (match.type === "category") return crumbs;

  crumbs.push({ label: byLocale(locale, match.subcategory.title), href: base([match.category.slug, match.subcategory.slug]) });
  if (match.type === "subcategory") return crumbs;

  if (!isCollapsedSubcategory(match.subcategory)) {
    crumbs.push({
      label: byLocale(locale, match.productType.title),
      href: base([match.category.slug, match.subcategory.slug, match.productType.slug]),
    });
  }
  if (match.type === "plp") return crumbs;

  if (match.type === "audience") {
    crumbs.push({ label: byLocale(locale, match.audience.title), href: base([match.category.slug, match.subcategory.slug, match.productType.slug, match.audience.slug]) });
  }
  if (match.type === "pdp") {
    const known = KNOWN_TARIFFS[match.pdpSlug];
    crumbs.push({
      label: known ? `${known.provider} ${known.name}` : match.pdpSlug.replace(/-/g, " "),
      href: base([match.category.slug, match.subcategory.slug, ...(match.productType.slug ? [match.productType.slug] : []), match.pdpSlug]),
    });
  }

  return crumbs;
}

const HOME_LABEL = t("خانه", "Startseite", "Главная");
const SERVICES_LABEL = t("خدمات", "Dienstleistungen", "Услуги");

export function byLocale(locale: Locale, text: LocalizedText): string {
  return text[locale];
}
