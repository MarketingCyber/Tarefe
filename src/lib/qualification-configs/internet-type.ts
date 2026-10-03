import type { QualificationConfig } from "../qualification-types";

// Not a per-connection-type wizard (there's no honest way to fabricate
// address-level fiber/cable availability without real geodata Tarefe
// doesn't have) — instead this helps someone choose WHICH of the four real
// connection types (fiber/DSL/cable/5G-home) to even look at, using only
// things the person already knows about their own situation: whether
// fiber is confirmed available, what's already wired into the building,
// and whether speed or price matters more. Every outcome still routes to
// a real PLP, never a fabricated "you qualify for X price" claim.
export const INTERNET_TYPE_QUALIFICATION: QualificationConfig = {
  id: "internet-type",
  title: {
    fa: "کدام نوع اینترنت برای تو مناسب‌تر است؟",
    de: "Welche Internet-Art passt zu Ihnen?",
    ru: "Какой тип интернета вам подходит?",
  },
  questions: [
    {
      id: "fiber_known",
      type: "radio",
      question: {
        fa: "آیا می‌دانی اینترنت فیبر نوری (Glasfaser) در آدرست موجود است؟",
        de: "Wissen Sie, ob an Ihrer Adresse Glasfaser verfügbar ist?",
        ru: "Знаете ли вы, доступно ли оптоволокно по вашему адресу?",
      },
      required: true,
      options: [
        { value: "yes", label: { fa: "بله، فیبر موجود است", de: "Ja, Glasfaser ist verfügbar", ru: "Да, оптоволокно доступно" } },
        { value: "unsure", label: { fa: "نمی‌دانم", de: "Ich weiß es nicht", ru: "Не знаю" } },
        { value: "no", label: { fa: "خیر، فیبر موجود نیست", de: "Nein, kein Glasfaser verfügbar", ru: "Нет, оптоволокно недоступно" } },
      ],
    },
    {
      id: "existing_wiring",
      type: "radio",
      showIf: (a) => a.fiber_known !== "yes",
      question: {
        fa: "در حال حاضر کدام‌یک در ساختمانت فعال یا نصب‌شده است؟",
        de: "Was ist in Ihrem Gebäude bereits vorhanden oder angeschlossen?",
        ru: "Что уже подключено или установлено в вашем здании?",
      },
      required: true,
      options: [
        { value: "phone_line", label: { fa: "خط تلفن ثابت", de: "Festnetz-Telefonleitung", ru: "Стационарная телефонная линия" } },
        { value: "cable_tv", label: { fa: "کابل تلویزیون", de: "TV-Kabelanschluss", ru: "Кабельное ТВ" } },
        { value: "neither", label: { fa: "هیچ‌کدام / نمی‌دانم", de: "Keins von beidem / weiß nicht", ru: "Ничего из этого / не знаю" } },
      ],
    },
    {
      id: "priority",
      type: "radio",
      question: {
        fa: "چه چیزی برایت مهم‌تر است؟",
        de: "Was ist Ihnen wichtiger?",
        ru: "Что для вас важнее?",
      },
      required: true,
      options: [
        { value: "speed", label: { fa: "سرعت بالا", de: "Hohe Geschwindigkeit", ru: "Высокая скорость" } },
        { value: "price", label: { fa: "قیمت پایین", de: "Niedriger Preis", ru: "Низкая цена" } },
        { value: "either", label: { fa: "فرقی نمی‌کند", de: "Egal", ru: "Не важно" } },
      ],
    },
  ],
  outcomes: [
    {
      match: (a) => a.fiber_known === "yes",
      result: "eligible",
      message: {
        fa: "چون فیبر نوری در آدرست موجود است، این معمولاً سریع‌ترین و پایدارترین گزینه است.",
        de: "Da an Ihrer Adresse Glasfaser verfügbar ist, ist das meist die schnellste und stabilste Option.",
        ru: "Поскольку оптоволокно доступно по вашему адресу, это обычно самый быстрый и стабильный вариант.",
      },
      ctaHref: "/services/communication/internet/fiber",
      ctaLabel: { fa: "مشاهده تعرفه‌های فیبر نوری", de: "Glasfaser-Tarife ansehen", ru: "Смотреть тарифы на оптоволокно" },
    },
    {
      match: (a) => a.existing_wiring === "cable_tv",
      result: "eligible",
      message: {
        fa: "چون کابل تلویزیون در ساختمانت فعال است، اینترنت کابلی معمولاً بدون نیاز به کابل‌کشی جدید و با سرعت خوب قابل‌نصب است.",
        de: "Da bereits ein TV-Kabelanschluss vorhanden ist, lässt sich Kabel-Internet meist ohne neue Verkabelung und mit guter Geschwindigkeit einrichten.",
        ru: "Поскольку кабельное ТВ уже подключено, кабельный интернет обычно можно установить без новой проводки и с хорошей скоростью.",
      },
      ctaHref: "/services/communication/internet/cable",
      ctaLabel: { fa: "مشاهده تعرفه‌های اینترنت کابلی", de: "Kabel-Internet-Tarife ansehen", ru: "Смотреть тарифы на кабельный интернет" },
    },
    {
      match: (a) => a.existing_wiring === "phone_line",
      result: "eligible",
      message: {
        fa: "چون خط تلفن ثابت در ساختمانت فعال است، DSL معمولاً سریع‌ترین راه برای اتصال بدون سیم‌کشی جدید است.",
        de: "Da bereits eine Telefonleitung vorhanden ist, ist DSL meist der schnellste Weg zu einem Anschluss ohne neue Verkabelung.",
        ru: "Поскольку телефонная линия уже есть, DSL обычно самый быстрый способ подключения без новой проводки.",
      },
      ctaHref: "/services/communication/internet/dsl",
      ctaLabel: { fa: "مشاهده تعرفه‌های DSL", de: "DSL-Tarife ansehen", ru: "Смотреть тарифы DSL" },
    },
    {
      match: (a) => a.priority === "speed",
      result: "conditional",
      message: {
        fa: "چون نه فیبر و نه سیم‌کشی مشخصی در دسترس نیست، بهترین گزینه برای شروع سریع، اینترنت خانگی ۵G است — بدون نیاز به هیچ سیم‌کشی.",
        de: "Da weder Glasfaser noch eine bestehende Verkabelung vorhanden ist, ist 5G-Heiminternet meist die schnellste Lösung ohne jede Verkabelung.",
        ru: "Поскольку ни оптоволокна, ни существующей проводки нет, домашний 5G-интернет — обычно самое быстрое решение без какой-либо проводки.",
      },
      ctaHref: "/services/communication/internet/5g-home",
      ctaLabel: { fa: "مشاهده اینترنت خانگی ۵G", de: "5G-Homespot ansehen", ru: "Смотреть домашний 5G" },
    },
    {
      match: () => true,
      result: "conditional",
      message: {
        fa: "بر اساس پاسخ‌هایت، برای پیدا کردن دقیق‌ترین گزینه بهتر است با یک مشاور صحبت کنی تا امکانات واقعی آدرست را بررسی کند.",
        de: "Basierend auf Ihren Antworten sprechen Sie am besten mit einem Berater, der die tatsächliche Verfügbarkeit an Ihrer Adresse prüft.",
        ru: "На основе ваших ответов лучше всего поговорить с консультантом, который проверит реальную доступность по вашему адресу.",
      },
    },
  ],
};
