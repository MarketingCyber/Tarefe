/**
 * The stops of the electricity / gas page, in reading order, and the element id
 * each section carries. A plain module (no "use client") on purpose: server
 * sections AND the client nav import these constants, and constants exported from
 * a client module reach server code as unusable client references.
 */
export type JourneyStop = "calculator" | "whyNow" | "situation" | "process" | "trust" | "faq";

export const JOURNEY_IDS: Record<JourneyStop, string> = {
  calculator: "calculator",
  whyNow: "why-now",
  situation: "situation",
  process: "process",
  trust: "trust",
  faq: "faq",
};

export const JOURNEY_ORDER: JourneyStop[] = ["calculator", "whyNow", "situation", "process", "trust", "faq"];
