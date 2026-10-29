"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { X } from "@phosphor-icons/react";
import { getCookiePrefs, markNoticeSeen, noticeSeen, OPEN_SETTINGS_EVENT, setCookiePrefs, type CookiePrefs } from "@/lib/cookie-consent";
import type { Locale } from "@/lib/taxonomy";

export type CookieLabels = {
  body: string;
  settings: string;
  close: string;
  title: string;
  intro: string;
  necessary: string;
  alwaysOn: string;
  analytics: string;
  analyticsNote: string;
  ads: string;
  adsNote: string;
  save: string;
  policyLink: string;
};

// The stored notice state only changes through this component, so there is nothing to subscribe to.
const subscribeNever = () => () => {};

/**
 * Cookie notice + cookie settings (owner's design, 2026-10-29). The notice shows once, with "Cookie settings" and a
 * close (×) button; closing keeps the defaults (everything on, see lib/cookie-consent.ts). The settings dialog can
 * also be opened later from the footer and the cookie-policy page (openCookieSettings()). Its switches are real:
 * saving updates Consent Mode, our own analytics and the server-side lead events.
 */
export function CookieConsentBanner({ locale, label }: { locale: Locale; label: CookieLabels }) {
  // Server render and first client render both say "seen", so nothing flashes for returning visitors.
  const seenBefore = useSyncExternalStore(subscribeNever, noticeSeen, () => true);
  const [closed, setClosed] = useState(false);
  const [prefs, setPrefs] = useState<CookiePrefs | null>(null); // null = settings dialog closed

  useEffect(() => {
    const open = () => setPrefs(getCookiePrefs());
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  function closeNotice() {
    markNoticeSeen();
    setClosed(true);
  }

  function save() {
    if (prefs) setCookiePrefs(prefs);
    setPrefs(null);
    setClosed(true);
  }

  return (
    <>
      {!seenBefore && !closed && prefs === null && (
        <div
          role="region"
          aria-label={label.settings}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 backdrop-blur transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-full supports-[backdrop-filter]:bg-white/80 motion-reduce:transition-none"
        >
          <div className="container-page relative flex flex-col items-start gap-3 py-4 sm:flex-row sm:items-center sm:gap-3">
            <p className="flex-1 pe-10 text-sm leading-relaxed text-body sm:pe-0">
              {label.body}{" "}
              <Link href={`/${locale}/cookie-policy`} className="font-semibold text-purple-600 underline underline-offset-2 hover:text-purple-900">
                {label.policyLink}
              </Link>
            </p>
            <button
              type="button"
              onClick={() => setPrefs(getCookiePrefs())}
              className="press shrink-0 rounded-full border border-border-strong px-4 py-2 text-xs font-semibold text-purple-900 transition-colors hover:border-purple-600"
            >
              {label.settings}
            </button>
            <button
              type="button"
              onClick={closeNotice}
              aria-label={label.close}
              className="press absolute end-2 top-2 grid size-10 place-items-center rounded-full text-secondary transition-colors hover:bg-tint hover:text-purple-900 sm:static"
            >
              <X size={18} weight="bold" aria-hidden />
            </button>
          </div>
        </div>
      )}
      {prefs && <SettingsDialog label={label} prefs={prefs} onChange={setPrefs} onSave={save} onClose={() => setPrefs(null)} />}
    </>
  );
}

function SettingsDialog({ label, prefs, onChange, onSave, onClose }: { label: CookieLabels; prefs: CookiePrefs; onChange: (p: CookiePrefs) => void; onSave: () => void; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <button type="button" aria-label={label.close} onClick={onClose} className="absolute inset-0 bg-purple-900/40 transition-opacity duration-200 starting:opacity-0 motion-reduce:transition-none" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-xl outline-none transition duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] starting:translate-y-6 starting:opacity-0 sm:rounded-3xl motion-reduce:transition-none"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="cookie-settings-title" className="text-lg font-bold text-purple-900">
            {label.title}
          </h2>
          <button type="button" onClick={onClose} aria-label={label.close} className="press -m-2 grid size-10 shrink-0 place-items-center rounded-full text-secondary transition-colors hover:bg-tint hover:text-purple-900">
            <X size={18} weight="bold" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-body">{label.intro}</p>

        <ul className="mt-5 divide-y divide-border rounded-2xl border border-border">
          <SettingRow title={label.necessary} note={label.alwaysOn} checked disabled />
          <SettingRow title={label.analytics} note={label.analyticsNote} checked={prefs.analytics} onToggle={() => onChange({ ...prefs, analytics: !prefs.analytics })} />
          <SettingRow title={label.ads} note={label.adsNote} checked={prefs.ads} onToggle={() => onChange({ ...prefs, ads: !prefs.ads })} />
        </ul>

        <button type="button" onClick={onSave} className="press mt-6 w-full rounded-full bg-purple-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-900">
          {label.save}
        </button>
      </div>
    </div>
  );
}

function SettingRow({ title, note, checked, disabled, onToggle }: { title: string; note: string; checked: boolean; disabled?: boolean; onToggle?: () => void }) {
  return (
    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
      <div>
        <p className="text-sm font-semibold text-purple-900">{title}</p>
        <p className="mt-0.5 text-xs text-secondary">{note}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-purple-600" : "bg-border-strong"}`}
      >
        <span
          aria-hidden
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-[inset-inline-start] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] ${checked ? "start-6" : "start-1"}`}
        />
      </button>
    </li>
  );
}
