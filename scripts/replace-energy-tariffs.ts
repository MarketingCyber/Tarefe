// One-off data migration: replaces the ENTIRE EnergyTariff catalog (both
// kinds) with 6 real provider tariffs, each bulk-imported from that
// provider's own export file in the same shape
// src/app/api/ops/energy-tariffs/[id]/import/route.ts accepts (see that
// route's own header comment for the full column-format rationale — this
// script duplicates its small parsing helpers rather than importing from a
// Next.js route file, since this runs standalone via `tsx`, not through
// the app).
//
// Run on the VPS (needs the real DATABASE_URL from .env):
//   cd /var/www/tarefe-next && npx tsx scripts/replace-energy-tariffs.ts
import "dotenv/config";
import * as path from "path";
import * as XLSX from "xlsx";
import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const FILES_DIR = path.join(__dirname, "..", "data", "energy-tariffs");

const TARIFFS = [
  { kind: "ELECTRICITY", provider: "EVD", name: "Strom direkt 24", file: "2026-09-28_EVD_EVD Strom direkt 24_1179 (1).xlsx" },
  { kind: "ELECTRICITY", provider: "Vattenfall", name: "ÖkoStrom24 Pur", file: "2026-09-28_Vattenfall_ÖkoStrom24 Pur_1089.xlsx" },
  { kind: "ELECTRICITY", provider: "Mark-E", name: "Fix Strom Direkt", file: "2026-09-28_Mark-E_Fix Strom Direkt_406.xlsx" },
  { kind: "GAS", provider: "RheinEnergie", name: "Fair Gas 24", file: "2026-09-24_RheinEnergie_Fair Gas 24_1096.xlsx" },
  { kind: "GAS", provider: "Vattenfall", name: "Easy 24 Gas PUR", file: "2026-09-17_Vattenfall_Easy 24 Gas PUR_396.xlsx" },
  { kind: "GAS", provider: "E WIE EINFACH", name: "EinPreisTarif 24 Gas", file: "2026-09-11_E WIE EINFACH_EinPreisTarif 24 Gas_1238.xlsx" },
] as const;

const HEADER_MAP = {
  plz: "PLZ",
  ort: "ORT",
  consumptionFromKwh: "Staffel von",
  consumptionToKwh: "Staffel bis",
  validFrom: "gültig seit",
  basePriceEurPerYear: "Grundpreis (€)",
  workingPriceCtPerKwh: "Arbeitspreis (ct/kwh)",
  workingPriceNtCtPerKwh: "Arbeitspreis NT (ct/kwh)",
  bonusEur: "Bonus (€)",
  welcomeBonusEur: "Willkommensbonus (€)",
  loyaltyBonus: "Treue-/Bleibebonus",
  networkOperator: "Netzbetreiber",
  salesArea: "Vertriebsgebiet",
  sourcePriceId: "Preis ID",
  sourceBonusId: "Bonus ID",
  bonusKwh: "Bonus kwh",
  bonusPercent: "Bonus Prozent",
} as const;

function parseGermanNumberOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  const s = String(v).trim();
  if (!s) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  return Number.isFinite(Number(normalized)) ? normalized : null;
}

function parseKwhInt(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").trim();
  return s ? Number(s.replace(/\./g, "")) : NaN;
}

function parseGermanDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  const s = String(v ?? "").trim();
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
}

const BATCH_SIZE = 5000;

function parsePriceRows(filePath: string, tariffId: string) {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });

  const priceRows: Prisma.EnergyTariffPriceRowCreateManyInput[] = [];
  let skipped = 0;

  for (const row of rows) {
    const plz = String(row[HEADER_MAP.plz] ?? "").trim();
    const from = parseKwhInt(row[HEADER_MAP.consumptionFromKwh]);
    const to = parseKwhInt(row[HEADER_MAP.consumptionToKwh]);
    const validFrom = parseGermanDate(row[HEADER_MAP.validFrom]);
    const basePrice = parseGermanNumberOrNull(row[HEADER_MAP.basePriceEurPerYear]);
    const workingPrice = parseGermanNumberOrNull(row[HEADER_MAP.workingPriceCtPerKwh]);

    if (!plz || !Number.isFinite(from) || !Number.isFinite(to) || !validFrom || basePrice === null || workingPrice === null) {
      skipped++;
      continue;
    }

    priceRows.push({
      tariffId,
      plz,
      ort: (row[HEADER_MAP.ort] as string) || null,
      consumptionFromKwh: from,
      consumptionToKwh: to,
      validFrom,
      basePriceEurPerYear: basePrice,
      workingPriceCtPerKwh: workingPrice,
      workingPriceNtCtPerKwh: parseGermanNumberOrNull(row[HEADER_MAP.workingPriceNtCtPerKwh]),
      bonusEur: parseGermanNumberOrNull(row[HEADER_MAP.bonusEur]),
      welcomeBonusEur: parseGermanNumberOrNull(row[HEADER_MAP.welcomeBonusEur]),
      loyaltyBonus: parseGermanNumberOrNull(row[HEADER_MAP.loyaltyBonus]),
      bonusKwh: parseGermanNumberOrNull(row[HEADER_MAP.bonusKwh]),
      bonusPercent: parseGermanNumberOrNull(row[HEADER_MAP.bonusPercent]),
      networkOperator: (row[HEADER_MAP.networkOperator] as string) || null,
      salesArea: (row[HEADER_MAP.salesArea] as string) || null,
      sourcePriceId: row[HEADER_MAP.sourcePriceId] != null ? String(row[HEADER_MAP.sourcePriceId]) : null,
      sourceBonusId: row[HEADER_MAP.sourceBonusId] != null ? String(row[HEADER_MAP.sourceBonusId]) : null,
    });
  }

  return { priceRows, skipped, totalRows: rows.length };
}

async function main() {
  console.log("Deleting all existing EnergyTariff rows (cascades price rows)...");
  const deleted = await prisma.energyTariff.deleteMany({});
  console.log(`  deleted ${deleted.count} tariff(s)`);

  for (let i = 0; i < TARIFFS.length; i++) {
    const spec = TARIFFS[i];
    const filePath = path.join(FILES_DIR, spec.file);
    console.log(`\n[${i + 1}/${TARIFFS.length}] ${spec.provider} — ${spec.name} (${spec.kind})`);

    const tariff = await prisma.energyTariff.create({
      data: { kind: spec.kind, provider: spec.provider, name: spec.name, published: true, order: i },
    });

    const { priceRows, skipped, totalRows } = parsePriceRows(filePath, tariff.id);
    if (priceRows.length === 0) {
      throw new Error(`No valid rows parsed from ${spec.file} — aborting before touching the DB further.`);
    }

    for (let b = 0; b < priceRows.length; b += BATCH_SIZE) {
      await prisma.energyTariffPriceRow.createMany({ data: priceRows.slice(b, b + BATCH_SIZE) });
    }

    console.log(`  imported ${priceRows.length}/${totalRows} rows (${skipped} skipped)`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
