import { z } from "zod";

/**
 * What the Google Ads landing journey attaches to a lead, besides the form fields:
 * the choices made on the way. Validated on the server (a visitor can send anything),
 * stored as Lead.landingContext (JSON), and summarised into Lead.notes so the
 * advisor sees it without opening anything else.
 */
export const LandingContextSchema = z.object({
  kind: z.enum(["electricity", "gas"]),
  plz: z.string().regex(/^\d{5}$/),
  usageOption: z.string().max(20),
  annualKwh: z.number().positive().max(1_000_000),
  tariff: z
    .object({
      id: z.string().max(60),
      provider: z.string().max(100),
      name: z.string().max(160),
      monthlyEur: z.number().min(0).max(100_000),
      bonusEur: z.number().min(0).max(100_000).nullable(),
    })
    .nullable(),
});

export type LandingContext = z.infer<typeof LandingContextSchema>;

export function summariseLandingContext(c: LandingContext): string {
  const kind = c.kind === "electricity" ? "Strom" : "Gas";
  const usage = `${Math.round(c.annualKwh).toLocaleString("de-DE")} kWh/Jahr (niedrig geschätzt, Auswahl "${c.usageOption}")`;
  const tariff = c.tariff
    ? `Gewählter Tarif: ${c.tariff.provider} – ${c.tariff.name}, ca. ${Math.round(c.tariff.monthlyEur)} €/Monat${c.tariff.bonusEur ? `, Bonus ${Math.round(c.tariff.bonusEur)} €` : ""}`
    : "Kein Tarif gewählt (für diese PLZ wurden keine Tarife angezeigt)";
  return `Landing Page ${kind}: PLZ ${c.plz}, ${usage}. ${tariff}.`;
}
