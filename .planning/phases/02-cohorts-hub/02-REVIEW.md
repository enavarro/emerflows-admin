---
phase: 02-cohorts-hub
reviewed: 2026-04-27T00:00:00Z
depth: standard
files_reviewed: 11
files_reviewed_list:
  - src/app/dashboard/teach/cohorts/[cohort]/error.tsx
  - src/app/dashboard/teach/cohorts/[cohort]/page.tsx
  - src/app/dashboard/teach/cohorts/error.tsx
  - src/app/dashboard/teach/cohorts/page.tsx
  - src/features/teach/api/service.ts
  - src/features/teach/components/cohort-card.tsx
  - src/features/teach/components/cohort-detail.tsx
  - src/features/teach/components/cohorts-listing.tsx
  - src/features/teach/components/learners-table.tsx
  - src/features/teach/components/progress-matrix.tsx
  - tests/e2e/teach-cohorts.spec.ts
findings:
  critical: 1
  warning: 4
  info: 5
  total: 10
status: issues_found
---

# Phase 02-cohorts-hub: Code Review Report

**Reviewed:** 2026-04-27
**Depth:** standard
**Files Reviewed:** 11
**Status:** issues_found

## Summary

Phase 2 implements the Cohorts Hub (cohort list + cohort detail with Learners and
Progress matrix tabs). Code structure matches the planning artifacts (PATTERNS.md,
UI-SPEC.md): RSC prefetch + HydrationBoundary, useSuspenseQuery clients, sage-
progressive matrix encoding, sticky row/col matrix, plain learner table, brand
tokens. Type contracts are honored, icons go through the registry, and code style
(single quotes, JSX single quotes, 2-space indent, no trailing commas) is clean.

However, **the production build fails** because `src/features/teach/api/queries.ts`
statically imports the server-only `service.ts` at module top-level, which then
gets pulled into client component bundles via `cohorts-listing.tsx` and
`cohort-detail.tsx`. This is the most important finding — verified by running
`next build`, which reports 4 server-only-import errors with full Turbopack import
traces. PATTERNS.md (line 250) actually called out the required pattern
("queries.ts closure-imports the service so Next.js code-splits it out of the
client bundle"), but the implementation uses a synchronous import.

A few quality issues round out the review: the cohort detail page renders
`PageContainer` from inside a client component (works, but the page-level skeleton
no longer mirrors the eventual header), the learner table renders four redundant
`<Link>` anchors per row to fake whole-row clickability, ISO timestamps are
compared lexicographically which only holds if timezone formats stay uniform, and
the description copy reads "1 learners" when a cohort has exactly one learner.

## Critical Issues

### CR-01: queries.ts static-imports server-only service into client bundle (build-blocking)

**File:** `src/features/teach/api/queries.ts:3`
**Issue:**
`queries.ts` is imported by both server route components and the `'use client'`
components `cohorts-listing.tsx` and `cohort-detail.tsx`. The top-level
`import { getCohort, getCohorts, getLearner, getSubmission } from './service';`
pulls `service.ts` (which has `import 'server-only';`) into the client bundle.
`next build` fails with 4 errors:

```
./src/features/teach/api/service.ts:1:1
'server-only' cannot be imported from a Client Component module
Import traces:
  Client Component Browser:
    ./src/features/teach/api/service.ts [Client Component Browser]
    ./src/features/teach/api/queries.ts [Client Component Browser]
    ./src/features/teach/components/cohort-detail.tsx [Client Component Browser]
```

PATTERNS.md (line 250) explicitly anticipated this and called for closure-imports
("queries.ts closure-imports the service so Next.js code-splits it out of the
client bundle"). The other `queries.ts` files in the repo do not hit this because
their `service.ts` files are not server-only.

**Fix:** Move the `getCohort` / `getCohorts` calls inside the `queryFn` closures
using a dynamic import so the static graph from a client component never reaches
`server-only`:

```typescript
// src/features/teach/api/queries.ts
import { queryOptions } from '@tanstack/react-query';

export const teachKeys = {
  all: ['teach'] as const,
  cohorts: () => [...teachKeys.all, 'cohorts'] as const,
  cohort: (cohortId: string) => [...teachKeys.all, 'cohort', cohortId] as const,
  learner: (learnerId: string) => [...teachKeys.all, 'learner', learnerId] as const,
  submission: (submissionId: string) =>
    [...teachKeys.all, 'submission', submissionId] as const
};

export const cohortsQueryOptions = () =>
  queryOptions({
    queryKey: teachKeys.cohorts(),
    queryFn: async () => {
      const { getCohorts } = await import('./service');
      return getCohorts();
    }
  });

export const cohortQueryOptions = (cohortId: string) =>
  queryOptions({
    queryKey: teachKeys.cohort(cohortId),
    queryFn: async () => {
      const { getCohort } = await import('./service');
      return getCohort(cohortId);
    }
  });

// Similar treatment for learner / submission options.
```

After applying the fix, re-run `npx next build` to confirm a green build, and
re-run `tests/e2e/teach-cohorts.spec.ts` against the production build to verify
SSR + hydration still resolves.

## Warnings

### WR-01: PageContainer rendered inside the client suspense boundary (cohort detail)

**File:** `src/app/dashboard/teach/cohorts/[cohort]/page.tsx:26-32`,
`src/features/teach/components/cohort-detail.tsx:26-49`
**Issue:**
The cohort list page wraps `<HydrationBoundary>` inside `<PageContainer>` at the
route level, but the cohort detail page renders `<PageContainer>` from inside the
client component `cohort-detail.tsx`. Consequences:
- During the suspense fall-through, `CohortDetailSkeleton` renders without the
  page header, then the header pops in once the query resolves — visible layout
  shift not seen on the cohorts list page (which keeps the header static and only
  swaps the grid).
- D-14 in CONTEXT.md explicitly says "Cohort detail header uses `PageContainer`"
  at the page boundary; placing it inside the suspense child is a subtle
  divergence from the locked decision.

**Fix:** Render `PageContainer` in the route file with a static title (cohort
slug humanized) plus a small server-side trip to fetch the real name, OR keep the
client-side header but pre-render a header-shaped skeleton at the route to avoid
the visible jump. Simplest:

```typescript
// [cohort]/page.tsx
export default async function CohortDetailPage({ params }: CohortDetailPageProps) {
  const { cohort: cohortId } = await params;
  await requireAdmin();

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(cohortQueryOptions(cohortId));

  return (
    <PageContainer
      pageTitle={humanizeCohortId(cohortId)}
      pageHeaderAction={<DisabledExportButton />}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<CohortDetailBodySkeleton />}>
          <CohortDetail cohortId={cohortId} />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}
```

Then drop the `PageContainer` from inside `cohort-detail.tsx` so the header is
stable across loading/loaded states. Either co-locate `humanizeCohortId` in a
small `@/features/teach/lib/format.ts` (since `service.ts` is server-only and
can't be imported here) or accept the slug as the title until the description
reconciles client-side.

### WR-02: Four redundant `<Link>` elements per learner row

**File:** `src/features/teach/components/learners-table.tsx:59-89`
**Issue:**
Each row creates one accessible `<Link>` on the name cell and three additional
`<Link>` elements on the other cells with `tabIndex={-1}` and `aria-hidden='true'`.
Goals (whole-row click target) are met, but the cost is high:
- 4 anchor elements per row in the DOM with identical `href`. Some screen readers
  still announce `aria-hidden` content under specific verbosity settings.
- Click telemetry / Sentry breadcrumbs see four separate link elements per row.
- Future maintainers may reasonably remove `tabIndex={-1}` thinking it's a typo,
  trapping keyboard users in repeated stops.

**Fix:** Use a single `<Link>` once per row, either by wrapping the `<TableRow>`
contents in a single anchor that spans visually via `position: relative` plus an
absolutely-positioned `<Link>` with `inset-0` (the "stretched-link" trick), or by
giving the row an `onClick={() => router.push(href)}` plus an inner real `<Link>`
on the name cell for keyboard / right-click semantics. Example with stretched
link:

```tsx
<TableRow className='hover:bg-brand-cream group relative cursor-pointer transition'>
  <TableCell className='text-brand-teal font-medium'>
    <Link
      href={href}
      aria-label={`Open ${learner.name}`}
      className='focus-visible:ring-brand-teal block focus:outline-none focus-visible:ring-2 after:absolute after:inset-0'
    >
      {learner.name}
    </Link>
  </TableCell>
  <TableCell>{learner.level ?? '—'}</TableCell>
  <TableCell className='text-right tabular-nums'>{learner.submissionCount}</TableCell>
  <TableCell>{formatLatestActivity(learner.latestActivityAt)}</TableCell>
</TableRow>
```

The `after:absolute after:inset-0` pseudo-element on the visible `<Link>` makes
the whole row clickable without duplicating anchor elements.

### WR-03: ISO-string timestamp comparison assumes uniform timezone formatting

**File:** `src/features/teach/api/service.ts:196-199, 220-221`
**Issue:**
`latestActivityAt` and the matrix latest-submission tiebreak compare ISO 8601
strings lexicographically (`s.reviewed_at > s.submitted_at`,
`sub.submitted_at > existing.submitted_at`). This is correct only when every
timestamp uses the same zone format. PostgreSQL's `timestamptz` columns return
ISO with `+00:00` by default through PostgREST, but if a future migration writes
`Z`-suffixed values for some rows (or local-zoned values via a different driver),
lexicographic order silently mis-orders them.

**Fix:** Normalize via `Date.parse()` / `new Date().getTime()` before comparing:

```typescript
function tsMs(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

// learner row latest:
const candidateMs = Math.max(tsMs(s.submitted_at), tsMs(s.reviewed_at));
if (latestTs === null || candidateMs > tsMs(latestTs)) {
  latestTs = candidateMs === tsMs(s.reviewed_at) ? s.reviewed_at : s.submitted_at;
}

// matrix tiebreak:
const newMs = tsMs(sub.submitted_at);
const oldMs = existing ? tsMs(existing.submitted_at) : -1;
if (!existing || newMs > oldMs || (newMs === oldMs && sub.id > existing.id)) {
  latestByLearnerModule.set(key, sub);
}
```

This is defensive — it costs only `Date.parse` per comparison, and removes a
silent-corruption foot-gun if the ISO format ever drifts.

### WR-04: Sticky header + sticky column inside Radix `<ScrollArea>` is brittle

**File:** `src/features/teach/components/progress-matrix.tsx:54-134`
**Issue:**
The matrix wraps `<Table>` in `<ScrollArea>` and uses `sticky top-0` on header
cells plus `sticky left-0` on row first cells. Radix `ScrollArea` creates a
`Viewport` element with `overflow: hidden` and an inner div the user actually
scrolls — sticky positioning relies on the nearest scrolling ancestor, which in
Radix is the inner viewport, not the `<ScrollArea>` root. With Radix v1.x this
generally works but specific shadcn upgrades have toggled the inner overflow
strategy in the past, breaking sticky positioning silently.

Additionally, the top-left cell uses `z-30`, header cells `z-20`, body sticky
cells `z-10`. When a scrollbar appears the radix scrollbar element renders at
`z-auto`/`z-50` depending on theme — vertical scroll affordance can sit on top of
the sticky learner-name column.

**Fix:** Either (a) replace `<ScrollArea>` with a plain `<div className='relative
w-full overflow-auto'>` so the table's natural sticky behavior survives any radix
upgrade, OR (b) keep `ScrollArea` but explicitly bump the dot column's sticky
class above the ScrollBar layer (`z-40`) and verify in a Playwright visual test
across viewport widths.

```tsx
<div className='relative w-full overflow-auto rounded-md border bg-card'>
  <Table>{/* unchanged */}</Table>
</div>
```

If `ScrollArea` is preserved for visual scrollbar styling, add a Playwright
assertion in `teach-cohorts.spec.ts` that scrolls the matrix horizontally and
asserts the learner-name column stays at left=0.

## Info

### IN-01: "1 learners" — pluralization missing in cohort detail description

**File:** `src/features/teach/components/cohort-detail.tsx:28`
**Issue:**
`pageDescription={`${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} learners`}`
renders "1 learners" when a cohort has exactly one learner. UI-SPEC defines the
copy as `{cohort.termHint} · {cohort.learnerCount} learners` and uses an example
("24 learners") that side-steps the singular case.
**Fix:**
```typescript
const learnerWord = cohort.learnerCount === 1 ? 'learner' : 'learners';
pageDescription={`${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} ${learnerWord}`}
```

### IN-02: humanizeCohortId not exported / centralized

**File:** `src/features/teach/api/service.ts:105-110`
**Issue:**
The slug-to-display helper is defined as a local function inside the server-only
service module, but the same display name is needed client-side (e.g. WR-01's
suggestion to render the title at route level, plus any future breadcrumb or
nav). Each future caller will reinvent the helper.
**Fix:** Move it to `@/features/teach/lib/format.ts` (a non-server-only module)
and re-import from `service.ts`. Keeps the formatter universal without leaking
service-only imports.

### IN-03: Type cast on Supabase rows widens silently

**File:** `src/features/teach/api/service.ts:151,151,75`
**Issue:**
`subRows = (data ?? []) as SubmissionAggRow[]` (line 151) and the inline
`row.id as string` casts assume the DB rows match the locally-declared shape.
Specifically, `type` is declared as `ModuleType = 'conversation' | 'recording'`
but Supabase returns it as `string`. A future row with a typo
("Conversation"/"recording ") would compile-pass but mis-aggregate.
**Fix:** Validate at the boundary with a small zod schema, OR narrow with a type
guard that filters bad rows and `console.warn`s them. This is a "harden the
boundary" suggestion, not a current correctness bug.

### IN-04: Unused `LearnerRow` type import in learners-table

**File:** `src/features/teach/components/learners-table.tsx:14`
**Issue:**
`import type { CohortDetail, LearnerRow } from '...'` — `LearnerRow` is used
only by the inner `LearnerLinkRow`. Today's WR-02 refactor removes that
component, which would also remove this import. Flagging now so the cleanup is
not forgotten.
**Fix:** When applying WR-02, drop unused imports.

### IN-05: Test asserts both `M01` and `M12` via `getByText` collide with row text

**File:** `tests/e2e/teach-cohorts.spec.ts:129-134`
**Issue:**
`page.getByText('M01', { exact: true }).first()` works today because no learner
name contains "M01", but it will silently match if a future row contains the
literal text. `M01..M12` are inside `<th>` cells inside a `<TooltipTrigger>`
span — the more specific selector is `page.getByRole('columnheader', { name:
/^M01/ })`. Same for M12.
**Fix:**
```typescript
await expect(
  page.getByRole('columnheader', { name: /^M01/i })
).toBeVisible({ timeout: 8_000 });
await expect(
  page.getByRole('columnheader', { name: /^M12/i })
).toBeVisible({ timeout: 8_000 });
```
Plus consider asserting the matrix has exactly 12 module-columns to lock the D-19
contract.

---

_Reviewed: 2026-04-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
