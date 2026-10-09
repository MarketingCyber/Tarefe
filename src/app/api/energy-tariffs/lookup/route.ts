import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * Real German energy prices vary by network-operator region (postal code)
 * and by annual usage tier — there is no single "the price" for a bulk-
 * imported tariff (see EnergyTariffPriceRow in schema.prisma). This route
 * resolves each published tariff of a kind to its real price for one
 * specific PLZ + annual-kWh combination, called by
 * EnergyConsumptionCalculator once a visitor enters both. A tariff with no
 * price grid at all (hand-entered via the simple admin form) falls back to
 * its flat fields; a tariff WITH a grid but no row covering this exact
 * PLZ/consumption combination is dropped from the results entirely rather
 * than shown with a wrong or averaged price.
 */
const QuerySchema = z.object({
  kind: z.enum(["ELECTRICITY", "GAS"]),
  plz: z.string().regex(/^\d{5}$/, "PLZ must be 5 digits"),
  annualKwh: z.coerce.number().positive().max(1_000_000),
  locale: z.enum(["fa", "de", "ru"]).optional().default("fa"),
});

/**
 * The bonus a card should show: the first of the given values that is a
 * real, positive amount — or null. Provider exports fill every bonus column
 * with "0,00" rather than leaving it empty, and `??` treats "0.00" as
 * present: it would let a zero "Bonus" column hide a real 100 € welcome
 * bonus (Eprimo), never look at the loyalty column at all (Vattenfall
 * r.B.), and print "Bonus 0.00 €" on every tariff that has none.
 */
function firstPositiveBonus(...values: (string | null | undefined)[]): string | null {
  for (const v of values) {
    if (v && Number.parseFloat(v) > 0) return v;
  }
  return null;
}

export async function GET(request: Request) {
  const { allowed } = rateLimit(`energy-lookup:${getClientIp(request)}`, 30);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    kind: searchParams.get("kind"),
    plz: searchParams.get("plz"),
    annualKwh: searchParams.get("annualKwh"),
    locale: searchParams.get("locale") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
  }
  const { kind, plz, annualKwh, locale } = parsed.data;

  const tariffs = await prisma.energyTariff.findMany({
    where: { kind, published: true },
    orderBy: { order: "asc" },
    include: {
      priceRows: {
        where: { plz, consumptionFromKwh: { lte: annualKwh }, consumptionToKwh: { gte: annualKwh } },
        orderBy: { validFrom: "desc" },
        take: 1,
      },
      _count: { select: { priceRows: true } },
    },
  });

  const highlightFor = (t: (typeof tariffs)[number]) => (locale === "de" ? t.highlightDe : locale === "ru" ? t.highlightRu : null) ?? t.highlightFa;

  const cards = tariffs.flatMap((t) => {
    const row = t.priceRows[0];
    if (row) {
      return [
        {
          id: t.id,
          provider: t.provider,
          name: t.name,
          workingPriceCtPerKwh: row.workingPriceCtPerKwh,
          basePriceEurPerYear: row.basePriceEurPerYear,
          bonusEur: firstPositiveBonus(row.bonusEur, row.welcomeBonusEur, row.loyaltyBonus),
          priceGuaranteeMonths: t.priceGuaranteeMonths,
          highlight: highlightFor(t),
        },
      ];
    }
    // Has a real price grid but no row covers this PLZ/consumption — this
    // provider doesn't serve this area or tier. Never fabricate a
    // substitute price; just exclude the tariff from this visitor's results.
    if (t._count.priceRows > 0) return [];

    // No grid at all — hand-entered tariff, use its flat fallback fields.
    if (t.workingPriceCtPerKwh && t.basePriceEurPerYear) {
      return [
        {
          id: t.id,
          provider: t.provider,
          name: t.name,
          workingPriceCtPerKwh: t.workingPriceCtPerKwh,
          basePriceEurPerYear: t.basePriceEurPerYear,
          bonusEur: firstPositiveBonus(t.bonusEur),
          priceGuaranteeMonths: t.priceGuaranteeMonths,
          highlight: highlightFor(t),
        },
      ];
    }
    return [];
  });

  return NextResponse.json({ cards, totalPublishedTariffs: tariffs.length });
}
