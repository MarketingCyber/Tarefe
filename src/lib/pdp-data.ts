import type { LocalizedText } from "./taxonomy";

/**
 * Known, real tariff content reused from the existing prototype's mock data
 * (src/data/mockData.ts on the VPS) — kept as genuine reference content
 * rather than fabricated pricing. Any PDP slug not listed here falls back
 * to a generic "request a personalized quote" template (see PdpView),
 * which is the honest choice until real provider data is wired up.
 *
 * `modules` is deliberately per-category-shaped (Phase 2 §8): an
 * electricity PDP needs Arbeitspreis/Grundpreis/Bonus/Preisgarantie, a
 * dental PDP needs coverage%/waiting period/Zahnstaffel — there is no
 * shared "universal" content shape, so this is a discriminated union
 * rather than one flat schema every service is forced into.
 */
export interface EnergyModule {
  kind: "energy";
  workingPriceCtPerKwh: string; // Arbeitspreis
  basePriceEurPerYear: string; // Grundpreis
  bonusEur: string;
  priceGuaranteeMonths: number;
  contractDurationMonths: number;
}

export interface DentalModule {
  kind: "dental";
  coveragePercent: number;
  waitingPeriodMonths: number;
  zahnstaffel: { period: LocalizedText; capPercent: number }[];
  implantsCovered: boolean;
  crownsCovered: boolean;
}

export type PdpModule = EnergyModule | DentalModule;

export interface KnownTariff {
  slug: string;
  provider: string;
  name: string;
  monthlyPrice: string;
  badges: LocalizedText[];
  module: PdpModule;
}

export const KNOWN_TARIFFS: Record<string, KnownTariff> = {
  "vattenfall-naturstrom-12": {
    slug: "vattenfall-naturstrom-12",
    provider: "Vattenfall",
    name: "Naturstrom 12",
    monthlyPrice: "72€",
    badges: [
      { fa: "گارانتی قیمت ۱۲ ماهه", de: "12 Monate Preisgarantie", ru: "Гарантия цены 12 месяцев" },
      { fa: "تا ۱۵۰€ بونوس نقدی", de: "Bis zu 150 € Bonus", ru: "До 150 € бонуса" },
      { fa: "۱۰۰٪ انرژی تجدیدپذیر", de: "100 % erneuerbare Energie", ru: "100% возобновляемая энергия" },
    ],
    module: {
      kind: "energy",
      workingPriceCtPerKwh: "32.4",
      basePriceEurPerYear: "132",
      bonusEur: "150",
      priceGuaranteeMonths: 12,
      contractDurationMonths: 12,
    },
  },
  "barmenia-mehr-zahn-100": {
    slug: "barmenia-mehr-zahn-100",
    provider: "Barmenia",
    name: "Mehr Zahn 100",
    monthlyPrice: "24€",
    badges: [
      { fa: "پوشش ۱۰۰٪ ایمپلنت", de: "100 % Implantat-Deckung", ru: "100% покрытие импланта" },
      { fa: "بدون دوره انتظار", de: "Ohne Wartezeit", ru: "Без периода ожидания" },
      { fa: "جرم‌گیری سالانه رایگان", de: "Jährliche Prophylaxe inklusive", ru: "Ежегодная профилактика включена" },
    ],
    module: {
      kind: "dental",
      coveragePercent: 100,
      waitingPeriodMonths: 0,
      implantsCovered: true,
      crownsCovered: true,
      zahnstaffel: [
        { period: { fa: "سال اول", de: "1. Jahr", ru: "1-й год" }, capPercent: 100 },
        { period: { fa: "سال دوم به بعد", de: "Ab dem 2. Jahr", ru: "Со 2-го года" }, capPercent: 100 },
      ],
    },
  },
};
