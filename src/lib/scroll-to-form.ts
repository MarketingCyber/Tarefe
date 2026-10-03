/**
 * Scrolls a same-page lead form's first field to the vertical center of the
 * viewport. The browser's native anchor jump (and a plain `scrollIntoView`
 * on the form container) aligns the form's *top edge* to the viewport top
 * instead — on a form embedded inside a taller section (heading, service
 * chip, trust copy above the fields), that often leaves the actual first
 * input pushed toward the bottom of the screen or off-screen entirely,
 * with just the CTA/heading area landing mid-viewport.
 */
export function scrollToFormField(formId: string) {
  const form = document.getElementById(formId);
  const field = form?.querySelector<HTMLElement>("input, textarea, select");
  (field ?? form)?.scrollIntoView({ behavior: "smooth", block: "center" });
}
