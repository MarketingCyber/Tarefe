/**
 * How a person in the old CRM (Dynamics contact / lead) and a tarefe.de account are recognised as the same person:
 * the same e-mail address or the same phone number. Both are normalised into keys ("email:…", "tel:…") that are
 * stored in crm_records.refs, so either side can find the other with one indexed lookup.
 */

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isGuid = (s: string) => GUID.test(s);

export function emailKey(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? `email:${e}` : null;
}

/** German numbers in any notation (0152…, +49 152…, 0049152…, 49152…) → "tel:49152…". */
export function phoneKey(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `49${d.slice(1)}`;
  return d.length >= 9 ? `tel:${d}` : null;
}

const PERSON_FIELDS = { email: ["emailaddress1", "emailaddress2", "emailaddress3"], phone: ["mobilephone", "telephone1", "telephone2", "telephone3"] };

/** The identity keys of a contact or lead record. */
export function personKeys(data: Record<string, unknown>): string[] {
  const keys = [...PERSON_FIELDS.email.map((f) => emailKey(data[f])), ...PERSON_FIELDS.phone.map((f) => phoneKey(data[f]))];
  return [...new Set(keys.filter((k): k is string => !!k))];
}

/**
 * What a record is indexed by (crm_records.refs): its own id, every record it points at (lookups like
 * _customerid_value, _regardingobjectid_value, _objectid_value), and for people their e-mail / phone keys.
 */
export function refsOf(entity: string, crmId: string, data: Record<string, unknown>): string[] {
  const refs = new Set<string>([crmId.toLowerCase()]);
  for (const [k, v] of Object.entries(data)) if (/^_.+_value$/.test(k) && typeof v === "string" && isGuid(v)) refs.add(v.toLowerCase());
  if (entity === "contact" || entity === "lead") for (const key of personKeys(data)) refs.add(key);
  return [...refs];
}
