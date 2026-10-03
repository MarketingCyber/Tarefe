import type { Metadata } from "next";
import { Phone, MapPin, WhatsappLogo, ArrowSquareOut } from "@phosphor-icons/react/dist/ssr";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";
import { TrackedPhoneLink } from "@/components/shared/TrackedPhoneLink";
import { Reveal } from "@/components/shared/Reveal";
import { buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const DESCRIPTION: Record<Locale, string> = {
  fa: "راه‌های تماس با تعرفه: تلفن، واتساپ، نشانی دفتر در دوسلدورف روی نقشه و فرم درخواست مشاوره رایگان.",
  de: "Kontaktieren Sie Tarefe: Telefon, WhatsApp, unser Bürostandort in Düsseldorf auf der Karte und ein kostenloses Beratungsformular.",
  ru: "Свяжитесь с Tarefe: телефон, WhatsApp, адрес офиса в Дюссельдорфе на карте и форма бесплатной консультации.",
};

// The real office address — same one as the Impressum and Testimonials'
// placeholder card.
const OFFICE_ADDRESS_DISPLAY = "Kesselstraße 3, 40221 Düsseldorf";
// "Germany" added only for the directions query, not shown to the reader.
const ENCODED_ADDRESS = encodeURIComponent(`${OFFICE_ADDRESS_DISPLAY}, Germany`);
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${ENCODED_ADDRESS}`;
// Real coordinates for this exact address, looked up via OpenStreetMap's
// Nominatim geocoder (2026-09-13) — 51.2141552, 6.7464649. The keyless
// Maps embed drops a plain pin at coordinates reliably; querying by the
// address *text* instead routes through Google's Place lookup, which
// intermittently fails with "Place info couldn't load" for addresses with
// no indexed business listing (this new office has none yet).
const MAP_EMBED_URL = "https://maps.google.com/maps?q=51.2141552,6.7464649&z=16&output=embed";

const MAP_TITLE: Record<Locale, string> = {
  fa: "نقشه دفتر تعرفه در دوسلدورف",
  de: "Karte des Tarefe-Büros in Düsseldorf",
  ru: "Карта офиса Tarefe в Дюссельдорфе",
};

const OPEN_IN_MAPS: Record<Locale, string> = {
  fa: "مسیریابی در گوگل مپ",
  de: "In Google Maps öffnen",
  ru: "Открыть в Google Картах",
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const dict = getDictionary(locale as Locale);
  return { title: dict.footer.contact, description: DESCRIPTION[locale as Locale], alternates: buildAlternates(locale as Locale, "contact") };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const dict = getDictionary(locale);

  return (
    <div>
      <SimplePageHeader items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: dict.footer.contact, href: `/${locale}/contact` }]} title={dict.footer.contact} />

      <Reveal>
        <div className="container-page pt-12">
          <div className="relative overflow-hidden rounded-2xl border border-border shadow-card">
            <iframe
              src={MAP_EMBED_URL}
              title={MAP_TITLE[locale]}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full md:h-96"
            />
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="press absolute bottom-4 start-4 flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-xs font-semibold text-purple-900 shadow-card-hover transition-colors hover:border-purple-600 hover:text-purple-600"
            >
              <MapPin size={14} weight="fill" className="text-purple-600" />
              {OPEN_IN_MAPS[locale]}
            </a>
          </div>
        </div>
      </Reveal>

      <div className="container-page grid gap-10 py-12 md:grid-cols-2">
        <div className="space-y-4">
          <TrackedPhoneLink locale={locale} className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
              <Phone size={18} />
            </span>
            <span className="font-latin text-sm font-semibold text-purple-900">+49 211 5421 8000</span>
          </TrackedPhoneLink>
          <a
            href="https://wa.me/4915224318691"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
              <WhatsappLogo size={18} weight="fill" />
            </span>
            <span className="font-latin text-sm font-semibold text-purple-900">+49 152 2431 8691</span>
          </a>
          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl border border-border bg-white p-4 transition-colors hover:border-purple-600"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
              <MapPin size={18} />
            </span>
            <span className="font-latin text-sm font-semibold text-purple-900">{OFFICE_ADDRESS_DISPLAY}</span>
            <ArrowSquareOut size={14} weight="bold" className="ms-auto shrink-0 text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        </div>
        <ConsultationForm locale={locale} />
      </div>
    </div>
  );
}
