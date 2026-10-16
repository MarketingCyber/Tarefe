/** Labels for event names — shared by the analytics page's filter, table and CSV export. */
export const EVENT_LABEL: Record<string, string> = {
  page_view: "Page view",
  search: "Site search",
  comparison_started: "Comparison started",
  qualification_started: "Qualification wizard started",
  qualification_completed: "Qualification wizard completed",
  consultation_form_started: "Consultation form started",
  consultation_submitted: "Consultation form submitted",
  whatsapp_clicked: "WhatsApp click",
  phone_clicked: "Phone click",
  energy_calculator_used: "Electricity/gas calculator used",
  tariff_cta_clicked: "Tariff card button clicked",
  signup: "Sign-up",
  login: "Login",
  logout: "Logout",
  web_vital: "Web-vitals sample",
  mfa_enabled: "MFA enabled",
  mfa_disabled: "MFA disabled",
  lead_status_changed: "Lead status changed",
  application_created: "Application created",
  application_approved: "Application approved",
  contract_created: "Contract created",
  contract_cancelled: "Contract cancelled",
  ticket_created: "Ticket created",
  document_uploaded: "Document uploaded",
};

export const eventLabel = (name: string) => EVENT_LABEL[name] ?? name;

/** Dimension values that carry meaning beyond their raw text. */
export const VALUE_LABEL: Record<string, string> = {
  "(not set)": "(not set)",
  "(direct)": "(direct)",
  "(none)": "(none)",
  new: "New",
  returning: "Returning",
  mobile: "Mobile",
  tablet: "Tablet",
  desktop: "Desktop",
};
export const valueLabel = (v: string) => VALUE_LABEL[v] ?? v;

// ------------------------------------------------------------------------
// Plain-language layer (v2 dashboard). The engine's names are analytics
// jargon ("session", "engagement rate"); these are what a marketer says.

export const DIM_LABEL: Record<string, string> = {
  channel: "Channel",
  source: "Source",
  medium: "Medium",
  campaign: "Campaign",
  content: "Ad content",
  term: "Keyword",
  landing: "Landing page",
  landing_group: "Landing page (no language)",
  device: "Device",
  browser: "Browser",
  os: "Operating system",
  locale: "Site language",
  category: "Service category",
  service: "Service",
  visitor_type: "Visitor type",
};

const LOCALE_NAME: Record<string, string> = { fa: "Persian", de: "German", ru: "Russian" };
const VISITOR_NAME: Record<string, string> = { new: "New", returning: "Returning" };
const DEVICE_NAME: Record<string, string> = { mobile: "Mobile", desktop: "Desktop", tablet: "Tablet" };

/** Human label for one value of a dimension (the raw value stays in the URL and the CSV). */
export function dimValueLabel(dim: string, value: string): string {
  if (value === "(not set)") return "(not set)";
  if (value === "(direct)") return "(direct)";
  if (value === "(none)") return "(none)";
  if (value === "Other") return "Other";
  if (dim === "locale") return LOCALE_NAME[value] ?? value;
  if (dim === "device") return DEVICE_NAME[value] ?? value;
  if (dim === "visitor_type") return VISITOR_NAME[value] ?? value;
  return value;
}

/** What each channel means — shown as a tooltip so nobody has to guess how visits are bucketed. */
export const CHANNEL_HINT: Record<string, string> = {
  "Organic Search": "Visits from Google, Bing, etc. search results (unpaid).",
  Paid: "Visits from ads: any link with a medium of cpc / ppc / paid…, or a Google Ads click (gclid), even without UTM tags.",
  Direct: "Visits with no referrer and no campaign tags: typed address, bookmark, or an app that hides its referrer.",
  Referral: "Visits from a link on another website (no UTM tags).",
  Social: "Visits from social networks (Instagram, Facebook, Telegram…).",
  Email: "Visits from links with utm_medium=email.",
  Other: "Tagged with a medium that is not one of the standard ones.",
  "(not set)": "No source was recorded: older data from before source tracking, or a visit where the visitor had not yet accepted cookies.",
};

/** Date-range menu rows. */
export const PRESET_PLAIN: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "14d": "Last 14 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  mtd: "Month to date",
  custom: "Custom range",
};

/** The tiles and trend tabs: a plain name and a one-sentence explanation each. */
export const KPI_PLAIN: Record<string, { label: string; hint: string }> = {
  leads_crm: { label: "Leads", hint: "Forms recorded in the CRM. Does not depend on cookie consent, so it is usually higher than tracked form submissions." },
  sessions: { label: "Visits", hint: "Each time someone comes to the site and does something. If they go quiet for 30 minutes and come back, that is a new visit." },
  users: { label: "Visitors", hint: "Distinct browsers, roughly the number of people. One person on two devices counts as two visitors." },
  conv_rate: { label: "Conversion rate", hint: "Of every 100 visits, how many ended with a submitted form (only visitors who accepted cookies are counted)." },
  median_duration: { label: "Typical visit length", hint: "The median: half of visits are shorter and half longer. More realistic than the average, which a few very long visits inflate." },
  pages_per_session: { label: "Pages per visit", hint: "On average, how many pages each visit looks at." },
};
