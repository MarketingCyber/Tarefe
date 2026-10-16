/**
 * The "≈ per month" figure shown on every tariff card: (usage cost + base price
 * − one-time bonus) ÷ 12, i.e. the average monthly bill in year one. One
 * definition for the service pages and the landing journey (the formula and its
 * history are explained in EnergyTariffCards.tsx — Grundpreis is ANNUAL, and the
 * sign-up bonus is netted out).
 */
export interface TariffRow {
  id: string;
  provider: string;
  name: string;
  workingPriceCtPerKwh: string;
  basePriceEurPerYear: string;
  bonusEur: string | null;
  priceGuaranteeMonths: number | null;
  highlight: string | null;
}

export interface PricedTariff extends TariffRow {
  monthly: number;
  yearly: number;
  basePriceMonthly: number;
}

export function priceTariff(t: TariffRow, annualKwh: number): PricedTariff | null {
  const working = parseFloat(t.workingPriceCtPerKwh);
  const base = parseFloat(t.basePriceEurPerYear);
  if (!Number.isFinite(working) || !Number.isFinite(base)) return null;
  const bonus = t.bonusEur ? parseFloat(t.bonusEur) : 0;
  const yearly = (annualKwh * working) / 100 + base - (Number.isFinite(bonus) ? bonus : 0);
  return { ...t, yearly, monthly: yearly / 12, basePriceMonthly: base / 12 };
}

/** Priced, cheapest first, top `limit`. */
export function rankTariffs(tariffs: TariffRow[], annualKwh: number, limit = 3): PricedTariff[] {
  return tariffs
    .map((t) => priceTariff(t, annualKwh))
    .filter((t): t is PricedTariff => t !== null)
    .sort((a, b) => a.monthly - b.monthly)
    .slice(0, limit);
}
