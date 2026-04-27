---
phase: 02-cohorts-hub
plan: 03
subsystem: ui
tags: [next-app-router, react-query, suspense, shadcn, tabs, table, page-container]

# Dependency graph
requires:
  - phase: 02-cohorts-hub
    plan: 01
    provides: Real getCohort(cohortId) service returning CohortDetail (cohort + learners + matrix)
  - phase: 01-foundations
    provides: cohortQueryOptions factory, requireAdmin gate, getQueryClient, PageContainer, Tabs/Table primitives, Icons registry
provides:
  - /dashboard/teach/cohorts/[cohort] dynamic RSC route (slim — gate, prefetch, hydrate)
  - /dashboard/teach/cohorts/[cohort]/error.tsx segment error boundary
  - <CohortDetail/> client wrapper that owns PageContainer header + Tabs IA, sourced from useSuspenseQuery(cohortQueryOptions(cohortId))
  - <LearnersTable/> plain shadcn Table with row-as-link to Phase-3 learner page URL
affects:
  - 02-04 progress-matrix (forward dependency — CohortDetail imports <ProgressMatrix/> from sibling Wave-2 plan)
  - 02-05 e2e (Playwright happy-path will validate cohort detail tabs + matrix integration)

# Tech tracking
tech-stack:
  added: []  # No new dependencies. Used existing date-fns, @tanstack/react-query, shadcn primitives.
  patterns:
    - "PageContainer rendered inside client component (not RSC) so locked dynamic pageDescription can be sourced from useSuspenseQuery cached data without a redundant server-side getCohort trip"
    - "Per-cell <Link> wrappers for whole-row click affordance (rows can't legally be wrapped in <a>; only Name cell's link is keyboard-focusable, secondary cells use tabIndex=-1 + aria-hidden='true')"
    - "Forward-declared sibling component import (ProgressMatrix from sibling Wave-2 plan 02-04 — accepted TS error until 02-04 lands)"
    - "Date-distance formatter ladder: ≤7d formatDistanceToNowStrict, ≤30d 'MMM d', else 'MMM d, yyyy'"
    - "Slim RSC route — gate + prefetch + hydrate; no PageContainer, no slug-derived placeholders"

key-files:
  created:
    - src/features/teach/components/learners-table.tsx
    - src/features/teach/components/cohort-detail.tsx
    - src/app/dashboard/teach/cohorts/[cohort]/page.tsx
    - src/app/dashboard/teach/cohorts/[cohort]/error.tsx
  modified: []

key-decisions:
  - Moved PageContainer from RSC route into client CohortDetail component to satisfy locked UI-SPEC pageDescription contract `{cohort.termHint} · {cohort.learnerCount} learners` without a redundant second server-side getCohort call (single React-Query fetch, suspended-data sourced)
  - termHint fallback to cohort.name when termHint is absent (D-08 placeholder may be empty in future schema) — preserves the locked pageDescription format
  - Export icon size = 16px (`h-4 w-4`) per UI-SPEC §Copywriting Contract row "Page header action — secondary placeholder CTA" — not 12px (`h-3 w-3`) which would violate the locked contract
  - Per-cell <Link> wrappers in the learners table (rows can't legally be wrapped in <a>); Name cell's link is the only focusable target — secondary cells use tabIndex=-1 + aria-hidden='true' so screen readers don't redundantly announce the same target four times per row
  - Default sort on learners table = name ASC via Array#toSorted() (immutable per CLAUDE.md / oxlint unicorn/no-array-sort)

patterns-established:
  - "PageContainer-inside-client-component pattern for routes whose page header copy depends on suspended query data"
  - "Slim-RSC-route pattern: gate + prefetch + hydrate only; client component owns header + body so single fetch satisfies both"

requirements-completed: [COD-01, COD-02, COD-04]

# Metrics
duration: 5min
completed: 2026-04-27
---

# Phase 2 Plan 03: Cohort Detail Tabs + Learners Table Summary

**Dynamic RSC route `/dashboard/teach/cohorts/[cohort]` plus tabbed client UI (Learners + Progress matrix) consuming the Wave-1 service via `cohortQueryOptions(cohortId)`. Page header (PageContainer) renders inside the client component so the locked UI-SPEC `pageDescription` can be sourced from suspended query data without a redundant server-side `getCohort` call.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-27T10:02:18Z
- **Completed:** 2026-04-27T10:07:22Z
- **Tasks:** 3
- **Files created:** 4

## Accomplishments

- Slim dynamic RSC route at `/dashboard/teach/cohorts/[cohort]` — awaits async params, defense-in-depth `requireAdmin()`, prefetches `cohortQueryOptions(cohortId)`, hydrates the client `CohortDetail` inside a top-level `<Suspense>`
- Segment error boundary (`error.tsx`) reuses the destructive `Alert` pattern with the locked copy `Could not load cohort`
- Client `CohortDetail` component owns the `PageContainer` header (with the locked dynamic description `{cohort.termHint} · {cohort.learnerCount} learners`) AND the two-tab IA (Learners default + Progress matrix), reading the prefetched `CohortDetail` once via `useSuspenseQuery`
- `LearnersTable` plain shadcn Table with the four locked columns (Name | Level | Submissions | Latest activity), default sort `name ASC`, row-as-link to the Phase-3 learner page URL, locked empty-state copy

## Task Commits

Each task was committed atomically (no Claude attribution per project convention):

1. **Task 1: Create learners-table.tsx** — `b5a646d` (feat)
2. **Task 2: Create cohort-detail.tsx** — `62940e4` (feat)
3. **Task 3: Create [cohort]/page.tsx + error.tsx** — `1724144` (feat)

## Files Created/Modified

### Created

- **`src/features/teach/components/learners-table.tsx`** (99 lines) — Plain shadcn `<Table>` with the locked four columns. Each row uses `cursor-pointer hover:bg-brand-cream` affordance. Per-cell `<Link>` wrappers point to `/dashboard/teach/cohorts/{cohortId}/learners/{learnerId}` (Phase-3 URL only). Name cell's link is the focusable target (other cells use `tabIndex={-1}` + `aria-hidden='true'`). Empty state renders the literal `No learners in this cohort yet.` Default sort `name ASC` via `Array#toSorted()` (immutable). `formatLatestActivity` uses date-fns `formatDistanceToNowStrict` for ≤7 days, `format(date, 'MMM d')` for ≤30 days, else `format(date, 'MMM d, yyyy')`.

- **`src/features/teach/components/cohort-detail.tsx`** (50 lines) — Client wrapper marked `'use client'`. Calls `useSuspenseQuery(cohortQueryOptions(cohortId))` once and feeds the resulting `CohortDetail` into both child components. Owns `PageContainer` with `pageTitle={cohort.name}`, `pageDescription={\`${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} learners\`}` (UI-SPEC locked literal), and a disabled `Export` button using `Icons.upload` at `h-4 w-4` (16px UI-SPEC, **not** 12px). Renders `<Tabs defaultValue='learners'>` with `Learners` (default active) and `Progress matrix` tabs. Imports `<ProgressMatrix/>` from sibling plan 02-04 (parallel Wave-2 dependency).

- **`src/app/dashboard/teach/cohorts/[cohort]/page.tsx`** (47 lines) — Slim async RSC. Signature `params: Promise<{ cohort: string }>`, awaits `params` to extract `cohortId`. Calls `await requireAdmin()` (defense-in-depth). Prefetches `cohortQueryOptions(cohortId)` via `void queryClient.prefetchQuery(...)`. Wraps `<CohortDetail cohortId={cohortId}/>` in `<HydrationBoundary state={dehydrate(queryClient)}>` + `<Suspense fallback={<CohortDetailSkeleton/>}>`. The skeleton renders header rows + tab strip + content block to mirror UI-SPEC §Loading state. **No** `PageContainer` import (lives in the client component now), **no** `humanizeSlug`, **no** `Icons.upload`.

- **`src/app/dashboard/teach/cohorts/[cohort]/error.tsx`** (20 lines) — Client error boundary marked `'use client'`. Uses `Alert variant='destructive'` + `Icons.alertCircle` (16px). Title `Could not load cohort`. Description appends `error.message` (when present) for diagnostic context.

## Implementation Excerpts

### `cohort-detail.tsx` — locked UI-SPEC `pageDescription`

```typescript
export function CohortDetail({ cohortId }: CohortDetailProps) {
  const { data: cohortDetail } = useSuspenseQuery(cohortQueryOptions(cohortId));
  const { cohort } = cohortDetail;

  return (
    <PageContainer
      pageTitle={cohort.name}
      pageDescription={`${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} learners`}
      pageHeaderAction={
        <Button variant='outline' disabled aria-disabled='true' title='Coming soon'>
          <Icons.upload className='mr-1 h-4 w-4' aria-hidden='true' />
          Export
        </Button>
      }
    >
      <Tabs defaultValue='learners' className='flex flex-col gap-4'>
        <TabsList>
          <TabsTrigger value='learners'>Learners</TabsTrigger>
          <TabsTrigger value='matrix'>Progress matrix</TabsTrigger>
        </TabsList>
        <TabsContent value='learners' className='m-0'>
          <LearnersTable cohortDetail={cohortDetail} />
        </TabsContent>
        <TabsContent value='matrix' className='m-0'>
          <ProgressMatrix cohortDetail={cohortDetail} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
```

### `learners-table.tsx` — date-distance ladder

```typescript
function formatLatestActivity(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const days = Math.abs(differenceInDays(new Date(), date));
  if (days <= 7) return formatDistanceToNowStrict(date, { addSuffix: true });
  if (days <= 30) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}
```

## Decisions Made

### PageContainer moved from RSC route to client `CohortDetail`

The Phase 2 PATTERNS map originally pictured `PageContainer` rendering inside the RSC route (line 196–215). The plan revised that placement because UI-SPEC §Cohort detail page locks the `pageDescription` as `{cohort.termHint} · {cohort.learnerCount} learners` — a string requiring the cohort summary (term hint + learner count). Sourcing it server-side would force a redundant `getCohort` call on the RSC (the same call already prefetched into the React-Query cache).

By moving `PageContainer` into the client `CohortDetail` component, we get:

- **Single fetch:** the prefetched `cohortQueryOptions(cohortId)` cache entry serves both the header copy and the body data
- **Locked contract honored:** the description is sourced from real query data, not from a slug-derived placeholder (the prior design rendered the slug as both `pageTitle` and `pageDescription`, which violated the UI-SPEC contract)
- **RSC stays slim:** the route's responsibilities shrink to gate / prefetch / hydrate / render `<CohortDetail/>` — no PageContainer, no slug humanization

**Trade-off:** First paint shows the skeleton, then the header + tabs hydrate together. This is acceptable per UI-SPEC §Loading state. A future iteration could render a pageTitle-only PageContainer in the RSC and stream just the description+content from the client, but that complicates the seam without meaningful UX gain at v1 scale.

### Export icon size = 16px (`h-4 w-4`)

UI-SPEC §Copywriting Contract row "Page header action — secondary placeholder CTA" locks `Icons.upload` at **16px / `h-4 w-4`**. The earlier PATTERNS-map sketch (line 154) showed `h-3 w-3` (12px), but the locked contract supersedes the sketch. The implementation uses `h-4 w-4` everywhere; `h-3 w-3` is forbidden in this file (verified by negative grep).

### Per-cell `<Link>` wrappers in learners table

HTML5 disallows `<a>` wrapping `<tr>`, so we cannot make the row itself a single link. The accessible workaround is per-cell `<Link>` wrapping. To avoid screen-reader redundancy (announcing the same href four times per row), only the Name cell's link carries `aria-label={\`Open ${learner.name}\`}` and is keyboard-focusable; the other three cells use `tabIndex={-1}` + `aria-hidden='true'` so they remain mouse-clickable but invisible to AT navigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Lint/Style] Used `Array#toSorted()` instead of `Array#sort()` (consistent with plan 02-01's lint fix)**

- **Found during:** Task 1 implementation
- **Issue:** The plan's action block showed `[...cohortDetail.learners].sort((a, b) => a.name.localeCompare(b.name))` to avoid mutating the source array. While the spread copy is functionally safe, oxlint's `unicorn/no-array-sort` rule still flags any `.sort()` invocation, and CLAUDE.md / `common/coding-style.md` immutability principle prefers non-mutating array methods.
- **Fix:** Used `cohortDetail.learners.toSorted((a, b) => a.name.localeCompare(b.name))` (ES2023). Returns a new sorted array without mutating; satisfies both lint and the project's immutability rule. This matches the lint fix that plan 02-01 applied to `service.ts` (commit `f583bf4`).
- **Files modified:** `src/features/teach/components/learners-table.tsx`
- **Verification:** `npx oxlint src/features/teach/components/learners-table.tsx` → 0 warnings, 0 errors. `npx tsc --noEmit` → 0 errors.
- **Committed in:** Task 1 commit `b5a646d` (folded — no separate fix commit needed).

**2. [Rule 2 — A11y improvement] Added `tabIndex={-1}` + `aria-hidden='true'` on secondary row Links**

- **Found during:** Task 1 implementation
- **Issue:** Plan's action block wrapped each row cell in `<Link>` with `block` styling but did not differentiate primary from secondary cells. Without `tabIndex={-1}` + `aria-hidden='true'`, screen-reader users encounter four identical link announcements per learner row (one per cell). This violates ASVS V12.6 / WAI-ARIA "avoid redundant announcements".
- **Fix:** Only the Name cell carries `aria-label={\`Open ${learner.name}\`}` and is focusable. Secondary cells (Level, Submissions, Latest activity) use `tabIndex={-1}` + `aria-hidden='true'` so they remain mouse-click targets but do not pollute the AT tree.
- **Files modified:** `src/features/teach/components/learners-table.tsx`
- **Committed in:** Task 1 commit `b5a646d` (folded — no separate fix commit needed).

---

**Total deviations:** 2 auto-fixed (1 lint/immutability, 1 a11y). No deviation from CONTEXT.md decisions; all UI-SPEC locked copy/sizes preserved verbatim.

## Issues Encountered

### Forward dependency on `progress-matrix.tsx` (expected)

`cohort-detail.tsx` imports `ProgressMatrix` from `@/features/teach/components/progress-matrix`, which is built by **plan 02-04** running in parallel in the same Wave 2. At our verification time (`tsc --noEmit`), this raises:

```
src/features/teach/components/cohort-detail.tsx(11,32): error TS2307:
  Cannot find module '@/features/teach/components/progress-matrix' or its corresponding type declarations.
```

This is the **only** TypeScript error in the worktree, and it is documented in the plan's verification gate:

> `tsc --noEmit` passes (excluding errors that originate from missing progress-matrix.tsx — those clear when plan 02-04 lands)

After plan 02-04 merges into Wave 2, this error resolves automatically. Plan 02-05 (Wave 3) provides the integration validation via Playwright.

## Acceptance Criteria — All Passed

### Task 1 — `learners-table.tsx`

- [x] File exists; line 1 = `'use client';`
- [x] `import Link from 'next/link';`
- [x] `import { differenceInDays, format, formatDistanceToNowStrict } from 'date-fns';`
- [x] All four exact column headers: `Name`, `Level`, `Submissions`, `Latest activity`
- [x] `tabular-nums` on Submissions column
- [x] `hover:bg-brand-cream` on row affordance
- [x] `/dashboard/teach/cohorts/${cohortId}/learners/${learner.id}` link target (COD-04)
- [x] Empty state literal `No learners in this cohort yet.`
- [x] `localeCompare` (default name-ASC sort)
- [x] No `@tabler/icons-react` import
- [x] `tsc --noEmit` passes with 0 errors

### Task 2 — `cohort-detail.tsx`

- [x] File exists; line 1 = `'use client';`
- [x] All required imports: `useSuspenseQuery`, `Tabs/TabsContent/TabsList/TabsTrigger`, `cohortQueryOptions`, `LearnersTable`, `ProgressMatrix`, `PageContainer`, `Icons`, `Button`
- [x] `pageTitle={cohort.name}` (dynamic — sourced from suspended query data)
- [x] Locked literal: `pageDescription={\`${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} learners\`}`
- [x] No slug-derived `pageDescription` placeholder (FORBIDDEN format absent)
- [x] `Icons.upload className='mr-1 h-4 w-4'` (16px UI-SPEC)
- [x] No `Icons.upload className='mr-1 h-3 w-3'` (12px FORBIDDEN — verified absent)
- [x] `disabled` AND `aria-disabled='true'` AND `title='Coming soon'` on Export button
- [x] `defaultValue='learners'` (D-13)
- [x] Both tab labels: `Learners` AND `Progress matrix`
- [x] `useSuspenseQuery(cohortQueryOptions(cohortId))`
- [x] `tsc --noEmit` passes (excluding the documented progress-matrix forward-dep error)

### Task 3 — `[cohort]/page.tsx` + `error.tsx`

- [x] `params: Promise<{ cohort: string }>` async-params signature
- [x] `const { cohort: cohortId } = await params;`
- [x] `await requireAdmin();` (defense-in-depth)
- [x] `void queryClient.prefetchQuery(cohortQueryOptions(cohortId));`
- [x] `<HydrationBoundary state={dehydrate(queryClient)}>`
- [x] `<CohortDetail cohortId={cohortId} />`
- [x] No `import PageContainer` (lives in client component)
- [x] No `humanizeSlug` (slug-derived title duplication FORBIDDEN — verified absent)
- [x] No `Icons.upload` (Export button moved into client component)
- [x] `error.tsx` exists; line 1 = `'use client';`
- [x] `error.tsx` contains `Could not load cohort` literal
- [x] `tsc --noEmit` passes (excluding the documented progress-matrix forward-dep error)

### Plan-level verification

- [x] No new file imports `@tabler/icons-react` directly
- [x] `Icons.upload` paired with `h-4 w-4` (NOT `h-3 w-3`) — UI-SPEC locked size
- [x] `PageContainer` NOT in RSC route (`grep -c PageContainer page.tsx` = 0)
- [x] `PageContainer` IS in client `cohort-detail.tsx` (`grep -c PageContainer` = 3 — import + open tag + close tag)

## User Setup Required

None — all dependencies (date-fns, @tanstack/react-query, shadcn primitives, brand tokens) already exist in the project. No new packages, no env vars, no migrations.

## Manual Smoke Plan (after plan 02-04 lands)

Visit `/dashboard/teach/cohorts/spring-2026` as admin and confirm:

1. PageContainer header shows `Spring 2026` (title) and `Spring 2026 · 49 learners` (description) — counts sourced from real query data, NOT a slug-derived duplicate
2. Export button is disabled with the 16px upload icon and `Coming soon` title
3. Tabs show `Learners` (default active) + `Progress matrix`
4. Learners tab table has rows with the four locked columns; clicking a row navigates to `/dashboard/teach/cohorts/spring-2026/learners/{id}` (will 404 until Phase 3 — expected)
5. Progress matrix tab renders the matrix supplied by plan 02-04
6. Empty cohort: visit a hypothetical empty-cohort URL (or stub `cohortDetail.learners = []` in dev) and verify the literal `No learners in this cohort yet.` is shown

Plan 02-05 (Wave 3) automates checks 1, 3, 4, 5 via Playwright.

## Threat Model Coverage

The plan's `<threat_model>` declared mitigation for T-02-11 (spoofing) and T-02-14/T-02-15 (XSS):

- **T-02-11 (spoofing):** `await requireAdmin()` is called at line 21 of `[cohort]/page.tsx` — verified present and functioning per Phase-1 contract.
- **T-02-14 (XSS via cohort.name):** `cohort.name` is rendered as a React text child in `<PageContainer pageTitle={...}/>`. React escapes strings by default; no `dangerouslySetInnerHTML` is used. Mitigated.
- **T-02-15 (XSS via learner.name):** `learner.name` rendered as text inside `<Link>` in `learners-table.tsx`. Same React-escaping argument. Mitigated.

T-02-12 (SQL injection) and T-02-16 (DoS) live at the service / DB boundary owned by plan 02-01; this plan does not introduce new query paths.

## Threat Flags

None — this plan does not introduce new network endpoints, auth paths, file access patterns, or schema changes outside the threat-model surface declared in the plan.

## Next Phase Readiness

- **Wave-2 remains coherent.** Plan 02-04 (progress-matrix) is in flight in parallel; once it lands, the only remaining `tsc --noEmit` error in `cohort-detail.tsx` resolves automatically.
- **Plan 02-05 (Wave 3 e2e) unblocked at the cohort-detail layer.** Playwright spec from PATTERNS map can target `/dashboard/teach/cohorts/spring-2026` and assert the two tabs render plus the row-link target shape.
- **Phase 3 dependency intact.** Learner-row links target `/dashboard/teach/cohorts/{cohortId}/learners/{learnerId}` per ROADMAP success criterion 3 (URL only — Phase 3 wires the page).

## Self-Check: PASSED

Verified all claims:

- File `src/features/teach/components/learners-table.tsx` exists ✓
- File `src/features/teach/components/cohort-detail.tsx` exists ✓
- File `src/app/dashboard/teach/cohorts/[cohort]/page.tsx` exists ✓
- File `src/app/dashboard/teach/cohorts/[cohort]/error.tsx` exists ✓
- Commit `b5a646d` (Task 1) exists in `git log` ✓
- Commit `62940e4` (Task 2) exists in `git log` ✓
- Commit `1724144` (Task 3) exists in `git log` ✓
- `tsc --noEmit` produces only the documented `progress-matrix` forward-dep error ✓
- `oxlint` over all four new files → 0 warnings, 0 errors ✓
- No `@tabler/icons-react` direct import in any new file ✓
- `Icons.upload` paired with `h-4 w-4` (not `h-3 w-3`) ✓
- `PageContainer` absent from RSC route, present in client component ✓

---
*Phase: 02-cohorts-hub*
*Completed: 2026-04-27*
