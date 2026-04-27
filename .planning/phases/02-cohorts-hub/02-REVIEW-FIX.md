---
phase: 02-cohorts-hub
fixed_at: 2026-04-27T00:00:00Z
review_path: .planning/phases/02-cohorts-hub/02-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 02-cohorts-hub: Code Review Fix Report

**Fixed at:** 2026-04-27
**Source review:** `.planning/phases/02-cohorts-hub/02-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (1 Critical + 4 Warning; Info findings excluded per `fix_scope=critical_warning`)
- Fixed: 5
- Skipped: 0
- Build status: `npx next build` passes cleanly (verified — CR-01 resolved end-to-end)

## Fixed Issues

### CR-01: queries.ts static-imports server-only service into client bundle (build-blocking)

**Files modified:** `src/features/teach/api/queries.ts`, `src/app/dashboard/teach/cohorts/page.tsx`, `src/app/dashboard/teach/cohorts/[cohort]/page.tsx`
**Commits:** `8965afc6` (initial dynamic-import attempt) + `8ac47c0c` (followup with the working pattern)
**Applied fix:**

The first attempt (commit `8965afc6`) followed the REVIEW.md suggestion and dynamic-imported `./service` inside each `queryFn`. `npx tsc --noEmit` passed but `npx next build` STILL failed with the same 4 server-only errors — Turbopack traces dynamic `import()` calls as static graph dependencies and treats them as part of the client bundle when reached from a `'use client'` module.

The followup (commit `8ac47c0c`) implements the truly bundle-safe split:
1. `queries.ts` is now key-only — every `queryFn` is a placeholder that throws `"queryFn was invoked, but data should have been hydrated from the server"`. No service import in any form.
2. Both route files (`cohorts/page.tsx` and `cohorts/[cohort]/page.tsx`) prefetch with an inline `prefetchQuery({ queryKey: teachKeys.x(), queryFn: () => getX() })`. The route is RSC, so `import { getCohorts } from '@/features/teach/api/service'` is fine.
3. Client `useSuspenseQuery(cohortsQueryOptions())` calls resolve synchronously from hydrated cache — the placeholder queryFn is never invoked.

`npx next build` now compiles in 4.4s with zero server-only errors and emits the production routes. Verified.

### WR-01: PageContainer rendered inside the client suspense boundary (cohort detail)

**Files modified:** `src/app/dashboard/teach/cohorts/[cohort]/page.tsx`, `src/features/teach/components/cohort-detail.tsx`, `src/features/teach/lib/format.ts` (new)
**Commit:** `8b57cd0e`
**Applied fix:**
- Created `src/features/teach/lib/format.ts` exporting a non-server-only `humanizeCohortId()` helper so route files can render a stable title before the suspense boundary resolves.
- Moved `<PageContainer>` from inside `cohort-detail.tsx` up to the route file. `pageTitle={humanizeCohortId(cohortId)}` so the header renders immediately at SSR; the disabled "Export" button stays in `pageHeaderAction`.
- `cohort-detail.tsx` now renders only its own body: a muted `<p>` description (`{termHint} · {N} learners` with proper IN-01 pluralization) above the Tabs.
- `CohortDetailBodySkeleton` slimmed to body-only (description + tabs + content), since the header is now stable across loading/loaded states.

Opportunistic IN-01 fix included: pluralization of `learner` / `learners` so cohorts with exactly one learner read correctly.

### WR-02: Four redundant `<Link>` elements per learner row

**Files modified:** `src/features/teach/components/learners-table.tsx`
**Commit:** `7f9a8c8f`
**Applied fix:**
- Removed the inner `LearnerLinkRow` helper component and the three `tabIndex={-1} aria-hidden='true'` `<Link>` clones.
- Each row now has exactly one visible `<Link>` on the name cell with class `after:absolute after:inset-0` (the "stretched link" pseudo-element pattern). The `<TableRow>` carries `relative` so the pseudo-element anchors to the row, expanding the click target to the full row.
- Removed the unused `LearnerRow` type import (covers IN-04 opportunistically).
- One anchor per row, single keyboard stop, no duplicate links in click telemetry, whole-row click target preserved.

### WR-03: ISO-string timestamp comparison assumes uniform timezone formatting

**Files modified:** `src/features/teach/api/service.ts`
**Commit:** `ae81c946`
**Applied fix:**
- Added local `tsMs(iso)` helper that returns `Date.parse(iso)` epoch-ms (or `-1` for null/invalid).
- Replaced lexicographic `>` compares on `submitted_at` and `reviewed_at` with numeric epoch-ms compares throughout `getCohort()`:
  - Per-learner `latestActivityAt` selection now uses `Math.max(submittedMs, reviewedMs)`.
  - Matrix latest-submission tiebreak uses `newMs > oldMs`, falling back to `sub.id > existing.id` only on exact-tie.
- Both call sites carry a `WR-03` comment block explaining the rationale (PostgREST `+00:00` vs `Z` vs local zone drift).

### WR-04: Sticky header + sticky column inside Radix `<ScrollArea>` is brittle

**Files modified:** `src/features/teach/components/progress-matrix.tsx`
**Commit:** `8594cb94`
**Applied fix:**
- Removed `ScrollArea` and `ScrollBar` imports.
- Wrapped `<Table>` in a plain `<div className='bg-card relative w-full overflow-auto rounded-md border'>` — the sticky positioning now anchors to a known, stable scrolling ancestor that does not depend on Radix internal viewport overflow strategy.
- Re-ordered Tailwind classes consistent with project formatter conventions; preserved the z-index hierarchy (top-left `z-30` > module headers `z-20` > sticky-row first cells `z-10`).
- Added a `WR-04` comment block explaining the rationale and z-index ordering for future maintainers.

## Skipped Issues

None — all five in-scope findings were fixed, verified, and committed.

## Verification

- `npx tsc --noEmit` passes after every fix (no new type errors introduced).
- `npx next build` compiles successfully (4.4s, 28 static pages generated). The 4 `'server-only' cannot be imported from a Client Component module` errors that the source review reported are gone.
- Each commit is atomic, listing only the files needed for that finding.
- All commits use conventional `fix(02): {ID} {short description}` format with no Claude attribution.

## Notes for next iteration

- IN-01 (pluralization) was fixed opportunistically alongside WR-01 since both touched the description string in `cohort-detail.tsx`.
- IN-04 (unused `LearnerRow` import) was removed as part of WR-02's anchor refactor.
- IN-02, IN-03, IN-05 remain open (they were Info-level and out of `critical_warning` scope). Address them in a future review iteration if desired.

---

_Fixed: 2026-04-27_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
