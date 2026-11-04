/**
 * A Latin fragment inside Persian (right-to-left) text — a phone number, an address, a law reference like
 * "§ 5 DDG" — wrapped in Unicode isolate marks (LRI … PDI), so it's laid out left-to-right as one unit and
 * isn't reordered by the surrounding Persian ("+49 211 54218000" would show as "54218000 211 49+").
 * For text in plain strings; in JSX, the font-latin class does the same (app/globals.css).
 */
export const ltr = (text: string) => `⁦${text}⁩`;
