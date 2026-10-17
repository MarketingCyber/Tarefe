import {
  CheckCircle,
  WhatsappLogo,
  ArrowRight,
  ChatCircleText,
  ShieldCheck,
  ClipboardText,
  HandHeart,
  Handshake,
  Users,
  Headset,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { byLocale, type Category, type Subcategory, type ProductType, type Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { KNOWN_TARIFFS } from "@/lib/pdp-data";
import { getPdpContent, WHY_TAREFE, PROCESS_STEPS, WHY_NOT_DIY, PDP_FAQ_ITEMS } from "@/lib/pdp-content";
import { getSubcategoryImage } from "@/lib/pdp-images";
import { CategoryHeroFrame } from "@/components/services/pdp/CategoryHeroFrame";
import { CATEGORY_ICON, categoryHeadingTracking } from "@/lib/category-theme";
import { EnergyModuleView } from "@/components/products/pdp/EnergyModuleView";
import { DentalModuleView } from "@/components/products/pdp/DentalModuleView";
import { CoverageAccordion } from "@/components/services/pdp/CoverageAccordion";
import { FaqAccordion } from "@/components/services/pdp/FaqAccordion";
import { Reveal } from "@/components/shared/Reveal";
import { EnergyConsumptionCalculator } from "@/components/products/EnergyConsumptionCalculator";
import { StickyConsultationCta } from "@/components/conversion/StickyConsultationCta";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";

const MODULE_TITLE: Record<Locale, Record<"energy" | "dental", string>> = {
  fa: { energy: "به‌عنوان نمونه، تعرفه واقعی این بازار", dental: "به‌عنوان نمونه، یک پوشش واقعی در بازار" },
  de: { energy: "Als Beispiel: ein echter Markttarif", dental: "Als Beispiel: ein echter Marktschutz" },
  ru: { energy: "Например: реальный тариф на рынке", dental: "Например: реальное покрытие на рынке" },
};

const FORM_ID = "pdp-lead-form";

// WHY_TAREFE's items are icon-agnostic in pdp-content.ts (shared with
// PlpView, which doesn't necessarily want the same visual treatment) —
// this page's own icon choice per item, keyed the same way.
const WHY_TAREFE_ICON: Record<string, PhosphorIcon> = { compare: Handshake, human: ChatCircleText, dedicated: Users, admin: ClipboardText, support: HandHeart };

export function PdpView({
  locale,
  dict,
  category,
  subcategory,
  productType,
  pdpSlug,
}: {
  locale: Locale;
  dict: Dictionary;
  category: Category;
  subcategory: Subcategory;
  productType: ProductType;
  pdpSlug: string;
}) {
  const known = KNOWN_TARIFFS[pdpSlug];
  const content = getPdpContent(category.slug, subcategory.slug, productType.slug);
  const parentTitle = productType.slug ? byLocale(locale, productType.title) : byLocale(locale, subcategory.title);
  const heroImage = getSubcategoryImage(category.slug, subcategory.slug);
  const CategoryIcon = CATEGORY_ICON[category.slug] ?? CATEGORY_ICON.insurance;

  // Only emit Product schema when real price data exists — fabricating
  // Offer/price structured data for the generic fallback pages would be
  // exactly the kind of dishonest markup Google penalizes.
  const productJsonLd = known
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${known.provider} ${known.name}`,
        brand: { "@type": "Brand", name: known.provider },
        offers: { "@type": "Offer", price: known.monthlyPrice.replace(/[^\d.,]/g, ""), priceCurrency: "EUR", availability: "https://schema.org/InStock" },
      }
    : null;

  return (
    <div className="pb-24 sm:pb-0">
      {/* 01 — Hero: a need/problem framing, not a price tag. Whether or not
          pdpSlug happens to have a real provider tariff behind it, this
          page's job is "help someone decide this category is relevant to
          them," not "sell this one specific plan." Two-column with a real
          photo now (was text-only before this round) — same grid shape as
          PlpView.tsx/the homepage Hero.tsx, one verified photo per
          subcategory (see pdp-images.ts). */}
      <section className="border-b border-border bg-tint">
        <div className={`container-page grid items-center gap-10 py-12 md:py-16 ${heroImage ? "md:grid-cols-2" : ""}`}>
          <div>
            <Reveal>
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white px-2.5 py-0.5 text-[11px] font-semibold text-purple-600">
                <CategoryIcon size={12} weight="fill" />
                {byLocale(locale, category.title)}
              </span>
              <p className="text-sm font-medium text-secondary">{parentTitle}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className={`mt-1.5 max-w-[24ch] text-3xl font-extrabold text-purple-900 md:text-4xl ${categoryHeadingTracking(category.slug)}`}>{parentTitle}</h1>
            </Reveal>
            <Reveal delay={0.16}>
              {content?.germanTerm && <p className="font-latin mt-1.5 text-sm text-secondary">{content.germanTerm}</p>}
              <p className="mt-3 max-w-[56ch] text-secondary">{byLocale(locale, productType.description)}</p>
            </Reveal>

            <Reveal delay={0.24}>
              <div className="mt-6 flex flex-wrap gap-3">
                <ConsultationCtaLink href={`#${FORM_ID}`} className="press inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
                  {dict.cta.freeConsultation}
                  <ArrowRight size={15} weight="bold" className="rtl:rotate-180" />
                </ConsultationCtaLink>
                <a
                  href="https://wa.me/4915224318691"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press inline-flex items-center gap-2 rounded-full border border-border-strong bg-white px-6 py-3 text-sm font-semibold text-purple-900"
                >
                  <WhatsappLogo size={16} weight="fill" />
                  {dict.cta.whatsappConsultation}
                </a>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
                {dict.home.heroTrust.map((claim) => (
                  <li key={claim} className="flex items-center gap-1.5 text-xs font-medium text-secondary">
                    <CheckCircle size={13} weight="fill" className="shrink-0 text-success" />
                    {claim}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {heroImage && (
            <Reveal delay={0.12} className="order-first md:order-none">
              <CategoryHeroFrame categorySlug={category.slug} image={heroImage} />
            </Reveal>
          )}
        </div>
      </section>

      {/* 02 — What exactly is this service? Heavier type than the sections
          below it — this and 03 are the page's actual substance. */}
      {content?.whatItIs && (
        <section className="container-page py-14">
          <Reveal>
            <h2 className="max-w-[28ch] text-xl font-bold text-purple-900 md:text-2xl">
              {byLocale(locale, { fa: `${parentTitle} دقیقاً چیست؟`, de: `Was genau ist ${parentTitle}?`, ru: `Что такое «${parentTitle}»?` })}
            </h2>
            <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-secondary">{byLocale(locale, content.whatItIs)}</p>
          </Reveal>
        </section>
      )}

      {/* 03 — Benefits: the most important section on the page. Falls
          back to the taxonomy's own description when no bespoke benefit
          list exists yet for this specific product. */}
      <section className={`py-14 ${content?.whatItIs ? "border-t border-border bg-tint" : ""}`}>
        <div className="container-page">
          <Reveal>
            <h2 className="text-xl font-bold text-purple-900 md:text-2xl">{byLocale(locale, { fa: "چه مزایایی دارد؟", de: "Welche Vorteile bietet es?", ru: "Какие у этого преимущества?" })}</h2>
            {content?.benefits && content.benefits.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {content.benefits.map((b) => (
                  <div key={b.title.fa} className="rounded-2xl border border-border bg-white p-5">
                    <p className="text-sm font-semibold text-purple-900">{byLocale(locale, b.title)}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-secondary">{byLocale(locale, b.body)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 max-w-[60ch] text-sm text-secondary">{byLocale(locale, productType.description)}</p>
            )}
          </Reveal>
        </div>
      </section>

      {/* 04 — Coverage/consumption, never price-as-headline. Electricity
          and gas get the real calculator (their actual value prop, per
          the agreed split); everything else gets the coverage
          accordion — plus, when a real provider tariff exists for this
          exact pdpSlug, its specific numbers shown honestly as one real
          example, not a category-wide claim. */}
      {content?.hasCalculator && (subcategory.slug === "electricity" || subcategory.slug === "gas") ? (
        <section className="container-page py-12">
          <Reveal>
            <EnergyConsumptionCalculator
              locale={locale}
              kind={subcategory.slug}
              consultationHref={`#${FORM_ID}`}
              tariffs={
                known && known.module.kind === "energy"
                  ? [
                      {
                        id: pdpSlug,
                        provider: known.provider,
                        name: known.name,
                        workingPriceCtPerKwh: known.module.workingPriceCtPerKwh,
                        basePriceEurPerYear: known.module.basePriceEurPerYear,
                        bonusEur: known.module.bonusEur,
                        priceGuaranteeMonths: known.module.priceGuaranteeMonths,
                        highlight: null,
                      },
                    ]
                  : []
              }
            />
          </Reveal>
        </section>
      ) : content?.coverageGroups && content.coverageGroups.length > 0 ? (
        <section className="container-page py-12">
          <Reveal>
            <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "پوشش‌ها و خدمات را بهتر بشناس", de: "Lernen Sie die Leistungen genauer kennen", ru: "Узнайте больше о покрытии и услугах" })}</h2>
            <div className="mt-6">
              <CoverageAccordion locale={locale} groups={content.coverageGroups} />
            </div>
          </Reveal>
        </section>
      ) : null}

      {known && (
        <section className="container-page pb-12">
          <Reveal>
            <h2 className="mb-5 text-sm font-bold text-secondary">{MODULE_TITLE[locale][known.module.kind]}</h2>
            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="font-latin mb-4 text-sm font-semibold text-purple-900">
                {known.provider} {known.name}
              </p>
              {known.module.kind === "energy" && <EnergyModuleView locale={locale} module={known.module} />}
              {known.module.kind === "dental" && <DentalModuleView locale={locale} module={known.module} />}
            </div>
          </Reveal>
        </section>
      )}

      {/* 05 — Is this for me? The visitor needs to find themselves on the
          page, and — just as important — not feel shut out if they
          don't recognize themselves in the list. */}
      {content?.goodFitFor && content.goodFitFor.length > 0 && (
        <section className="border-t border-border bg-tint py-12">
          <div className="container-page">
            <Reveal>
              <h2 className="text-lg font-bold text-purple-900">
                {byLocale(locale, { fa: `${parentTitle} برای چه کسانی مناسب است؟`, de: `Für wen eignet sich ${parentTitle}?`, ru: `Кому подходит «${parentTitle}»?` })}
              </h2>
              <ul className="mt-5 grid max-w-2xl gap-2.5">
                {content.goodFitFor.map((fit) => (
                  <li key={fit.fa} className="flex items-start gap-2.5 text-sm text-body">
                    <CheckCircle size={16} weight="fill" className="mt-0.5 shrink-0 text-success" />
                    {byLocale(locale, fit)}
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[56ch] text-sm text-secondary">
                {byLocale(locale, {
                  fa: "اگر شرایطت متفاوت است، جای نگرانی نیست — مشاور ما شرایطت را بررسی می‌کند.",
                  de: "Wenn Ihre Situation anders ist, kein Problem — unser Berater prüft das mit Ihnen.",
                  ru: "Если ваша ситуация другая — не проблема, наш консультант всё разберёт.",
                })}
              </p>
              <ConsultationCtaLink href={`#${FORM_ID}`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-600">
                {byLocale(locale, { fa: "شرایط من را بررسی کنید", de: "Prüfen Sie meine Situation", ru: "Проверьте мою ситуацию" })}
                <ArrowRight size={13} weight="bold" className="rtl:rotate-180" />
              </ConsultationCtaLink>
            </Reveal>
          </div>
        </section>
      )}

      {/* 06 — Why Tarefe: sells the brand, not the product. Same 5 points
          on every PDP — this is deliberately category-agnostic. */}
      <section className="container-page py-12">
        <Reveal>
          <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "چرا تعرفه؟", de: "Warum Tarefe?", ru: "Почему Tarefe?" })}</h2>
          <p className="mt-1.5 max-w-[48ch] text-sm text-secondary">
            {byLocale(locale, { fa: "فقط مقایسه نمی‌کنیم؛ کنارت هستیم.", de: "Wir vergleichen nicht nur; wir stehen Ihnen zur Seite.", ru: "Мы не просто сравниваем — мы рядом с вами." })}
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_TAREFE.map((item) => {
              const Icon = WHY_TAREFE_ICON[item.key];
              return (
                <div key={item.title.fa} className="flex gap-3 rounded-2xl border border-border bg-white p-4">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600/10 text-purple-600">
                    <Icon size={18} weight="duotone" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-purple-900">{byLocale(locale, item.title)}</p>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">{byLocale(locale, item.body)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      {/* 07 — Process: 6 steps, ending in ongoing support, matching 06/08.
          Last step's number breaks from purple to gold, same treatment as
          the homepage journey (HowItWorks.tsx) — the one step that isn't
          really a step, since support doesn't end when the process does. */}
      <section className="border-t border-border bg-tint py-12">
        <div className="container-page">
          <Reveal>
            <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "مراحل کار با تعرفه", de: "Wie läuft es mit Tarefe ab?", ru: "Как проходит работа с Tarefe?" })}</h2>
            <ol className="mt-6 grid gap-x-4 gap-y-6 sm:grid-cols-3">
              {PROCESS_STEPS.map((step, i) => (
                <li key={step.fa} className="flex items-start gap-3">
                  <span
                    className={`font-latin flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      i === PROCESS_STEPS.length - 1 ? "bg-yellow-500 text-purple-900" : "bg-purple-600 text-white"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <p className="pt-1 text-sm font-medium text-purple-900">{byLocale(locale, step)}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* 08 — Why not just do it myself? The real differentiator from a
          bare comparison table — everything a comparison SITE stops doing
          the moment it shows a price. Lighter tier: shorter section,
          tighter padding — supporting material, not a headline claim. */}
      <section className="container-page py-10">
        <Reveal>
          <h2 className="max-w-[36ch] text-lg font-bold text-purple-900">
            {byLocale(locale, {
              fa: "می‌تونی خودت هم مقایسه کنی؛ اما لازم نیست تنها این مسیر را بروی.",
              de: "Sie könnten auch selbst vergleichen — aber Sie müssen diesen Weg nicht allein gehen.",
              ru: "Вы могли бы сравнить всё сами — но не обязаны проходить этот путь в одиночку.",
            })}
          </h2>
          <ul className="mt-5 grid max-w-xl gap-2.5">
            {WHY_NOT_DIY.map((item) => (
              <li key={item.fa} className="flex items-center gap-2.5 text-sm text-body">
                <CheckCircle size={16} weight="fill" className="shrink-0 text-success" />
                {byLocale(locale, item)}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* 09 — Customer experience. No fabricated testimonials — this
          project has a standing rule against inventing reviews, and none
          are collected yet. Same honest placeholder already used on the
          homepage (Testimonials.tsx), not a different story told here. */}
      <section className="border-t border-border bg-tint py-10">
        <div className="container-page flex flex-col items-center gap-3 text-center">
          <Reveal>
            <div className="flex flex-col items-center gap-3">
              <Headset size={28} weight="duotone" className="text-purple-600" />
              <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "یک تیم واقعی پشت تعرفه است", de: "Hinter Tarefe steht ein echtes Team", ru: "За Tarefe стоит настоящая команда" })}</h2>
              <p className="max-w-[48ch] text-sm text-secondary">
                {byLocale(locale, {
                  fa: "به‌محض این‌که مشتریان واقعی نظر خود را با ما در میان بگذارند، تجربه‌های واقعی آن‌ها همین‌جا منتشر می‌شود — بدون نظر ساختگی.",
                  de: "Sobald echte Kunden ihre Erfahrungen mit uns teilen, veröffentlichen wir sie genau hier — ohne erfundene Bewertungen.",
                  ru: "Как только реальные клиенты поделятся своим опытом, мы опубликуем его здесь — без выдуманных отзывов.",
                })}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10 — FAQ: collapsed accordion, not a static open grid — 6-7 Q&A
          pairs all expanded at once is a lot of dense text competing for
          attention this deep into an 11-section page. */}
      <section className="container-page py-10">
        <Reveal>
          <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "سوالات پرتکرار", de: "Häufige Fragen", ru: "Частые вопросы" })}</h2>
          <FaqAccordion locale={locale} items={PDP_FAQ_ITEMS} />
        </Reveal>
      </section>

      {/* 11 — The one real conversion point on the page. Everything above
          exists to make submitting this specific form feel like an easy,
          informed decision by the time someone scrolls this far. */}
      <section className="border-t border-border bg-purple-900 py-12 md:py-16">
        <div className="container-page grid gap-10 md:grid-cols-2 md:items-center">
          <div className="text-center md:text-start">
            <h2 className="text-xl font-bold text-white md:text-2xl">
              {byLocale(locale, { fa: "بیا با هم شرایطت را بررسی کنیم", de: "Sollen wir Ihre Situation prüfen?", ru: "Проверим вашу ситуацию?" })}
            </h2>
            <p className="mt-2 max-w-[42ch] text-sm text-white/70 md:mx-0 mx-auto">
              {byLocale(locale, {
                fa: "فقط چند اطلاعات ساده — یک مشاور فارسی ظرف کمتر از سه ساعت کاری با تو تماس می‌گیرد.",
                de: "Nur ein paar einfache Angaben — ein Berater in Ihrer Sprache meldet sich innerhalb von drei Werktagsstunden.",
                ru: "Всего пара простых данных — консультант на вашем языке свяжется в течение трёх рабочих часов.",
              })}
            </p>
            <div className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-white/60 md:justify-start">
              <ShieldCheck size={14} weight="fill" />
              {byLocale(locale, { fa: "بدون تعهد — مشاوره به زبان فارسی", de: "Unverbindlich — Beratung in Ihrer Sprache", ru: "Без обязательств — консультация на вашем языке" })}
            </div>
          </div>
          <ConsultationForm
            id={FORM_ID}
            locale={locale}
            serviceLabel={parentTitle}
            category={category.slug}
            serviceSlug={productType.slug || subcategory.slug}
          />
        </div>
      </section>

      {productJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />}

      <StickyConsultationCta locale={locale} dict={dict} scrollTargetId={FORM_ID} />
    </div>
  );
}
