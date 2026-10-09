import {
  CheckCircle,
  WhatsappLogo,
  ArrowRight,
  ChatCircleText,
  ClipboardText,
  HandHeart,
  Handshake,
  Users,
  Headset,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";
import { byLocale, type Category, type Subcategory, type ProductType, type Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { prisma } from "@/lib/db";
import { StickyConsultationCta } from "@/components/conversion/StickyConsultationCta";
import { ConsultationCtaLink } from "@/components/conversion/ConsultationCtaLink";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";
import { EnergyConsumptionCalculator } from "@/components/products/EnergyConsumptionCalculator";
import { CoverageAccordion } from "@/components/services/pdp/CoverageAccordion";
import { FaqAccordion } from "@/components/services/pdp/FaqAccordion";
import { Reveal } from "@/components/shared/Reveal";
import { getPdpContent, WHY_TAREFE, PROCESS_STEPS, WHY_NOT_DIY, PDP_FAQ_ITEMS } from "@/lib/pdp-content";
import { getEnergyPageContent } from "@/lib/energy-page-content";
import {
  EnergySupplyPaths,
  EnergyWhyNow,
  EnergyOptions,
  EnergyWhyTarefe,
  EnergyProcess,
} from "@/components/services/energy/EnergySections";
import { EnergyWhenToCheck } from "@/components/services/energy/EnergyWhenToCheck";
import { getSubcategoryImage } from "@/lib/pdp-images";
import { CategoryHeroFrame } from "@/components/services/pdp/CategoryHeroFrame";
import { CATEGORY_ICON, categoryHeadingTracking } from "@/lib/category-theme";

const GENERIC_BENEFITS: Record<Locale, string[]> = {
  fa: ["مقایسه رایگان بین چند ارائه‌دهنده معتبر", "مشاوره تخصصی به زبان فارسی", "ثبت آنلاین بدون نیاز به حضور شما", "پشتیبانی در تمام طول مدت قرارداد"],
  de: ["Kostenloser Vergleich mehrerer renommierter Anbieter", "Fachberatung in Ihrer Sprache", "Digitaler Abschluss, ohne dass Sie erscheinen müssen", "Support für die gesamte Vertragslaufzeit"],
  ru: ["Бесплатное сравнение нескольких надёжных поставщиков", "Профессиональная консультация на вашем языке", "Онлайн-оформление без вашего личного присутствия", "Поддержка на весь срок действия договора"],
};

const FORM_ID = "plp-lead-form";
const WHY_TAREFE_ICON: Record<string, PhosphorIcon> = { compare: Handshake, human: ChatCircleText, dedicated: Users, admin: ClipboardText, support: HandHeart };

export async function PlpView({
  locale,
  dict,
  category,
  subcategory,
  productType,
}: {
  locale: Locale;
  dict: Dictionary;
  category: Category;
  subcategory: Subcategory;
  productType: ProductType;
}) {
  const title = byLocale(locale, productType.title);
  const content = getPdpContent(category.slug, subcategory.slug, productType.slug);
  const heroImage = getSubcategoryImage(category.slug, subcategory.slug);
  const CategoryIcon = CATEGORY_ICON[category.slug] ?? CATEGORY_ICON.insurance;

  const isEnergyCalculator = category.slug === "energy" && (subcategory.slug === "electricity" || subcategory.slug === "gas");
  // Real prices vary by postal code and usage tier (see EnergyTariffPriceRow
  // in schema.prisma) — this page only needs to know whether ANY published
  // tariff exists for this kind, to decide whether to offer the calculator
  // at all. Actual pricing is resolved per-visitor by
  // /api/energy-tariffs/lookup once they've entered a PLZ, not fetched
  // once here for every visitor regardless of where they live.
  const energyTariffCount = isEnergyCalculator
    ? await prisma.energyTariff.count({ where: { kind: subcategory.slug === "electricity" ? "ELECTRICITY" : "GAS", published: true } })
    : 0;
  // Electricity and gas swap the generic long-form sections for their own
  // copy (lib/energy-page-content.ts) — same slots, same order, different
  // words. Null for every other service page, which keeps the generic path.
  const energy = isEnergyCalculator ? getEnergyPageContent(subcategory.slug as "electricity" | "gas") : null;

  return (
    <div className="pb-24 sm:pb-0">
      {/* 01 — Hero: a need/problem framing, not a price tag — this page's
          job is helping someone decide the category is relevant to them.
          Two-column with a real photo now (was text-only before this
          round) — same grid shape as the homepage Hero.tsx, one verified
          photo per subcategory (see pdp-images.ts), not a generic category
          stock shot reused across every one of its products. */}
      <section className="border-b border-border bg-tint">
        <div className={`container-page grid items-center gap-10 py-12 md:py-16 ${heroImage ? "md:grid-cols-2" : ""}`}>
          <div>
            <Reveal>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white px-2.5 py-0.5 text-[11px] font-semibold text-purple-600">
                  <CategoryIcon size={12} weight="fill" />
                  {byLocale(locale, category.title)}
                </span>
                {subcategory.classification && (
                  <span className="inline-block rounded-full border border-border-strong bg-white px-2.5 py-0.5 text-[11px] font-semibold text-purple-600">
                    {subcategory.classification}
                  </span>
                )}
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className={`max-w-[24ch] text-3xl font-extrabold leading-tight text-purple-900 md:text-4xl ${categoryHeadingTracking(category.slug)}`}>{title}</h1>
            </Reveal>
            <Reveal delay={0.16}>
              {content?.germanTerm && <p className="font-latin mt-1.5 text-sm text-secondary">{content.germanTerm}</p>}
              <p className="mt-3 max-w-[56ch] text-secondary">{byLocale(locale, productType.description)}</p>
            </Reveal>

            {/* Hero CTAs and trust badges are deliberately skipped for the
                energy calculator pages (2026-10-01) — this hero's only job
                there is to frame the category before the calculator, which
                follows immediately below and carries its own CTA; every
                extra element here is scroll depth between landing and the
                actual value prop. Every other PLP keeps the normal hero
                with its own conversion path, since it has no calculator to
                hand off to. */}
            {!isEnergyCalculator && (
              <>
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
              </>
            )}
          </div>

          {heroImage && (
            <Reveal delay={0.12} className="order-first md:order-none">
              <CategoryHeroFrame categorySlug={category.slug} image={heroImage} />
            </Reveal>
          )}
        </div>
      </section>

      {/* 01b — The calculator, right after the hero: this page's real
          value prop comes before any reading material, not after 3
          sections of it. No intro line above it anymore (2026-10-01,
          removed along with the hero CTAs/trust badges above) — the
          calculator's own heading is the first thing here, so there's
          nothing left between landing and the actual value prop. */}
      {isEnergyCalculator && (
        <section className="border-b border-border bg-tint py-12">
          <div className="container-page">
            <Reveal>
              <EnergyConsumptionCalculator
                locale={locale}
                kind={subcategory.slug as "electricity" | "gas"}
                consultationHref={`#${FORM_ID}`}
                pricingMode="live"
                hasAnyTariffs={energyTariffCount > 0}
              />
            </Reveal>
            {/* Below the calculator, not above it: the calculator stays the
                first thing after the hero (see the note above), and this
                "where does your supply come from today" framing reads as
                its follow-up. */}
            {energy && (
              <div className="mt-14">
                <EnergySupplyPaths locale={locale} content={energy} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 02 — What exactly is this service? Heavier type than the sections
          below it — this and 03 are the page's actual substance, not
          supporting material, and the heading scale now says so instead
          of every one of the 11 sections reading as equally important. */}
      {energy && <EnergyWhyNow locale={locale} content={energy} />}
      {!energy && content?.whatItIs && (
        <section className="container-page py-14">
          <Reveal>
            <h2 className="max-w-[28ch] text-xl font-bold text-purple-900 md:text-2xl">
              {byLocale(locale, { fa: `${title} دقیقاً چیست؟`, de: `Was genau ist ${title}?`, ru: `Что такое «${title}»?` })}
            </h2>
            <p className="mt-4 max-w-[68ch] text-base leading-relaxed text-secondary">{byLocale(locale, content.whatItIs)}</p>
          </Reveal>
        </section>
      )}

      {/* 03 — Benefits: the most important section on the page — same
          heavier heading tier as 02. */}
      {energy && <EnergyOptions locale={locale} content={energy} formId={FORM_ID} />}
      {!energy && (
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
              <ul className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {(GENERIC_BENEFITS[locale] ?? GENERIC_BENEFITS.fa).map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-body">
                    <CheckCircle size={17} weight="fill" className="mt-0.5 shrink-0 text-success" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </Reveal>
        </div>
      </section>
      )}

      {/* 04 — Coverage: non-energy products with bespoke content get the
          coverage accordion (energy's equivalent, the calculator, already
          ran right after the hero — see 01b). */}
      {!isEnergyCalculator && content?.coverageGroups && content.coverageGroups.length > 0 && (
        <section className="border-t border-border bg-tint py-12">
          <div className="container-page">
            <Reveal>
              <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "پوشش‌ها و خدمات را بهتر بشناس", de: "Lernen Sie die Leistungen genauer kennen", ru: "Узнайте больше о покрытии и услугах" })}</h2>
              <div className="mt-6">
                <CoverageAccordion locale={locale} groups={content.coverageGroups} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* 06 — Why Tarefe: sells the brand, not the product. Same 5 points
          on every service page — deliberately category-agnostic. Energy
          pages swap in their own copy (which also absorbs 08 below). */}
      {energy && <EnergyWhyTarefe locale={locale} content={energy} />}
      {!energy && (
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
                <div key={item.key} className="flex gap-3 rounded-2xl border border-border bg-white p-4">
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
      )}

      {/* 07 — Process: 6 steps, ending in ongoing support, matching 06/08.
          Last step's number breaks from purple to gold, same treatment as
          the homepage journey (HowItWorks.tsx) — the one step that isn't
          really a step, since support doesn't end when the process does. */}
      {energy && <EnergyProcess locale={locale} content={energy} formId={FORM_ID} />}
      {!energy && (
      <section className="border-t border-border bg-tint py-12">
        <div className="container-page">
          <Reveal>
            <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, { fa: "چطور با تعرفه پیش می‌رود؟", de: "Wie läuft es mit Tarefe ab?", ru: "Как проходит работа с Tarefe?" })}</h2>
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
      )}

      {/* 08 — Why not just do it myself? The real differentiator from a
          bare comparison table. Lighter tier: shorter section, tighter
          padding — supporting material, not a headline claim. Skipped on
          the energy pages: their 06 already makes this exact argument. */}
      {!energy && (
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
      )}

      {/* 09 — Customer experience. No fabricated testimonials — same
          honest placeholder already used on the homepage. Same block on
          the energy pages (this is where real customer comments will
          appear); they add 09b (when to check) right after it, which has
          no generic counterpart. */}
      <section className={`border-t border-border py-10 ${energy ? "" : "bg-tint"}`}>
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
      {energy && <EnergyWhenToCheck locale={locale} content={energy.whenToCheck} formId={FORM_ID} />}

      {/* 10 — FAQ: collapsed accordion, not a static open grid — 6-7 Q&A
          pairs all expanded at once is a lot of dense text competing for
          attention this deep into an 11-section page. */}
      <section className="container-page py-10">
        <Reveal>
          <h2 className="text-lg font-bold text-purple-900">{byLocale(locale, energy ? energy.faqTitle : { fa: "سوالات پرتکرار", de: "Häufige Fragen", ru: "Частые вопросы" })}</h2>
          <FaqAccordion locale={locale} items={energy ? energy.faq : PDP_FAQ_ITEMS} />
        </Reveal>
      </section>

      {/* 11 — The one real conversion point on the page. */}
      <section className="border-t border-border bg-purple-900 py-12 md:py-16">
        <div className="container-page grid gap-10 md:grid-cols-2 md:items-center">
          <div className="text-center md:text-start">
            <h2 className="text-xl font-bold text-white md:text-2xl">{byLocale(locale, { fa: "شرایطت را با ما بررسی کنیم؟", de: "Sollen wir Ihre Situation prüfen?", ru: "Проверим вашу ситуацию?" })}</h2>
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
          <ConsultationForm id={FORM_ID} locale={locale} serviceLabel={title} category={category.slug} serviceSlug={productType.slug || subcategory.slug} />
        </div>
      </section>

      <StickyConsultationCta locale={locale} dict={dict} scrollTargetId={FORM_ID} />
    </div>
  );
}
