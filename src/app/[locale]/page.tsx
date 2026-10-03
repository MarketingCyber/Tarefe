import type { Metadata } from "next";
import type { Locale } from "@/lib/taxonomy";
import { getDictionary } from "@/lib/dictionary";
import { buildAlternates } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { PartnerLogos } from "@/components/home/PartnerLogos";
import { ServiceCategories } from "@/components/home/ServiceCategories";
import { PopularServices } from "@/components/home/PopularServices";
import { WhyTarefe } from "@/components/home/WhyTarefe";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Testimonials } from "@/components/home/Testimonials";
import { GuidesPreview } from "@/components/home/GuidesPreview";
import { ConsultationBanner } from "@/components/home/ConsultationBanner";
import { FaqSection } from "@/components/home/FaqSection";
import { FinalCta } from "@/components/home/FinalCta";
import { Reveal } from "@/components/shared/Reveal";
import { prisma } from "@/lib/db";

// No generateStaticParams — see the force-dynamic comment below; a
// prebuilt-routes hint is dead weight on a page that never gets
// statically rendered in the first place.

// Originally tried SSG + `revalidate` (ISR) here, to keep this
// highest-traffic page static while still refreshing the DB-backed FAQ
// section periodically. Reverted: ISR still does a full static prerender
// at BUILD time, and this project's local builds have zero DB access
// (DATABASE_URL is a bare placeholder — there's no local Postgres, see
// AGENTS.md/session history), so any Prisma read during prerendering
// fails the local build outright, breaking it as a pre-deploy safety net.
// `force-dynamic` avoids that tension entirely by never prerendering.
// The performance cost is currently theoretical (near-zero real traffic
// pre-launch) — worth revisiting for real once either a CI environment
// with DB access exists or actual traffic justifies the optimization,
// but not worth the local-build fragility today.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: buildAlternates(locale as Locale, "") };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = locale as Locale;
  const dict = getDictionary(l);

  const faqs = await prisma.faqItem.findMany({ where: { published: true }, orderBy: { order: "asc" }, take: 4 });
  const faqItems = faqs.map((f) => ({
    q: { fa: f.questionFa, de: f.questionDe, ru: f.questionRu },
    a: { fa: f.answerFa, de: f.answerDe, ru: f.answerRu },
  }));

  return (
    <>
      <Hero locale={l} dict={dict} />
      <PartnerLogos locale={l} dict={dict} />
      <Reveal>
        <ServiceCategories locale={l} dict={dict} />
      </Reveal>
      <Reveal>
        <PopularServices locale={l} dict={dict} />
      </Reveal>
      <Reveal>
        <WhyTarefe locale={l} dict={dict} />
      </Reveal>
      <Reveal>
        <HowItWorks locale={l} dict={dict} />
      </Reveal>
      <Reveal>
        <Testimonials locale={l} dict={dict} />
      </Reveal>
      {/* MyTarefePreview (the "My Tarefe" customer-dashboard marketing
          section) is deliberately not rendered — the feature is built but
          not yet launched publicly. Component file kept as-is so this is a
          one-line re-add, not a rebuild, once it's ready to announce. */}
      <Reveal>
        <GuidesPreview locale={l} />
      </Reveal>
      <ConsultationBanner locale={l} dict={dict} />
      <Reveal>
        <FaqSection locale={l} dict={dict} items={faqItems} />
      </Reveal>
      <FinalCta locale={l} dict={dict} />
    </>
  );
}
