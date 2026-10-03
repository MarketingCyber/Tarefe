import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

/**
 * Canonical Service Card — homepage, category pages, related-services rails.
 * Per Phase 2 spec §9: icon/image, name, short description, key benefit, CTA.
 */
export function ServiceCard({
  href,
  icon: IconComponent,
  title,
  description,
  benefit,
  ctaLabel,
  disabled,
  size = "md",
}: {
  href: string;
  icon: Icon;
  title: string;
  description: string;
  benefit?: string;
  ctaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const iconBox = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const iconSize = size === "lg" ? 24 : size === "sm" ? 17 : 20;
  const titleClass = size === "lg" ? "text-xl" : size === "sm" ? "text-sm" : "text-base";

  const content = (
    <div
      className={`group flex h-full flex-col gap-3 rounded-2xl border p-5 transition-all ${
        disabled ? "border-border bg-tint" : "border-border bg-white hover:-translate-y-0.5 hover:shadow-card-hover"
      } ${size === "lg" ? "p-6" : "p-5"}`}
    >
      <span className={`flex ${iconBox} items-center justify-center rounded-xl bg-purple-600/10 text-purple-600`}>
        <IconComponent size={iconSize} weight="duotone" />
      </span>
      <div className="flex-1">
        <h3 className={`font-bold text-purple-900 ${titleClass}`}>{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-secondary">{description}</p>
        {benefit && <p className="font-latin mt-2 text-xs font-medium text-purple-600">{benefit}</p>}
      </div>
      {!disabled && ctaLabel && (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600">
          {ctaLabel}
          <ArrowRight size={12} weight="bold" className="rtl:rotate-180 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
        </span>
      )}
    </div>
  );

  if (disabled) return content;
  return (
    <Link href={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 rounded-2xl">
      {content}
    </Link>
  );
}
