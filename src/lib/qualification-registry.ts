import type { QualificationConfig } from "./qualification-types";
import { PKV_QUALIFICATION } from "./qualification-configs/pkv";
import { DENTAL_QUALIFICATION } from "./qualification-configs/dental";
import { ELECTRICITY_QUALIFICATION } from "./qualification-configs/electricity";
import { GAS_QUALIFICATION } from "./qualification-configs/gas";
import { INTERNET_TYPE_QUALIFICATION } from "./qualification-configs/internet-type";
import { MOBILE_CONTRACT_QUALIFICATION } from "./qualification-configs/mobile-contract";
import { CAR_INSURANCE_QUALIFICATION } from "./qualification-configs/car-insurance";

/**
 * One flat map, keyed either "{category}/{subcategory}/{productType}"
 * (per-productType eligibility checks) or "{category}/{subcategory}"
 * (subcategory-level "which of these fits you" chooser — e.g.
 * communication/internet, whose real productTypes — fiber/DSL/cable/5G —
 * don't each need their own near-duplicate wizard). Both key shapes live
 * in the SAME map because QualificationWizard resolves whatever
 * `qualificationId` string it's given against this one registry — a
 * second registry object would silently desync the moment a caller
 * constructed a key for the "wrong" one.
 *
 * One engine (QualificationWizard), many configs — a new service plugs in
 * by adding a config file and an entry here, not by building a new wizard.
 *
 * Note: collapsed subcategories (single productType — see
 * isCollapsedSubcategory in taxonomy.ts) have an empty productType slug,
 * so their key ends in a trailing "/" — e.g. energy/electricity's
 * productType.slug is "", giving the key "energy/electricity/". This must
 * match exactly what PlpView constructs.
 */
export const QUALIFICATION_REGISTRY: Record<string, QualificationConfig> = {
  "insurance/health/pkv": PKV_QUALIFICATION,
  "insurance/health/dental": DENTAL_QUALIFICATION,
  "energy/electricity/": ELECTRICITY_QUALIFICATION,
  "energy/gas/": GAS_QUALIFICATION,
  "communication/internet": INTERNET_TYPE_QUALIFICATION,
  "communication/mobile/contract": MOBILE_CONTRACT_QUALIFICATION,
  "insurance/vehicles/car": CAR_INSURANCE_QUALIFICATION,
};

export function getQualificationConfig(category: string, subcategory: string, productType: string): QualificationConfig | undefined {
  return QUALIFICATION_REGISTRY[`${category}/${subcategory}/${productType}`];
}

export function getSubcategoryQualificationConfig(category: string, subcategory: string): QualificationConfig | undefined {
  return QUALIFICATION_REGISTRY[`${category}/${subcategory}`];
}
