import Link from "next/link";
import type { BreadcrumbItem } from "@/lib/taxonomy";

const SITE_URL = "https://tarefe.de";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  if (items.length <= 1) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href}`,
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="container-page flex items-center gap-1.5 py-4 text-xs text-secondary">
      {items.map((item, i) => (
        <span key={item.href} className="flex items-center gap-1.5">
          {i > 0 && <span className="opacity-50">/</span>}
          {i === items.length - 1 ? (
            <span className="font-medium text-body" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link href={item.href} className="transition-colors hover:text-purple-600">
              {item.label}
            </Link>
          )}
        </span>
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
