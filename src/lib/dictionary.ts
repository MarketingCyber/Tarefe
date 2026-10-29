import type { Locale } from "./taxonomy";

/**
 * UI string dictionary. Persian is the production language; German and
 * Russian are architecturally complete but content-stub (marked where the
 * translation is a functional placeholder rather than a reviewed one).
 */
export interface Dictionary {
  nav: {
    services: string;
    guides: string;
    about: string;
    contact: string;
    faq: string;
    login: string;
    whatsapp: string;
    consultation: string;
    search: string;
    myAccount: string;
    goToOps: string;
    signOut: string;
  };
  cta: {
    freeConsultation: string;
    whatsappConsultation: string;
    checkEligibility: string;
    /** The site-wide promise: every service is free for the customer. Shown in the top bar, hero chips, footer, forms. */
    freeClaim: string;
    freeDetail: string;
  };
  home: {
    heroEyebrow: string;
    heroTitle: string;
    heroSubtitle: string;
    heroTrust: string[];
    partnersTitle: string;
    categoriesTitle: string;
    categoriesSubtitle: string;
    popularTitle: string;
    whyTitle: string;
    whySubtitle: string;
    howTitle: string;
    howSubtitle: string;
    storiesTitle: string;
    portalTitle: string;
    portalSubtitle: string;
    portalCta: string;
    faqTitle: string;
    finalCtaTitle: string;
    finalCtaSubtitle: string;
  };
  footer: {
    services: string;
    popularServices: string;
    company: string;
    support: string;
    legal: string;
    account: string;
    about: string;
    contact: string;
    careers: string;
    whatsapp: string;
    imprint: string;
    privacy: string;
    terms: string;
    cookiePolicy: string;
    myTarefe: string;
    rights: string;
  };
  breadcrumbHome: string;
  notFound: {
    title: string;
    subtitle: string;
    cta: string;
  };
  cookieConsent: {
    body: string;
    acceptAll: string;
    policyLink: string;
  };
}

const fa: Dictionary = {
  nav: {
    services: "خدمات",
    guides: "راهنما",
    about: "درباره تعرفه",
    contact: "تماس با ما",
    faq: "سوالات متداول",
    login: "ورود",
    whatsapp: "واتساپ",
    consultation: "درخواست مشاوره",
    search: "جستجو",
    myAccount: "تعرفه من",
    goToOps: "رفتن به عملیات",
    signOut: "خروج",
  },
  cta: {
    freeConsultation: "درخواست مشاوره رایگان",
    whatsappConsultation: "مشاوره در واتساپ",
    checkEligibility: "ببینم واجد شرایط هستم",
    freeClaim: "همه خدمات ما رایگان است",
    freeDetail: "مقایسه، مشاوره و ثبت قرارداد برای تو هیچ هزینه‌ای ندارد",
  },
  home: {
    heroEyebrow: "پلتفرم تخصصی قراردادها در آلمان",
    heroTitle: "مقایسه، انتخاب و مدیریت قراردادهای شما در آلمان",
    heroSubtitle: "از بیمه تا انرژی؛ گزینه‌ها را مقایسه کن و رایگان با یک مشاور فارسی تصمیم بگیر.",
    heroTrust: ["۱۰۰٪ رایگان و بدون هزینه پنهان", "مشاوران رسمی و دارای تاییدیه IHK", "پشتیبانی کامل به زبان فارسی"],
    partnersTitle: "با شرکت‌های معتبر آلمانی همکاری می‌کنیم",
    categoriesTitle: "سه حوزه کلیدی قراردادهای زندگی در آلمان",
    categoriesSubtitle: "هر آنچه برای آسودگی خاطر در امور بیمه، انرژی و ارتباطات نیاز دارید.",
    popularTitle: "خدمات پرطرفدار تعرفه",
    whyTitle: "فقط قیمت مقایسه نمی‌کنیم",
    whySubtitle: "کمک می‌کنیم انتخاب درست را ساده و بی‌دردسر انجام بدهی — و همه خدمات ما برایت رایگان است.",
    howTitle: "مسیر شما در تعرفه",
    howSubtitle: "یک چرخه شفاف و بدون استرس از اولین ارتباط تا سال‌ها همراهی.",
    storiesTitle: "یک تیم واقعی پشت تعرفه است",
    portalTitle: "همه قراردادهایت، یکجا",
    portalSubtitle: "قراردادها، مدارک و پیگیری‌ها را از یکجا مدیریت کن.",
    portalCta: "آشنایی با My Tarefe",
    faqTitle: "سوالات متداول",
    finalCtaTitle: "انتخاب قرارداد لازم نیست سخت باشد",
    finalCtaSubtitle: "شرایطت را رایگان با ما بررسی کن و ببین کدام گزینه برایت مناسب‌تر است.",
  },
  footer: {
    services: "خدمات",
    popularServices: "خدمات محبوب",
    company: "شرکت",
    support: "پشتیبانی",
    legal: "قوانین",
    account: "حساب کاربری",
    about: "درباره ما",
    contact: "تماس با ما",
    careers: "فرصت‌های شغلی",
    whatsapp: "واتساپ",
    imprint: "اطلاعات قانونی",
    privacy: "حریم خصوصی",
    terms: "شرایط و قوانین",
    cookiePolicy: "سیاست کوکی",
    myTarefe: "My Tarefe",
    rights: "تمام حقوق محفوظ است.",
  },
  breadcrumbHome: "خانه",
  notFound: {
    title: "این صفحه پیدا نشد",
    subtitle: "لینک را دوباره بررسی کنید یا از خدمات ما شروع کنید.",
    cta: "بازگشت به صفحه اصلی",
  },
  cookieConsent: {
    body: "ما از کوکی‌ها و ابزارهای تحلیل و تبلیغات (Google، Meta و Microsoft Clarity) برای بهبود سایت و سنجش تبلیغات‌مان استفاده می‌کنیم.",
    acceptAll: "باشه",
    policyLink: "سیاست کوکی",
  },
};

const de: Dictionary = {
  nav: {
    services: "Dienstleistungen",
    guides: "Ratgeber",
    about: "Über Tarefe",
    contact: "Kontakt",
    faq: "FAQ",
    login: "Anmelden",
    whatsapp: "WhatsApp",
    consultation: "Kostenlose Beratung",
    search: "Suche",
    myAccount: "Mein Tarefe",
    goToOps: "Zu Operations",
    signOut: "Abmelden",
  },
  cta: {
    freeConsultation: "Kostenlose Beratung anfragen",
    whatsappConsultation: "Beratung per WhatsApp",
    checkEligibility: "Anspruch prüfen",
    freeClaim: "Alle unsere Leistungen sind kostenlos",
    freeDetail: "Vergleich, Beratung und Vertragsabschluss kosten Sie nichts",
  },
  home: {
    heroEyebrow: "Ihre Vertragsplattform in Deutschland",
    heroTitle: "Verträge in Deutschland vergleichen, wählen und verwalten",
    heroSubtitle: "Von Versicherung bis Energie — vergleichen Sie Optionen und entscheiden Sie kostenlos mit einer Beratung in Ihrer Sprache.",
    heroTrust: ["100 % kostenlos, keine versteckten Kosten", "Zertifizierte Berater (IHK)", "Vollständiger Support in Ihrer Sprache"],
    partnersTitle: "Wir arbeiten mit renommierten deutschen Unternehmen zusammen",
    categoriesTitle: "Drei zentrale Vertragsbereiche in Deutschland",
    categoriesSubtitle: "Alles, was Sie für Versicherung, Energie und Kommunikation brauchen.",
    popularTitle: "Beliebte Tarefe-Dienstleistungen",
    whyTitle: "Wir vergleichen nicht nur Preise",
    whySubtitle: "Wir machen die richtige Wahl einfach und stressfrei — und alle unsere Leistungen sind für Sie kostenlos.",
    howTitle: "Ihr Weg mit Tarefe",
    howSubtitle: "Ein transparenter, stressfreier Ablauf vom ersten Kontakt bis zur langfristigen Begleitung.",
    storiesTitle: "Ein echtes Team steht hinter Tarefe",
    portalTitle: "Alle Verträge an einem Ort",
    portalSubtitle: "Verwalten Sie Verträge, Dokumente und Anfragen zentral.",
    portalCta: "My Tarefe entdecken",
    faqTitle: "Häufig gestellte Fragen",
    finalCtaTitle: "Die Vertragswahl muss nicht schwer sein",
    finalCtaSubtitle: "Schildern Sie uns Ihre Situation — wir finden kostenlos die passende Option.",
  },
  footer: {
    services: "Dienstleistungen",
    popularServices: "Beliebte Dienstleistungen",
    company: "Unternehmen",
    support: "Support",
    legal: "Rechtliches",
    account: "Konto",
    about: "Über uns",
    contact: "Kontakt",
    careers: "Karriere",
    whatsapp: "WhatsApp",
    imprint: "Impressum",
    privacy: "Datenschutz",
    terms: "AGB",
    cookiePolicy: "Cookie-Richtlinie",
    myTarefe: "My Tarefe",
    rights: "Alle Rechte vorbehalten.",
  },
  breadcrumbHome: "Startseite",
  notFound: {
    title: "Seite nicht gefunden",
    subtitle: "Überprüfen Sie den Link oder starten Sie bei unseren Dienstleistungen.",
    cta: "Zur Startseite",
  },
  cookieConsent: {
    body: "Wir nutzen Cookies sowie Analyse- und Werbedienste (Google, Meta, Microsoft Clarity), um unsere Website und Werbung zu verbessern.",
    acceptAll: "OK",
    policyLink: "Cookie-Richtlinie",
  },
};

const ru: Dictionary = {
  nav: {
    services: "Услуги",
    guides: "Гид",
    about: "О Tarefe",
    contact: "Контакты",
    faq: "Вопросы",
    login: "Войти",
    whatsapp: "WhatsApp",
    consultation: "Бесплатная консультация",
    search: "Поиск",
    myAccount: "Мой Tarefe",
    goToOps: "К операциям",
    signOut: "Выйти",
  },
  cta: {
    freeConsultation: "Запросить бесплатную консультацию",
    whatsappConsultation: "Консультация в WhatsApp",
    checkEligibility: "Проверить право",
    freeClaim: "Все наши услуги бесплатны",
    freeDetail: "Сравнение, консультация и оформление договора вам ничего не стоят",
  },
  home: {
    heroEyebrow: "Ваша платформа договоров в Германии",
    heroTitle: "Сравнивайте, выбирайте и управляйте договорами в Германии",
    heroSubtitle: "От страхования до энергии — сравните варианты и получите бесплатную консультацию на вашем языке.",
    heroTrust: ["100% бесплатно, без скрытых платежей", "Сертифицированные консультанты (IHK)", "Полная поддержка на вашем языке"],
    partnersTitle: "Мы сотрудничаем с надёжными немецкими компаниями",
    categoriesTitle: "Три ключевые сферы договоров в Германии",
    categoriesSubtitle: "Всё для страхования, энергии и связи.",
    popularTitle: "Популярные услуги Tarefe",
    whyTitle: "Мы не просто сравниваем цены",
    whySubtitle: "Мы делаем правильный выбор простым и без стресса — и все наши услуги для вас бесплатны.",
    howTitle: "Ваш путь с Tarefe",
    howSubtitle: "Прозрачный процесс без стресса от первого контакта до долгосрочного сопровождения.",
    storiesTitle: "За Tarefe стоит настоящая команда",
    portalTitle: "Все договоры в одном месте",
    portalSubtitle: "Управляйте договорами, документами и запросами централизованно.",
    portalCta: "Узнать о My Tarefe",
    faqTitle: "Часто задаваемые вопросы",
    finalCtaTitle: "Выбор договора не должен быть сложным",
    finalCtaSubtitle: "Расскажите нам о своей ситуации — мы бесплатно найдём подходящий вариант.",
  },
  footer: {
    services: "Услуги",
    popularServices: "Популярные услуги",
    company: "Компания",
    support: "Поддержка",
    legal: "Правовая информация",
    account: "Аккаунт",
    about: "О нас",
    contact: "Контакты",
    careers: "Карьера",
    whatsapp: "WhatsApp",
    imprint: "Выходные данные",
    privacy: "Конфиденциальность",
    terms: "Условия",
    cookiePolicy: "Политика cookie",
    myTarefe: "My Tarefe",
    rights: "Все права защищены.",
  },
  breadcrumbHome: "Главная",
  notFound: {
    title: "Страница не найдена",
    subtitle: "Проверьте ссылку или начните с наших услуг.",
    cta: "На главную",
  },
  cookieConsent: {
    body: "Мы используем cookie, а также сервисы аналитики и рекламы (Google, Meta, Microsoft Clarity), чтобы улучшать сайт и рекламу.",
    acceptAll: "OK",
    policyLink: "Политика cookie",
  },
};

const dictionaries: Record<Locale, Dictionary> = { fa, de, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.fa;
}
