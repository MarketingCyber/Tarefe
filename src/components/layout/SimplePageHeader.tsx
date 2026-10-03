import type { BreadcrumbItem } from "@/lib/taxonomy";
import { Breadcrumbs } from "./Breadcrumbs";
import { Reveal } from "@/components/shared/Reveal";

// Used at the top of about/guides/faq/contact (and every other "simple"
// page) — the entrance staggers breadcrumbs → title → subtitle in one
// short cascade rather than the whole header fading in as a single block,
// so it reads as a beat, not a flash. Reveal's whileInView fires as soon
// as this above-the-fold content mounts (nothing to scroll to reach it),
// making it double as a mount entrance, not just a scroll reveal.
export function SimplePageHeader({ items, title, subtitle }: { items: BreadcrumbItem[]; title: string; subtitle?: string }) {
  return (
    <div className="border-b border-border bg-tint">
      <div className="container-page py-10">
        <Reveal>
          <Breadcrumbs items={items} />
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-2 text-3xl font-bold text-purple-900 md:text-4xl">{title}</h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={0.16}>
            <p className="mt-3 max-w-[60ch] text-secondary">{subtitle}</p>
          </Reveal>
        )}
      </div>
    </div>
  );
}
