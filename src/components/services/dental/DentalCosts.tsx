"use client";

import { useId, useState } from "react";
import { ArrowRight, Info, ArrowsClockwise, CalendarX } from "@phosphor-icons/react";
import type { Locale } from "@/lib/taxonomy";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";

/**
 * Dental page, right after the hero: "what does this treatment cost, and what is left for me?"
 *
 * Owner's decisions (2026-10-23): implant shown as a range (about 3,000 to 3,500 €) with 3,500 € as the worked
 * example; a tap-a-tooth cost map and your-share bars; no insurer names (generic 75 / 90 / 100 % levels, the
 * advisor picks the insurer); a note that first-years limits add up if unused; free consultation at the end.
 *
 * Numbers are examples from insurer brochures (Concordia, Gothaer, Bayerische, DFV, Continentale, Allianz) and
 * the marketing handbook, as of 2026. Percentages are "including the GKV share", as almost all tariffs count it:
 * at 90 % coverage, GKV and the supplementary insurance together pay 90 % of the bill.
 */

type L = Record<Locale, string>;
const t = (fa: string, de: string, ru: string): L => ({ fa, de, ru });

type Kind = "replacement" | "treatment"; // Zahnersatz (levels apply) vs Zahnbehandlung/PZR (most tariffs pay 100 %)

type Treatment = {
  key: string;
  name: L;
  range: [number, number];
  example: number;
  gkv: number;
  kind: Kind;
  teeth: number[]; // which teeth light up on the arch
  note?: L;
};

const TREATMENTS: Treatment[] = [
  {
    key: "implant",
    name: t("ایمپلنت با روکش", "Implantat mit Krone", "Имплант с коронкой"),
    range: [3000, 3500],
    example: 3500,
    gkv: 500,
    kind: "replacement",
    teeth: [8],
    note: t(
      "بیمه پایه برای خود ایمپلنت چیزی نمی‌دهد؛ فقط کمک‌هزینه ثابت روکش روی آن (Festzuschuss).",
      "Für das Implantat selbst zahlt die GKV nichts, nur den Festzuschuss für die Krone darauf.",
      "За сам имплант GKV не платит, только фиксированную доплату за коронку (Festzuschuss).",
    ),
  },
  { key: "crown", name: t("روکش تمام‌سرامیک", "Vollkeramikkrone", "Цельнокерамическая коронка"), range: [700, 1000], example: 1000, gkv: 210, kind: "replacement", teeth: [6] },
  { key: "bridge", name: t("بریج", "Brücke", "Мост"), range: [1400, 2200], example: 2000, gkv: 500, kind: "replacement", teeth: [10, 11, 12] },
  { key: "inlay", name: t("اینله سرامیکی", "Keramik-Inlay", "Керамическая вкладка"), range: [500, 1000], example: 800, gkv: 40, kind: "replacement", teeth: [1] },
  {
    key: "root",
    name: t("درمان ریشه", "Wurzelbehandlung", "Лечение корней"),
    range: [300, 1000],
    example: 1000,
    gkv: 0,
    kind: "treatment",
    teeth: [4],
    note: t(
      "بیمه پایه درمان ریشه ساده را می‌دهد؛ این مثال هزینه‌های خصوصی اضافه است که خودت می‌پردازی.",
      "Die einfache Wurzelbehandlung zahlt die GKV; das Beispiel zeigt die privaten Zusatzkosten.",
      "Простое лечение корней оплачивает GKV; пример показывает частные доплаты.",
    ),
  },
  { key: "filling", name: t("پرکردگی کامپوزیت", "Kompositfüllung", "Композитная пломба"), range: [100, 300], example: 200, gkv: 30, kind: "treatment", teeth: [2] },
  {
    key: "cleaning",
    name: t("جرم‌گیری حرفه‌ای (PZR)", "Professionelle Zahnreinigung", "Профессиональная чистка"),
    range: [80, 150],
    example: 120,
    gkv: 0,
    kind: "treatment",
    teeth: [],
    note: t(
      "بیشتر تعرفه‌ها جرم‌گیری را تا یک سقف سالانه می‌دهند (معمولاً ۸۰ تا ۲۵۰ یورو).",
      "Die meisten Tarife zahlen die Reinigung bis zu einer Jahresgrenze (meist 80 bis 250 €).",
      "Большинство тарифов оплачивают чистку до годового лимита (обычно 80–250 €).",
    ),
  },
];

const COPY = {
  title: t("هزینه درمان دندان در آلمان، و سهم خودت", "Was Zahnbehandlungen kosten und was Sie selbst zahlen", "Сколько стоит лечение зубов и сколько платите вы"),
  body: t(
    "یک درمان را انتخاب کن. می‌بینی بیمه پایه (GKV) معمولاً چقدر می‌دهد و با بیمه تکمیلی چقدر برای خودت می‌ماند.",
    "Wählen Sie eine Behandlung. Sie sehen, was die gesetzliche Kasse meist zahlt und was mit Zahnzusatzversicherung für Sie übrig bleibt.",
    "Выберите лечение и посмотрите, сколько обычно платит GKV и сколько остаётся вам с дополнительной страховкой.",
  ),
  pick: t("درمان را انتخاب کن", "Behandlung wählen", "Выберите лечение"),
  usually: t("معمولاً", "meist", "обычно"),
  to: t("تا", "bis", "–"),
  example: t("مثال برای", "Beispiel für", "Пример для"),
  without: t("بدون بیمه تکمیلی", "Ohne Zusatzversicherung", "Без доп. страховки"),
  level: (p: number): L => t(`با پوشش ${(p).toLocaleString("fa-IR")}٪`, `Mit ${p} % Erstattung`, `С покрытием ${p} %`),
  withIns: t("با بیمه تکمیلی (بیشتر تعرفه‌ها ۱۰۰٪)", "Mit Zusatzversicherung (meist 100 %)", "С доп. страховкой (обычно 100 %)"),
  yourShare: t("سهم تو", "Ihr Anteil", "Ваша часть"),
  gkv: t("بیمه پایه (GKV)", "Gesetzliche Kasse (GKV)", "GKV"),
  ins: t("بیمه تکمیلی", "Zusatzversicherung", "Доп. страховка"),
  you: t("سهم تو", "Ihr Anteil", "Ваша часть"),
  zero: t("هیچ", "nichts", "ничего"),
  goodToKnow: t("خوب است بدانی", "Gut zu wissen", "Полезно знать"),
  notes: [
    {
      icon: "rollover",
      title: t("سقف سال‌های اول جمع می‌شود", "Die Grenzen der ersten Jahre addieren sich", "Лимиты первых лет суммируются"),
      body: t(
        "در بیشتر تعرفه‌ها پرداخت بیمه در سال‌های اول سقف دارد. اگر از سقف یک سال استفاده نکنی، به سقف سال بعد اضافه می‌شود.",
        "In den meisten Tarifen ist die Erstattung in den ersten Jahren begrenzt. Was Sie in einem Jahr nicht nutzen, kommt im nächsten dazu.",
        "В большинстве тарифов выплаты в первые годы ограничены. Неиспользованный лимит переходит на следующий год.",
      ),
    },
    {
      icon: "info",
      title: t("درصد پوشش، با سهم بیمه پایه", "Prozent inklusive GKV-Anteil", "Процент включая долю GKV"),
      body: t(
        "پوشش ۹۰٪ یعنی بیمه پایه و بیمه تکمیلی با هم ۹۰٪ کل هزینه را می‌دهند و ۱۰٪ برای تو می‌ماند.",
        "90 % heißt: Kasse und Zusatzversicherung zahlen zusammen 90 % der Rechnung, 10 % bleiben bei Ihnen.",
        "90 % означает: GKV и доп. страховка вместе платят 90 % счёта, 10 % остаются вам.",
      ),
    },
    {
      icon: "started",
      title: t("درمانی که شروع شده، معمولاً پوشش ندارد", "Begonnene Behandlungen sind meist nicht versichert", "Начатое лечение обычно не покрывается"),
      body: t(
        "اگر دندانپزشک قبل از بیمه شدن درمانی را توصیه یا شروع کرده، بیمه جدید معمولاً آن را نمی‌دهد. قبل از درمان گران با مشاورت هماهنگ کن.",
        "Wurde eine Behandlung vor Versicherungsbeginn angeraten oder begonnen, zahlt der neue Tarif sie meist nicht. Sprechen Sie vor teuren Behandlungen mit uns.",
        "Если лечение посоветовали или начали до страхования, новый тариф его обычно не оплачивает. Перед дорогим лечением посоветуйтесь с нами.",
      ),
    },
  ],
  source: t(
    "اعداد نمونه‌اند، بر اساس بروشور بیمه‌گران و قیمت‌های رایج ۲۰۲۶. هزینه واقعی به طرح درمان (HKP) دندانپزشکت بستگی دارد و سهم بیمه پایه به سابقه Bonusheft.",
    "Beispielwerte aus Versicherer-Broschüren und üblichen Preisen 2026. Die echten Kosten hängen vom Heil- und Kostenplan (HKP) ab, der GKV-Anteil vom Bonusheft.",
    "Примерные значения из брошюр страховщиков и обычных цен 2026 года. Реальная стоимость зависит от плана лечения (HKP), доля GKV — от Bonusheft.",
  ),
  ask: t("سهم خودت را برای شرایطت بپرس", "Für Ihre Situation nachfragen", "Узнать для вашей ситуации"),
};

const money = (n: number, locale: Locale) =>
  locale === "fa" ? `${Math.round(n).toLocaleString("fa-IR")} یورو` : `${Math.round(n).toLocaleString(locale === "de" ? "de-DE" : "ru-RU")} €`;

type Split = { label: string; gkv: number; ins: number; you: number };

function splits(tr: Treatment, locale: Locale): Split[] {
  const rest = tr.example - tr.gkv;
  const rows: Split[] = [{ label: COPY.without[locale], gkv: tr.gkv, ins: 0, you: rest }];
  if (tr.kind === "replacement") {
    for (const p of [75, 90, 100]) {
      const ins = Math.max(0, Math.min(rest, (p / 100) * tr.example - tr.gkv));
      rows.push({ label: COPY.level(p)[locale], gkv: tr.gkv, ins, you: rest - ins });
    }
  } else {
    rows.push({ label: COPY.withIns[locale], gkv: tr.gkv, ins: rest, you: 0 });
  }
  return rows;
}

// --- The tooth arch: an upper jaw seen from below, 14 teeth on an ellipse. Simple geometry, not an illustration:
// incisors small in the middle, molars wider at the ends. The teeth of the chosen treatment light up.
const ARCH = Array.from({ length: 14 }, (_, i) => {
  const theta = Math.PI * (0.94 - (i / 13) * 0.88); // left end → right end over the top
  const cx = 170, cy = 196, rx = 140, ry = 160;
  const x = cx + rx * Math.cos(theta);
  const y = cy - ry * Math.sin(theta);
  const edge = Math.abs(Math.cos(theta)); // 0 at the front, ~1 at the back
  const w = 17 + edge * 13;
  const h = 22 + edge * 6;
  const rotate = (90 - (theta * 180) / Math.PI) * 0.9;
  return { x, y, w, h, rotate };
});

function ToothArch({ active, onPick }: { active: Treatment; onPick: (key: string) => void }) {
  const lit = new Set(active.key === "cleaning" ? ARCH.map((_, i) => i) : active.teeth);
  const owner = new Map<number, string>();
  for (const tr of TREATMENTS) for (const i of tr.teeth) owner.set(i, tr.key);
  return (
    <svg viewBox="0 0 340 210" className="mx-auto w-full max-w-[420px]" aria-hidden="true">
      {/* gum line */}
      <path d={`M 26 200 Q 170 -60 314 200`} fill="none" stroke="var(--color-border-strong)" strokeWidth="26" strokeLinecap="round" opacity="0.35" />
      {ARCH.map((tooth, i) => {
        const on = lit.has(i);
        const implant = i === 8;
        const clickable = owner.has(i);
        return (
          <g
            key={i}
            transform={`translate(${tooth.x.toFixed(1)} ${tooth.y.toFixed(1)}) rotate(${tooth.rotate.toFixed(1)})`}
            onClick={clickable ? () => onPick(owner.get(i)!) : undefined}
            className={clickable ? "cursor-pointer" : undefined}>
            <rect
              x={-tooth.w / 2}
              y={-tooth.h / 2}
              width={tooth.w}
              height={tooth.h}
              rx={tooth.w * 0.38}
              className="transition-[fill,stroke] duration-200 ease-out motion-reduce:transition-none"
              fill={on ? (active.key === "cleaning" ? "#efe3f5" : "var(--color-purple-600)") : "#ffffff"}
              stroke={on ? "var(--color-purple-600)" : "var(--color-border-strong)"}
              strokeWidth={1.6}
              strokeDasharray={implant && !on ? "3 3" : undefined}
            />
            {implant && <line x1={0} y1={-tooth.h / 2 + 5} x2={0} y2={tooth.h / 2 - 5} stroke={on ? "#ffffff" : "var(--color-border-strong)"} strokeWidth={2} strokeLinecap="round" />}
          </g>
        );
      })}
    </svg>
  );
}

function Bar({ row, total, locale }: { row: Split; total: number; locale: Locale }) {
  const pct = (n: number) => (n / total) * 100;
  // Bars start from the reading side: right in Persian, left in German and Russian.
  const side = locale === "fa" ? "right" : "left";
  const seg = "absolute inset-y-0 rounded-[6px] transition-[left,right,width] duration-[450ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none";
  const a = pct(row.gkv);
  const b = pct(row.ins);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-purple-900">{row.label}</span>
        <span className="text-sm text-secondary">
          {COPY.yourShare[locale]}:{" "}
          <b className={`text-base font-extrabold ${row.you > 0 ? "text-purple-900" : "text-success"}`}>{row.you > 0 ? money(row.you, locale) : COPY.zero[locale]}</b>
        </span>
      </div>
      <div className="relative h-4 overflow-hidden rounded-[6px] bg-tint" role="img" aria-label={`${COPY.gkv[locale]} ${money(row.gkv, locale)}، ${COPY.ins[locale]} ${money(row.ins, locale)}، ${COPY.you[locale]} ${money(row.you, locale)}`}>
        <span className={`${seg} bg-border-strong`} style={{ [side]: "0%", width: `${a}%` }} />
        <span className={`${seg} bg-purple-600`} style={{ [side]: `${a}%`, width: `${b}%` }} />
        <span className={`${seg} bg-yellow-500`} style={{ [side]: `${a + b}%`, width: `${100 - a - b}%` }} />
      </div>
    </div>
  );
}

const NOTE_ICON = { rollover: ArrowsClockwise, info: Info, started: CalendarX } as const;

export function DentalCosts({ locale, formId, ctaLabel }: { locale: Locale; formId: string; ctaLabel: string }) {
  const [key, setKey] = useState("implant");
  const active = TREATMENTS.find((x) => x.key === key)!;
  const rows = splits(active, locale);
  const groupId = useId();

  return (
    <section className="border-b border-border bg-white py-14 md:py-20">
      <div className="container-page">
        <div className="max-w-[62ch]">
          <h2 className="text-balance text-2xl font-extrabold leading-snug text-purple-900 md:text-3xl">{COPY.title[locale]}</h2>
          <p className="mt-3 text-base leading-relaxed text-secondary">{COPY.body[locale]}</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12">
          {/* The map: the arch mirrors the choice; the buttons are the real control (keyboard + screen reader). */}
          <div className="rounded-3xl border border-border bg-tint p-6 md:p-8">
            <ToothArch active={active} onPick={setKey} />
            <p id={groupId} className="mt-6 text-sm font-bold text-purple-900">
              {COPY.pick[locale]}
            </p>
            <div role="radiogroup" aria-labelledby={groupId} className="mt-3 flex flex-wrap gap-2">
              {TREATMENTS.map((tr) => {
                const on = tr.key === key;
                return (
                  <button
                    key={tr.key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setKey(tr.key)}
                    className={`press min-h-11 rounded-full border px-4 text-sm transition-colors duration-150 ${on ? "border-purple-900 bg-purple-900 font-bold text-white" : "border-border-strong bg-white font-medium text-purple-900 hover:border-purple-600"}`}>
                    {tr.name[locale]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* The answer for the chosen treatment. */}
          <div className="flex flex-col gap-6" aria-live="polite">
            <div>
              <p className="text-2xl font-extrabold text-purple-900">{active.name[locale]}</p>
              <p className="mt-1 text-base text-secondary">
                {COPY.usually[locale]} <b className="font-bold text-purple-900">{money(active.range[0], locale).replace(/ ?(یورو|€)$/, "")}</b> {COPY.to[locale]}{" "}
                <b className="font-bold text-purple-900">{money(active.range[1], locale)}</b>
              </p>
            </div>

            <div className="rounded-3xl border border-border p-6 shadow-[0_10px_30px_-22px_rgba(93,0,137,0.45)] md:p-7">
              <p className="text-sm font-semibold text-secondary">
                {COPY.example[locale]} {money(active.example, locale)}
              </p>
              <div className="mt-5 space-y-5">
                {rows.map((row) => (
                  <Bar key={row.label} row={row} total={active.example} locale={locale} />
                ))}
              </div>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-secondary" aria-hidden="true">
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-border-strong" />{COPY.gkv[locale]}</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-purple-600" />{COPY.ins[locale]}</li>
                <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-yellow-500" />{COPY.you[locale]}</li>
              </ul>
              {active.note && <p className="mt-4 text-sm leading-relaxed text-body">{active.note[locale]}</p>}
            </div>

            <ConsultationCtaLink
              href={`#${formId}`}
              className="press inline-flex min-h-12 items-center gap-2 self-start rounded-full bg-purple-600 px-7 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
              {ctaLabel}
              <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
            </ConsultationCtaLink>
          </div>
        </div>

        <div className="mt-14">
          <h3 className="text-lg font-extrabold text-purple-900">{COPY.goodToKnow[locale]}</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {COPY.notes.map((n) => {
              const Icon = NOTE_ICON[n.icon as keyof typeof NOTE_ICON];
              return (
                <div key={n.icon} className="rounded-2xl bg-tint p-5">
                  <Icon size={22} weight="duotone" className="text-purple-600" />
                  <p className="mt-3 text-sm font-bold text-purple-900">{n.title[locale]}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-secondary">{n.body[locale]}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-6 max-w-[80ch] text-xs leading-relaxed text-secondary">{COPY.source[locale]}</p>
        </div>
      </div>
    </section>
  );
}
