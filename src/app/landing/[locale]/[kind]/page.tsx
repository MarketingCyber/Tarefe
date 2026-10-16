import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/taxonomy";
import { LANDING_KINDS, type LandingKind } from "@/lib/landing-estimates";
import { LANDING_COPY } from "@/lib/landing-copy";
import { LandingJourney } from "@/components/landing/LandingJourney";

export function generateStaticParams() {
  return LOCALES.flatMap((locale) => LANDING_KINDS.map((kind) => ({ locale, kind })));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; kind: string }> }): Promise<Metadata> {
  const { locale, kind } = await params;
  if (!LOCALES.includes(locale as Locale) || !LANDING_KINDS.includes(kind as LandingKind)) return {};
  return {
    title: `${LANDING_COPY.h1[kind as LandingKind][locale as Locale]} | Tarefe`,
    description: LANDING_COPY.sub[locale as Locale],
    robots: { index: false, follow: false },
  };
}

export default async function LandingPage({ params }: { params: Promise<{ locale: string; kind: string }> }) {
  const { locale, kind } = await params;
  if (!LOCALES.includes(locale as Locale) || !LANDING_KINDS.includes(kind as LandingKind)) notFound();
  return <LandingJourney locale={locale as Locale} kind={kind as LandingKind} />;
}
