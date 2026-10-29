import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { LegalPage } from "@/components/legal/LegalPage";
import { CookieConsentControl } from "@/components/shared/CookieConsentControl";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const DESCRIPTION: Record<Locale, string> = {
  fa: "توضیح این‌که تعرفه از چه کوکی‌هایی استفاده می‌کند و چگونه می‌توانید تنظیمات آن‌ها را مدیریت کنید.",
  de: "Erklärung, welche Cookies Tarefe verwendet und wie Sie Ihre Cookie-Einstellungen verwalten können.",
  ru: "Информация о том, какие файлы cookie использует Tarefe и как управлять настройками cookie.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.footer.cookiePolicy, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "cookie-policy") };
}

const PENDING: Record<Locale, string> = {
  fa: "با ورود اول به سایت، می‌توانید کوکی‌های تحلیلی را قبول یا رد کنید. با پاک‌کردن داده‌های محلی مرورگر یا دکمه زیر می‌توانید انتخاب خود را تغییر دهید.",
  de: "Beim ersten Besuch können Sie den Analyse-Cookies zustimmen oder sie ablehnen. Sie können Ihre Wahl jederzeit über die lokalen Browserdaten oder die Schaltfläche unten ändern.",
  ru: "При первом посещении сайта вы можете принять или отклонить аналитические cookie. Изменить выбор можно в любой момент, очистив локальные данные браузера или через кнопку ниже.",
};

const CHANGE_CHOICE_LABEL: Record<Locale, string> = {
  fa: "تنظیمات کوکی",
  de: "Cookie-Einstellungen",
  ru: "Настройки cookie",
};

const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  fa: [
    { heading: "کوکی‌های ضروری", body: "برای عملکرد پایه وب‌سایت، مانند حفظ زبان انتخابی شما، استفاده می‌شوند." },
    { heading: "کوکی‌های تحلیلی", body: "برای بهبود سایت و سنجش تبلیغات به‌کار می‌روند. می‌توانید آن‌ها را هر زمان در «تنظیمات کوکی» غیرفعال کنید." },
  ],
  de: [
    { heading: "Notwendige Cookies", body: "Werden für die Grundfunktionen der Website benötigt, z. B. zum Speichern Ihrer Sprachauswahl." },
    { heading: "Analyse-Cookies", body: "Dienen der Verbesserung der Website und der Erfolgsmessung unserer Werbung. Sie können sie jederzeit in den „Cookie-Einstellungen“ deaktivieren." },
  ],
  ru: [
    { heading: "Необходимые cookie", body: "Используются для базовой работы сайта, например для сохранения выбранного языка." },
    { heading: "Аналитические cookie", body: "Используются для улучшения сайта и оценки рекламы. Их можно в любой момент отключить в «Настройках cookie»." },
  ],
};

export default async function CookiePolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <div>
      <LegalPage locale={locale} dict={dict} title={dict.footer.cookiePolicy} crumbLabel={dict.footer.cookiePolicy} href={`/${locale}/cookie-policy`} pendingNote={PENDING[locale]} sections={SECTIONS[locale]} />
      <div className="container-page -mt-8 max-w-3xl pb-12">
        <CookieConsentControl label={CHANGE_CHOICE_LABEL[locale]} />
      </div>
    </div>
  );
}
