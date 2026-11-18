"use client";

import { useOpsI18n } from "@/lib/ops-i18n/client";

/**
 * «+ یادداشت» in the header of the customer and contract pages (staff feedback 2026-11-18: finding where to leave a
 * note took a quarter of an hour). Scrolls to the note box (AddNoteForm with anchor "note") and puts the cursor in it.
 */
export function JumpToNote() {
  const { t } = useOpsI18n();
  return (
    <a
      href="#note"
      onClick={(e) => {
        const form = document.getElementById("note");
        if (!form) return;
        e.preventDefault();
        form.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        form.querySelector("textarea")?.focus({ preventScroll: true });
      }}
      className="press rounded-full bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-900"
    >
      {t("+ یادداشت")}
    </a>
  );
}
