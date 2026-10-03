import type { Locale } from "@/lib/taxonomy";
import type { Dictionary } from "@/lib/dictionary";
import { SimplePageHeader } from "@/components/layout/SimplePageHeader";

export function LegalPage({
  locale,
  dict,
  title,
  crumbLabel,
  href,
  pendingNote,
  sections,
}: {
  locale: Locale;
  dict: Dictionary;
  title: string;
  crumbLabel: string;
  href: string;
  /** Omitted once a page's content is real and complete — the notice box only makes sense while something is still a placeholder. */
  pendingNote?: string;
  sections: { heading: string; body: string }[];
}) {
  return (
    <div>
      <SimplePageHeader items={[{ label: dict.breadcrumbHome, href: `/${locale}` }, { label: crumbLabel, href }]} title={title} />
      <div className="container-page max-w-3xl py-12">
        {pendingNote && <div className="mb-8 rounded-xl border border-border-strong bg-tint px-4 py-3 text-xs text-secondary">{pendingNote}</div>}
        {sections.map((s) => (
          <section key={s.heading} className="mb-8">
            <h2 className="mb-2 text-lg font-bold text-purple-900">{s.heading}</h2>
            {/* whitespace-pre-line: some sections (e.g. Imprint's address/
                contact blocks) embed real line breaks in `body` for
                readability — plain <p> would collapse them by default. */}
            <p className="whitespace-pre-line leading-relaxed text-body">{s.body}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
