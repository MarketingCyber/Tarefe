import { NextResponse } from "next/server";
import { getAppUser, type AppUser } from "@/lib/app-auth";
import { TAXONOMY, byLocale, type Locale } from "@/lib/taxonomy";

/**
 * OWNER'S RULE (2026-10-23): the app never shows the website's energy tariffs (EnergyTariff /
 * EnergyTariffPriceRow). Those are marketing tariffs for the website with little margin. Offers in the app are
 * the advisor's personal offers for one customer (an "Angebot" in the CRM), sent in the contract conversation.
 * No /api/v1 route may read the tariff tables.
 *
 * Shared pieces of the mobile app API (/api/v1/*): JSON responses, errors, auth, and the small mappings
 * the app needs (service names from the website taxonomy, request status steps, request topics).
 * Every response is private and never cached — it's one customer's data.
 */

const NO_STORE = { "Cache-Control": "private, no-store" };

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: NO_STORE });
}

export function fail(status: number, code: string, message?: string) {
  return NextResponse.json({ error: { code, message: message ?? code } }, { status, headers: NO_STORE });
}

/** The signed-in customer, or a 401 response to return as-is. */
export async function requireUser(request: Request): Promise<AppUser | NextResponse> {
  const user = await getAppUser(request);
  return user ?? fail(401, "unauthorized", "Sign in again");
}

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as T) : null;
  } catch {
    return null;
  }
}

export const isLocale = (v: unknown): v is Locale => v === "fa" || v === "de" || v === "ru";

/** Which part of the taxonomy a contract belongs to, from its category (top-level or any deeper slug). */
export type ServiceKind = "energy" | "insurance" | "retirement" | "other";

type Hit = { kind: ServiceKind; title: Parameters<typeof byLocale>[1] };

function findInTaxonomy(slug: string): Hit | null {
  for (const cat of TAXONOMY) {
    const kind = (["energy", "insurance", "retirement"].includes(cat.slug) ? cat.slug : "other") as ServiceKind;
    if (cat.slug === slug) return { kind, title: cat.title };
    for (const sub of cat.subcategories) {
      if (sub.slug === slug) return { kind, title: sub.title };
      for (const pt of sub.productTypes) if (pt.slug && pt.slug === slug) return { kind, title: pt.title };
    }
  }
  return null;
}

export function describeService(category: string, locale: Locale): { kind: ServiceKind; serviceName: string } {
  const hit = findInTaxonomy(category);
  if (hit) return { kind: hit.kind, serviceName: byLocale(locale, hit.title) };
  const lower = category.toLowerCase();
  const kind: ServiceKind = lower.includes("energy") || lower.includes("strom") || lower.includes("gas") ? "energy" : lower.includes("insur") || lower.includes("versich") ? "insurance" : "other";
  return { kind, serviceName: category };
}

/** Initials used as a stand-in logo until providers have real logos in the database. */
export function providerInitials(provider: string): string {
  const words = provider.normalize("NFD").replace(/[^A-Za-z0-9 .-]/g, "").split(/[\s.-]+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map((w) => w[0]).join("").toUpperCase() || provider.slice(0, 2).toUpperCase();
}

/** Request (ticket) status shown to customers as three steps: registered, in progress, done. */
export function requestStep(status: string): 0 | 1 | 2 {
  if (status === "RECEIVED") return 0;
  if (status === "COMPLETED") return 2;
  return 1;
}

export const ticketNumber = (id: string) => "T-" + id.slice(-6).toUpperCase();

type TopicKey = string;
const T = (fa: string, de: string, ru: string) => ({ fa, de, ru });

/** Request topics per kind of contract (owner's design, 2026-10-23). The key is stored as subjectType. */
export const REQUEST_TOPICS: Record<ServiceKind | "general", { key: TopicKey; label: Record<Locale, string> }[]> = {
  energy: [
    { key: "cancellation", label: T("فسخ یا تغییر تعرفه", "Kündigen oder Tarif wechseln", "Расторгнуть или сменить тариф") },
    { key: "invoice_question", label: T("سوال درباره صورت‌حساب", "Frage zur Rechnung", "Вопрос по счёту") },
    { key: "address_change", label: T("اسباب‌کشی و تغییر آدرس", "Umzug und Adressänderung", "Переезд и смена адреса") },
    { key: "other", label: T("سایر", "Sonstiges", "Другое") },
  ],
  insurance: [
    { key: "claim_report", label: T("ثبت خسارت یا هزینه درمان", "Schaden oder Behandlungskosten melden", "Заявить ущерб или расходы на лечение") },
    { key: "coverage_question", label: T("سوال درباره پوشش", "Frage zum Versicherungsschutz", "Вопрос о покрытии") },
    { key: "cancellation", label: T("فسخ یا تغییر بیمه", "Kündigen oder ändern", "Расторгнуть или изменить") },
    { key: "other", label: T("سایر", "Sonstiges", "Другое") },
  ],
  retirement: [
    { key: "contribution_change", label: T("تغییر مبلغ پرداخت", "Beitrag ändern", "Изменить взнос") },
    { key: "coverage_question", label: T("سوال درباره طرح", "Frage zum Vertrag", "Вопрос по договору") },
    { key: "other", label: T("سایر", "Sonstiges", "Другое") },
  ],
  other: [
    { key: "general_question", label: T("سوال درباره قرارداد", "Frage zum Vertrag", "Вопрос по договору") },
    { key: "cancellation", label: T("فسخ", "Kündigung", "Расторжение") },
    { key: "other", label: T("سایر", "Sonstiges", "Другое") },
  ],
  general: [
    { key: "new_service", label: T("مشاوره برای خدمت جدید", "Beratung zu einem neuen Angebot", "Консультация по новой услуге") },
    { key: "general_question", label: T("سوال کلی", "Allgemeine Frage", "Общий вопрос") },
    { key: "other", label: T("سایر", "Sonstiges", "Другое") },
  ],
};

export const STATUS_WORDS: Record<0 | 1 | 2, Record<Locale, string>> = {
  0: T("ثبت شد", "Eingegangen", "Принят"),
  1: T("در حال انجام", "In Bearbeitung", "В работе"),
  2: T("انجام شد", "Erledigt", "Выполнен"),
};
