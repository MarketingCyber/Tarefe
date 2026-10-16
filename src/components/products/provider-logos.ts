import type { StaticImageData } from "next/image";
import evdLogo from "@/assets/logos/evd.png";
import rheinEnergieLogo from "@/assets/logos/rheinenergie.svg";
import eWieEinfachLogo from "@/assets/logos/e-wie-einfach.svg";
import markELogo from "@/assets/logos/mark-e.webp";
import vattenfallLogo from "@/assets/logos/vattenfall.png";
import eweLogo from "@/assets/logos/ewe.svg";
import enviaMLogo from "@/assets/logos/envia-m.svg";
import eprimoLogo from "@/assets/logos/eprimo.svg";

/**
 * Provider logos, keyed by EnergyTariff.provider exactly as stored — see
 * scripts/replace-energy-tariffs.ts and scripts/add-energy-tariffs.ts, the only
 * places that write these strings. A provider not in this map (a hand-entered
 * tariff with no logo on file yet) falls back to its plain name text, never a
 * broken image. ewe.svg/envia-m.svg were pulled 2026-10-08 straight from each
 * provider's own live site — real brand colour confirmed via computed style.
 * Shared by the tariff cards on the service pages and the Google Ads landing journey.
 */
export const PROVIDER_LOGOS: Record<string, StaticImageData> = {
  EVD: evdLogo,
  RheinEnergie: rheinEnergieLogo,
  "E WIE EINFACH": eWieEinfachLogo,
  "Mark-E": markELogo,
  Vattenfall: vattenfallLogo,
  EWE: eweLogo,
  "Envia M": enviaMLogo,
  Eprimo: eprimoLogo,
};
