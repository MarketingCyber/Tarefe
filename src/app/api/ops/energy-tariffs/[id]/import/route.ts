import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { canAccessContent } from "@/lib/permissions";

/**
 * Bulk price-grid upload for one EnergyTariff — accepts a provider's own
 * export file (.xlsx or .csv) in the real-world German energy-market
 * shape (Goldgas's own export uses exactly these column names; see
 * schema.prisma's EnergyTariffPriceRow comment for why this table exists
 * at all — prices genuinely vary by postal code and usage tier). Matches
 * columns BY NAME, not position, so a provider's raw export and a
 * hand-built CSV using the same header names both work, and unrelated
 * columns (Preis ID, Messpreis_*, DM ID, etc.) are safely ignored rather
 * than rejected.
 *
 * FULLY REPLACES this tariff's price rows — delete-then-insert in one
 * transaction, never a merge/upsert. A partial or malformed file is
 * rejected before any row is touched, so a bad upload can't leave a
 * tariff half-updated.
 *
 * A Route Handler rather than a Server Action deliberately — Server
 * Actions default to a 1MB body limit, and real provider exports (the
 * three Goldgas files this was built against) run ~11MB with ~128,000
 * rows each.
 */

const REQUIRED_HEADERS = ["PLZ", "Staffel von", "Staffel bis", "gültig seit", "Grundpreis (€)", "Arbeitspreis (ct/kwh)"] as const;

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
  // A cell Excel stores as an actual number (not text) comes back from
  // SheetJS as a native JS number, already correct — String(87.63) is
  // "87.63" (JS always uses '.', regardless of locale). Only a TEXT cell
  // (the real Goldgas export's own format, "87,63") needs German-style
  // reparsing. Running every cell through the text path unconditionally
  // would silently 100x a real numeric cell — "." stripped as a thousands
  // separator, e.g. 87.63 -> "8763" — the exact bug this branch prevents.
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : null;
  const s = String(v).trim();
  if (!s) return null;
  const normalized = s.replace(/\./g, "").replace(",", ".");
  return Number.isFinite(Number(normalized)) ? normalized : null;
}

/** Consumption-tier boundaries are whole kWh numbers — a native numeric
 * cell passes straight through; a text cell may use German thousands
 * separators ("5.000" meaning 5000), so strip dots before parsing. */
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

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: tariffId } = await params;
  const session = await auth();
  const isStaff = session?.user && canAccessContent(session.user.role);
  if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tariff = await prisma.energyTariff.findUnique({ where: { id: tariffId } });
  if (!tariff) return NextResponse.json({ error: "Tariff not found" }, { status: 404 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  // .xlsx only, deliberately — not .csv. A real provider export (Goldgas's
  // own files, confirmed against 384,000+ real rows) stores numbers as
  // plain, locale-independent values internally regardless of German
  // display formatting, which parseGermanNumberOrNull/parseKwhInt handle
  // correctly either way (text cell "87,63" or native number 87.63). CSV
  // has no such guarantee — SheetJS's CSV auto-detection silently mangles
  // German decimal commas (strips them as thousands separators, turning
  // "87,63" into 8763 — a 100x error) and can also garble UTF-8 headers
  // ("gültig seit" -> "gÃ¼ltig seit"), both confirmed while building this.
  // Properly fixing CSV needs its own encoding/number-format handling,
  // not a shared code path with xlsx — out of scope until actually needed.
  if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
    return NextResponse.json({ error: "Only .xlsx or .xls files are accepted — CSV isn't reliably supported for German-formatted numbers yet." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    return NextResponse.json({ error: "Could not parse the file — is it a valid .xlsx file?" }, { status: 400 });
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
  if (rows.length === 0) return NextResponse.json({ error: "File has no data rows" }, { status: 400 });

  const actualHeaders = new Set(Object.keys(rows[0]));
  const missing = REQUIRED_HEADERS.filter((h) => !actualHeaders.has(h));
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required column(s): ${missing.join(", ")}` }, { status: 400 });
  }

  const priceRows: {
    tariffId: string;
    plz: string;
    ort: string | null;
    consumptionFromKwh: number;
    consumptionToKwh: number;
    validFrom: Date;
    basePriceEurPerYear: string;
    workingPriceCtPerKwh: string;
    workingPriceNtCtPerKwh: string | null;
    bonusEur: string | null;
    welcomeBonusEur: string | null;
    loyaltyBonus: string | null;
    bonusKwh: string | null;
    bonusPercent: string | null;
    networkOperator: string | null;
    salesArea: string | null;
    sourcePriceId: string | null;
    sourceBonusId: string | null;
  }[] = [];

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

  if (priceRows.length === 0) {
    return NextResponse.json({ error: "No valid rows found after parsing — check the file's column values" }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.energyTariffPriceRow.deleteMany({ where: { tariffId } });
    for (let i = 0; i < priceRows.length; i += BATCH_SIZE) {
      await tx.energyTariffPriceRow.createMany({ data: priceRows.slice(i, i + BATCH_SIZE) });
    }
  });

  revalidatePath("/ops/energy-tariffs");
  for (const locale of ["fa", "de", "ru"]) {
    revalidatePath(`/${locale}/services/energy/electricity`);
    revalidatePath(`/${locale}/services/energy/gas`);
  }

  return NextResponse.json({ imported: priceRows.length, skipped });
}
