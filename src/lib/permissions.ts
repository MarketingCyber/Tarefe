import type { UserRole } from "@prisma/client";

/**
 * Centralized role-group checks for /ops — added 2026-10-01 alongside
 * LEAD_MANAGER/CONTENT_EDITOR/ANALYST. Before this, every gate in the app
 * spelled out `role !== "ADVISOR" && role !== "ADMIN"` (duplicated across
 * ~15 files), which quietly meant "any staff role" back when those were
 * the only two. That stops being true with narrower roles — a
 * CONTENT_EDITOR is staff but shouldn't pass a pipeline check, so each
 * resource now asks the group that actually applies to it, not a blanket
 * "is this person staff at all".
 *
 * ADVISOR and ADMIN are in every group — the point of adding narrower
 * roles was to let new hires see *less* than the original two roles, not
 * to take anything away from them. ADMIN additionally gets isAdminRole()
 * for /ops/team, which nothing else grants.
 */

const PIPELINE_ROLES: UserRole[] = ["ADVISOR", "ADMIN", "LEAD_MANAGER"];
const CONTENT_ROLES: UserRole[] = ["ADVISOR", "ADMIN", "CONTENT_EDITOR"];
const ANALYTICS_ROLES: UserRole[] = ["ADVISOR", "ADMIN", "ANALYST"];
const STAFF_ROLES: UserRole[] = ["ADVISOR", "ADMIN", "LEAD_MANAGER", "CONTENT_EDITOR", "ANALYST"];

type RoleLike = UserRole | string | null | undefined;

function hasRole(role: RoleLike, allowed: UserRole[]): boolean {
  return !!role && (allowed as string[]).includes(role);
}

/** Any of the five staff roles — replaces the old "is this ADVISOR or ADMIN" checks used for things every staff member can do regardless of their specific role (see /ops/layout.tsx, /ops/security, /ops/my-work). */
export function isStaffRole(role: RoleLike): boolean {
  return hasRole(role, STAFF_ROLES);
}

/** Leads, customers, applications, contracts, tickets, tasks — the day-to-day sales/support pipeline. LEAD_MANAGER's whole reason to exist. */
export function canAccessPipeline(role: RoleLike): boolean {
  return hasRole(role, PIPELINE_ROLES);
}

/** Guides, FAQ, testimonials, energy tariffs — public-site content, no customer PII. CONTENT_EDITOR's whole reason to exist. */
export function canAccessContent(role: RoleLike): boolean {
  return hasRole(role, CONTENT_ROLES);
}

/** /ops/analytics — the page itself has no mutations, so granting ANALYST access here is inherently read-only; there's nothing further to restrict. */
export function canAccessAnalytics(role: RoleLike): boolean {
  return hasRole(role, ANALYTICS_ROLES);
}

/** /ops/team only — granting or revoking a colleague's access is deliberately stricter than every other group above. */
export function isAdminRole(role: RoleLike): boolean {
  return role === "ADMIN";
}
