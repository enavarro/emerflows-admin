// ============================================================
// Teach Admin — universal formatters (no I/O, no server-only).
// ============================================================
// This module is safe to import from BOTH server and client code.
// Keep it free of `'server-only'` and free of any Supabase/admin
// dependency so route files (RSC) and client components alike can
// reuse the same display contract (e.g. cohort title rendered
// before the Suspense boundary resolves the real cohort name).
// ============================================================

/**
 * Humanize a cohort slug for display.
 *
 * Converts a kebab-case cohort id (e.g. `spring-2026`) into a
 * Title Case string (e.g. `Spring 2026`).
 *
 * Pure function — no I/O. Safe to call from server or client.
 */
export function humanizeCohortId(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
