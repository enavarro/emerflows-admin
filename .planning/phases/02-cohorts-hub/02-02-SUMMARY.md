---
phase: 02-cohorts-hub
plan: 02
subsystem: ui
tags: [next-app-router, react-query, shadcn, suspense, hydration, rsc, cohorts]

# Dependency graph
requires:
  - phase: 02-cohorts-hub
    plan: 01
    provides: getCohorts() service body returning real Cohort[]; cohortsQueryOptions() React Query factory
  - phase: 01-foundations
    provides: PageContainer; requireAdmin(); getQueryClient(); shadcn Card/Badge/Button/Skeleton/Alert primitives; @/components/icons registry; brand tokens
provides:
  - /dashboard/teach/cohorts route renders real cohort cards from getCohorts()
  - CohortCard presentational component (whole-card-as-link to cohort detail)
  - CohortsListing client component (suspense consumer + empty state)
  - cohorts/error.tsx route segment error boundary
  - Locked-copy header with two disabled placeholder CTAs (Export, + New cohort)
affects: [02-03 cohort-detail (entry point per CohortCard link), 02-05 e2e (covers this route)]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — only shadcn primitives already in repo + existing TanStack patterns
  patterns:
    - "RSC prefetch + HydrationBoundary + Suspense" — copy of demos-listing.tsx canonical shape
    - "Whole-card-as-link" wrapping shadcn Card in next/link with aria-label='Open {name}'
    - "Disabled-button placeholders with disabled + aria-disabled + title='Coming soon'" (D-11/D-12 IA preservation)
    - "CSS grid auto-fill minmax(340px, 1fr) + gap-6" via inline style for one-off cohort grid
    - "Icons.* registry-only" usage — no direct @tabler/icons-react imports

key-files:
  created:
    - src/features/teach/components/cohort-card.tsx
    - src/features/teach/components/cohorts-listing.tsx
    - src/app/dashboard/teach/cohorts/error.tsx
  modified:
    - src/app/dashboard/teach/cohorts/page.tsx  # Phase-1 stub replaced entirely; requireAdmin defense-in-depth preserved

key-decisions:
  - "Followed UI-SPEC verbatim — every visible string locked from §Copywriting Contract (page title, page description, button labels, empty-state heading + body, error heading + body, stat labels)"
  - "Export icon at h-4 w-4 (16px) per UI-SPEC §Visual Fidelity — NOT h-3 w-3 which the PATTERNS.md analog example used for the chevron-affordance only"
  - "Whole CohortCard wrapped in next/link rather than nested inner buttons — UI-SPEC §Interaction Contract row 1 (no inner actions in v1)"
  - "Used inline style for grid-template-columns rather than adding a Tailwind config rule — Tailwind v4 has no tailwind.config.js in the project, and the 340px breakpoint is a one-off cohort-grid value"
  - "Stats grid uses Tailwind grid-cols-2 + gap-4 (8 px). Stat labels render as text-xs uppercase tracking-wider muted, values as text-sm font-semibold tabular-nums brand-teal — both fit UI-SPEC's two-weight type contract (400 Body / 600 Label)"
  - "Skeleton fallback = 3 cards at h-56 (matches UI-SPEC ~220px card min-height)"

requirements-completed: [COH-01, COH-02, COH-03]

# Metrics
duration: ~10min
completed: 2026-04-27
---

# Phase 2 Plan 02: Cohorts Listing UI Summary

**Replaced the Phase-1 cohorts page stub with a real RSC route that prefetches `cohortsQueryOptions()`, hydrates a `<CohortsListing />` client component via `<HydrationBoundary>` + `<Suspense>`, and renders prototype-faithful `<CohortCard />` tiles using only shadcn primitives + brand tokens — completing COH-01 (real per-cohort cards), COH-02 (zero-state), COH-03 (prototype IA via shadcn primitives).**

## Performance

- **Started:** worktree base reset → first edit
- **Tasks:** 3 (all auto, no checkpoints)
- **Files created:** 3 (cohort-card.tsx, cohorts-listing.tsx, error.tsx)
- **Files modified:** 1 (page.tsx — stub fully replaced)

## Accomplishments

- `/dashboard/teach/cohorts` now renders the real cohorts list from Wave-1's `getCohorts()` instead of the "Cohorts list ships in Phase 2." stub
- `CohortCard` mirrors the prototype `teacher-admin/teacher-admin.jsx` IA — status pill (`Active` + sage dot), level badge (`B1–B2`), cohort name, term hint, 4-stat grid (Students / Completion / Needs review / Next), and bottom-right `Open >` chevron — using only shadcn `Card` + `Badge` + brand tokens (no prototype CSS ported)
- `CohortsListing` consumes `useSuspenseQuery(cohortsQueryOptions())` and renders either the cohort grid (`repeat(auto-fill, minmax(340px, 1fr))` + `gap-6`) or the locked empty state (`Icons.school` + "No cohorts yet" + "Cohorts appear here once learners are enrolled.")
- Page header uses `PageContainer` with locked title `Cohorts`, description `Browse cohorts and drill into a cohort to review learner progress.`, and two disabled placeholder CTAs (`Export` outline+upload-icon at locked 16 px size; `+ New cohort` default) — preserving prototype IA per D-11 / D-12
- Suspense fallback renders 3 skeleton cards in the same 340 px grid so the layout doesn't shift on hydration
- New `error.tsx` boundary surfaces locked copy (`Could not load cohorts` / `Refresh the page to try again. If the problem persists, contact support.`) with optional `(error.message)` suffix for debugging
- `requireAdmin()` defense-in-depth gate on the page is preserved (layout already gates; page is belt-and-suspenders per existing convention)
- All icons sourced from `@/components/icons` registry — zero direct `@tabler/icons-react` imports in any new file (CLAUDE.md mandate)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create cohort-card.tsx (presentational, prototype-faithful IA)** — `75965af` (feat)
2. **Task 2: Create cohorts-listing.tsx (suspense consumer + grid + empty state)** — `5907ad5` (feat)
3. **Task 3: Replace cohorts/page.tsx + create error.tsx (RSC prefetch + PageContainer + Suspense)** — `580386c` (feat)

## Files Created / Modified

### Created

- **`src/features/teach/components/cohort-card.tsx`** (81 lines) — Pure presentational component. Wraps `<Card>` in `<Link>` with `aria-label='Open {cohort.name}'`. Hover lift (`hover:-translate-y-0.5 hover:bg-brand-cream hover:shadow-md`) + focus ring. 2×2 stat grid via internal `<Stat>` helper. Static placeholders for `Active`, `B1–B2`, `0%`, `Module in progress` per D-07..D-10. `Icons.chevronRight` at 12 px (`h-3 w-3`).
- **`src/features/teach/components/cohorts-listing.tsx`** (37 lines) — `'use client'` consumer. `useSuspenseQuery(cohortsQueryOptions())` resolves the prefetched cache. Empty state = bordered card with `Icons.school` (32 px muted) + locked heading + body. Non-empty = inline-style CSS grid with one `<CohortCard>` per cohort.
- **`src/app/dashboard/teach/cohorts/error.tsx`** (18 lines) — Route-segment error boundary. `'use client'` mandatory for App Router error.tsx. Renders shadcn `<Alert variant='destructive'>` with `Icons.alertCircle` + locked copy.

### Modified

- **`src/app/dashboard/teach/cohorts/page.tsx`** (Phase-1 stub → real RSC, 70 lines) — Imports `Suspense`, `HydrationBoundary`, `dehydrate`, `Button`, `Skeleton`, `Icons`, `PageContainer`, `requireAdmin`, `getQueryClient`, `cohortsQueryOptions`, `CohortsListing`. Server function calls `await requireAdmin()` then `void queryClient.prefetchQuery(cohortsQueryOptions())`. Returns `<PageContainer>` (with locked header and two disabled buttons inside a flex wrapper) wrapping `<HydrationBoundary>` → `<Suspense fallback={<CohortsGridSkeleton />}>` → `<CohortsListing />`. Inline `CohortsGridSkeleton` renders 3 `Skeleton h-56 rounded-xl` blocks in the same 340 px grid.

## Implementation Excerpts

### CohortCard — whole-card-as-link + status pill

```tsx
<Link
  href={`/dashboard/teach/cohorts/${cohort.id}`}
  aria-label={`Open ${cohort.name}`}
  className='block focus:outline-none'
>
  <Card className='cursor-pointer transition hover:-translate-y-0.5 hover:bg-brand-cream hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-teal'>
    <CardHeader className='flex flex-col gap-2'>
      <div className='flex items-center justify-between gap-2'>
        <Badge
          variant='outline'
          className='inline-flex items-center gap-1.5 text-xs uppercase tracking-wider'
        >
          <span className='h-1.5 w-1.5 rounded-full bg-brand-sage' aria-hidden='true' />
          Active
        </Badge>
        <Badge variant='secondary' className='text-xs'>B1–B2</Badge>
      </div>
      ...
```

### CohortsListing — suspense consumer + empty state

```tsx
'use client';
const { data: cohorts } = useSuspenseQuery(cohortsQueryOptions());

if (cohorts.length === 0) {
  return (
    <div className='flex flex-col items-center justify-center gap-3 rounded-md border bg-card py-12 text-center'>
      <Icons.school className='h-8 w-8 text-muted-foreground' aria-hidden='true' />
      <h2 className='text-lg font-semibold text-brand-teal'>No cohorts yet</h2>
      <p className='max-w-sm text-sm text-muted-foreground'>
        Cohorts appear here once learners are enrolled.
      </p>
    </div>
  );
}
```

### page.tsx — RSC prefetch + locked header

```tsx
await requireAdmin();
const queryClient = getQueryClient();
void queryClient.prefetchQuery(cohortsQueryOptions());

return (
  <PageContainer
    pageTitle='Cohorts'
    pageDescription='Browse cohorts and drill into a cohort to review learner progress.'
    pageHeaderAction={
      <div className='flex items-center gap-2'>
        <Button variant='outline' disabled aria-disabled='true' title='Coming soon'>
          <Icons.upload className='mr-1 h-4 w-4' aria-hidden='true' />
          Export
        </Button>
        <Button variant='default' disabled aria-disabled='true' title='Coming soon'>
          + New cohort
        </Button>
      </div>
    }
  >
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CohortsGridSkeleton />}>
        <CohortsListing />
      </Suspense>
    </HydrationBoundary>
  </PageContainer>
);
```

## Decisions Made

- **Export icon size: `h-4 w-4` (16 px) — locked from UI-SPEC.** PATTERNS.md showed an example snippet with `h-3 w-3`, but the UI-SPEC §Copywriting Contract row "Page header action — secondary placeholder CTA" explicitly specifies 16 px. Plan acceptance criteria treated `h-3 w-3` here as a forbidden value. Followed UI-SPEC.
- **Inline `style={{ gridTemplateColumns: ... }}` for cohort grid.** Tailwind v4 in this project has no `tailwind.config.js` and no preset cohort-grid utility. Inline style is the cleanest one-off expression matching the PATTERNS.md and Plan guidance.
- **Disabled buttons keep `disabled` AND `aria-disabled='true'` AND `title='Coming soon'`.** All three present per UI-SPEC §Disabled-button accessibility.
- **`Icons.chevronRight` at `h-3 w-3` on the card open affordance vs `Icons.upload` at `h-4 w-4` in the header.** Two distinct sizes are intentional (UI-SPEC §Visual Fidelity differentiates the small bottom-right card chevron from the page-header export icon).
- **Used `<h3>` for cohort name (not `<CardTitle>`).** Cohort names sit visually below the status row, and the page already has an `<h1>`-equivalent rendered by `PageContainer.Heading`. `<h3>` keeps the document outline coherent without forcing the `CardTitle` primitive's default size styling.

## Deviations from Plan

None — plan executed exactly as written. The only judgement call was the Export icon size (`h-4 w-4` vs `h-3 w-3`), and the plan's own acceptance criteria locked `h-4 w-4` as the required value, so following it was not a deviation.

## Verification

### tsc

```
$ npx tsc --noEmit -p tsconfig.json
(0 errors)
```

### oxlint

```
$ npx oxlint src/features/teach/components/cohort-card.tsx \
             src/features/teach/components/cohorts-listing.tsx \
             src/app/dashboard/teach/cohorts/page.tsx \
             src/app/dashboard/teach/cohorts/error.tsx
Found 0 warnings and 0 errors.
```

### Plan-mandated grep checks

| Check | Result |
|---|---|
| `grep "import 'server-only'" src/app/dashboard/teach/cohorts/page.tsx` | (none — server-only marker stays in service.ts only) |
| `grep "from '@tabler/icons-react'" <new files>` | (none — icon registry rule honored) |
| `grep "Icons.upload" src/app/dashboard/teach/cohorts/page.tsx` | matches `className='mr-1 h-4 w-4'` (locked size) |
| `grep "Cohorts list ships in Phase 2." src/app/dashboard/teach/cohorts/page.tsx` | (none — Phase-1 stub copy removed) |

### Manual smoke test

Not run in this plan — Playwright happy-path coverage is owned by Plan 02-05 per phase plan. The route is structurally correct and `tsc` + `oxlint` clean. Cohort cards link to `/dashboard/teach/cohorts/{id}`, which 404s until Plan 02-03 ships its dynamic route — that is expected and explicitly called out in the plan's Output section.

## Acceptance Criteria — All Passed

### Task 1 — `cohort-card.tsx`

- [x] File exists at `src/features/teach/components/cohort-card.tsx`
- [x] Contains `import Link from 'next/link';`
- [x] Contains `import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';`
- [x] Contains `import { Icons } from '@/components/icons';` (NOT direct tabler import)
- [x] Contains `aria-label={\`Open ${cohort.name}\`}`
- [x] Contains `bg-brand-sage` (status pill dot)
- [x] Contains `text-brand-teal` (cohort name + open affordance)
- [x] Contains `hover:bg-brand-cream` (hover lift)
- [x] Contains all four stat labels: `Students`, `Completion`, `Needs review`, `Next`
- [x] Contains `0%`, `Module in progress`, `B1–B2` literals
- [x] Does NOT contain any `IconChevronRight` direct import
- [x] `tsc --noEmit` passes

### Task 2 — `cohorts-listing.tsx`

- [x] File exists at `src/features/teach/components/cohorts-listing.tsx`
- [x] Line 1 reads `'use client';`
- [x] Contains `import { useSuspenseQuery } from '@tanstack/react-query';`
- [x] Contains `import { CohortCard } from '@/features/teach/components/cohort-card';`
- [x] Contains `import { cohortsQueryOptions } from '@/features/teach/api/queries';`
- [x] Contains `useSuspenseQuery(cohortsQueryOptions())`
- [x] Contains literal `No cohorts yet`
- [x] Contains literal `Cohorts appear here once learners are enrolled.`
- [x] Contains `gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))'`
- [x] Contains `Icons.school` (NOT `IconSchool`)
- [x] `tsc --noEmit` passes

### Task 3 — `page.tsx` + `error.tsx`

- [x] page.tsx contains `import PageContainer from '@/components/layout/page-container';`
- [x] page.tsx contains `await requireAdmin();`
- [x] page.tsx contains `void queryClient.prefetchQuery(cohortsQueryOptions());`
- [x] page.tsx contains `<HydrationBoundary state={dehydrate(queryClient)}>`
- [x] page.tsx contains `<Suspense fallback={<CohortsGridSkeleton />}>`
- [x] page.tsx contains `<CohortsListing />`
- [x] page.tsx contains `pageTitle='Cohorts'`
- [x] page.tsx contains `pageDescription='Browse cohorts and drill into a cohort to review learner progress.'`
- [x] page.tsx contains `disabled` AND `aria-disabled='true'` AND `title='Coming soon'`
- [x] page.tsx contains `Icons.upload` paired with `h-4 w-4` (NOT `h-3 w-3`)
- [x] page.tsx does NOT contain Phase-1 stub copy
- [x] error.tsx exists, line 1 is `'use client';`
- [x] error.tsx contains `Could not load cohorts` and `Refresh the page to try again.` and `Icons.alertCircle`
- [x] `tsc --noEmit` passes for both files

## Next Phase Readiness

- **Plan 02-03 (cohort-detail) entry point ready.** Cohort cards link to `/dashboard/teach/cohorts/{id}`. That dynamic route doesn't exist yet (404 expected) — Plan 02-03 ships it.
- **No blockers** for downstream Wave-2 plans. Plans 02-03 / 02-04 can proceed independently.
- **Plan 02-05 e2e** will smoke-test this route (loads, shows spring-2026 card, click → navigates) once both plans land.

## Self-Check: PASSED

Verified all claims:

- File `src/features/teach/components/cohort-card.tsx` exists ✓
- File `src/features/teach/components/cohorts-listing.tsx` exists ✓
- File `src/app/dashboard/teach/cohorts/error.tsx` exists ✓
- File `src/app/dashboard/teach/cohorts/page.tsx` modified (no longer contains stub copy) ✓
- Commit `75965af` (Task 1) exists in `git log` ✓
- Commit `5907ad5` (Task 2) exists in `git log` ✓
- Commit `580386c` (Task 3) exists in `git log` ✓
- `tsc --noEmit` exits 0 ✓
- `oxlint` on all 4 files → 0 warnings, 0 errors ✓
- Plan grep verifications all match expected results ✓

---
*Phase: 02-cohorts-hub*
*Completed: 2026-04-27*
