---
phase: 01-foundations
plan: 03
subsystem: api
tags: [typescript, react-query, feature-module, scaffold, types, contracts]

requires:
  - phase: 01-foundations
    provides: 'Plan 01 added reviewed_at / reviewed_by columns to public.submissions, which the SubmissionSummary type reflects'
provides:
  - 'src/features/teach/ feature module scaffold (api/types, api/service, api/queries, constants/modules)'
  - 'Public type contracts (Cohort, LearnerRow, SubmissionSummary, ModuleProgressCell, CohortDetail, LearnerDetail, SubmissionDetail, MarkReviewedInput, payload shapes)'
  - 'teachKeys query-key factory (all/cohorts/cohort/learner/submission) — the cache-invalidation seam Phase 3 mark-as-reviewed depends on'
  - '12-module typed catalog mirroring teacher-admin/teacher-data.js with prototype IDs normalised to schema convention (module-01..module-12) and types mapped to wire format (recording/conversation)'
  - 'Server-only service stubs (getCohorts, getCohort, getLearner, getSubmission) that throw with TODO(Phase2/Phase3) markers, locking signatures before downstream implementation'
affects:
  - 'Phase 02 cohorts hub (will fill in getCohorts + getCohort)'
  - 'Phase 03 learner deep-dive + submission viewer (will fill in getLearner + getSubmission, plus mark-as-reviewed mutation keyed off teachKeys)'
  - 'Plan 01-04 (RBAC gate) — independent, no shared symbols'
  - 'Plan 01-05 (sidebar nav) — independent, no shared symbols'

tech-stack:
  added: []
  patterns:
    - 'API-layer pattern (types.ts → service.ts → queries.ts) per CLAUDE.md / .planning/codebase/CONVENTIONS.md'
    - "import 'server-only' marker to prevent admin-client code leaking into the client bundle (Next.js compiled marker package)"
    - 'Discriminated union over submission.type to share SubmissionPayload between recording + conversation viewers'
    - "queryOptions() wrapper pattern shared with src/features/demos/api/queries.ts"

key-files:
  created:
    - 'src/features/teach/api/types.ts'
    - 'src/features/teach/api/service.ts'
    - 'src/features/teach/api/queries.ts'
    - 'src/features/teach/constants/modules.ts'
  modified: []

key-decisions:
  - 'Module IDs in the catalog use the production schema convention `module-01..module-12` rather than the prototype IDs `m01..m12` — this matches submissions.module_id and the recordings storage path; documented inline in modules.ts'
  - 'Prototype types `speak`/`convo` are mapped to wire-format `recording`/`conversation` (the names used in submissions.type) so consumers get one consistent vocabulary'
  - "queries.ts is intentionally NOT marked 'server-only'; it imports the server-only service module via queryFn closures, which Next.js code-splits out of the client bundle (same pattern as src/features/demos/api/queries.ts)"
  - 'Service stubs throw at runtime rather than returning empty values — premature wiring fails loudly, preventing stub-shaped pages from shipping'

patterns-established:
  - 'Feature scaffold pattern for read-heavy modules: types → server-only service stubs → query factory + queryOptions wrappers'
  - 'Cache-invalidation seam: teachKeys.all is the single root key; Phase 3 mutation invalidation will use it to refresh both the cohort matrix and the learner submission list with one invalidate call'

requirements-completed:
  - FND-03

duration: 3min
completed: 2026-04-25
---

# Phase 01 Plan 03: Teach Feature Scaffold Summary

**Locked the load-bearing types, query-key factory, and server-only service signatures for the Teach Admin feature so Phase 2 (Cohorts Hub) and Phase 3 (Learner Deep-Dive + Submission Viewer) can be planned and implemented in parallel without rediscovering contracts.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-25 (UTC)
- **Completed:** 2026-04-25 (UTC)
- **Tasks:** 3 / 3 completed
- **Files created:** 4

## Accomplishments

- Established the `src/features/teach/` API-layer scaffold (types/service/queries) following the project's established React Query convention.
- Defined every public type contract Phases 2 and 3 will consume: `Cohort`, `CohortDetail`, `LearnerRow`, `LearnerDetail`, `SubmissionSummary`, `SubmissionDetail`, `ModuleProgressCell`, payload shapes for both submission types, and the `MarkReviewedInput` mutation contract.
- Shipped the 12-module typed catalog transcribed from the prototype, with IDs normalised to the production schema convention so the matrix and viewer header can both consume it without a translation layer.
- Built the `teachKeys` query-key factory (`all` / `cohorts` / `cohort(id)` / `learner(id)` / `submission(id)`) and matching `queryOptions` wrappers — the cache-invalidation seam the Phase 3 mark-as-reviewed mutation depends on.

## Task Commits

Each task was committed atomically:

1. **Task 1 — Write `src/features/teach/api/types.ts`** — `40e6bc2` (feat)
2. **Task 2 — Write `src/features/teach/constants/modules.ts`** — `5b4cbbd` (feat)
3. **Task 3 — Write `src/features/teach/api/service.ts` and `queries.ts`** — `c3446a7` (feat)

## Files Created

- `src/features/teach/api/types.ts` (141 lines) — Public type contracts (Cohort, LearnerRow, SubmissionSummary, ModuleProgressCell, CohortDetail, LearnerDetail, SubmissionDetail, RecordingPayload, ConversationPayload discriminated union, MarkReviewedInput / MarkReviewedResponse).
- `src/features/teach/api/service.ts` (40 lines) — Server-only stubs (getCohorts, getCohort, getLearner, getSubmission) that throw with `TODO(Phase2)` / `TODO(Phase3)` markers.
- `src/features/teach/api/queries.ts` (43 lines) — `teachKeys` factory + `cohortsQueryOptions`, `cohortQueryOptions`, `learnerQueryOptions`, `submissionQueryOptions`.
- `src/features/teach/constants/modules.ts` (31 lines) — `MODULES` typed catalog (12 entries) + `getModule(id)` lookup.

## File Tree

```
src/features/teach/
├── api/
│   ├── queries.ts
│   ├── service.ts
│   └── types.ts
└── constants/
    └── modules.ts
```

## Decisions Made

| Decision | Rationale |
| --- | --- |
| Module IDs use schema convention `module-01..module-12` (not prototype `m01..m12`) | Matches `submissions.module_id` and the storage path `recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm`; eliminates a translation layer between the matrix and the live data |
| Prototype types `speak`/`convo` mapped to `recording`/`conversation` | Wire-format names used in `submissions.type`; gives consumers a single vocabulary |
| `queries.ts` is **not** marked `'server-only'` | Same pattern as `src/features/demos/api/queries.ts` — query options are imported by client components; queryFn closures get code-split out of the client bundle by Next.js |
| Stubs throw rather than return empty values | Premature wiring fails loudly, preventing stub-shaped pages from shipping accidentally before Phase 2/3 implementation |

## Deviations from Plan

### Rule 3 — Blocking issue resolved

**1. [Rule 3 — Toolchain] Installed `typescript@5.7.2` locally to run `tsc --noEmit` verification**
- **Found during:** Task 1 (verify step)
- **Issue:** Worktree had no `node_modules/` so the verification command `npx tsc --noEmit -p tsconfig.json` resolved to the macOS Apple Teleport `tsc` shim instead of the TypeScript compiler. The plan's verify block requires the project's TypeScript compiler.
- **Fix:** Ran `npm install --no-audit --no-fund --no-save --prefer-offline typescript@5.7.2` and invoked `./node_modules/.bin/tsc --noEmit -p tsconfig.json` directly.
- **Files modified:** None tracked (`/node_modules` is gitignored; `package.json` and `package-lock.json` unchanged in working tree because `--no-save` was used; the lockfile was regenerated by npm but reverted automatically since no save flag was passed — verified by `git status --short` reporting no tracked changes outside the four scaffold files).
- **Verification:** `git diff --name-only d65fedc..HEAD` lists only the four scaffold files — no toolchain commits.
- **Committed in:** N/A (toolchain-only, no source commit)

## Verification

### Plan must_have truths

| # | Truth | Status |
| --- | --- | --- |
| 1 | `src/features/teach/` exists with the api/types.ts → service.ts → queries.ts pattern | PASS — 4 files present |
| 2 | `queries.ts` exports a `teachKeys` factory with `all`, `cohorts`, `cohort(id)`, `learner(id)`, `submission(id)` helpers | PASS — all 5 helpers grep-confirmed |
| 3 | `service.ts` functions are stubs with `TODO(Phase2/3)` markers, throw at runtime, compile under strict TS | PASS — 4 throws + 4 TODO markers + tsc clean |
| 4 | `types.ts` exports the data contracts Phases 2 and 3 will consume | PASS — 13 exports grep-confirmed (Cohort, LearnerRow, SubmissionSummary, ProgressState, ModuleProgressCell, CohortDetail, LearnerDetail, SubmissionDetail, MarkReviewedInput, ModuleDef, ModuleType, RecordingPayload, ConversationPayload) |
| 5 | `constants/modules.ts` exports the typed 12-module catalog | PASS — exactly 12 entries, no `<REAL` placeholders |
| 6 | `tsc --noEmit` reports zero errors for files under `src/features/teach/` | PASS — full project compile, 0 errors |

### Acceptance criteria (per task)

```
Task 1 (types.ts):  10/10 grep checks PASS, tsc PASS
Task 2 (modules):    7/7  grep checks PASS, tsc PASS
Task 3 (service+q): 13/13 grep checks PASS, tsc PASS
```

### Final tsc output (filtered to teach paths)

```
$ ./node_modules/.bin/tsc --noEmit -p tsconfig.json | grep 'src/features/teach' ; echo "exit=$?"
exit=1   # grep returned no matches → 0 errors
```

### Threat-register dispositions verified

| Threat ID | Mitigation | Status |
| --- | --- | --- |
| T-01-03-01 (info disclosure: server-only leak) | `import 'server-only'` at top of service.ts; queries.ts imports service via queryFn closure | Implemented |
| T-01-03-02 (tampering: catalog drift) | 12 entries transcribed from prototype, IDs normalised, no placeholders remain | Implemented |
| T-01-03-03 (EoP: stub used in production) | All 4 stubs throw with descriptive Error referencing the implementing requirement | Implemented |
| T-01-03-04 (repudiation: schema drift) | Accepted in plan; types reflect Plan 01 schema as of writing | Accepted |

## Notes for downstream phases

- **Phase 2 (Cohorts Hub)** will replace the bodies of `getCohorts()` and `getCohort()` only — signatures and return types are locked. The matrix in `CohortDetail` is keyed by `learnerId`; iterate `MODULES` (already in module-num order) for column ordering.
- **Phase 3 (Mark-as-Reviewed)** will add `mutations.ts` next to `queries.ts` and invalidate `teachKeys.all` on success to refresh the cohort matrix and learner row in one call. The `MarkReviewedInput` contract supports the undo flow (REV-03) via `reviewed: false`.
- **Audio signed URLs:** the `SubmissionDetail.signedAudioUrl` field is optional and pre-shaped for Phase 3 (TTL ≤ 5 min — SPK-02). The path resolution rule (`payload.audioPath` first, then derive from `recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm`) is documented in REQUIREMENTS.md SPK-02.

## Self-Check: PASSED

Verified existence of all four created files via `test -f`, all three task commits exist in git log (`40e6bc2`, `5b4cbbd`, `c3446a7`), and final `tsc --noEmit` reports zero errors across the project (including the four new files). No tracked-file deletions in the wave (`git diff --diff-filter=D --name-only d65fedc..HEAD` returns empty).
