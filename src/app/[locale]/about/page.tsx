import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Scales,
  ChatCircleText,
  FileText,
  Files,
  Clock,
  ShieldWarning,
  ShieldCheck,
  Translate,
  ClipboardText,
  HeartStraight,
  Tooth,
  Lightning,
  DeviceMobile,
  CheckCircle,
  ArrowRight,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { Reveal } from "@/components/shared/Reveal";
import { MagneticCta } from "@/components/shared/MagneticCta";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  const copy = COPY[locale as Locale];
  return { title: dict.footer.about, description: copy.subtitle, alternates: buildAlternates(locale as Locale, "about") };
}

// Rewritten 2026-09-29 from the user's own drafted copy (approved against
// the brand messaging reference) — replaces the earlier 3-paragraph
// placeholder with the full structure: intro, the challenges we recognize,
// what Tarefe actually is, how working together goes, why Tarefe, the
// services on offer, our transparency commitment, data privacy, and vision.
// Deliberately still no customer-count/founding-year/contract-count style
// numeric claims — same standing rule as before: only verified, sourced
// figures go on this page, and none were supplied for this pass.
type Bullet = { title: string; body: string };

const CHALLENGE_ICONS = [Files, Clock, ShieldWarning, Translate, ClipboardText];
const WHAT_IS_ICONS = [Scales, ChatCircleText, FileText];

const SERVICE_ICONS = [HeartStraight, ShieldCheck, Tooth, Lightning, DeviceMobile] as const;
const SERVICE_HREFS = ["insurance/health/pkv", "insurance/health/gkv", "insurance/health/dental", "energy", null] as const;

const COPY: Record<
  Locale,
  {
    title: string;
    subtitle: string;
    intro: string[];
    challengesTitle: string;
    challengesIntro: string;
    challenges: Bullet[];
    challengesClosing: string;
    whatIsTitle: string;
    whatIsIntro: string;
    whatIs: Bullet[];
    whatIsClosing: string;
    processTitle: string;
    processSteps: string[];
    processBody: string;
    whyTitle: string;
    why: string[];
    servicesTitle: string;
    services: string[];
    transparencyTitle: string;
    transparency: string[];
    privacyTitle: string;
    privacy: string;
    visionTitle: string;
    vision: string;
    ctaTitle: string;
    ctaSubtitle: string;
  }
> = {
  fa: {
    title: "درباره تعرفه",
    subtitle: "ما فقط قیمت مقایسه نمی‌کنیم؛ کمک می‌کنیم انتخاب درست را ساده و بی‌دردسر انجام بدهی",
    intro: [
      "تعرفه برای فارسی‌زبان‌های ساکن آلمان ساخته شده — جایی که پیدا کردن گزینه‌ی مناسب برای بیمه، برق، گاز یا تلفن، معمولاً یعنی ساعت‌ها گشتن بین سایت‌های آلمانی، خواندن قراردادهایی با اصطلاحات ناآشنا، و تصمیم گرفتن بدون اینکه واقعاً مطمئن باشی انتخابت درسته.",
      "ما اینجاییم که این بخش رو برات ساده کنیم. نه با قول‌های اغراق‌آمیز، بلکه با مقایسه‌ی واقعی گزینه‌ها، توضیح ساده‌ی تفاوت‌ها، و همراهی از همون مقایسه‌ی اول تا مدت‌ها بعد از ثبت قرارداد.",
    ],
    challengesTitle: "چالشی که می‌شناسیمش",
    challengesIntro: "هر کسی که به آلمان مهاجرت کرده، این تجربه رو داره:",
    challenges: [
      { title: "پیچیدگی", body: "قراردادها و اصطلاحات آلمانی، به‌خصوص برای موضوعات مالی و بیمه‌ای، به‌راحتی قابل فهم نیستن." },
      { title: "وقت", body: "بین کار، زندگی و بقیه‌ی درگیری‌های مهاجرت، وقتی برای بررسی ده‌ها ارائه‌دهنده نمی‌مونه." },
      { title: "اعتماد", body: "ترک یه ارائه‌دهنده‌ی آشنا برای یه گزینه‌ی ناشناس، ریسک‌ حس می‌شه." },
      { title: "زبان", body: "تصمیم‌های مالی و قراردادی مهم، بهتره به زبونی گرفته بشن که کاملاً باهاش راحتی." },
      { title: "کارهای اداری", body: "فسخ قرارداد قبلی، پیگیری، تغییر آدرس یا حساب بانکی؛ کسی دوست نداره خودش تنها با این‌ها درگیر باشه." },
    ],
    challengesClosing: "تعرفه دقیقاً برای همین نقطه‌ها ساخته شده.",
    whatIsTitle: "تعرفه چیست؟",
    whatIsIntro: "تعرفه فقط یه سایت مقایسه‌ی قیمت نیست. سه تا چیز با هم:",
    whatIs: [
      { title: "پلتفرم مقایسه", body: "گزینه‌های واقعی بازار آلمان رو کنار هم می‌ذاریم، نه فقط قیمت، بلکه پوشش، شرایط قرارداد، محدودیت‌ها و مدت تعهد." },
      { title: "مشاور فارسی", body: "یه آدم واقعی، نه یه فرم خودکار، شرایط تو رو می‌شنوه و کمکت می‌کنه گزینه‌ی منطقی رو پیدا کنی." },
      { title: "مدیریت قرارداد", body: "از ثبت قرارداد جدید تا فسخ قرارداد قبلی، تغییر آدرس، پیگیری با ارائه‌دهنده‌ها و رسیدگی به شکایت‌ها — همه از طریق یک پلتفرم." },
    ],
    whatIsClosing: "تو انتخاب کن؛ تعرفه مقایسه، ثبت و پیگیریش رو انجام می‌ده.",
    processTitle: "مسیر همکاری با ما",
    processSteps: ["مقایسه", "مشاوره", "ثبت قرارداد", "پشتیبانی"],
    processBody:
      "هر همکاری با تعرفه از یه مقایسه‌ی رایگان و بدون تعهد شروع می‌شه. اگه گزینه‌ی بهتری پیدا بشه، در تمام مراحل ثبت قرارداد کنارتیم؛ و بعد از قرارداد هم، پشتیبانی همچنان ادامه داره — تغییر شرایط، تمدید، یا هر سوالی که پیش بیاد.",
    whyTitle: "چرا تعرفه؟",
    why: [
      "گزینه‌های متعدد — به‌جای یه پیشنهاد ثابت، طیف واقعی ارائه‌دهنده‌های بازار آلمان رو می‌بینی.",
      "مقایسه‌ی واقعی، نه فقط قیمت — پوشش، شرایط فسخ، مدت قرارداد و محدودیت‌ها هم بررسی می‌شن.",
      "پشتیبانی کاملاً فارسی — از مشاوره تا حل مشکل، به زبونی که راحتی.",
      "همراهی end-to-end — از اولین مقایسه تا مدیریت قرارداد بعد از خرید.",
      "یک پلتفرم، چند قرارداد — بیمه، انرژی، و در آینده تلفن، همه از یه‌جا مدیریت می‌شن.",
      "مشاوره‌ی اولیه‌ی رایگان — بدون تعهد و بدون هزینه، شرایطت رو بررسی می‌کنیم.",
    ],
    servicesTitle: "خدماتی که ارائه می‌دهیم",
    services: [
      "بیمه خصوصی درمان (PKV) — برای افراد واجد شرایط (Selbstständig، Freelancer، صاحبان کسب‌وکار، کارمندان با درآمد بالا)",
      "بهینه‌سازی بیمه درمانی دولتی (GKV) — مقایسه و تغییر صندوق بدون از دست دادن پوشش پایه",
      "بیمه تکمیلی دندان (Zahnzusatzversicherung) — پوشش هزینه‌های درمان‌هایی که GKV به‌طور کامل پرداخت نمی‌کنه",
      "برق (Stromtarif) و گاز (Gastarif) — مقایسه‌ی تعرفه‌ها بر اساس مصرف واقعی‌ات",
      "در مسیر توسعه: تلفن همراه و اینترنت، برای تکمیل مدیریت قراردادهای زندگی روزمره‌ات در آلمان",
    ],
    transparencyTitle: "تعهد ما به شفافیت",
    transparency: [
      "هیچ گزینه‌ای برای همه مناسب نیست، و ما این رو صادقانه می‌گیم. کار ما پیدا کردن ارزان‌ترین گزینه به‌هر قیمت نیست؛ پیدا کردن گزینه‌ایه که واقعاً با شرایط تو منطقی باشه. سقف پرداخت، دوره‌ی انتظار، شرایط پذیرش و محدودیت‌های هر طرح رو شفاف بهت می‌گیم — حتی وقتی جواب «این گزینه براتون مناسب نیست» باشه.",
      "هر پیشنهادی که بهت می‌دیم، جواب یه سوال ساده‌ست: تعرفه دقیقاً چه کاری برای من انجام می‌دهد؟ — شرایطت رو بررسی می‌کنیم، گزینه‌ها رو مقایسه می‌کنیم، تفاوت‌ها رو ساده توضیح می‌دیم، و اگه انتخاب کنی، در ثبت و پیگیری قرارداد هم کنارت می‌مونیم.",
    ],
    privacyTitle: "حریم خصوصی اطلاعات تو",
    privacy:
      "اطلاعاتی که با ما در میون می‌ذاری فقط برای همون مقایسه و مشاوره‌ای استفاده می‌شه که درخواست کردی، و مطابق با مقررات حفظ حریم خصوصی اتحادیه اروپا (GDPR/DSGVO) نگهداری می‌شه.",
    visionTitle: "چشم‌انداز ما",
    vision:
      "تعرفه قراره بیشتر از یه پلتفرم مقایسه باشه: پلتفرم مدیریت قراردادهای زندگی در آلمان — جایی که هر قراردادی که در آلمان امضا می‌کنی، از بیمه تا انرژی تا تلفن، از یک‌جا و با یک مشاور فارسی قابل مدیریت باشه.",
    ctaTitle: "آماده‌ای شروع کنیم؟",
    ctaSubtitle: "شرایطت رو رایگان و بدون تعهد بررسی می‌کنیم.",
  },
  de: {
    title: "Über Tarefe",
    subtitle: "Wir vergleichen nicht nur Preise — wir machen die richtige Entscheidung einfach und stressfrei.",
    intro: [
      "In Deutschland die passende Option für Versicherung, Strom, Gas oder Telefon zu finden bedeutet oft: stundenlanges Suchen auf deutschen Webseiten, Verträge mit unbekannten Fachbegriffen lesen und eine Entscheidung treffen, ohne wirklich sicher zu sein, ob sie richtig ist.",
      "Wir sind da, um genau das für Sie einfacher zu machen. Nicht mit übertriebenen Versprechen, sondern mit einem echten Vergleich der Optionen, einer einfachen Erklärung der Unterschiede und Begleitung vom ersten Vergleich bis lange nach Vertragsabschluss.",
    ],
    challengesTitle: "Die Herausforderung, die wir kennen",
    challengesIntro: "Jeder, der nach Deutschland ausgewandert ist, kennt diese Erfahrung:",
    challenges: [
      { title: "Komplexität", body: "Verträge und deutsche Fachbegriffe, besonders bei finanziellen und versicherungsbezogenen Themen, sind nicht einfach zu verstehen." },
      { title: "Zeit", body: "Zwischen Arbeit, Alltag und den übrigen Herausforderungen der Migration bleibt keine Zeit, Dutzende Anbieter zu prüfen." },
      { title: "Vertrauen", body: "Einen vertrauten Anbieter für eine unbekannte Option zu verlassen, fühlt sich riskant an." },
      { title: "Sprache", body: "Wichtige finanzielle und vertragliche Entscheidungen sollten besser in einer Sprache getroffen werden, in der man sich völlig sicher fühlt." },
      { title: "Behördliche Abwicklung", body: "Kündigung des alten Vertrags, Nachverfolgung, Adress- oder Bankwechsel; niemand möchte sich damit allein herumschlagen." },
    ],
    challengesClosing: "Genau für diese Punkte wurde Tarefe gemacht.",
    whatIsTitle: "Was ist Tarefe?",
    whatIsIntro: "Tarefe ist nicht nur eine Preisvergleichsseite. Es sind drei Dinge zugleich:",
    whatIs: [
      {
        title: "Vergleichsplattform",
        body: "Wir stellen die echten Optionen des deutschen Marktes gegenüber — nicht nur den Preis, sondern auch Leistungsumfang, Vertragsbedingungen, Einschränkungen und Vertragslaufzeit.",
      },
      { title: "Beratung in Ihrer Sprache", body: "Ein echter Mensch, kein automatisches Formular, hört sich Ihre Situation an und hilft Ihnen, die sinnvolle Option zu finden." },
      {
        title: "Vertragsverwaltung",
        body: "Vom Abschluss eines neuen Vertrags über die Kündigung des alten, Adressänderungen und Nachverfolgung mit den Anbietern bis zur Bearbeitung von Beschwerden — alles über eine Plattform.",
      },
    ],
    whatIsClosing: "Sie entscheiden; Tarefe übernimmt Vergleich, Abschluss und Nachverfolgung.",
    processTitle: "So arbeiten wir zusammen",
    processSteps: ["Vergleich", "Beratung", "Vertragsabschluss", "Support"],
    processBody:
      "Jede Zusammenarbeit mit Tarefe beginnt mit einem kostenlosen, unverbindlichen Vergleich. Wird eine bessere Option gefunden, begleiten wir Sie durch den gesamten Vertragsabschluss; und auch danach bleibt der Support bestehen — bei Änderungen, Verlängerungen oder jeder Frage, die auftaucht.",
    whyTitle: "Warum Tarefe?",
    why: [
      "Mehrere Optionen — statt eines einzigen festen Angebots sehen Sie die echte Bandbreite der Anbieter auf dem deutschen Markt.",
      "Echter Vergleich, nicht nur der Preis — auch Leistungsumfang, Kündigungsbedingungen, Vertragslaufzeit und Einschränkungen werden geprüft.",
      "Vollständiger Support in Ihrer Sprache — von der Beratung bis zur Problemlösung.",
      "End-to-End-Begleitung — vom ersten Vergleich bis zur Vertragsverwaltung nach dem Abschluss.",
      "Eine Plattform, mehrere Verträge — Versicherung, Energie und künftig Telefon, alles an einem Ort verwaltet.",
      "Kostenlose Erstberatung — unverbindlich und kostenlos prüfen wir Ihre Situation.",
    ],
    servicesTitle: "Unsere Leistungen",
    services: [
      "Private Krankenversicherung (PKV) — für berechtigte Personen (Selbstständige, Freelancer, Unternehmer, gut verdienende Angestellte)",
      "Optimierung der gesetzlichen Krankenversicherung (GKV) — Vergleich und Kassenwechsel ohne Verlust des Grundschutzes",
      "Zahnzusatzversicherung — Kostenübernahme für Behandlungen, die die GKV nicht vollständig zahlt",
      "Strom- und Gastarife — Tarifvergleich auf Basis Ihres tatsächlichen Verbrauchs",
      "In Entwicklung: Mobilfunk und Internet, zur Vervollständigung der Vertragsverwaltung Ihres Alltags in Deutschland",
    ],
    transparencyTitle: "Unser Versprechen: Transparenz",
    transparency: [
      "Keine Option passt für jeden, und das sagen wir offen. Unser Ziel ist nicht, um jeden Preis die billigste Option zu finden, sondern die Option, die wirklich zu Ihrer Situation passt. Wir erklären Ihnen transparent Erstattungsgrenzen, Wartezeiten, Aufnahmebedingungen und Einschränkungen jedes Tarifs — auch wenn die Antwort lautet: „Diese Option passt nicht zu Ihnen.“",
      "Jeder Vorschlag, den wir Ihnen machen, beantwortet eine einfache Frage: Was genau tut Tarefe für mich? — Wir prüfen Ihre Situation, vergleichen die Optionen, erklären die Unterschiede einfach, und wenn Sie sich entscheiden, begleiten wir Sie auch beim Vertragsabschluss und danach.",
    ],
    privacyTitle: "Datenschutz Ihrer Informationen",
    privacy:
      "Informationen, die Sie mit uns teilen, werden ausschließlich für den von Ihnen angefragten Vergleich und die Beratung verwendet und gemäß der EU-Datenschutz-Grundverordnung (DSGVO) verarbeitet.",
    visionTitle: "Unsere Vision",
    vision:
      "Tarefe soll mehr sein als eine Vergleichsplattform: eine Plattform für die Verwaltung aller Verträge des Lebens in Deutschland — wo jeder Vertrag, den Sie in Deutschland abschließen, von Versicherung über Energie bis Telefon, an einem Ort und mit einer Beratung in Ihrer Sprache verwaltet werden kann.",
    ctaTitle: "Bereit anzufangen?",
    ctaSubtitle: "Wir prüfen Ihre Situation kostenlos und unverbindlich.",
  },
  ru: {
    title: "О Tarefe",
    subtitle: "Мы не просто сравниваем цены — мы помогаем сделать правильный выбор просто и без хлопот.",
    intro: [
      "В Германии поиск подходящего варианта страхования, электричества, газа или телефонной связи обычно означает часы блуждания по немецким сайтам, чтение договоров с незнакомыми терминами и принятие решения без настоящей уверенности в его правильности.",
      "Мы здесь, чтобы упростить для вас эту часть жизни. Не громкими обещаниями, а настоящим сравнением вариантов, простым объяснением различий и сопровождением с самого первого сравнения и ещё долго после подписания договора.",
    ],
    challengesTitle: "Трудности, которые мы знаем",
    challengesIntro: "Каждый, кто переехал в Германию, знаком с этим опытом:",
    challenges: [
      { title: "Сложность", body: "Немецкие договоры и термины, особенно в финансовых и страховых вопросах, непросто понять." },
      { title: "Время", body: "Между работой, бытом и другими заботами переезда не остаётся времени изучать десятки поставщиков услуг." },
      { title: "Доверие", body: "Уходить от знакомого поставщика к незнакомому варианту ощущается рискованно." },
      { title: "Язык", body: "Важные финансовые и договорные решения лучше принимать на языке, на котором вы чувствуете себя полностью уверенно." },
      { title: "Бумажная волокита", body: "Расторжение старого договора, переписка с поставщиком, смена адреса или банковского счёта; никто не хочет разбираться с этим в одиночку." },
    ],
    challengesClosing: "Tarefe создан именно для этих моментов.",
    whatIsTitle: "Что такое Tarefe?",
    whatIsIntro: "Tarefe — это не просто сайт сравнения цен. Это три вещи одновременно:",
    whatIs: [
      { title: "Платформа сравнения", body: "Мы сопоставляем реальные варианты немецкого рынка: не только цену, но и покрытие, условия договора, ограничения и срок обязательств." },
      { title: "Консультант на вашем языке", body: "Живой человек, а не автоматическая форма, который выслушает вашу ситуацию и поможет найти разумный вариант." },
      {
        title: "Управление договором",
        body: "От оформления нового договора до расторжения старого, смены адреса, переписки с поставщиками и рассмотрения жалоб — всё через одну платформу.",
      },
    ],
    whatIsClosing: "Вы выбираете; Tarefe берёт на себя сравнение, оформление и сопровождение.",
    processTitle: "Как проходит сотрудничество с нами",
    processSteps: ["Сравнение", "Консультация", "Оформление договора", "Поддержка"],
    processBody:
      "Любое сотрудничество с Tarefe начинается с бесплатного сравнения без каких-либо обязательств. Если найден более выгодный вариант, мы сопровождаем вас на всех этапах оформления договора; а после подписания поддержка продолжается — при изменении условий, продлении или любом возникшем вопросе.",
    whyTitle: "Почему Tarefe?",
    why: [
      "Множество вариантов — вместо одного фиксированного предложения вы видите реальный спектр поставщиков на немецком рынке.",
      "Настоящее сравнение, а не только цена — также проверяются покрытие, условия расторжения, срок договора и ограничения.",
      "Полная поддержка на вашем языке — от консультации до решения проблем.",
      "Комплексное сопровождение от начала до конца — от первого сравнения до управления договором после покупки.",
      "Одна платформа, несколько договоров — страхование, энергия, а в будущем и связь, всё управляется из одного места.",
      "Бесплатная первичная консультация — без обязательств и без оплаты мы оценим вашу ситуацию.",
    ],
    servicesTitle: "Наши услуги",
    services: [
      "Частная медицинская страховка (PKV) — для подходящих категорий (самозанятые, фрилансеры, владельцы бизнеса, сотрудники с высоким доходом)",
      "Оптимизация государственной медицинской страховки (GKV) — сравнение и смена кассы без потери базового покрытия",
      "Дополнительная стоматологическая страховка (Zahnzusatzversicherung) — покрытие расходов на лечение, которые GKV не оплачивает полностью",
      "Тарифы на электричество и газ — сравнение тарифов на основе вашего реального потребления",
      "В разработке: мобильная связь и интернет — для полного управления договорами повседневной жизни в Германии",
    ],
    transparencyTitle: "Наше обязательство: прозрачность",
    transparency: [
      "Ни один вариант не подходит всем, и мы говорим об этом честно. Наша задача — не найти самый дешёвый вариант любой ценой, а найти вариант, который действительно разумен для вашей ситуации. Мы прозрачно рассказываем о лимитах выплат, периодах ожидания, условиях приёма и ограничениях каждого тарифа — даже когда ответ звучит как «этот вариант вам не подходит».",
      "Каждое предложение, которое мы вам делаем, отвечает на один простой вопрос: что именно Tarefe делает для меня? — мы изучаем вашу ситуацию, сравниваем варианты, просто объясняем различия, и если вы делаете выбор, мы остаёмся рядом при оформлении и сопровождении договора.",
    ],
    privacyTitle: "Конфиденциальность ваших данных",
    privacy:
      "Информация, которой вы делитесь с нами, используется только для того сравнения и консультации, которые вы запросили, и хранится в соответствии с регламентом ЕС о защите персональных данных (GDPR/DSGVO).",
    visionTitle: "Наше видение",
    vision:
      "Tarefe станет больше, чем платформой сравнения: платформой управления всеми договорами жизни в Германии — где каждый договор, который вы подписываете в Германии, от страхования до энергии и связи, можно будет вести из одного места и с консультантом на вашем языке.",
    ctaTitle: "Готовы начать?",
    ctaSubtitle: "Мы бесплатно и без обязательств оценим вашу ситуацию.",
  },
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-purple-900 md:text-3xl">{children}</h2>;
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);
  const copy = COPY[locale];

  return (
    <div>
      <SimplePageHeader items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: copy.title, href: `/${locale}/about` }]} title={copy.title} subtitle={copy.subtitle} />

      {/* Intro */}
      <div className="container-page max-w-3xl py-12">
        {/* Real, manually curated and verified photo (Unsplash): the
            Rheinturm and riverside promenade, genuinely Düsseldorf — not a
            random stock photo standing in for the city, and matching the
            real office address given in the Impressum/contact page. */}
        <div className="relative mb-8 aspect-[16/7] overflow-hidden rounded-2xl border border-border">
          <Image
            src="https://images.unsplash.com/photo-1600081926664-b4224c1abc0d?q=80&w=1200&auto=format&fit=crop"
            alt=""
            fill
            sizes="(min-width: 768px) 768px, 100vw"
            className="object-cover"
          />
        </div>
        {copy.intro.map((p) => (
          <p key={p} className="mb-4 leading-relaxed text-body">
            {p}
          </p>
        ))}
      </div>

      {/* Challenges we recognize */}
      <section className="border-y border-border bg-tint py-14 md:py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading>{copy.challengesTitle}</SectionHeading>
            <p className="mt-2 max-w-[55ch] text-sm text-secondary md:text-base">{copy.challengesIntro}</p>
          </Reveal>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {copy.challenges.map((item, i) => {
              const Icon = CHALLENGE_ICONS[i];
              return (
                <Reveal key={item.title} delay={i * 0.05}>
                  <div className="flex h-full gap-3 rounded-2xl border border-border bg-white p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                      <Icon size={18} weight="duotone" />
                    </span>
                    <p className="text-sm text-body">
                      <span className="font-semibold text-purple-900">{item.title}</span> — {item.body}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={0.25}>
            <p className="mt-8 text-sm font-semibold text-purple-900">{copy.challengesClosing}</p>
          </Reveal>
        </div>
      </section>

      {/* What Tarefe is */}
      <section className="py-14 md:py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading>{copy.whatIsTitle}</SectionHeading>
            <p className="mt-2 max-w-[55ch] text-sm text-secondary md:text-base">{copy.whatIsIntro}</p>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.whatIs.map((item, i) => {
              const Icon = WHAT_IS_ICONS[i];
              return (
                <Reveal key={item.title} delay={i * 0.08}>
                  <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-white p-5">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                      <Icon size={20} weight="duotone" />
                    </span>
                    <p className="text-sm font-bold text-purple-900">{item.title}</p>
                    <p className="text-sm leading-relaxed text-secondary">{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
          <Reveal delay={0.3}>
            <p className="mt-8 text-sm font-semibold text-purple-900">{copy.whatIsClosing}</p>
          </Reveal>
        </div>
      </section>

      {/* How working together goes */}
      <section className="border-y border-border bg-tint py-14 md:py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading>{copy.processTitle}</SectionHeading>
          </Reveal>
          <Reveal delay={0.08}>
            <ol className="mt-8 flex flex-wrap items-center gap-3">
              {copy.processSteps.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-purple-900">
                    <span className="font-latin flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">{i + 1}</span>
                    {step}
                  </span>
                  {i < copy.processSteps.length - 1 && <ArrowRight size={16} weight="bold" className="shrink-0 text-purple-600 rtl:rotate-180" />}
                </li>
              ))}
            </ol>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-8 max-w-[65ch] text-sm leading-relaxed text-body md:text-base">{copy.processBody}</p>
          </Reveal>
        </div>
      </section>

      {/* Why Tarefe */}
      <section className="py-14 md:py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading>{copy.whyTitle}</SectionHeading>
          </Reveal>
          <ul className="mt-8 grid gap-3 md:grid-cols-2">
            {copy.why.map((item, i) => (
              <Reveal key={item} delay={i * 0.04}>
                <li className="flex items-start gap-2.5 text-sm text-body md:text-base">
                  <CheckCircle size={18} weight="fill" className="mt-0.5 shrink-0 text-success" />
                  {item}
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* Services offered */}
      <section className="border-y border-border bg-tint py-14 md:py-20">
        <div className="container-page">
          <Reveal>
            <SectionHeading>{copy.servicesTitle}</SectionHeading>
          </Reveal>
          <div className="mt-8 grid gap-3">
            {copy.services.map((item, i) => {
              const Icon = SERVICE_ICONS[i];
              const hrefSlug = SERVICE_HREFS[i];
              const content = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                    <Icon size={18} weight={hrefSlug ? "duotone" : "regular"} />
                  </span>
                  <span className={`text-sm ${hrefSlug ? "text-body" : "text-secondary"}`}>{item}</span>
                </>
              );
              return (
                <Reveal key={item} delay={i * 0.04}>
                  {hrefSlug ? (
                    <Link href={`/${locale}/services/${hrefSlug}`} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600">
                      {content}
                      <ArrowRight size={14} weight="bold" className="ms-auto shrink-0 text-secondary rtl:rotate-180" />
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-white/60 p-4">{content}</div>
                  )}
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Transparency, privacy, vision */}
      <div className="container-page max-w-3xl space-y-10 py-14 md:py-20">
        <Reveal>
          <SectionHeading>{copy.transparencyTitle}</SectionHeading>
          {copy.transparency.map((p) => (
            <p key={p} className="mt-4 leading-relaxed text-body">
              {p}
            </p>
          ))}
        </Reveal>
        <Reveal>
          <SectionHeading>{copy.privacyTitle}</SectionHeading>
          <p className="mt-4 leading-relaxed text-body">{copy.privacy}</p>
        </Reveal>
        <Reveal>
          <SectionHeading>{copy.visionTitle}</SectionHeading>
          <p className="mt-4 leading-relaxed text-body">{copy.vision}</p>
        </Reveal>
      </div>

      {/* Closing CTA */}
      <section className="pb-16 md:pb-24">
        <Reveal>
          <div className="container-page rounded-3xl bg-tint px-6 py-14 text-center md:px-12">
            <h2 className="mx-auto max-w-[24ch] text-2xl font-bold text-purple-900 md:text-3xl">{copy.ctaTitle}</h2>
            <p className="mx-auto mt-3 max-w-[46ch] text-sm text-secondary md:text-base">{copy.ctaSubtitle}</p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <MagneticCta>
                <Link
                  href={`/${locale}/consultation`}
                  className="press inline-flex items-center gap-2 rounded-full bg-purple-600 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900"
                >
                  {dict.cta.freeConsultation}
                  <ArrowRight size={16} weight="bold" className="rtl:rotate-180" />
                </Link>
              </MagneticCta>
              <MagneticCta>
                <a
                  href="https://wa.me/4915224318691"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex items-center gap-2 rounded-full border border-border-strong px-7 py-3.5 text-sm font-semibold text-purple-900 transition-colors hover:border-purple-600"
                >
                  <WhatsappLogo size={18} weight="fill" />
                  {dict.cta.whatsappConsultation}
                </a>
              </MagneticCta>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
