import Link from "next/link";
import { CheckCircle, WhatsappLogo } from "@phosphor-icons/react/dist/ssr";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata = { robots: { index: false } };

export default async function ConsultationSuccessPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="container-page flex flex-col items-center py-20 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg text-success">
        <CheckCircle size={32} weight="fill" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-purple-900 md:text-3xl">
        {locale === "fa" ? "درخواست شما ثبت شد" : locale === "de" ? "Ihre Anfrage wurde übermittelt" : "Ваш запрос отправлен"}
      </h1>
      <p className="mt-3 max-w-[48ch] text-secondary">
        {locale === "fa"
          ? "مشاوران ما ظرف کمتر از ۳ ساعت کاری با شما تماس خواهند گرفت."
          : locale === "de"
            ? "Unsere Berater melden sich innerhalb von 3 Werkstunden bei Ihnen."
            : "Наши консультанты свяжутся с вами в течение 3 рабочих часов."}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <a
          href="https://wa.me/4915224318691"
          target="_blank"
          rel="noopener noreferrer"
          className="press inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white"
        >
          <WhatsappLogo size={16} weight="fill" />
          {dict.cta.whatsappConsultation}
        </a>
        <Link href={`/${locale}`} className="press inline-flex items-center gap-2 rounded-full border border-border-strong px-6 py-3 text-sm font-semibold text-purple-900">
          {dict.notFound.cta}
        </Link>
      </div>
    </div>
  );
}
