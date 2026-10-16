import type { LocalizedText } from "./taxonomy";
import type { Commodity } from "./market-series";

/**
 * Copy for the live wholesale-price chart (MarketPriceChart). Persian is the
 * master text; German and Russian follow the same structure.
 *
 * What this chart is NOT: a tariff price. Both feeds are wholesale prices
 * without taxes, levies and grid fees, so the subtitle says so — the
 * Preisgarantie card it sits in is about the visitor's own fixed price, and
 * the chart must never be read as an offer.
 */
const t = (fa: string, de: string, ru: string): LocalizedText => ({ fa, de, ru });

export interface MarketChartLabels {
  title: LocalizedText;
  subtitle: LocalizedText;
  latest: LocalizedText;
  monthlyChange: LocalizedText;
  /** Small print under the monthly change: what is compared with what. */
  monthlyChangeNote: LocalizedText;
  /** Tooltip line: what one point on the chart is. */
  monthAverage: LocalizedText;
  toDate: LocalizedText;
  sourceLead: LocalizedText;
  loading: LocalizedText;
  table: LocalizedText;
  unitName: LocalizedText;
  /** Headline when the 12-month change is clearly upward. `{p}` is replaced with the percentage. */
  risen: LocalizedText;
  /** Headline when it is not (flat or falling) — never claims a rise the data does not show. */
  swings: LocalizedText;
  /** The point of the section: the guarantee holds whatever the market does. Conditional, never a forecast. */
  guarantee: LocalizedText;
}

const COMMON = {
  monthlyChange: t("تغییر ماهانه", "Monatsänderung", "Изменение за месяц"),
  monthlyChangeNote: t("میانگین این ماه تا امروز نسبت به ماه قبل", "Ø dieser Monat bisher ggü. Vormonat", "среднее за этот месяц к прошлому"),
  monthAverage: t("میانگین ماه", "Monatsdurchschnitt", "Среднее за месяц"),
  toDate: t("تا امروز", "bisher", "на сегодня"),
  sourceLead: t("منبع", "Quelle", "Источник"),
  loading: t("در حال بارگذاری نمودار…", "Diagramm wird geladen …", "Загрузка графика…"),
  table: t("جدول داده‌ها", "Datentabelle", "Таблица данных"),
  unitName: t("سنت بر کیلووات‌ساعت", "Cent pro kWh", "цент за кВт·ч"),
  latest: t("قیمت فعلی", "Aktueller Preis", "Текущая цена"),
  swings: t("قیمت بازار مدام بالا و پایین می‌شود", "Der Marktpreis schwankt ständig", "Рыночная цена постоянно колеблется"),
  guarantee: t(
    "با Preisgarantie قیمت تو تا پایان دوره قرارداد ثابت می‌ماند، حتی اگر قیمت‌ها در سال آینده بالاتر بروند.",
    "Mit der Preisgarantie bleibt Ihr Preis bis zum Ende der Vertragslaufzeit gleich, auch wenn die Preise im nächsten Jahr weiter steigen.",
    "С Preisgarantie ваша цена остаётся прежней до конца срока договора, даже если в следующем году цены вырастут ещё больше."
  ),
};

export const MARKET_LABELS: Record<Commodity, MarketChartLabels> = {
  electricity: {
    ...COMMON,
    risen: t("قیمت برق در بازار در ۱۲ ماه گذشته {p}٪ بالا رفته", "Der Strompreis an der Börse ist in den letzten 12 Monaten um {p} % gestiegen", "Цена электроэнергии на бирже за последние 12 месяцев выросла на {p} %"),
    title: t("قیمت برق در بازار عمده", "Börsenstrompreis in Deutschland", "Биржевая цена электроэнергии в Германии"),
    subtitle: t(
      "میانگین ماهانه قیمت بورس برق آلمان، بدون مالیات و هزینه شبکه. قیمت تعرفه تو نیست.",
      "Monatsdurchschnitt an der deutschen Strombörse, ohne Steuern und Netzentgelte. Nicht Ihr Tarifpreis.",
      "Среднемесячная цена на немецкой электробирже, без налогов и сетевых сборов. Не цена вашего тарифа."
    ),
  },
  gas: {
    ...COMMON,
    risen: t("قیمت گاز در بازار در ۱۲ ماه گذشته {p}٪ بالا رفته", "Der Gaspreis im Großhandel ist in den letzten 12 Monaten um {p} % gestiegen", "Оптовая цена газа за последние 12 месяцев выросла на {p} %"),
    title: t("قیمت گاز در بازار عمده", "Erdgas-Großhandelspreis", "Оптовая цена газа"),
    subtitle: t(
      "میانگین ماهانه قیمت مرجع TTF اروپا که بازار آلمان از آن پیروی می‌کند، بدون مالیات و هزینه شبکه. قیمت تعرفه تو نیست.",
      "Monatsdurchschnitt des europäischen TTF-Referenzpreises, dem der deutsche Markt folgt, ohne Steuern und Netzentgelte. Nicht Ihr Tarifpreis.",
      "Среднемесячная эталонная цена TTF, за которой следует немецкий рынок, без налогов и сетевых сборов. Не цена вашего тарифа."
    ),
  },
};
