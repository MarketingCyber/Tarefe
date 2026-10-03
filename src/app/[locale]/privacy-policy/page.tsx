import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { LegalPage } from "@/components/legal/LegalPage";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const DESCRIPTION: Record<Locale, string> = {
  fa: "سیاست حریم خصوصی تعرفه — چه اطلاعاتی جمع‌آوری می‌شود، چرا، و حقوق شما طبق GDPR.",
  de: "Datenschutzerklärung von Tarefe — welche Daten wir erheben, warum, und Ihre Rechte nach der DSGVO.",
  ru: "Политика конфиденциальности Tarefe — какие данные мы собираем, зачем, и ваши права по GDPR.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.footer.privacy, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "privacy-policy") };
}

// Real, complete Datenschutzerklärung — written 2026-09-15, replacing the
// earlier three-line placeholder now that the client has supplied a
// reference document. Deliberately NOT a verbatim copy of that reference:
// it's a generic template (from a legal-document generator) that also
// covers WordPress Stats/Jetpack, Google AdSense, seven different social-
// network share plugins (Facebook, Google+, Instagram, LinkedIn, X/
// Twitter, XING, YouTube), a CleverReach newsletter, and blog comments —
// none of which exist anywhere on this Next.js site. Copying those
// sections in would make the policy describe data processing that doesn't
// actually happen, which is its own accuracy problem. What's below covers
// only what this codebase actually does: Google Tag Manager (GA4 + Google
// Ads conversion tracking are confirmed configured inside it, per the
// client 2026-09-15 — both now gated behind the cookie-consent banner
// rather than loading unconditionally, see GoogleTagManager.tsx), the
// Google Maps embed on /contact (confirmed NOT consent-gated — it's a
// fixed iframe, unlike the reference document's "off until you click to
// activate" description, described here as it actually behaves), Google
// Fonts (corrected — this site self-hosts every font at build time via
// next/font, so there is no runtime connection to Google's font servers
// the way the reference document assumes), the consultation/contact form,
// and the customer portal's real user accounts. The GDPR rights section
// (§3 in the reference) is condensed from its original a/b/c/d/e
// sub-itemized format into plain paragraphs to fit this page's existing
// heading+body rendering (see LegalPage.tsx), not shortened in substance.
const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  fa: [
    {
      heading: "مسئول پردازش داده",
      body: `مسئول جمع‌آوری و پردازش داده‌های شخصی در این وب‌سایت: ${"‎"}Hamid Eshaghi${"‎"}\n${"‎"}Kesselstr. 3, 40221 Düsseldorf${"‎"}\nایمیل: ${"‎"}info@tarefe.de${"‎"}\nتلفن: ${"‎"}+49 211 54218000${"‎"}`,
    },
    {
      heading: "داده‌های دسترسی (Server-Logfiles)",
      body: `هنگام بازدید از وب‌سایت، مرورگر شما به‌صورت خودکار اطلاعاتی مانند نوع و نسخه مرورگر، سیستم‌عامل، آدرس صفحه ارجاع‌دهنده، تاریخ و ساعت درخواست و آدرس ${"‎"}IP${"‎"} شما را برای ما ارسال می‌کند که در سیاهه‌های سرور ذخیره می‌شود. این داده‌ها معمولا قابل انتساب به یک شخص خاص نیستند و صرفا برای حفظ امنیت و پایداری سایت طبق ${"‎"}Art. 6 Abs. 1 lit. f DSGVO${"‎"} پردازش می‌شوند.`,
    },
    {
      heading: "کوکی‌ها و رضایت شما",
      body: `در اولین بازدید، بنری برای انتخاب کوکی‌ها نمایش داده می‌شود: می‌توانید فقط کوکی‌های ضروری فنی را بپذیرید یا خدمات دیگر (شرح در ادامه) را نیز تایید کنید. تا زمانی که به‌صراحت رضایت ندهید، هیچ سرویس غیرضروری بارگذاری نمی‌شود. انتخاب شما در مرورگرتان ذخیره می‌شود و هر زمان قابل تغییر است. جزئیات هر کوکی در صفحه «سیاست کوکی» ما آمده است.`,
    },
    {
      heading: "Google Tag Manager، Google Analytics 4 و Google Ads",
      body: `پس از رضایت شما از طریق بنر کوکی، از ${"‎"}Google Tag Manager${"‎"} (ارائه‌دهنده: ${"‎"}Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland${"‎"}) برای مدیریت ابزارهای تحلیل و تبلیغات استفاده می‌کنیم. از طریق آن دو سرویس فعال است: ${"‎"}Google Analytics 4${"‎"} (برای تحلیل آماری استفاده از سایت) و ردیابی تبدیل ${"‎"}Google Ads${"‎"} (برای سنجش اثربخشی تبلیغات ما).\n\nدر ${"‎"}Google Analytics 4${"‎"} آدرس ${"‎"}IP${"‎"} شما پیش از هرگونه انتقال احتمالی به آمریکا در داخل اتحادیه اروپا کوتاه می‌شود؛ داده‌های سطح کاربر و رویداد پس از ۱۴ ماه به‌طور خودکار حذف می‌شوند. کوکی ردیابی تبدیل ${"‎"}Google Ads${"‎"} نیز پس از ۳۰ روز منقضی می‌شود و صرفا به‌صورت آماری و بدون امکان شناسایی شخصی شما استفاده می‌شود.\n\nمبنای قانونی در هر دو مورد رضایت شما طبق ${"‎"}Art. 6 Abs. 1 lit. a DSGVO${"‎"} است که از طریق بنر کوکی می‌دهید و هر زمان می‌توانید برای آینده آن را پس بگیرید. اطلاعات بیشتر: ${"‎"}policies.google.com/privacy?hl=de${"‎"}`,
    },
    {
      heading: "Google Fonts",
      body: `فونت‌های استفاده‌شده در سایت هنگام ساخت (${"‎"}build${"‎"}) وب‌سایت به‌صورت محلی بارگذاری و از سرور خودمان ارائه می‌شوند. هیچ اتصال مستقیمی به سرورهای ${"‎"}Google${"‎"} برقرار نمی‌شود و داده‌ای برای این منظور به ${"‎"}Google${"‎"} ارسال نمی‌گردد.`,
    },
    {
      heading: "Google Maps",
      body: `در صفحه «تماس با ما»، نقشه‌ای از سرویس ${"‎"}Google Maps${"‎"} (ارائه‌دهنده: ${"‎"}Google Ireland Ltd.${"‎"}) نمایش داده می‌شود که به‌صورت ثابت در صفحه جاسازی شده است — برخلاف بسیاری از سایت‌ها، این نقشه پشت یک کلیک فعال‌سازی مخفی نیست. با باز کردن این صفحه، اتصال به سرورهای ${"‎"}Google${"‎"} برقرار شده و آدرس ${"‎"}IP${"‎"} شما به آن‌ها منتقل و در آنجا ذخیره می‌شود، مستقل از انتخاب شما در بنر کوکی. مبنای قانونی، منافع مشروع ما طبق ${"‎"}Art. 6 Abs. 1 lit. f DSGVO${"‎"} برای نمایش واضح موقعیت دفتر است.`,
    },
    {
      heading: "فرم تماس و درخواست مشاوره",
      body: `اگر از طریق فرم تماس یا درخواست مشاوره با ما در ارتباط باشید، اطلاعاتی که وارد می‌کنید (مانند نام، ایمیل، شماره تماس) را برای پیگیری درخواست شما ذخیره می‌کنیم. این اطلاعات بدون رضایت شما در اختیار اشخاص ثالث قرار نمی‌گیرد. مبنای قانونی: ${"‎"}Art. 6 Abs. 1 lit. b DSGVO${"‎"} (مقدمات انعقاد قرارداد) و ${"‎"}Art. 6 Abs. 1 lit. f DSGVO${"‎"} (منافع مشروع ما در پاسخ‌گویی به درخواست‌ها).`,
    },
    {
      heading: "حساب کاربری در پورتال مشتریان",
      body: `اگر در پورتال «تعرفه من» حساب کاربری بسازید، اطلاعات لازم (نام، ایمیل، در صورت وجود شماره تماس و رمز عبوری که به‌صورت رمزنگاری‌شده ذخیره می‌شود) نگه‌داری می‌شود تا بتوانید وارد شوید و قراردادها و مدارک خود را ببینید. مبنای قانونی: ${"‎"}Art. 6 Abs. 1 lit. b DSGVO${"‎"}.`,
    },
    {
      heading: "مدت نگهداری",
      body: `داده‌های شخصی‌ای که از طریق سایت در اختیار ما قرار می‌گیرد، فقط تا زمانی نگه‌داری می‌شود که برای هدف مربوطه لازم است یا مهلت‌های قانونی نگه‌داری (در امور تجاری و مالیاتی تا ۱۰ سال) آن را ایجاب کند.`,
    },
    {
      heading: "رمزنگاری SSL/TLS",
      body: `وب‌سایت ما از رمزنگاری ${"‎"}SSL/TLS${"‎"} استفاده می‌کند. اتصال رمزنگاری‌شده را می‌توانید از تغییر آدرس نوار مرورگر از «${"‎"}http://${"‎"}» به «${"‎"}https://${"‎"}» تشخیص دهید.`,
    },
    {
      heading: "حقوق شما",
      body: `طبق ${"‎"}GDPR${"‎"} حقوق زیر را دارید: دریافت اطلاعات درباره داده‌های ذخیره‌شده (${"‎"}ماده ۱۵${"‎"})، اصلاح داده‌های نادرست (${"‎"}ماده ۱۶${"‎"})، حذف داده‌ها (${"‎"}ماده ۱۷${"‎"})، محدودسازی پردازش (${"‎"}ماده ۱۸${"‎"})، انتقال داده‌ها (${"‎"}ماده ۲۰${"‎"}) و اعتراض به پردازش (${"‎"}ماده ۲۱${"‎"}). اگر پردازش بر مبنای رضایت شما بوده، هر زمان می‌توانید برای آینده آن را پس بگیرید (${"‎"}ماده ۷ بند ۳${"‎"})، بدون این‌که مشروعیت پردازش‌های قبل از آن زیر سوال برود. برای استفاده از این حقوق، یک پیام ساده به ایمیل بالا کافی است.`,
    },
    {
      heading: "حق شکایت",
      body: `همچنین حق دارید نزد یک مرجع نظارتی حفاظت از داده شکایت کنید. مرجع مسئول برای ما:\n${"‎"}Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen${"‎"}\n${"‎"}Kavalleriestraße 2-4, 40213 Düsseldorf${"‎"}\nتلفن: ${"‎"}0211 384 24-0${"‎"}\nایمیل: ${"‎"}poststelle@ldi.nrw.de${"‎"}`,
    },
    {
      heading: "اعتبار و تغییرات",
      body: `این سیاست حریم خصوصی از تاریخ ${"‎"}15 سپتامبر 2026${"‎"} معتبر است. در صورت تغییر وب‌سایت یا مقررات قانونی، ممکن است این متن به‌روزرسانی شود؛ همواره نسخه‌ای که هنگام بازدید شما در دسترس است معتبر است.`,
    },
  ],
  de: [
    {
      heading: "Verantwortliche Stelle",
      body: "Datenschutzrechtlich verantwortlich für die Erhebung und Verarbeitung personenbezogener Daten auf dieser Website ist:\nHamid Eshaghi\nKesselstr. 3, 40221 Düsseldorf\nE-Mail: info@tarefe.de\nTelefon: +49 211 54218000",
    },
    {
      heading: "Zugriffsdaten (Server-Logfiles)",
      body: "Beim Aufruf unserer Website erheben und speichern wir automatisch in Server-Logfiles Zugriffsdaten, die Ihr Browser an uns übermittelt: Browsertyp und -version, verwendetes Betriebssystem, Referrer-URL, Datum und Uhrzeit der Anfrage sowie Ihre IP-Adresse. Ein Personenbezug ist uns dabei im Regelfall nicht möglich und nicht beabsichtigt. Die Verarbeitung erfolgt gemäß Art. 6 Abs. 1 lit. f DSGVO zur Wahrung unseres berechtigten Interesses an der Stabilität und Sicherheit unserer Website.",
    },
    {
      heading: "Cookies und Ihre Einwilligung",
      body: "Bei Ihrem ersten Besuch zeigen wir ein Cookie-Banner, über das Sie wählen können, ob Sie nur technisch notwendige Cookies zulassen oder auch weitere Dienste (siehe unten) akzeptieren. Solange Sie nicht ausdrücklich zugestimmt haben, laden wir keine nicht notwendigen Dienste. Ihre Wahl wird in Ihrem Browser gespeichert und kann jederzeit geändert werden; Details zu einzelnen Cookies finden Sie in unserer Cookie-Richtlinie.",
    },
    {
      heading: "Google Tag Manager, Google Analytics 4 und Google Ads",
      body: "Nach Ihrer Einwilligung über das Cookie-Banner setzen wir den Google Tag Manager ein, ein Tool der Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland („Google“), über das wir Webanalyse- und Werbe-Tags verwalten. Darüber sind aktuell zwei Dienste aktiv: Google Analytics 4 (zur statistischen Auswertung der Websitenutzung) und Google Ads Conversion-Tracking (zur Erfolgsmessung unserer Anzeigen).\n\nBei Google Analytics 4 wird Ihre IP-Adresse innerhalb der EU/des EWR gekürzt, bevor eine etwaige Übermittlung in die USA erfolgt; auf Nutzer- und Ereignisebene gespeicherte Daten werden nach 14 Monaten automatisch gelöscht. Das Cookie des Google Ads Conversion-Trackings läuft nach 30 Tagen ab und dient ausschließlich der anonymisierten Erfolgsmessung, nicht der persönlichen Identifizierung.\n\nRechtsgrundlage ist in beiden Fällen Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO, die Sie über das Cookie-Banner erteilen und jederzeit mit Wirkung für die Zukunft widerrufen können. Weitere Informationen: https://policies.google.com/privacy?hl=de.",
    },
    {
      heading: "Google Fonts",
      body: "Die auf unserer Website verwendeten Schriftarten werden beim Build unserer Website lokal eingebunden und bei jedem Seitenaufruf direkt von unserem eigenen Server ausgeliefert. Es findet dabei keine Verbindung zu Servern von Google statt und es werden keine Daten zu diesem Zweck an Google übertragen.",
    },
    {
      heading: "Google Maps",
      body: "Auf unserer Kontaktseite binden wir eine Karte des Kartendienstes Google Maps ein, Anbieter Google Ireland Ltd. Diese Karte ist fest in die Seite eingebunden, nicht hinter einem separaten Aktivierungs-Klick verborgen. Beim Aufruf der Kontaktseite wird dabei unabhängig von Ihrer Cookie-Einwilligung eine Verbindung zu Servern von Google hergestellt und Ihre IP-Adresse an Google übermittelt und dort gespeichert. Rechtsgrundlage ist unser berechtigtes Interesse gemäß Art. 6 Abs. 1 lit. f DSGVO, unseren Standort verständlich darzustellen. Weitere Informationen: https://policies.google.com/privacy?hl=de.",
    },
    {
      heading: "Kontakt- und Beratungsformular",
      body: "Wenn Sie uns über ein Kontakt- oder Beratungsformular erreichen, speichern wir die von Ihnen angegebenen Daten (z.B. Name, E-Mail-Adresse, Telefonnummer), um Ihre Anfrage zu bearbeiten und gegebenenfalls für Anschlussfragen bereitzustehen. Eine Weitergabe an Dritte findet ohne Ihre Einwilligung nicht statt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung) und Art. 6 Abs. 1 lit. f DSGVO (unser berechtigtes Interesse an der Bearbeitung Ihrer Anfrage).",
    },
    {
      heading: "Nutzerkonto im Kundenportal",
      body: "Wenn Sie ein Nutzerkonto in unserem Kundenportal („Mein Tarefe“) eröffnen, speichern wir die dafür erforderlichen Daten (Name, E-Mail-Adresse, ggf. Telefonnummer sowie ein verschlüsselt gespeichertes Passwort), damit Sie sich einloggen und Ihre Verträge und Unterlagen einsehen können. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO.",
    },
    {
      heading: "Speicherdauer",
      body: "Personenbezogene Daten, die uns über unsere Website mitgeteilt wurden, speichern wir nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungsfristen dies verlangen (handels- und steuerrechtlich bis zu 10 Jahre).",
    },
    {
      heading: "SSL-/TLS-Verschlüsselung",
      body: "Unsere Website nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile Ihres Browsers von „http://“ auf „https://“ wechselt.",
    },
    {
      heading: "Ihre Rechte",
      body: "Ihnen stehen nach der DSGVO folgende Rechte zu: Auskunft über Ihre gespeicherten Daten (Art. 15), Berichtigung unrichtiger Daten (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) sowie Widerspruch gegen die Verarbeitung (Art. 21). Haben wir Ihre Daten auf Grundlage Ihrer Einwilligung verarbeitet, können Sie diese jederzeit mit Wirkung für die Zukunft widerrufen (Art. 7 Abs. 3 DSGVO), ohne dass die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung berührt wird. Zur Ausübung dieser Rechte genügt eine formlose Mitteilung an die oben genannte E-Mail-Adresse.",
    },
    {
      heading: "Beschwerderecht bei einer Aufsichtsbehörde",
      body: "Sie haben zudem das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für uns zuständig ist:\nLandesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen\nKavalleriestraße 2-4, 40213 Düsseldorf\nTelefon: 0211 384 24-0\nE-Mail: poststelle@ldi.nrw.de",
    },
    {
      heading: "Gültigkeit und Änderung dieser Datenschutzerklärung",
      body: "Diese Datenschutzerklärung gilt ab dem 15. September 2026. Wir behalten uns vor, sie bei Änderungen unserer Website oder der Rechtslage anzupassen; es gilt jeweils die zum Zeitpunkt Ihres Besuchs abrufbare Fassung.",
    },
  ],
  ru: [
    {
      heading: "Ответственная сторона",
      body: "Ответственным за сбор и обработку персональных данных на этом сайте является:\nHamid Eshaghi\nKesselstr. 3, 40221 Düsseldorf\nЭл. почта: info@tarefe.de\nТелефон: +49 211 54218000",
    },
    {
      heading: "Данные доступа (журналы сервера)",
      body: "При посещении сайта мы автоматически сохраняем в журналах сервера данные, которые передаёт ваш браузер: тип и версия браузера, операционная система, referrer-URL, дата и время запроса, а также ваш IP-адрес. Как правило, эти данные не позволяют и не предназначены для идентификации конкретного лица. Обработка осуществляется на основании ст. 6 (1) (f) GDPR для обеспечения стабильности и безопасности сайта.",
    },
    {
      heading: "Файлы cookie и ваше согласие",
      body: "При первом посещении сайта вы видите баннер cookie, где можете выбрать: разрешить только технически необходимые cookie или также принять другие сервисы (описаны ниже). Пока вы явно не дали согласие, ни один необязательный сервис не загружается. Ваш выбор сохраняется в браузере и может быть изменён в любой момент; подробности об отдельных cookie — в нашей политике использования cookie.",
    },
    {
      heading: "Google Tag Manager, Google Analytics 4 и Google Ads",
      body: "После получения вашего согласия через баннер cookie мы используем Google Tag Manager — инструмент компании Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland («Google»), через который управляем тегами аналитики и рекламы. Сейчас через него подключены два сервиса: Google Analytics 4 (для статистического анализа использования сайта) и отслеживание конверсий Google Ads (для оценки эффективности нашей рекламы).\n\nВ Google Analytics 4 ваш IP-адрес усекается в пределах ЕС/ЕЭЗ до возможной передачи в США; данные на уровне пользователя и события автоматически удаляются через 14 месяцев. Cookie отслеживания конверсий Google Ads действует 30 дней и используется исключительно для обезличенной статистики, без возможности личной идентификации.\n\nПравовым основанием в обоих случаях является ваше согласие по ст. 6 (1) (a) GDPR, которое вы даёте через баннер cookie и можете в любой момент отозвать на будущее. Подробнее: https://policies.google.com/privacy?hl=de.",
    },
    {
      heading: "Google Fonts",
      body: "Шрифты, используемые на нашем сайте, подключаются локально при сборке (build) сайта и при каждом посещении доставляются напрямую с нашего собственного сервера. Соединение с серверами Google при этом не устанавливается, и данные для этой цели в Google не передаются.",
    },
    {
      heading: "Google Maps",
      body: "На странице контактов встроена карта сервиса Google Maps, поставщик Google Ireland Ltd. Карта встроена в страницу напрямую, а не скрыта за отдельным кликом активации. При открытии страницы контактов, независимо от вашего выбора в баннере cookie, устанавливается соединение с серверами Google, и ваш IP-адрес передаётся и сохраняется там. Правовое основание — наш законный интерес по ст. 6 (1) (f) GDPR наглядно показать местоположение офиса. Подробнее: https://policies.google.com/privacy?hl=de.",
    },
    {
      heading: "Контактная форма и форма заявки на консультацию",
      body: "Если вы связываетесь с нами через контактную форму или форму заявки на консультацию, мы сохраняем указанные вами данные (например, имя, эл. почту, номер телефона) для обработки вашего запроса и возможных последующих вопросов. Передача этих данных третьим лицам без вашего согласия не производится. Правовое основание: ст. 6 (1) (b) GDPR (подготовка к заключению договора) и ст. 6 (1) (f) GDPR (наш законный интерес в обработке запросов).",
    },
    {
      heading: "Учётная запись в клиентском портале",
      body: "Если вы создаёте учётную запись в нашем клиентском портале («Mein Tarefe»), мы сохраняем необходимые для этого данные (имя, эл. почту, при наличии номер телефона, а также пароль, хранящийся в зашифрованном виде), чтобы вы могли входить в систему и просматривать свои договоры и документы. Правовое основание: ст. 6 (1) (b) GDPR.",
    },
    {
      heading: "Срок хранения",
      body: "Персональные данные, сообщённые нам через сайт, мы храним только столько, сколько это необходимо для соответствующей цели, либо в течение установленных законом сроков хранения (в торговом и налоговом праве — до 10 лет).",
    },
    {
      heading: "Шифрование SSL/TLS",
      body: "Из соображений безопасности наш сайт использует шифрование SSL/TLS. Зашифрованное соединение можно распознать по изменению адресной строки браузера с «http://» на «https://».",
    },
    {
      heading: "Ваши права",
      body: "Согласно GDPR вам принадлежат следующие права: право на информацию о хранимых данных (ст. 15), право на исправление неверных данных (ст. 16), право на удаление (ст. 17), право на ограничение обработки (ст. 18), право на переносимость данных (ст. 20), а также право на возражение против обработки (ст. 21). Если обработка велась на основании вашего согласия, вы можете отозвать его в любой момент на будущее (ст. 7 (3) GDPR), без ущерба для законности уже проведённой обработки. Для реализации этих прав достаточно свободного сообщения на указанный выше адрес эл. почты.",
    },
    {
      heading: "Право на обращение в надзорный орган",
      body: "Вы также вправе подать жалобу в орган по защите данных. Ответственный орган для нас:\nLandesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen\nKavalleriestraße 2-4, 40213 Düsseldorf\nТелефон: 0211 384 24-0\nЭл. почта: poststelle@ldi.nrw.de",
    },
    {
      heading: "Действие и изменение настоящей политики",
      body: "Настоящая политика конфиденциальности действует с 15 сентября 2026 года. Мы оставляем за собой право изменять её при изменении сайта или правовых норм; действует версия, доступная на момент вашего посещения.",
    },
  ],
};

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <LegalPage locale={locale} dict={dict} title={dict.footer.privacy} crumbLabel={dict.footer.privacy} href={`/${locale}/privacy-policy`} sections={SECTIONS[locale]} />
  );
}
