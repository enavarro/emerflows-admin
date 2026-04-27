---
phase: 02-cohorts-hub
plan: 01
subsystem: api
tags: [supabase, server-only, react-query, postgres, typescript]

# Dependency graph
requires:
  - phase: 01-foundations
    provides: getCohorts/getCohort stubs, Cohort/CohortDetail/LearnerRow/ModuleProgressCell type contracts, createAdminClient singleton, MODULES catalog, teach feature scaffold
provides:
  - Real getCohorts() service implementation (D-01..D-04 aggregates)
  - Real getCohort(cohortId) service implementation with 12-cell matrix per learner (D-05 latest-wins)
  - humanizeCohortId() helper ('spring-2026' -> 'Spring 2026', D-08 placeholder)
  - Snake-to-camel mapping pattern (external_id -> externalId) at the service boundary
affects: [02-02 cohorts-listing, 02-03 cohort-detail, 02-04 progress-matrix, 02-05 e2e]

# Tech tracking
tech-stack:
  added: []  # No new dependencies — used existing @supabase/supabase-js + @/lib/supabase/admin singleton
  patterns:
    - Two-trip aggregate query (avoid Postgres views/RPC at small scale; D-01)
    - In-memory aggregation with Set<string> dedupe keys for distinct counts (D-02)
    - Latest-wins reducer keyed by `${learner_id}|${module_id}` for progress matrix (D-05)
    - Loud-failure error pattern: throw with descriptive message so route error.tsx surfaces

key-files:
  created: []
  modified:
    - src/features/teach/api/service.ts

key-decisions:
  - Followed D-01 two-trip strategy verbatim (no view, no RPC, no schema change)
  - Cohort name + termHint both derived via humanizeCohortId() pending real term column (D-08)
  - latestActivityAt = max(submitted_at, reviewed_at) so review action bumps activity timestamp
  - Empty learners cohort skips the second submissions trip (zero-learner CohortDetail short-circuit)
  - Tie-breaker for D-05 latest = submitted_at desc, then id desc (deterministic ordering)
  - Used Array#toSorted() instead of sort() for immutability per CLAUDE.md / oxlint

patterns-established:
  - "Service-layer dedupe via Set<string> with `|`-joined composite keys"
  - "Snake_case wire columns mapped to camelCase TypeScript at the service boundary, not the consumer"
  - "Phase-3 stubs throw with 'is not implemented — see Phase X plan' marker so accidental usage fails loudly"

requirements-completed: [COD-03]

# Metrics
duration: 4min
completed: 2026-04-27
---

# Phase 2 Plan 01: Real Supabase queries for getCohorts() and getCohort(cohortId) Summary

**Two-trip Supabase aggregate query replacing the Phase-1 throwing stubs in `src/features/teach/api/service.ts`, hydrating the locked `Cohort[]` and `CohortDetail` contracts (D-01..D-05) with real data from `public.learners` + `public.submissions`.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-27T09:54:26Z
- **Completed:** 2026-04-27T09:58:14Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- `getCohorts()` returns real `Cohort[]` with all four count fields (`learnerCount`, `totalSubmissions`, `needsReview`, `reviewed`) computed per D-01..D-04 semantics — totalSubmissions de-duplicates on `(learner_id, module_id, type)`, needsReview/reviewed split on `reviewed_at IS NULL` only (no status filter)
- `getCohort(cohortId)` returns real `CohortDetail` with cohort summary, ordered learner rows, and a 12-cell progress matrix per learner — every cell follows D-05's latest-wins rule
- Service-role key kept confined to `@/lib/supabase/admin` via `createAdminClient()` singleton; `import 'server-only'` marker preserved
- Phase-3 stubs (`getLearner`, `getSubmission`) untouched — both still throw with the "is not implemented" marker for fail-loud detection

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement getCohorts() with two-trip aggregate query (D-01..D-04)** — `163bbeb` (feat)
2. **Task 2: Implement getCohort(cohortId) with learners + 12-cell matrix (D-05, COD-02..04)** — `35eef77` (feat)
3. **Lint/immutability fix: Array#toSorted() over Array#sort()** — `f583bf4` (fix)

_No formal unit-test infra exists for service-level Supabase tests in this repo (only Playwright e2e). Per the plan's TDD note, the verification gate was `tsc --noEmit` for both tasks. Plan 02-05 owns the Playwright happy-path coverage._

## Files Created/Modified

- `src/features/teach/api/service.ts` — Replaced two throwing stubs (`getCohorts`, `getCohort`) with real Supabase implementations. Added `createAdminClient` import, `MODULES` catalog import, `LearnerRow` / `ModuleProgressCell` / `ModuleType` type imports. Added `humanizeCohortId()` private helper. File grew from 41 to 264 lines. Phase-3 stubs (`getLearner`, `getSubmission`) untouched.

## Implementation Excerpts

### `getCohorts()` core aggregation

```typescript
const { data: learnerRows, error: learnersError } = await client
  .from('learners')
  .select('id, cohort')
  .not('cohort', 'is', null);
// ... (build learnersByCohort + cohortByLearnerId maps)
const { data: subRows, error: subsError } = await client
  .from('submissions')
  .select('learner_id, module_id, type, reviewed_at')
  .in('learner_id', allLearnerIds);
// per-cohort totals: distinct (learner_id|module_id|type) count + needsReview / reviewed split
```

### `getCohort()` matrix builder (D-05 latest-wins)

```typescript
const latestByLearnerModule = new Map<string, SubmissionAggRow>();
for (const sub of subRows) {
  const key = `${sub.learner_id}|${sub.module_id}`;
  const existing = latestByLearnerModule.get(key);
  if (
    !existing ||
    sub.submitted_at > existing.submitted_at ||
    (sub.submitted_at === existing.submitted_at && sub.id > existing.id)
  ) {
    latestByLearnerModule.set(key, sub);
  }
}
const matrix: Record<string, ModuleProgressCell[]> = {};
for (const learner of learnerRowList) {
  matrix[learner.id] = MODULES.map((mod) => {
    const latest = latestByLearnerModule.get(`${learner.id}|${mod.id}`);
    if (!latest) return { moduleId: mod.id, state: 'not-started', /* ... */ };
    return { moduleId: mod.id, state: latest.reviewed_at === null ? 'submitted' : 'reviewed', /* ... */ };
  });
}
```

## Decisions Made

- **D-01 two-trip strategy adopted verbatim.** No Postgres view, no RPC, no schema change. Aggregation runs in Node. Promotion path documented in CONTEXT.md if profiling shows it slow at >5 active cohorts.
- **D-08 placeholder for cohort.name / termHint.** Both fields derive from `humanizeCohortId()` (e.g. `'spring-2026'` → `'Spring 2026'`). Plan 02-02 / 02-03 will visually render this; future schema work can promote to a real `term` column.
- **`latestActivityAt = max(submitted_at, reviewed_at)`** — chosen so a review action bumps the column. Aligns with UI-SPEC's "Latest activity" column semantics (review counts as activity).
- **Tie-breaker on D-05 latest** = `submitted_at` descending, then `id` descending. Deterministic + reproducible; no clock drift sensitivity.
- **Empty-learners short-circuit in `getCohort()`.** When the cohort has zero learners, the second submissions trip is skipped and an empty `learners` / `matrix` `CohortDetail` is returned. Consumer pages handle empty `learners[]` per UI-SPEC empty-state copy (plan 02-03's job).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Lint/Style] Used Array#toSorted() instead of Array#sort()**

- **Found during:** Post-Task-2 oxlint check
- **Issue:** `oxlint`'s `unicorn/no-array-sort` rule flagged `Array.from(map.keys()).sort()` because `Array#sort()` mutates in place. CLAUDE.md immutability rule (`common/coding-style.md`) forbids mutation. Functionally inert here (the array from `Array.from()` is fresh) but violates project lint config.
- **Fix:** Changed `.sort()` to `.toSorted()` (ES2023). Returns a new sorted array without mutating.
- **Files modified:** `src/features/teach/api/service.ts`
- **Verification:** `npx oxlint src/features/teach/api/service.ts` → 0 warnings, 0 errors. `npx tsc --noEmit` → 0 errors.
- **Committed in:** `f583bf4` (separate fix commit)

---

**Total deviations:** 1 auto-fixed (1 lint/immutability)
**Impact on plan:** No scope creep. Plan instructed `.sort()` verbatim in its action block; fix aligns with project-level coding standard (CLAUDE.md immutability + oxlint). All Plan-1 D-01..D-05 semantics preserved. No deviation from CONTEXT.md decisions.

## Issues Encountered

- **No service-level test infrastructure exists.** The plan's TDD `<behavior>` block specified 5 test cases for Task 1 + 7 for Task 2. The plan also explicitly authorized skipping a formal harness if no infra exists, falling back to `tsc --noEmit` as the contract gate. Confirmed `package.json` has only `@playwright/test`; no vitest/jest/node:test setup. Followed plan's authorized fallback. Runtime contract validation will land via Playwright happy-path in plan 02-05 (per CONTEXT.md Discretion: "Playwright happy-path test for `/dashboard/teach/cohorts`").

## Test Fixture State

**Not smoke-tested in this plan.** The current dev Supabase project (per memory: `bohqhhpzsgmwsvqryhfw`) is documented to have a `spring-2026` cohort, but this plan only edits server-only code that requires `SUPABASE_SERVICE_ROLE_KEY`. Manual smoke is deferred to plan 02-05 (Playwright happy-path) which boots Next.js with the real env and asserts the cohort card renders with non-zero counts.

## Acceptance Criteria — All Passed

### Task 1 — `getCohorts()`

- [x] Contains `import { createAdminClient } from '@/lib/supabase/admin';`
- [x] Line 1 still reads `import 'server-only';`
- [x] Contains `await client.from('learners').select(`
- [x] Contains `await client.from('submissions').select(`
- [x] Contains `.in('learner_id'` (D-01 two-trip)
- [x] Contains dedupe-key marker `${sub.learner_id}|${sub.module_id}|${sub.type}` (D-02 distinct-by triple)
- [x] Contains `if (subsError) {` and `if (learnersError) {` (loud-failure)
- [x] Stub message `getCohorts is not implemented` removed
- [x] `getLearner` and `getSubmission` Phase-3 stubs preserved (`is not implemented` count = 2)
- [x] `tsc --noEmit` passes with zero errors

### Task 2 — `getCohort(cohortId)`

- [x] Contains `export async function getCohort(cohortId: string): Promise<CohortDetail>`
- [x] Contains `import { MODULES } from '@/features/teach/constants/modules';`
- [x] Contains `latestByLearnerModule` (D-05 latest-wins marker)
- [x] Contains `MODULES.map((mod)` (12-module catalog iteration, COD-03)
- [x] Contains all three ProgressState branches: `'not-started'`, `'submitted'`, `'reviewed'`
- [x] Contains `.eq('cohort', cohortId)` (cohort-scoped)
- [x] Stub message `getCohort(${cohortId}) is not implemented` removed
- [x] `tsc --noEmit` passes with zero errors
- [x] `grep -c "is not implemented"` returns ≥ 2 (Phase-3 stubs preserved)

## User Setup Required

None — no external service configuration required. The service-role key (`SUPABASE_SERVICE_ROLE_KEY`) was already configured for Phase 1's `createAdminClient` and is consumed unchanged.

## Next Phase Readiness

- **Wave-2 unblocked.** Plans 02-02 (cohorts-listing), 02-03 (cohort-detail tabs), 02-04 (progress matrix) can now consume `cohortsQueryOptions()` / `cohortQueryOptions(cohortId)` via `useSuspenseQuery` and get real `Cohort[]` / `CohortDetail` shapes. The query-key factory in `src/features/teach/api/queries.ts` (Phase-1) connects directly to the new service bodies — no further wiring required.
- **No blockers** for downstream plans in this phase.
- **Phase-3 dependency intact.** `getLearner` / `getSubmission` stubs throw with their distinctive marker so any accidental Phase-2 component that tries to navigate to a learner/submission detail page will fail visibly rather than render empty.

## Self-Check: PASSED

Verified all claims:

- File `src/features/teach/api/service.ts` exists (264 lines) ✓
- Commit `163bbeb` (Task 1) exists in `git log` ✓
- Commit `35eef77` (Task 2) exists in `git log` ✓
- Commit `f583bf4` (lint fix) exists in `git log` ✓
- `tsc --noEmit` exits 0 ✓
- `oxlint src/features/teach/api/service.ts` → 0 warnings, 0 errors ✓
- `head -1 service.ts` = `import 'server-only';` ✓
- `grep -c "is not implemented" service.ts` = 2 ✓ (Phase-3 stubs preserved)

---
*Phase: 02-cohorts-hub*
*Completed: 2026-04-27*
