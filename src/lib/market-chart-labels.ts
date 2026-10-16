import type { LocalizedText } from "./taxonomy";
import type { Commodity, Preset } from "./market-series";

/**
 * Copy for the live wholesale-price chart (MarketPriceChart). Persian is the
 * master text; German and Russian follow the same structure.
 *
 * What this chart is NOT: a tariff price. Both feeds are wholesale prices
 * without taxes, levies and grid fees, so every version of the subtitle says
 * so in its first sentence — the Preisgarantie callout it sits in is about the
 * visitor's own fixed price, and the chart must never be read as an offer.
 */
const t = (fa: string, de: string, ru: string): LocalizedText => ({ fa, de, ru });

export interface MarketChartLabels {
  title: LocalizedText;
  subtitle: LocalizedText;
  presets: Record<Preset, LocalizedText>;
  /** Names for what one point of the chart is, for the tooltip. */
  perPoint: Record<Preset, LocalizedText>;
  latest: LocalizedText;
  average: LocalizedText;
  change: LocalizedText;
  highest: LocalizedText;
  lowest: LocalizedText;
  toDate: LocalizedText;
  sourceLead: LocalizedText;
  loading: LocalizedText;
  table: LocalizedText;
  unitName: LocalizedText;
  periodChange: Record<Preset, LocalizedText>;
}

const COMMON = {
  presets: {
    monthly: t("ماهانه", "Monatlich", "По месяцам"),
    weekly: t("هفتگی", "Wöchentlich", "По неделям"),
    daily: t("روزانه", "Täglich", "По дням"),
  },
  perPoint: {
    monthly: t("میانگین ماه", "Monatsdurchschnitt", "Среднее за месяц"),
    weekly: t("میانگین هفته", "Wochendurchschnitt", "Среднее за неделю"),
    daily: t("میانگین روز", "Tagesdurchschnitt", "Среднее за день"),
  },
  periodChange: {
    monthly: t("نسبت به ۲۴ ماه پیش", "ggü. vor 24 Monaten", "к 24 месяцам назад"),
    weekly: t("نسبت به ۵۲ هفته پیش", "ggü. vor 52 Wochen", "к 52 неделям назад"),
    daily: t("نسبت به ۹۰ روز پیش", "ggü. vor 90 Tagen", "к 90 дням назад"),
  },
  average: t("میانگین دوره", "Ø im Zeitraum", "Среднее за период"),
  change: t("تغییر", "Veränderung", "Изменение"),
  highest: t("بالاترین", "Höchster", "Максимум"),
  lowest: t("پایین‌ترین", "Niedrigster", "Минимум"),
  toDate: t("تا امروز", "bisher", "на сегодня"),
  loading: t("در حال بارگذاری نمودار…", "Diagramm wird geladen …", "Загрузка графика…"),
  table: t("جدول داده‌ها", "Datentabelle", "Таблица данных"),
  unitName: t("سنت بر کیلووات‌ساعت", "Cent pro kWh", "цент за кВт·ч"),
};

export const MARKET_LABELS: Record<Commodity, MarketChartLabels> = {
  electricity: {
    ...COMMON,
    title: t("قیمت برق در بازار عمده", "Börsenstrompreis in Deutschland", "Биржевая цена электроэнергии в Германии"),
    subtitle: t(
      "میانگین قیمت Day-Ahead بورس برق آلمان، بدون مالیات و هزینه‌های شبکه. این قیمت تعرفه تو نیست؛ نشان می‌دهد بازار چقدر بالا و پایین می‌شود.",
      "Durchschnittlicher Day-Ahead-Preis an der deutschen Strombörse, ohne Steuern und Netzentgelte. Das ist nicht Ihr Tarifpreis – es zeigt, wie stark der Markt schwankt.",
      "Средняя цена Day-Ahead на немецкой электробирже, без налогов и сетевых сборов. Это не цена вашего тарифа – график показывает, как сильно колеблется рынок."
    ),
    latest: t("آخرین قیمت", "Letzter Preis", "Последняя цена"),
    sourceLead: t("منبع", "Quelle", "Источник"),
  },
  gas: {
    ...COMMON,
    title: t("قیمت گاز در بازار عمده", "Erdgas-Großhandelspreis", "Оптовая цена газа"),
    subtitle: t(
      "قیمت مرجع TTF اروپا که بازار آلمان (THE) از آن پیروی می‌کند، بدون مالیات و هزینه‌های شبکه. این قیمت تعرفه تو نیست؛ نشان می‌دهد بازار چقدر بالا و پایین می‌شود.",
      "Europäischer TTF-Referenzpreis, dem der deutsche Markt (THE) folgt, ohne Steuern und Netzentgelte. Das ist nicht Ihr Tarifpreis – es zeigt, wie stark der Markt schwankt.",
      "Европейская эталонная цена TTF, за которой следует немецкий рынок (THE), без налогов и сетевых сборов. Это не цена вашего тарифа – график показывает, как сильно колеблется рынок."
    ),
    latest: t("آخرین قیمت", "Letzter Preis", "Последняя цена"),
    sourceLead: t("منبع", "Quelle", "Источник"),
  },
};
