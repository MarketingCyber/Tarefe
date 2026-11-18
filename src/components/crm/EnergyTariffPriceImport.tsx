"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadSimple, CheckCircle, WarningCircle } from "@phosphor-icons/react";

import { useOpsI18n } from "@/lib/ops-i18n/client";
/**
 * Bulk price-grid upload for one tariff — see the import route's own
 * comment (src/app/api/ops/energy-tariffs/[id]/import/route.ts) for the
 * full "why": real German energy prices vary by postal code and usage
 * tier, so this replaces the tariff's ENTIRE price grid in one shot
 * rather than editing rows one at a time.
 */
export function EnergyTariffPriceImport({ tariffId, currentRowCount }: { tariffId: string; currentRowCount: number }) {
  const { t } = useOpsI18n();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/ops/energy-tariffs/${tariffId}/import`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? t("خطای نامشخص"));
        return;
      }
      setStatus("done");
      setMessage(t("{n} ردیف قیمت وارد شد", { n: data.imported.toLocaleString("de-DE") }) + (data.skipped ? t(" ({n} ردیف نامعتبر رد شد)", { n: data.skipped }) : "") + ".");
      router.refresh();
    } catch {
      setStatus("error");
      setMessage(t("آپلود ناموفق بود — اتصال یا فایل را بررسی کن."));
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-xl border border-border-strong bg-tint p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-purple-900">{t("جدول قیمت کد پستی")}</h3>
        <span className="font-latin text-xs text-secondary">{t("{n} ردیف فعلی", { n: currentRowCount.toLocaleString("de-DE") })}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-secondary">
        {t("فایل اکسل خروجی تامین‌کننده (xlsx) را آپلود کن — کل جدول قیمت این تعرفه جایگزین می‌شود، نه اضافه. فعلاً فقط xlsx/xls پشتیبانی می‌شود، نه CSV. ستون‌های")}
        {t("لازم: PLZ، Staffel von، Staffel bis، gültig seit، Grundpreis (€)، Arbeitspreis (ct/kwh).")}
      </p>

      <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} disabled={status === "uploading"} className="hidden" id="price-grid-file" />
      <label
        htmlFor="price-grid-file"
        className={`press mt-4 inline-flex cursor-pointer items-center gap-2 rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-900 ${
          status === "uploading" ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <UploadSimple size={16} weight="bold" />
        {status === "uploading" ? t("در حال آپلود…") : t("آپلود فایل قیمت")}
      </label>

      {message && (
        <p className={`mt-3 flex items-start gap-1.5 text-xs ${status === "error" ? "text-danger" : "text-success"}`}>
          {status === "error" ? <WarningCircle size={14} weight="bold" className="mt-0.5 shrink-0" /> : <CheckCircle size={14} weight="bold" className="mt-0.5 shrink-0" />}
          {message}
        </p>
      )}
    </div>
  );
}
