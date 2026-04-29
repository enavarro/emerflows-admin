---
phase: 03
plan: 01
subsystem: data-layer
tags: [supabase, server-only, react-query, signed-url]
requires: [01-foundations, 02-cohorts-hub]
provides:
  - "src/features/teach/api/service.ts:getLearner — server-only LearnerDetail reader"
  - "src/features/teach/api/service.ts:getSubmission — server-only SubmissionDetail reader with audio signing"
affects:
  - "Phase 3 Plans 04-06 (route prefetch via fetchQuery + client useSuspenseQuery)"
tech_stack:
  added: []
  patterns:
    - "Two-trip aggregate pattern (mirrors getCohort): fetch entity, then fetch related rows"
    - "Wire-format aliasing in service layer (created_at -> submittedAt, attempt_num -> attemptNum)"
    - "Signed-URL graceful degrade (D-10/SPK-06): try/catch leaves signedAudioUrl undefined on failure"
    - "Discriminated payload narrowing on submission.type before audio signing"
key_files:
  created: []
  modified:
    - "src/features/teach/api/service.ts"
decisions:
  - "Service returns submissionsByModule arrays unsorted on the wire — UI sorts per D-05"
  - "LearnerRow.level left undefined (no learners.level column today, matches D-09 fallback)"
  - "Audio signing only for type=recording with non-empty audioPath; conversation skipped"
  - "Sign failure logs via console.error and continues (D-10) — never blocks the response"
  - "SubmissionDetail.learner populated with submissionCount=0, latestActivityAt=null since the viewer header does not need them"
metrics:
  duration: "~3 minutes"
  tasks: 2
  files: 1
  completed: "2026-04-29T12:11:54Z"
---

# Phase 03 Plan 01: Service & Queries Summary

Replaced the throwing `getLearner` and `getSubmission` stubs in
`src/features/teach/api/service.ts` with real Supabase implementations
conforming to the Phase 1 type contracts (`LearnerDetail`, `SubmissionDetail`).

## What Was Built

### Task 1: `getLearner(learnerId)`

Two-trip aggregate (mirrors the existing `getCohort` shape in the same file):

1. **Trip 1** — `learners` row: `select('id, name, cohort, external_id').eq('id', learnerId).maybeSingle()`
2. **Trip 2** — `submissions` for the learner: `select('id, learner_id, module_id, type, attempt_num, status, created_at, reviewed_at, reviewed_by').eq('learner_id', learnerId)`

Aggregates per LRN-02 / LRN-03:
- `submissionCount` — distinct on `module_id|type` (matches D-02 semantics scoped to one learner)
- `latestActivityAt` — `max(submittedAt, reviewedAt)` via numeric epoch-ms compare (`tsMs()` helper, WR-03)
- `submissionsByModule` — rows grouped by `module_id`, **unsorted on the wire** (UI sorts per D-05)

Wire-format aliasing applied: `created_at → submittedAt`, `learner_id → learnerId`, `module_id → moduleId`, `attempt_num → attemptNum`, `reviewed_by → reviewedBy`.

### Task 2: `getSubmission(submissionId)`

Loads four pieces of data:

1. **`submissions` row** with full JSONB payload — `select('..., payload').eq('id', submissionId).maybeSingle()`
2. **`learners` row** for header display
3. **`MODULES` catalog lookup** via `getModule(submission.module_id)` — throws if module is not in the 12-module catalog
4. **Signed audio URL** (recordings only, with graceful degrade per D-10/SPK-06)

#### Signed-URL flow

```typescript
let signedAudioUrl: SubmissionDetail['signedAudioUrl'] = undefined;
if (submissionType === 'recording') {
  const recordingPayload = payload as RecordingPayload;
  if (recordingPayload.audioPath) {
    try {
      const { signedUrl, expiresAt } = await createSignedRecordingUrl(
        recordingPayload.audioPath
      );
      signedAudioUrl = { url: signedUrl, expiresAt };
    } catch (err) {
      // D-10: graceful degrade — leave signedAudioUrl undefined; UI renders
      // the brand-cream "Audio unavailable" notice. Transcript still renders.
      console.error(`getSubmission(${submissionId}): failed to sign audio URL:`, err);
    }
  }
}
```

The helper `createSignedRecordingUrl` (in `src/lib/supabase/admin.ts`) caps TTL at 5 minutes (`DEFAULT_SIGNED_URL_TTL_SEC = 300`) per SPK-02. It throws on failure; we catch and continue.

For `conversation` submissions there is no audio — `signedAudioUrl` stays `undefined`.

## Supabase Tables & Columns Touched

| Table | Columns Read | Where |
|-------|--------------|-------|
| `learners` | `id, name, cohort, external_id` | Both functions |
| `submissions` | `id, learner_id, module_id, type, attempt_num, status, created_at, reviewed_at, reviewed_by` (and `payload` for `getSubmission`) | Both functions |

No writes. No RLS bypass concerns at the read boundary because the admin client (service role) is gated by `import 'server-only'` and the routes that consume these functions are admin-gated via `requireAdmin()` (Phase 2 pattern, applied in Plans 04-06).

## Schema Observations for Plans 02-06

- **`submissions.created_at`** is the canonical "submitted at" timestamp. There is no `submitted_at` column. Aliased in TS at the service boundary.
- **`learners.level`** does not exist today. `LearnerRow.level` stays `undefined`; UI renders the `'—'` fallback (D-09).
- **`submissions.attempt_num`** is constrained to `1 | 2` in the schema; cast applied at service boundary.
- **`submissions.payload`** is JSONB; Supabase returns it as a parsed object. We narrow via `submission.type === 'recording'` before treating it as `RecordingPayload`.
- **`submissionsByModule` arrays are unsorted on the wire.** Plan 04 (learner detail page) must apply newest-first sort by `submittedAt` DESC with `attemptNum` DESC tiebreaker per D-05.

## Acceptance Criteria

- [x] `getLearner` no longer throws stub error — verified by absence of `is not implemented — see Phase 3 plan (LRN-01..03)` string
- [x] `getSubmission` no longer throws stub error — verified by absence of `is not implemented — see Phase 3 plan (SPK-*, CNV-*)` string
- [x] `npx tsc --noEmit` exits with code 0
- [x] `npm run build` exits with code 0 (server-only purity preserved)
- [x] Try/catch around `createSignedRecordingUrl` for D-10 graceful degrade
- [x] `if (submissionType === 'recording')` branching present
- [x] `import 'server-only'` preserved at line 1
- [x] Phase 1 type contracts (`src/features/teach/api/types.ts`) untouched
- [x] Existing `getCohort` body untouched

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `aa5e2cd1` | `feat(03-01): implement getLearner with two-trip aggregate` |
| 2 | `2a017985` | `feat(03-01): implement getSubmission with signed-URL graceful degrade` |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/features/teach/api/service.ts` exists and contains both new function bodies (verified via grep)
- Commit `aa5e2cd1` exists in git log
- Commit `2a017985` exists in git log
- `npx tsc --noEmit` exits 0
- `npm run build` exits 0
