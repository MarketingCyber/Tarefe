"use client";

/**
 * Wraps a delete Server Action form with a native confirm() prompt —
 * /ops/faq's delete button is the first true hard-delete action in the
 * ops UI (leads/tickets/tasks are all status-changed, never removed), and
 * shipping the first one with zero confirmation is a real footgun: one
 * misclick permanently destroys content with no undo. A plain browser
 * confirm() is enough here — this isn't consequential enough to warrant a
 * custom modal (unlike, say, account deletion, which is staff-reviewed
 * for a different reason — see src/app/app/profile/page.tsx).
 */
export function ConfirmDeleteForm({
  action,
  id,
  message,
  className,
  children,
  hiddenFields,
}: {
  action: (formData: FormData) => void | Promise<void>;
  id: string;
  message: string;
  className?: string;
  children: React.ReactNode;
  /** Extra hidden fields the action needs beyond `id` — e.g. a returnPath so the action revalidates the page it was called from, not a hardcoded default. */
  hiddenFields?: Record<string, string>;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      {hiddenFields &&
        Object.entries(hiddenFields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
