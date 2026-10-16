import type { Locale } from "./taxonomy";

/**
 * The guided usage choice on the Google Ads landing pages: a visitor who does
 * not know their kWh picks how many people live at home (electricity) or how big
 * the home is (gas), and we assume a LOW usage for that choice.
 *
 * Why low: the page's job is to show a realistic best-case monthly price, and a
 * low-end figure keeps the "≈ per month" from being inflated by a generous
 * average — while staying inside what is normal for that household (never the
 * unrealistic minimum). The page says "a low estimate" next to the figure.
 *
 * These numbers are the team's own working estimates (2026-10-17), NOT a
 * verified published table:
 *  - electricity: low end of the usual range per household size (2 people:
 *    2,000 kWh, in the 2,000–3,000 range the team quoted);
 *  - gas: the project's existing rule of ~160 kWh/m²/year (see
 *    EnergyConsumptionCalculator.tsx — BDEW/Heizspiegel) applied to the LOWER
 *    edge of each size band instead of the upper edge it uses on the service pages.
 * The service pages' calculator is untouched and keeps its own (higher) figures.
 */
export type LandingKind = "electricity" | "gas";

export interface UsageOption {
  value: string;
  kwh: number;
  label: Record<Locale, string>;
}

export const LANDING_KINDS: LandingKind[] = ["electricity", "gas"];

export const USAGE_OPTIONS: Record<LandingKind, { default: string; options: UsageOption[] }> = {
  electricity: {
    default: "2",
    options: [
      { value: "1", kwh: 1300, label: { fa: "۱ نفر", de: "1 Person", ru: "1 человек" } },
      { value: "2", kwh: 2000, label: { fa: "۲ نفر", de: "2 Personen", ru: "2 человека" } },
      { value: "3", kwh: 2500, label: { fa: "۳ نفر", de: "3 Personen", ru: "3 человека" } },
      { value: "4", kwh: 3000, label: { fa: "۴ نفر یا بیشتر", de: "4 Personen oder mehr", ru: "4 человека и больше" } },
    ],
  },
  gas: {
    default: "50-80",
    options: [
      { value: "under50", kwh: 5000, label: { fa: "تا ۵۰ متر", de: "Bis 50 m²", ru: "До 50 м²" } },
      { value: "50-80", kwh: 8000, label: { fa: "۵۰ تا ۸۰ متر", de: "50–80 m²", ru: "50–80 м²" } },
      { value: "80-120", kwh: 12800, label: { fa: "۸۰ تا ۱۲۰ متر", de: "80–120 m²", ru: "80–120 м²" } },
      { value: "120-150", kwh: 19200, label: { fa: "۱۲۰ تا ۱۵۰ متر", de: "120–150 m²", ru: "120–150 м²" } },
      { value: "over150", kwh: 24000, label: { fa: "بیش از ۱۵۰ متر", de: "Über 150 m²", ru: "Более 150 м²" } },
    ],
  },
};

export function usageFor(kind: LandingKind, value: string): UsageOption {
  const group = USAGE_OPTIONS[kind];
  return group.options.find((o) => o.value === value) ?? group.options.find((o) => o.value === group.default)!;
}
