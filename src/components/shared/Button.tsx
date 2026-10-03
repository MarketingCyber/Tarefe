import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_STYLE: Record<ButtonVariant, string> = {
  primary: "bg-purple-600 font-semibold text-white hover:bg-purple-900",
  secondary: "border border-border-strong font-medium text-purple-900 hover:border-purple-600",
  danger: "border border-danger/40 font-semibold text-danger hover:bg-danger-bg",
  ghost: "font-medium text-secondary hover:text-purple-600",
};

const SIZE_STYLE: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-xs",
  lg: "px-6 py-2.5 text-sm",
};

/**
 * Phase 2.3's "Buttons" primitive — purely presentational (no knowledge of
 * Server Actions), so it drops straight into `<form action={...}>` the
 * same way a raw `<button type="submit">` did. Scoped to the ops/CRM
 * surface for now (see the design-taste review that shipped alongside
 * this): 77 hand-styled `className="press ..."` buttons exist across the
 * whole app, but retrofitting the public marketing site risks visual
 * regressions on pages that got real design attention this project
 * (mega menu, hero, homepage grid) for a mechanical refactor with no
 * user-facing upside there — ops/CRM is where the actual duplication
 * (identical variants, copy-pasted across 8+ list/detail pages) lives.
 */
export function Button({
  variant = "primary",
  size = "sm",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      {...props}
      className={`press rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_STYLE[variant]} ${SIZE_STYLE[size]} ${className}`}
    />
  );
}
