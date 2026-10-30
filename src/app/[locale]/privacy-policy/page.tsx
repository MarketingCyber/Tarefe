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
      heading: "شمارش بازدیدها بدون کوکی و کلیک تبلیغاتی",
      body: "برای اینکه بدانیم چند نفر از صفحه‌های ما بازدید می‌کنند، سرور ما هر بازدید را بدون کوکی و بدون ذخیره‌سازی چیزی روی دستگاه شما می‌شمارد. فقط آدرس صفحه، منبع ورود (مثلا گوگل یا تبلیغ)، نوع کلی دستگاه و مرورگر و یک شناسه رمزنگاری‌شده که هر روز تغییر می‌کند ذخیره می‌شود؛ آدرس IP شما ذخیره نمی‌شود و شناسه به شخص شما قابل انتساب نیست. در صفحه‌های فرود تبلیغاتی نیز به‌همین شکل شمارش می‌شود کدام مرحله از فرایند (انتخاب مصرف، مشاهده تعرفه‌ها، ارسال درخواست) انجام شده است. مبنای حقوقی: ‎Art. 6 Abs. 1 lit. f DSGVO‎ (علاقه مشروع به ارزیابی ساده و کارآمد سایت). اگر با کلیک روی تبلیغ گوگل آمده باشید و درخواست مشاوره بفرستید، شناسه کلیک تبلیغ (‎gclid‎) همراه درخواستتان ذخیره می‌شود تا بتوانیم اثر تبلیغات را بسنجیم؛ همین‌طور تعرفه و مصرفی که انتخاب کرده‌اید تا مشاور بتواند بهتر کمک کند.",
    },
    {
      heading: "کوکی‌ها",
      body: `وب‌سایت ما علاوه بر کوکی‌های ضروری فنی، از کوکی‌ها و فناوری‌های مشابه ابزارهای تحلیل و تبلیغات که در ادامه شرح داده شده‌اند (${"‎"}Google Analytics 4${"‎"}، ${"‎"}Google Ads${"‎"}، ${"‎"}Meta Pixel${"‎"}، ${"‎"}Microsoft Clarity${"‎"}) و آمار داخلی سایت استفاده می‌کند. در اولین بازدید، بنری شما را از این موضوع مطلع می‌کند. در «تنظیمات کوکی» (در همان بنر و در پایین هر صفحه) می‌توانید گروه «تحلیل و آمار» و گروه «تبلیغات و شخصی‌سازی» را هر زمان غیرفعال کنید. کوکی‌ها را می‌توانید هر زمان در تنظیمات مرورگرتان پاک یا مسدود کنید؛ همچنین می‌توانید از طریق «تنظیمات کوکی» یا با تماس با ما با این پردازش مخالفت کنید (${"‎"}Art. 21 DSGVO${"‎"}). جزئیات هر کوکی در صفحه «سیاست کوکی» ما آمده است.`,
    },
    {
      heading: "Google Tag Manager، Google Analytics 4 و Google Ads",
      body: `در وب‌سایت ما از ${"‎"}Google Tag Manager${"‎"} استفاده می‌شود (ارائه‌دهنده: ${"‎"}Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland${"‎"}) و ما از آن برای مدیریت ابزارهای تحلیل و تبلیغات استفاده می‌کنیم. از طریق آن دو سرویس به کار می‌رود: ${"‎"}Google Analytics 4${"‎"} (برای تحلیل آماری استفاده از سایت) و ردیابی تبدیل ${"‎"}Google Ads${"‎"} (برای سنجش اثربخشی تبلیغات ما). در این کار گوگل کوکی ذخیره می‌کند (مثلا ${"‎"}_ga${"‎"} و ${"‎"}_gcl_*${"‎"}) و آدرس ${"‎"}IP${"‎"} و اطلاعات مرورگر شما را دریافت می‌کند.\n\nدر ${"‎"}Google Analytics 4${"‎"} آدرس ${"‎"}IP${"‎"} شما پیش از هرگونه انتقال احتمالی به آمریکا در داخل اتحادیه اروپا کوتاه می‌شود؛ داده‌های سطح کاربر و رویداد پس از ۱۴ ماه به‌طور خودکار حذف می‌شوند. کوکی ردیابی تبدیل ${"‎"}Google Ads${"‎"} نیز پس از ۳۰ روز منقضی می‌شود و صرفا به‌صورت آماری و بدون امکان شناسایی شخصی شما استفاده می‌شود.\n\nمبنای حقوقی، منفعت مشروع ما در تحلیل استفاده از سایت و سنجش اثربخشی تبلیغات طبق ${"‎"}Art. 6 Abs. 1 lit. f DSGVO${"‎"} است. می‌توانید هر زمان از طریق «تنظیمات کوکی» یا با تماس با ما با این پردازش مخالفت کنید (${"‎"}Art. 21 DSGVO${"‎"}). اطلاعات بیشتر: ${"‎"}policies.google.com/privacy?hl=de${"‎"}`,
    },
    {
      heading: "سرور تگ اختصاصی ما (sgtm.tarefe.de)",
      body: "Google Tag Manager و تگ‌های گوگل را مستقیم از گوگل بارگذاری نمی‌کنیم، بلکه از طریق سرور تگ اختصاصی خودمان در نشانی sgtm.tarefe.de (نسخه سمت سرور Google Tag Manager) که روی سرور اجاره‌ای ما اجرا می‌شود. داده‌های تگ‌های گوگل (مانند Google Analytics 4 و Google Ads) ابتدا به این سرور می‌رسند و از آنجا به گوگل فرستاده می‌شوند. این سرور برای این کار آدرس IP و اطلاعات مرورگر شما را پردازش می‌کند. برای کنترل فنی، Tag Manager گاهی یک نشانی بررسی را مستقیم از گوگل (www.googletagmanager.com) فراخوانی می‌کند؛ اگر سرور ما در دسترس نباشد، Tag Manager مستقیم از گوگل بارگذاری می‌شود. مبنای حقوقی همان مبنای Google Tag Manager در بالا است.",
    },
    {
      heading: "Meta Pixel و Conversions API (فیسبوک و اینستاگرام)",
      body: "برای سنجش اثر تبلیغات\u200cمان در فیسبوک و اینستاگرام از Meta Pixel و Conversions API شرکت Meta Platforms Ireland Ltd. (Merrion Road, Dublin 4, Irland) استفاده می\u200cکنیم. Pixel در مرورگر شما بارگذاری می\u200cشود و کوکی\u200cهای _fbp و _fbc را قرار می\u200cدهد؛ با هر بازدید صفحه رویداد «PageView»، در صفحه\u200cهای خدمات و مقایسه انرژی رویداد «ViewContent» (نام خدمت) و وقتی فرم درخواست مشاوره را بفرستید، رویداد «Lead» به Meta ارسال می\u200cشود. همین رویدادها از سرور ما نیز به Meta فرستاده می\u200cشوند (Conversions API)، همراه با آدرس IP، نوع مرورگر و مقدار کوکی\u200cهای Meta؛ در رویداد «Lead» علاوه بر این ایمیل، شماره تلفن و نام شما به\u200cصورت رمزنگاری\u200cشده با SHA-256 (Meta متن اصلی را نمی\u200cبیند و فقط برای تطبیق با حساب\u200cهای Meta از آن استفاده می\u200cکند). داده\u200cها ممکن است به Meta Platforms Inc. در آمریکا منتقل شوند؛ Meta عضو EU-US Data Privacy Framework است. برای پردازش با Pixel، ما و Meta مسئول مشترک هستیم (\u200eArt. 26 DSGVO\u200e). مبنای حقوقی: \u200eArt. 6 Abs. 1 lit. f DSGVO\u200e (علاقه مشروع به سنجش اثر تبلیغات). می\u200cتوانید در هر زمان با ما تماس بگیرید و با این پردازش مخالفت کنید (\u200eArt. 21 DSGVO\u200e).",
    },
    {
      heading: "Microsoft Clarity",
      body: "برای بهبود وب‌سایت از Microsoft Clarity شرکت Microsoft Ireland Operations Ltd. (One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland) استفاده می‌کنیم. Clarity ثبت می‌کند که بازدیدکنندگان چگونه از صفحات ما استفاده می‌کنند (مثلا حرکت ماوس، کلیک، اسکرول و بازدید صفحات) و از آن نقشه حرارتی و بازپخش ناشناس جلسه‌ها می‌سازد؛ ورودی‌های حساس به‌طور پیش‌فرض پوشانده می‌شوند. برای این کار Clarity کوکی‌های _clck و _clsk را ذخیره می‌کند و آدرس IP و اطلاعات مرورگر شما را پردازش می‌کند. داده‌ها ممکن است به Microsoft در آمریکا منتقل شوند؛ Microsoft عضو EU-US Data Privacy Framework است. مبنای حقوقی: ‎Art. 6 Abs. 1 lit. f DSGVO‎ (منفعت مشروع در بهبود وب‌سایت). می‌توانید هر زمان از طریق «تنظیمات کوکی» یا با تماس با ما با این پردازش مخالفت کنید (‎Art. 21 DSGVO‎). اطلاعات بیشتر: privacy.microsoft.com",
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
      heading: "Zählung von Aufrufen ohne Cookies und Werbeklick-Kennung",
      body: "Um zu wissen, wie viele Personen unsere Seiten besuchen, zählt unser Server Aufrufe ohne Cookies und ohne etwas auf Ihrem Gerät zu speichern. Gespeichert werden nur die aufgerufene Seite, die Herkunft (z. B. Google oder eine Anzeige), grobe Geräte- und Browserkategorien sowie eine kryptografisch erzeugte Kennung, die sich täglich ändert. Ihre IP-Adresse wird dabei nicht gespeichert, und die Kennung lässt sich Ihrer Person nicht zuordnen. Auf den Werbe-Landingpages wird auf dieselbe Weise gezählt, welcher Schritt des Ablaufs erreicht wurde (Verbrauch wählen, Tarife ansehen, Anfrage senden). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer einfachen, wirksamen Auswertung unserer Website). Wenn Sie über eine Google-Anzeige zu uns kommen und eine Beratung anfragen, speichern wir die Klick-Kennung der Anzeige (gclid) zusammen mit Ihrer Anfrage, um die Wirkung der Werbung zu messen, sowie den gewählten Tarif und Verbrauch, damit Ihr Berater Sie besser unterstützen kann.",
    },
    {
      heading: "Cookies",
      body: "Unsere Website verwendet neben technisch notwendigen Cookies auch Cookies und ähnliche Technologien der unten beschriebenen Analyse- und Werbedienste (Google Analytics 4, Google Ads, Meta Pixel, Microsoft Clarity) sowie unserer eigenen Websitestatistik. Beim ersten Besuch informiert Sie ein Hinweis-Banner darüber. In den „Cookie-Einstellungen“ (im Banner und am Ende jeder Seite) können Sie die Gruppen „Analyse und Statistik“ sowie „Werbung und Personalisierung“ jederzeit deaktivieren. Cookies können Sie jederzeit in Ihren Browsereinstellungen löschen oder blockieren; außerdem können Sie der Verarbeitung jederzeit widersprechen, über die „Cookie-Einstellungen“ oder indem Sie uns kontaktieren (Art. 21 DSGVO). Details zu einzelnen Cookies finden Sie in unserer Cookie-Richtlinie.",
    },
    {
      heading: "Google Tag Manager, Google Analytics 4 und Google Ads",
      body: "Auf unserer Website nutzen wir den Google Tag Manager, ein Tool der Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland („Google“), über das wir Webanalyse- und Werbe-Tags verwalten. Darüber setzen wir zwei Dienste ein: Google Analytics 4 (zur statistischen Auswertung der Websitenutzung) und Google Ads Conversion-Tracking (zur Erfolgsmessung unserer Anzeigen). Dabei setzt Google Cookies (z. B. _ga, _gcl_*) und erhält Ihre IP-Adresse und Browserangaben.\n\nBei Google Analytics 4 wird Ihre IP-Adresse innerhalb der EU/des EWR gekürzt, bevor eine etwaige Übermittlung in die USA erfolgt; auf Nutzer- und Ereignisebene gespeicherte Daten werden nach 14 Monaten automatisch gelöscht. Das Cookie des Google Ads Conversion-Trackings läuft nach 30 Tagen ab und dient ausschließlich der anonymisierten Erfolgsmessung, nicht der persönlichen Identifizierung.\n\nRechtsgrundlage ist unser berechtigtes Interesse an der Auswertung der Websitenutzung und der Erfolgsmessung unserer Werbung nach Art. 6 Abs. 1 lit. f DSGVO. Sie können dem jederzeit widersprechen (Art. 21 DSGVO), über die „Cookie-Einstellungen“ oder indem Sie uns kontaktieren. Weitere Informationen: https://policies.google.com/privacy?hl=de.",
    },
    {
      heading: "Eigener Tagging-Server (sgtm.tarefe.de)",
      body: "Den Google Tag Manager und die Google-Tags laden wir nicht direkt von Google, sondern über unseren eigenen Tagging-Server unter sgtm.tarefe.de (serverseitiger Google Tag Manager), der auf einem von uns gemieteten Server läuft. Die Daten der Google-Tags (z. B. Google Analytics 4 und Google Ads) gehen zuerst an diesen Server und werden von dort an Google weitergeleitet. Der Server verarbeitet dafür Ihre IP-Adresse und Browserangaben. Zur technischen Kontrolle ruft der Tag Manager gelegentlich eine Prüfadresse direkt bei Google (www.googletagmanager.com) auf; ist unser Server nicht erreichbar, wird der Tag Manager direkt von Google geladen. Rechtsgrundlage ist dieselbe wie für den Google Tag Manager oben.",
    },
    {
      heading: "Meta Pixel und Conversions API (Facebook und Instagram)",
      body: "Um die Wirkung unserer Werbung auf Facebook und Instagram zu messen, nutzen wir das Meta Pixel und die Conversions API der Meta Platforms Ireland Ltd. (Merrion Road, Dublin 4, Irland). Das Pixel wird in Ihrem Browser geladen und setzt die Cookies _fbp und _fbc; an Meta übermittelt werden das Ereignis „PageView“ bei jedem Seitenaufruf, „ViewContent“ (Name der Leistung) auf Leistungs- und Energievergleichsseiten und „Lead“, wenn Sie das Beratungsformular absenden. Dieselben Ereignisse senden wir zusätzlich von unserem Server an Meta (Conversions API), zusammen mit IP-Adresse, Browsertyp und den Werten der Meta-Cookies; beim Ereignis „Lead“ außerdem mit Ihrer E-Mail-Adresse, Telefonnummer und Ihrem Namen in mit SHA-256 verschlüsselter (gehashter) Form; Meta sieht die Klartexte nicht und nutzt die Werte nur zum Abgleich mit Meta-Konten. Daten können an die Meta Platforms Inc. in den USA übermittelt werden; Meta ist unter dem EU-US Data Privacy Framework zertifiziert. Für die Verarbeitung über das Pixel sind wir und Meta gemeinsam verantwortlich (Art. 26 DSGVO). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Messung des Werbeerfolgs). Sie können dieser Verarbeitung jederzeit widersprechen (Art. 21 DSGVO), über die „Cookie-Einstellungen“ oder indem Sie uns kontaktieren.",
    },
    {
      heading: "Microsoft Clarity",
      body: "Zur Verbesserung unserer Website nutzen wir Microsoft Clarity der Microsoft Ireland Operations Ltd., One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland. Clarity erfasst, wie Besucher unsere Seiten nutzen (z. B. Mausbewegungen, Klicks, Scrollen, Seitenaufrufe), und erstellt daraus Heatmaps und anonymisierte Sitzungsaufzeichnungen; sensible Eingaben werden standardmäßig maskiert. Dafür setzt Clarity die Cookies _clck und _clsk und verarbeitet Ihre IP-Adresse und Browserangaben. Daten können an Microsoft in den USA übermittelt werden; Microsoft ist unter dem EU-US Data Privacy Framework zertifiziert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Verbesserung unserer Website). Sie können jederzeit widersprechen (Art. 21 DSGVO), über die „Cookie-Einstellungen“ oder indem Sie uns kontaktieren. Weitere Informationen: https://privacy.microsoft.com/de-de/privacystatement.",
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
      heading: "Подсчёт посещений без cookie и идентификатор рекламного клика",
      body: "Чтобы знать, сколько людей посещает наши страницы, наш сервер считает посещения без cookie и ничего не сохраняя на вашем устройстве. Сохраняются только адрес страницы, источник перехода (например, Google или реклама), общие категории устройства и браузера и криптографически созданный идентификатор, который меняется каждый день. Ваш IP-адрес при этом не сохраняется, а идентификатор нельзя отнести к вам лично. На рекламных посадочных страницах таким же образом считается, какого шага процесса достигли (выбор потребления, просмотр тарифов, отправка заявки). Правовое основание: Art. 6 Abs. 1 lit. f DSGVO (законный интерес в простой и эффективной оценке сайта). Если вы пришли по рекламе Google и отправили заявку на консультацию, мы сохраняем идентификатор клика (gclid) вместе с заявкой, чтобы оценивать эффективность рекламы, а также выбранный тариф и потребление, чтобы консультант мог лучше помочь.",
    },
    {
      heading: "Файлы cookie",
      body: "Помимо технически необходимых cookie наш сайт использует cookie и похожие технологии описанных ниже сервисов аналитики и рекламы (Google Analytics 4, Google Ads, Meta Pixel, Microsoft Clarity), а также собственную статистику сайта. При первом посещении вас информирует об этом баннер. В «Настройках cookie» (в баннере и внизу каждой страницы) вы можете в любой момент отключить группы «Аналитика и статистика» и «Реклама и персонализация». Cookie можно в любой момент удалить или заблокировать в настройках браузера; кроме того, вы можете в любой момент возразить против обработки через «Настройки cookie» или связавшись с нами (ст. 21 GDPR). Подробности об отдельных cookie — в нашей политике использования cookie.",
    },
    {
      heading: "Google Tag Manager, Google Analytics 4 и Google Ads",
      body: "На нашем сайте используется Google Tag Manager — инструмент компании Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Ireland («Google»), через который мы управляем тегами аналитики и рекламы. Через него мы используем два сервиса: Google Analytics 4 (для статистического анализа использования сайта) и отслеживание конверсий Google Ads (для оценки эффективности нашей рекламы). При этом Google устанавливает cookie (например, _ga, _gcl_*) и получает ваш IP-адрес и данные браузера.\n\nВ Google Analytics 4 ваш IP-адрес усекается в пределах ЕС/ЕЭЗ до возможной передачи в США; данные на уровне пользователя и события автоматически удаляются через 14 месяцев. Cookie отслеживания конверсий Google Ads действует 30 дней и используется исключительно для обезличенной статистики, без возможности личной идентификации.\n\nПравовое основание — наш законный интерес в анализе использования сайта и оценке эффективности рекламы по ст. 6 (1) (f) GDPR. Вы можете в любой момент возразить (ст. 21 GDPR) через «Настройки cookie» или связавшись с нами. Подробнее: https://policies.google.com/privacy?hl=de.",
    },
    {
      heading: "Собственный сервер тегов (sgtm.tarefe.de)",
      body: "Google Tag Manager и теги Google загружаются не напрямую от Google, а через наш собственный сервер тегов sgtm.tarefe.de (серверный Google Tag Manager), работающий на арендованном нами сервере. Данные тегов Google (например, Google Analytics 4 и Google Ads) сначала поступают на этот сервер и уже оттуда передаются в Google. Для этого сервер обрабатывает ваш IP-адрес и данные браузера. Для технического контроля Tag Manager иногда обращается к проверочному адресу напрямую у Google (www.googletagmanager.com); если наш сервер недоступен, Tag Manager загружается напрямую от Google. Правовое основание то же, что и для Google Tag Manager выше.",
    },
    {
      heading: "Meta Pixel и Conversions API (Facebook и Instagram)",
      body: "Чтобы оценивать эффективность рекламы в Facebook и Instagram, мы используем Meta Pixel и Conversions API компании Meta Platforms Ireland Ltd. (Merrion Road, Dublin 4, Irland). Pixel загружается в вашем браузере и устанавливает cookie _fbp и _fbc; в Meta передаются событие «PageView» при каждом просмотре страницы, «ViewContent» (название услуги) на страницах услуг и сравнения энергии и «Lead» при отправке формы консультации. Те же события мы дополнительно отправляем в Meta с нашего сервера (Conversions API) вместе с IP-адресом, типом браузера и значениями cookie Meta; для события «Lead» также с вашим e-mail, телефоном и именем в виде хеша SHA-256: Meta не видит исходные данные и использует их только для сопоставления с аккаунтами Meta. Данные могут передаваться Meta Platforms Inc. в США; Meta сертифицирована по EU-US Data Privacy Framework. За обработку через Pixel мы и Meta несём совместную ответственность (Art. 26 DSGVO). Правовое основание: Art. 6 Abs. 1 lit. f DSGVO (законный интерес в оценке эффективности рекламы). Вы можете в любое время возразить против этой обработки (Art. 21 DSGVO) через «Настройки cookie» или связавшись с нами.",
    },
    {
      heading: "Microsoft Clarity",
      body: "Для улучшения сайта мы используем Microsoft Clarity компании Microsoft Ireland Operations Ltd., One Microsoft Place, South County Business Park, Leopardstown, Dublin 18, Irland. Clarity фиксирует, как посетители пользуются нашими страницами (например, движения мыши, клики, прокрутку, просмотры страниц), и строит на этой основе тепловые карты и обезличенные записи сеансов; чувствительные вводимые данные по умолчанию скрываются. Для этого Clarity устанавливает cookie _clck и _clsk и обрабатывает ваш IP-адрес и данные браузера. Данные могут передаваться Microsoft в США; Microsoft сертифицирована по EU-US Data Privacy Framework. Правовое основание: ст. 6 (1) (f) GDPR (законный интерес в улучшении сайта). Вы можете в любой момент возразить (ст. 21 GDPR) через «Настройки cookie» или связавшись с нами. Подробнее: https://privacy.microsoft.com/ru-ru/privacystatement.",
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
