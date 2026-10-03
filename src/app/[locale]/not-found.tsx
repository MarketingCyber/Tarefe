import Link from "next/link";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { getDictionary } from "@/lib/dictionary";

/**
 * Next.js renders not-found.tsx without the dynamic [locale] param available,
 * so this stays locale-neutral (defaults to Persian, the production locale)
 * rather than guessing from an unavailable segment.
 */
export default function NotFound() {
  const dict = getDictionary("fa");

  return (
    <div className="container-page flex flex-col items-center py-24 text-center" dir="rtl">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-tint text-purple-600">
        <Compass size={30} weight="duotone" />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-purple-900 md:text-3xl">{dict.notFound.title}</h1>
      <p className="mt-3 max-w-[46ch] text-secondary">{dict.notFound.subtitle}</p>
      <Link href="/fa" className="press mt-7 inline-flex items-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
        {dict.notFound.cta}
      </Link>
    </div>
  );
}
