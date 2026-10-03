import { TAXONOMY, isCollapsedSubcategory, type Locale } from "./taxonomy";

export interface SearchResult {
  type: "category" | "subcategory" | "product" | "faq" | "guide";
  title: string;
  subtitle?: string;
  href: string;
  /** Searchable text beyond the displayed title — includes fa/de/ru terms so
   * "دندان", "Zahnzusatzversicherung" and "дантист" all resolve to the same
   * result regardless of the UI's active locale (Phase 2 §13). */
  keywords: string;
}

let cachedIndex: SearchResult[] | null = null;

export function buildSearchIndex(): SearchResult[] {
  if (cachedIndex) return cachedIndex;
  const index: SearchResult[] = [];

  for (const category of TAXONOMY) {
    if (!category.published) continue;
    index.push({
      type: "category",
      title: category.title.fa,
      href: `/services/${category.slug}`,
      keywords: [category.title.fa, category.title.de, category.title.ru, category.description.fa].join(" "),
    });

    for (const sub of category.subcategories) {
      index.push({
        type: "subcategory",
        title: sub.title.fa,
        subtitle: category.title.fa,
        href: `/services/${category.slug}/${sub.slug}`,
        keywords: [sub.title.fa, sub.title.de, sub.title.ru, sub.classification ?? ""].join(" "),
      });

      if (isCollapsedSubcategory(sub)) continue;
      for (const pt of sub.productTypes) {
        index.push({
          type: "product",
          title: pt.title.fa,
          subtitle: sub.title.fa,
          href: `/services/${category.slug}/${sub.slug}/${pt.slug}`,
          keywords: [pt.title.fa, pt.title.de, pt.title.ru, pt.description.fa, pt.description.de].join(" "),
        });
      }
    }
  }

  // FAQ and Guides are no longer indexed here: both moved to the DB
  // (Phase 9's CMS content types — see prisma/schema.prisma's FaqItem and
  // Guide comments), and this whole index is built synchronously inside a
  // "use client" module (SearchModal.tsx calls search() directly, no API
  // route in between) — a browser can't query Prisma. Converting search
  // to an async API-backed call so it could stay live for DB content is a
  // real follow-up, more worth doing now that it's two content types
  // affected instead of one — not attempted here: dropping them from
  // search results is an honest, visible gap; silently keeping a static
  // snapshot that goes stale the moment someone edits either via /ops
  // would not be.

  cachedIndex = index;
  return index;
}

export function search(query: string, locale: Locale, limit = 8): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const index = buildSearchIndex();
  const scored = index
    .map((entry) => {
      const haystack = entry.keywords.toLowerCase();
      const titleMatch = entry.title.toLowerCase().includes(q);
      const keywordMatch = haystack.includes(q);
      if (!titleMatch && !keywordMatch) return null;
      return { entry, score: titleMatch ? 2 : 1 };
    })
    .filter((x): x is { entry: SearchResult; score: number } => x !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({ ...x.entry, href: `/${locale}${x.entry.href}` }));

  return scored;
}
