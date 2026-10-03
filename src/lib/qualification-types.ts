import type { Locale } from "./taxonomy";

export type QuestionType = "radio" | "select" | "number" | "text";

export interface QualificationOption {
  value: string;
  label: Record<Locale, string>;
}

export interface QualificationQuestion {
  id: string;
  type: QuestionType;
  question: Record<Locale, string>;
  helpText?: Record<Locale, string>;
  options?: QualificationOption[];
  /** Only show this question when a prior answer matches. Keeps the wizard
   * from asking irrelevant questions (e.g. income threshold only for employees). */
  showIf?: (answers: Record<string, string>) => boolean;
  required?: boolean;
}

export interface QualificationOutcome {
  /** Evaluated top-to-bottom against current answers; first match wins. */
  match: (answers: Record<string, string>) => boolean;
  result: "eligible" | "conditional" | "not-eligible";
  message: Record<Locale, string>;
  /**
   * Optional: route to a specific page instead of the generic consultation
   * flow — e.g. a "which connection type fits you" chooser routing to that
   * type's own PLP. Falls back to the wizard's default consultationHref
   * when omitted.
   */
  ctaHref?: string;
  ctaLabel?: Record<Locale, string>;
}

export interface QualificationConfig {
  id: string;
  title: Record<Locale, string>;
  questions: QualificationQuestion[];
  outcomes: QualificationOutcome[];
}
