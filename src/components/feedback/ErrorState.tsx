import { WarningCircle } from "@phosphor-icons/react/dist/ssr";

/**
 * Per Phase 2 §24: errors explain what went wrong and how to fix it, in
 * the interface's own voice — no apology, no vagueness.
 */
export function ErrorState({
  title,
  body,
  retryLabel,
  onRetry,
}: {
  title: string;
  body: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-danger-bg bg-danger-bg/40 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-danger">
        <WarningCircle size={24} weight="fill" />
      </span>
      <p className="text-sm font-semibold text-purple-900">{title}</p>
      <p className="max-w-[38ch] text-xs text-secondary">{body}</p>
      {retryLabel && onRetry && (
        <button type="button" onClick={onRetry} className="press mt-2 inline-flex items-center gap-1.5 rounded-full border border-border-strong bg-white px-4 py-2 text-xs font-semibold text-purple-900">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
