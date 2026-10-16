import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import type { Dictionary } from "@/lib/dictionary";

/**
 * Slim bar above the header on every public page: all of Tarefe's services are
 * free for the customer, and that is the reason to choose it. Not sticky on
 * purpose (it scrolls away; the sticky header and the energy pages' section map
 * keep their own offsets), and server-rendered — no JavaScript for a sentence.
 */
export function FreeBar({ dict }: { dict: Dictionary }) {
  return (
    <div className="bg-purple-900 text-white">
      <p className="container-page flex items-center justify-center gap-2 py-2 text-center text-xs font-medium sm:text-[13px]">
        <CheckCircle size={15} weight="fill" className="shrink-0 text-yellow-500" aria-hidden />
        <span className="font-bold">{dict.cta.freeClaim}</span>
        <span className="hidden text-white/70 md:inline">— {dict.cta.freeDetail}</span>
      </p>
    </div>
  );
}
