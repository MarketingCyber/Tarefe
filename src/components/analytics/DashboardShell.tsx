"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Navigation plumbing for the analytics dashboard.
 *
 * Every filter, tab and range choice on the page is a plain LINK to the same
 * route with different query params — the URL is the whole state, so any view
 * is bookmarkable and shareable, and there are no "Apply" buttons. This file
 * makes those links feel instant:
 *
 *  - NavLink navigates through router.push inside a React transition, so the
 *    page does not reload and the old view stays on screen until the new one
 *    is ready.
 *  - While that transition is pending the whole dashboard dims to 60%
 *    (DashboardShell). No skeleton, no layout jump, no flash — the frame is
 *    held, which is what the BI guidance asks for on refetch.
 *  - Dropdown closes itself on choosing something, on Esc and on an outside
 *    click, and animates open from its trigger (150 ms, ease-out; transform +
 *    opacity only; off under prefers-reduced-motion).
 */
const NavContext = createContext<{ navigate: (href: string) => void; pending: boolean }>({ navigate: () => {}, pending: false });

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const navigate = useCallback((href: string) => start(() => router.push(href, { scroll: false })), [router]);
  return (
    <NavContext.Provider value={{ navigate, pending }}>
      <div aria-busy={pending} className={`transition-opacity duration-150 ease-out motion-reduce:transition-none ${pending ? "opacity-60" : "opacity-100"}`}>
        {children}
      </div>
    </NavContext.Provider>
  );
}

/** A link that behaves like a normal <a> (middle-click, copy address, open in new tab all work) but navigates without a reload. */
export function NavLink({ href, className, children, title, active, role }: { href: string; className?: string; children: React.ReactNode; title?: string; active?: boolean; role?: string }) {
  const { navigate } = useContext(NavContext);
  return (
    <a
      href={href}
      title={title}
      role={role}
      aria-current={active ? "true" : undefined}
      className={className}
      onClick={(e) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

export function Dropdown({
  label,
  children,
  align = "start",
  buttonClassName,
  panelClassName,
  ariaLabel,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  align?: "start" | "end";
  buttonClassName?: string;
  panelClassName?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // Choosing anything changes the URL — close on that, so the menu never sits open over the new view.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing in response to the URL changing, an external system
    setOpen(false);
  }, [pathname, search]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="sm:relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        className={buttonClassName ?? "press inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border-strong bg-white px-3.5 text-sm font-medium text-purple-900 transition-colors hover:border-purple-600"}
      >
        {label}
      </button>
      <div
        id={id}
        inert={!open}
        // Phones: a bottom sheet pinned inside the viewport (a closed absolute panel
        // wider than the screen would still add horizontal scroll). sm+: anchored under the button.
        className={`fixed inset-x-3 bottom-3 z-30 max-h-[70vh] origin-bottom overflow-y-auto rounded-xl border border-border bg-white p-1.5 shadow-[0_12px_32px_-12px_rgba(36,20,38,0.22)] transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none sm:absolute sm:inset-x-auto sm:bottom-auto sm:top-full sm:mt-2 sm:min-w-[16rem] ${
          align === "end" ? "sm:end-0 sm:origin-top-right sm:rtl:origin-top-left" : "sm:start-0 sm:origin-top-left sm:rtl:origin-top-right"
        } ${open ? "scale-100 opacity-100" : "pointer-events-none scale-[0.97] opacity-0"} ${panelClassName ?? ""}`}
      >
        <div className="sticky -top-1.5 z-10 -mx-1.5 -mt-1.5 mb-1 flex justify-end bg-white px-3 pb-1 pt-2 sm:hidden">
          <button type="button" onClick={() => setOpen(false)} className="press rounded-full bg-tint px-3 py-1 text-xs font-medium text-purple-900">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
