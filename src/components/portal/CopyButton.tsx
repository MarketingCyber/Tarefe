"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

/** Copies a value (a referral code or link); the label turns into a confirmation for two seconds. */
export function CopyButton({ value, label, copiedLabel = "کپی شد" }: { value: string; label: string; copiedLabel?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked (insecure context, permissions): the value stays visible to copy by hand.
        }
      }}
      className="press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-semibold text-purple-900 hover:border-purple-600"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
