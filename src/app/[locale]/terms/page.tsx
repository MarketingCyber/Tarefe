import type { Metadata } from "next";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { LegalPage } from "@/components/legal/LegalPage";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const DESCRIPTION: Record<Locale, string> = {
  fa: "شرایط و ضوابط استفاده از خدمات مقایسه و مشاوره تعرفه.",
  de: "Allgemeine Geschäftsbedingungen für die Nutzung der Vergleichs- und Beratungsleistungen von Tarefe.",
  ru: "Условия использования услуг сравнения и консультирования Tarefe.",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.footer.terms, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "terms") };
}

const PENDING: Record<Locale, string> = {
  fa: "متن کامل و رسمی شرایط و قوانین استفاده پیش از انتشار نهایی باید توسط تیم حقوقی تعرفه تهیه و تایید شود.",
  de: "Der vollständige, rechtsverbindliche Text der AGB muss vor der Veröffentlichung vom Rechtsteam erstellt und freigegeben werden.",
  ru: "Полный юридически обязывающий текст условий использования должен быть подготовлен и утверждён юридической командой перед публикацией.",
};

const SECTIONS: Record<Locale, { heading: string; body: string }[]> = {
  fa: [
    { heading: "دامنه خدمات", body: "تعرفه خدمات مقایسه، مشاوره و پیگیری قراردادهای بیمه، انرژی و اینترنت را به‌صورت رایگان ارائه می‌دهد." },
    { heading: "مسئولیت", body: "تعرفه واسطه بین مشتری و شرکت ارائه‌دهنده است؛ تعهدات قراردادی نهایی بین مشتری و شرکت طرف قرارداد برقرار می‌شود." },
  ],
  de: [
    { heading: "Leistungsumfang", body: "Tarefe bietet den kostenlosen Vergleich, die Beratung und Betreuung von Versicherungs-, Energie- und Internetverträgen." },
    { heading: "Haftung", body: "Tarefe vermittelt zwischen Kunde und Anbieter; die vertraglichen Verpflichtungen bestehen letztlich zwischen Kunde und Anbieter." },
  ],
  ru: [
    { heading: "Объём услуг", body: "Tarefe предоставляет бесплатное сравнение, консультации и сопровождение договоров страхования, энергии и интернета." },
    { heading: "Ответственность", body: "Tarefe выступает посредником между клиентом и поставщиком; итоговые договорные обязательства действуют между клиентом и поставщиком." },
  ],
};

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return <LegalPage locale={locale} dict={dict} title={dict.footer.terms} crumbLabel={dict.footer.terms} href={`/${locale}/terms`} pendingNote={PENDING[locale]} sections={SECTIONS[locale]} />;
}
