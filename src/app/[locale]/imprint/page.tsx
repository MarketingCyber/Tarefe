import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { LegalPage } from "@/components/legal/LegalPage";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const DESCRIPTION: Record<Locale, string> = {
  fa: "اطلاعات ثبتی و تماس تعرفه طبق ماده ۵ قانون خدمات دیجیتال آلمان (DDG).",
  de: "Impressum von Tarefe gemäß § 5 DDG — Anbieterkennzeichnung und Kontaktangaben.",
  ru: "Импрессум Tarefe согласно § 5 DDG — реквизиты и контактные данные компании.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.footer.imprint, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "imprint") };
}

// Real, verified business data — updated 2026-09-15 from a fresh Impressum
// PDF the client supplied directly (superseding the previous version
// sourced 2026-09-09 from the live WordPress site). Per the client's own
// confirmation: this version lists Hamid Eshaghi as sole Inhaber (the
// earlier "Majid Moinian & Hamid Eshaghi / Geschäftsführer" listing and
// the §34d GewO insurance-broker license / IHK-Erlaubnisbehörde section
// are both intentionally dropped, not carried forward — also no fax
// number or social-media page URLs in the new source, so those are gone
// too. Facts (names, address, phone/email, the VAT ID, the IHK register
// number, the insurer's address) are kept verbatim in every locale —
// they're official identifiers, not prose to translate; only the
// surrounding descriptive text is localized. Each Latin/digit run
// embedded in the Farsi (RTL) body is prefixed with a U+200E
// left-to-right mark so it doesn't get bidi-reordered inside the
// surrounding RTL paragraph — same convention already used elsewhere on
// this page before this rewrite (see git history) and in Footer.tsx.
const LRM = "‎";

const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  fa: [
    {
      heading: "دامنه اعتبار",
      body: `این صفحه برای وب‌سایت ${LRM}https://tarefe.de${LRM} و تمام زیردامنه‌های آن معتبر است.`,
    },
    {
      heading: "اطلاعات طبق § 5 DDG",
      body: `${LRM}Hamid Eshaghi${LRM}\n${LRM}Kesselstr. 3${LRM}\n${LRM}40221 Düsseldorf${LRM}\nتلفن: ${LRM}+49 211 54218000${LRM}\nایمیل: ${LRM}info@tarefe.de${LRM}\nواتساپ: ${LRM}+49 152 24318691${LRM}`,
    },
    {
      heading: "ثبت",
      body: `شماره ثبت نزد اتاق صنعت و بازرگانی (${LRM}IHK${LRM}): ${LRM}D-ZEWI-FHRZG-90${LRM}`,
    },
    {
      heading: "شناسه مالیات بر ارزش‌افزوده",
      body: `شماره شناسایی مالیات بر ارزش‌افزوده طبق § 27a قانون مالیات بر ارزش‌افزوده آلمان: ${LRM}DE356741347${LRM}`,
    },
    {
      heading: "شخص دارای اختیار نمایندگی",
      body: `${LRM}Hamid Eshaghi${LRM}، مالک (${LRM}Inhaber${LRM})`,
    },
    {
      heading: "بیمه مسئولیت حرفه‌ای",
      body: `${LRM}HDI${LRM}\n${LRM}Postfach 10 10 59${LRM}\n${LRM}40710 Hilden${LRM}`,
    },
    {
      heading: "تاریخ اعتبار",
      body: `این اطلاعات از تاریخ ${LRM}10 اکتبر 2023${LRM} معتبر است.`,
    },
  ],
  de: [
    {
      heading: "Website",
      body: "Dieses Impressum gilt für alle Angebote unter der Domain https://tarefe.de inklusive aller Subdomains (Unterseiten).",
    },
    {
      heading: "Angaben gemäß § 5 DDG",
      body: "Hamid Eshaghi\nKesselstr. 3\n40221 Düsseldorf\nTelefon: +49 211 54218000\nE-Mail: info@tarefe.de\nWhatsApp: +49 152 24318691",
    },
    {
      heading: "Eintragung",
      body: "IHK 34D Registernummer: D-ZEWI-FHRZG-90",
    },
    {
      heading: "Umsatzsteuer-Identifikationsnummer",
      body: "DE356741347",
    },
    {
      heading: "Vertretungsberechtigte Personen",
      body: "Hamid Eshaghi, Inhaber",
    },
    {
      heading: "Berufshaftpflichtversicherung",
      body: "HDI\nPostfach 10 10 59\n40710 Hilden",
    },
    {
      heading: "Gültigkeit",
      body: "Dieses Impressum gilt ab dem 10. Oktober 2023.",
    },
  ],
  ru: [
    {
      heading: "Область действия",
      body: "Настоящее уведомление действует для всех предложений на домене https://tarefe.de, включая все поддомены.",
    },
    {
      heading: "Данные согласно § 5 DDG",
      body: "Hamid Eshaghi\nKesselstr. 3\n40221 Düsseldorf\nТелефон: +49 211 54218000\nЭл. почта: info@tarefe.de\nWhatsApp: +49 152 24318691",
    },
    {
      heading: "Регистрация",
      body: "Регистрационный номер в Торгово-промышленной палате (IHK): D-ZEWI-FHRZG-90",
    },
    {
      heading: "Идентификационный номер плательщика НДС",
      body: "Идентификационный номер плательщика НДС согласно § 27a Закона об НДС Германии: DE356741347",
    },
    {
      heading: "Уполномоченное представительное лицо",
      body: "Hamid Eshaghi, владелец (Inhaber)",
    },
    {
      heading: "Страхование профессиональной ответственности",
      body: "HDI\nPostfach 10 10 59\n40710 Hilden",
    },
    {
      heading: "Срок действия",
      body: "Настоящие данные действительны с 10 октября 2023 г.",
    },
  ],
};

export default async function ImprintPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <LegalPage locale={locale} dict={dict} title={dict.footer.imprint} crumbLabel={dict.footer.imprint} href={`/${locale}/imprint`} sections={SECTIONS[locale]} />
  );
}
