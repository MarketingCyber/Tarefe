import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";

/**
 * "An empty screen is an invitation to act" (Phase 2 §24) — every empty
 * list in the app should say what's missing and offer the one action that
 * fixes it, not just render nothing.
 */
export function EmptyState({
  icon: IconComponent,
  title,
  body,
  actionLabel,
  actionHref,
}: {
  icon: Icon;
  title: string;
  body: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong bg-tint px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-secondary">
        <IconComponent size={24} weight="duotone" />
      </span>
      <p className="text-sm font-semibold text-purple-900">{title}</p>
      <p className="max-w-[38ch] text-xs text-secondary">{body}</p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="press mt-2 inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-4 py-2 text-xs font-semibold text-white">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
