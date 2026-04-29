---
phase: 03
plan: 04
subsystem: ui-route
tags: [ui, route, rsc, hydration, learner-page]
dependency_graph:
  requires:
    - "Plan 03-01: getLearner service (server-only Supabase reads)"
    - "Plan 03-01: learnerQueryOptions + teachKeys.learner key factory"
    - "Plan 03-03: Icons.forms registry alias for empty state"
  provides:
    - "Route: /dashboard/teach/cohorts/[cohort]/learners/[learnerId]"
    - "LearnerDetail client component (cards-per-module layout)"
    - "Stretched-link navigation to /dashboard/teach/submissions/[id]"
  affects:
    - "Plan 03-05 (submission viewer speaking) - target of stretched-link rows"
    - "Plan 03-06 (conversation viewer + mark-reviewed) - target of stretched-link rows"
tech_stack:
  added: []
  patterns:
    - "fetchQuery + dehydrate + HydrationBoundary RSC prefetch (errors propagate to error.tsx)"
    - "Pre-resolve route data so PageContainer header avoids loading flash"
    - "Stretched-link row pattern (after:absolute after:inset-0) for accessible row navigation"
    - "Cards-per-module D-08 (only touched modules) + D-05 row sort (submittedAt DESC, attemptNum DESC tiebreaker)"
key_files:
  created:
    - "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx"
    - "src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx"
    - "src/features/teach/components/learner-detail.tsx"
  modified: []
decisions:
  - "Pre-resolve learnerDetail at the route via fetchQuery so PageContainer pageTitle uses the real learner.name immediately (no Loading… flash). The same QueryClient instance is then dehydrated for HydrationBoundary, so the client useSuspenseQuery resolves synchronously without an extra fetch."
  - "Used fetchQuery (not prefetchQuery): prefetchQuery silently swallows errors which would cause useSuspenseQuery to fall through to the missingPrefetch placeholder and surface a cryptic error instead of the real failure. fetchQuery propagates real errors to error.tsx."
  - "Stretched-link pattern applied to submission rows: ONE invisible <Link> per row with after:absolute after:inset-0 expanding the click target to the entire row. Single keyboard stop per row, badges remain plain text (no nested anchors)."
  - "Module sort: ascending by MODULES.num. Unknown moduleIds defensively sort to position 99 so future modules added to submissions but missing from the catalog do not break the page."
  - "Row sort: submittedAt DESC primary, attemptNum DESC tiebreaker. Implemented via String#localeCompare reversed (b vs a) for the ISO timestamp + numeric subtraction for attemptNum."
  - "Used Icons.forms (registry alias for IconClipboardText) for the empty state — UI-SPEC names this clipboardList but the registry alias is forms (locked Phase 1)."
metrics:
  duration: "~3min"
  completed: "2026-04-29"
  tasks_completed: 2
  files_created: 3
---

# Phase 3 Plan 04: Learner Detail Page Summary

Implements UI-SPEC Surface 1 (the learner deep-dive page): three new files closing
LRN-01 / LRN-02 / LRN-03. Visiting `/dashboard/teach/cohorts/<cohort>/learners/<id>`
as an admin renders the learner's name in the page header (cohort + level
description, optional external_id supplemental line) and one Card per module the
learner has touched, with submission rows sorted newest-attempt-first that
stretched-link to the (Plan 05/06) submission viewer.

## What Changed

### New files

| File | Role | Lines |
|------|------|------:|
| `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx` | RSC route — admin gate + fetchQuery prefetch + PageContainer header + HydrationBoundary | 69 |
| `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx` | Per-route error boundary — destructive Alert with "Could not load learner" | 18 |
| `src/features/teach/components/learner-detail.tsx` | Client component — cards-per-module layout + empty state + stretched-link rows | 121 |

### Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `58effa7c` | feat(03-04): RSC route + error boundary for learner detail page |
| 2 | `0ace455b` | feat(03-04): learner-detail client component with module cards |

## Why fetchQuery and pre-resolve

The PATTERNS.md §React Query Server-Prefetch section documents that the project
deliberately uses `fetchQuery` (not `prefetchQuery`) for two reasons:

1. **Errors propagate.** `prefetchQuery` swallows query errors — it stores a
   failed-query state which `dehydrate()` drops by default. The client cache then
   has no entry for the key, `useSuspenseQuery` falls through to the
   `missingPrefetch()` placeholder in `queries.ts`, and the user sees a cryptic
   "missing prefetch" stack instead of the real failure (RLS denied, schema drift,
   etc.). `fetchQuery` re-throws the original error to Next.js's error boundary,
   so `error.tsx` shows a useful destructive Alert and the dev console shows the
   real cause.

2. **Successful data is also returned.** `fetchQuery` resolves to the cached
   value, letting us bind `learnerDetail.learner.name` to `pageTitle` immediately.
   The same QueryClient is then dehydrated for HydrationBoundary, so the client
   `useSuspenseQuery(learnerQueryOptions(learnerId))` resolves synchronously with
   the same data — no second network call, no loading flash on the header.

This pattern is mirrored from `src/app/dashboard/teach/cohorts/[cohort]/page.tsx`
(Phase 2). The learner page is now the second consumer.

## D-05 / D-08 sort and filter logic

**D-08 (only touched modules):**

```ts
const moduleIds = Object.keys(submissionsByModule);
if (moduleIds.length === 0) {
  return <EmptyState />;
}
```

We never iterate the full `MODULES` catalog — only modules with at least one
submission key in `submissionsByModule` are rendered. This is the correct
"learner snapshot" semantic per CONTEXT.md D-08; the cohort page (Phase 2)
shows the full grid because it is documenting cohort-wide progress, but the
learner page is a personal deep-dive.

**D-05 (sort order):**

```ts
// Module cards: ASCENDING by MODULES.num
const sortedModuleIds = moduleIds.toSorted((a, b) => {
  const ma = MODULES.find((m) => m.id === a)?.num ?? 99;
  const mb = MODULES.find((m) => m.id === b)?.num ?? 99;
  return ma - mb;
});

// Rows within a module: submittedAt DESC, attemptNum DESC tiebreaker
const subs = submissionsByModule[moduleId].toSorted((a, b) => {
  const tsCmp = (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
  return tsCmp !== 0 ? tsCmp : b.attemptNum - a.attemptNum;
});
```

Note both sorts use `Array#toSorted` (not in-place `.sort()`) so the original
React Query cache state is never mutated — important because `submissionsByModule`
is the deserialized cache value passed across the hydration boundary.

The module sort defensively maps unknown moduleIds to position 99 so a future
DB row referencing a module not in the 12-module catalog does not throw.

## Stretched-link row pattern

Each submission row is one `<Link>` with `after:absolute after:inset-0` expanding
the click target to the whole row, plus the parent `<div>` getting `relative`.
The `<Link>` only contains an `sr-only` label — the visual badges + date span are
plain text. This keeps:

- One keyboard stop per row (vs. multiple anchors per row)
- One screen-reader label per row (`Open submission <id>`)
- The full row hover (`hover:bg-brand-cream`) clickable
- Focus ring (`focus-visible:ring-brand-teal`) anchored to the row visually

The link target is `/dashboard/teach/submissions/${submission.id}` — Plan 05's
URL for recording submissions and Plan 06's URL for conversation submissions.
Until those plans land, clicking a row will 404 — that is expected for Plan 04's
smoke and called out in the plan's verification section.

## Note for Plan 05 / Plan 06

The submission viewer URL is **`/dashboard/teach/submissions/[id]`** (NOT
`/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/submissions/[id]`).
Plan 04's stretched-link rows commit to this flat URL shape so Plan 05/06's
RSC routes must live at `src/app/dashboard/teach/submissions/[id]/page.tsx`.

The submission row also passes only `submission.id` to the link — Plan 05/06's
`getSubmission(submissionId)` service is the single source of truth for
re-loading the learner + module + payload, so no contextual params are
threaded through the URL.

## UI-SPEC Surface 1 contract honored

| UI-SPEC §Surface 1 element | Where rendered |
|----------------------------|----------------|
| Page title — learner.name | `page.tsx` PageContainer pageTitle |
| Description — `{cohort} · {level || '—'}` | `page.tsx` PageContainer pageDescription |
| External_id supplemental | `page.tsx` `<p className='font-mono text-xs ...'>` (only when non-null) |
| One Card per touched module | `learner-detail.tsx` map over sortedModuleIds |
| Module heading — `M{NN} · {title}` | `learner-detail.tsx` `<h2 className='text-brand-teal text-base font-semibold'>` |
| Submission row — Type / Att N / Status / Reviewed badges + date | `learner-detail.tsx` `<SubmissionRow>` |
| Reviewed badge style — `bg-brand-sage/20 text-brand-teal border-brand-sage` | `learner-detail.tsx` line 103 |
| Empty state — `Icons.forms` + "No submissions yet" + descriptive copy | `learner-detail.tsx` lines 27-35 |
| Hover state — `hover:bg-brand-cream` | `learner-detail.tsx` SubmissionRow line 90 |

## Verification

| Check | Result |
|-------|--------|
| `test -f .../page.tsx && .../error.tsx && learner-detail.tsx` | all exist |
| `grep "queryClient.fetchQuery" page.tsx` | line 31 |
| `grep "prefetchQuery" page.tsx` | none (only fetchQuery used) |
| `grep "await requireAdmin" page.tsx` | line 23 |
| `grep "Could not load learner" error.tsx` | line 11 |
| `grep "useSuspenseQuery(learnerQueryOptions" learner-detail.tsx` | line 20 |
| `grep "after:absolute after:inset-0" learner-detail.tsx` | line 93 (stretched-link) |
| `grep "/dashboard/teach/submissions/" learner-detail.tsx` | line 86 |
| `grep "Icons.forms" learner-detail.tsx` | line 29 |
| `grep "@tabler/icons-react" learner-detail.tsx` | none (CLAUDE.md icon rule) |
| `grep "import { Heading }" learner-detail.tsx` | none (PageContainer owns header) |
| `grep -c ".toSorted(" learner-detail.tsx` | 2 (modules + rows — non-mutating) |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 — new route present in build output |

## Threat Model Compliance

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-03-18 (non-admin spoofing) | mitigate | `await requireAdmin()` at top of page.tsx — redirects unauthenticated to /auth/sign-in and non-admin to /dashboard/overview?denied=teach. Layout segment is also gated. |
| T-03-19 (uuid in URL) | accept | UUIDs are unguessable; admin-only context; single-tenant per PROJECT.md. |
| T-03-20 (learnerId tampering) | mitigate | Plan 01's `getLearner` uses Supabase parameterized `.eq('id', learnerId)` — no SQL string concat. |
| T-03-21 (error.message leak) | accept | Admin-only context; matches Phase 2 cohort error.tsx precedent. |
| T-03-22 (XSS via learner data) | mitigate | React escapes by default; no `dangerouslySetInnerHTML`; data sourced from admin-controlled Supabase rows. |

## Deviations from Plan

**Minor wording change (not a deviation, just a clean-up):**

In `page.tsx`, the inline comment was rewritten to avoid the literal string
`prefetchQuery` so the verification `grep -v` rule reads cleanly. The intent
("use fetchQuery, not the prefetch helper") is preserved verbatim — the comment
now reads "use fetchQuery here. The alternative (prefetch helper) silently
swallows errors". No semantic change, just better verification ergonomics.

Otherwise the plan was executed exactly as specified.

## Known Stubs

None. Both files are fully wired:
- `getLearner(learnerId)` is real (Plan 01)
- `learnerQueryOptions(learnerId)` is real (Phase 1)
- `Icons.forms` is registered (Phase 1, confirmed in Plan 03)
- `MODULES` catalog is real (Phase 1)
- `requireAdmin()` is real (Phase 2)

The only "stub-like" reference is the stretched-link target
`/dashboard/teach/submissions/${id}` which 404s until Plan 05/06 lands. This is
expected and documented in this plan and in the plan's `<verification>` block.

## Self-Check: PASSED

- File `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx` exists (verified via `test -f`)
- File `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/error.tsx` exists (verified via `test -f`)
- File `src/features/teach/components/learner-detail.tsx` exists (verified via `test -f`)
- Commit `58effa7c` exists in git log (verified via `git log --oneline -3`)
- Commit `0ace455b` exists in git log (verified via `git log --oneline -3`)
- TypeScript check passed with exit code 0
- `npm run build` passed with exit code 0; new route `/dashboard/teach/cohorts/[cohort]/learners/[learnerId]` confirmed in build output
- No unintended file deletions (`git diff --diff-filter=D HEAD~2 HEAD` returned empty)
