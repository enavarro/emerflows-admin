---
phase: 01-foundations
plan: 03
type: execute
wave: 1
depends_on: []
files_modified:
  - src/features/teach/api/types.ts
  - src/features/teach/api/service.ts
  - src/features/teach/api/queries.ts
  - src/features/teach/constants/modules.ts
autonomous: true
requirements:
  - FND-03
must_haves:
  truths:
    - 'src/features/teach/ directory exists with the api/types.ts → service.ts → queries.ts pattern'
    - 'queries.ts exports a teachKeys factory with `all`, `cohorts`, `cohort(id)`, `learner(id)`, `submission(id)` helpers'
    - 'service.ts functions are stubs with TODO(Phase2/3) markers, throw at runtime, compile under strict TS'
    - 'types.ts exports the data contracts that Phases 2 and 3 will consume (Cohort, Learner, SubmissionSummary, ModuleProgressCell, etc.)'
    - 'constants/modules.ts exports the typed 12-module catalog (id, num, title, types) matching teacher-admin/teacher-data.js MODULES'
    - "tsc --noEmit reports zero errors for files under src/features/teach/"
  artifacts:
    - path: 'src/features/teach/api/types.ts'
      provides: 'Cohort, Learner, SubmissionSummary, ModuleProgressCell, ProgressState, MarkReviewed types'
      exports:
        - 'Cohort'
        - 'LearnerRow'
        - 'SubmissionSummary'
        - 'ProgressState'
        - 'ModuleProgressCell'
        - 'CohortDetail'
        - 'LearnerDetail'
        - 'SubmissionDetail'
        - 'MarkReviewedInput'
      min_lines: 40
    - path: 'src/features/teach/api/service.ts'
      provides: 'getCohorts, getCohort, getLearner, getSubmission stubs (server-only)'
      exports:
        - 'getCohorts'
        - 'getCohort'
        - 'getLearner'
        - 'getSubmission'
      min_lines: 30
    - path: 'src/features/teach/api/queries.ts'
      provides: 'teachKeys factory and queryOptions wrappers'
      exports:
        - 'teachKeys'
        - 'cohortsQueryOptions'
        - 'cohortQueryOptions'
        - 'learnerQueryOptions'
        - 'submissionQueryOptions'
      min_lines: 25
    - path: 'src/features/teach/constants/modules.ts'
      provides: 'MODULES typed constant — 12 modules from prototype'
      exports:
        - 'MODULES'
        - 'getModule'
      min_lines: 20
  key_links:
    - from: 'src/features/teach/api/queries.ts'
      to: 'src/features/teach/api/service.ts'
      via: 'queryFn wraps the service call'
      pattern: "queryFn:\\s*\\(\\)\\s*=>\\s*get(Cohorts|Cohort|Learner|Submission)"
    - from: 'src/features/teach/api/service.ts'
      to: 'src/features/teach/api/types.ts'
      via: 'imported return types'
      pattern: "from\\s+'\\./types'"
---

<objective>
Create the `src/features/teach/` feature module scaffold following the project convention (`api/types.ts` → `service.ts` → `queries.ts`) plus a typed module catalog at `src/features/teach/constants/modules.ts`. The scaffold establishes contracts and key factories that Phases 2 and 3 will fill in — service functions are intentional stubs with `TODO(Phase2)` / `TODO(Phase3)` markers.

Purpose: Solo-dev workflow needs the feature shape locked down BEFORE implementation so Phases 2 and 3 can be planned (and built in parallel) without rediscovering contracts. The key factory in particular is the cache-invalidation seam Phase 3's mark-as-reviewed mutation depends on.

Output:
- `src/features/teach/api/types.ts` — public type contracts
- `src/features/teach/api/service.ts` — typed stub functions, server-only marker
- `src/features/teach/api/queries.ts` — `teachKeys` factory + `*QueryOptions()`
- `src/features/teach/constants/modules.ts` — 12-module typed catalog
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/STRUCTURE.md
@CLAUDE.md
@src/features/demos/api/types.ts
@src/features/demos/api/service.ts
@src/features/demos/api/queries.ts
@src/features/demos/api/mutations.ts

<interfaces>
<!-- Reference pattern (DO NOT modify these — copy the shape). -->
<!-- src/features/demos/api/queries.ts:
  export const demoKeys = {
    all: ['demos'] as const,
    tokens: () => [...demoKeys.all, 'tokens'] as const,
    spend: () => [...demoKeys.all, 'spend'] as const
  };
  export const tokensQueryOptions = () => queryOptions({ queryKey: demoKeys.tokens(), queryFn: () => listTokens() }); -->

<!-- Submissions schema columns relevant to types (from supabase/migrations/00001..00006 + plan 01):
  id uuid, learner_id uuid, module_id text, type ('conversation'|'recording'),
  attempt_num smallint(1|2), payload jsonb, status text, created_at timestamptz,
  reviewed_at timestamptz | null (added in plan 01), reviewed_by uuid | null (added in plan 01) -->

<!-- Learners schema columns: id uuid, name text, cohort text, external_id text|null, created_at timestamptz -->

<!-- Module catalog source (DO NOT import from this file — copy the data into a typed TS const):
  teacher-admin/teacher-data.js MODULES — 12 entries with id like 'module-01', num 1..12, title, types
  See PROJECT.md "Context" section: 12 modules typed catalog matching prototype's MODULES list (COD-03) -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Write src/features/teach/api/types.ts</name>
  <files>src/features/teach/api/types.ts</files>
  <read_first>
    - src/features/demos/api/types.ts (naming + suffix conventions)
    - .planning/codebase/CONVENTIONS.md (TypeScript section: interface vs type, suffix rules)
    - .planning/REQUIREMENTS.md (Cohorts, Cohort Detail, Learner Detail, Submission Viewer sections — these define the shapes Phases 2/3 will need)
    - .planning/PROJECT.md (Payload shapes section — recording + conversation payload structures)
    - supabase/migrations/00001_create_foundation_schema.sql (ground truth: learners, submissions columns)
  </read_first>
  <action>
Create `src/features/teach/api/types.ts` with the following content. These contracts must satisfy Phase 2 + Phase 3 needs without further changes — they are the load-bearing shape for the milestone. Use `interface` for object shapes (project convention) and `type` only for unions / discriminated unions. Preserve oxfmt formatting: single quotes, 2-space indent, semicolons, no trailing commas.

Required exports (all must be present):

1. `ModuleType` — union `'conversation' | 'recording'`
2. `ModuleDef` — interface `{ id: string; num: number; title: string; types: ModuleType[] }`
3. `Cohort` — interface `{ id: string; name: string; termHint?: string; learnerCount: number; totalSubmissions: number; needsReview: number; reviewed: number }`
4. `ProgressState` — union `'not-started' | 'submitted' | 'reviewed'`
5. `ModuleProgressCell` — interface `{ moduleId: string; state: ProgressState; submissionId: string | null; submittedAt: string | null; reviewedAt: string | null }`
6. `LearnerRow` — interface `{ id: string; name: string; cohort: string; level?: string; externalId?: string; submissionCount: number; latestActivityAt: string | null }`
7. `CohortDetail` — interface `{ cohort: Cohort; learners: LearnerRow[]; matrix: Record<string, ModuleProgressCell[]> }`  (matrix keyed by learnerId, value sorted by module num)
8. `SubmissionSummary` — interface `{ id: string; learnerId: string; moduleId: string; type: ModuleType; attemptNum: 1 | 2; status: string; submittedAt: string; reviewedAt: string | null; reviewedBy: string | null }`
9. `LearnerDetail` — interface `{ learner: LearnerRow; submissionsByModule: Record<string, SubmissionSummary[]> }` (keyed by moduleId)
10. `RecordingTranscriptWord`, `RecordingTranscriptEntry`, `RecordingTip`, `RecordingPayload` — payload shapes per PROJECT.md "Recording payload" entry: `{ tips: [{category, tip}], level, audioPath, recordingTranscript: [{text, classification, words: [{word, pronunciation}]}] }`. Use `'pronunciation' | 'delivery'` for `RecordingTip['category']` and `'strong' | 'needs improvement'` for `classification`.
11. `ConversationFlag`, `ClassifiedPair`, `ConversationPayload` — `{ introduction, conversationId, classifiedPairs: [{question, answer, flags: [{word, issue, suggestion}]}], exerciseSummary }`
12. `SubmissionPayload` — type union `RecordingPayload | ConversationPayload`
13. `SubmissionDetail` — interface `{ submission: SubmissionSummary; learner: LearnerRow; module: ModuleDef; payload: SubmissionPayload; signedAudioUrl?: { url: string; expiresAt: string } }`
14. `MarkReviewedInput` — interface `{ submissionId: string; reviewed: boolean }` (reviewed=false → undo, REV-03)
15. `MarkReviewedResponse` — interface `{ submission: Pick<SubmissionSummary, 'id' | 'reviewedAt' | 'reviewedBy'> }`

Header comment at top of file:
```
// ============================================================
// Teach Admin — public type contracts (FND-03)
// ============================================================
// Implementation (service.ts) and consumers (Phase 2/3 components)
// import only from this file. Wire-format types live here so the
// service implementation can be swapped without touching downstream code.
// ============================================================
```

Do NOT inline these types in service.ts or components — every consumer imports from `./types`.
  </action>
  <acceptance_criteria>
    - `test -f src/features/teach/api/types.ts` succeeds
    - `grep -c '^export interface Cohort ' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface SubmissionSummary' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export type ProgressState' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface ModuleProgressCell' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface CohortDetail' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface LearnerDetail' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface SubmissionDetail' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface MarkReviewedInput' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface RecordingPayload' src/features/teach/api/types.ts` returns 1
    - `grep -c '^export interface ConversationPayload' src/features/teach/api/types.ts` returns 1
    - `npx tsc --noEmit -p tsconfig.json` reports zero errors mentioning src/features/teach/api/types.ts
  </acceptance_criteria>
  <verify>
    <automated>test -f src/features/teach/api/types.ts && grep -q '^export interface Cohort ' src/features/teach/api/types.ts && grep -q '^export interface SubmissionDetail' src/features/teach/api/types.ts && npx --yes tsc --noEmit -p tsconfig.json 2>&1 | tee /tmp/tsc-types.log | (! grep -E 'src/features/teach/api/types\.ts.*error')</automated>
  </verify>
  <done>types.ts written with all required exports plus payload sub-types; tsc reports no errors in this file.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Write src/features/teach/constants/modules.ts (transcribed from prototype)</name>
  <files>src/features/teach/constants/modules.ts</files>
  <read_first>
    - teacher-admin/teacher-data.js (prototype source — copy MODULES array verbatim, transcribe to TS)
    - src/features/teach/api/types.ts (just-written ModuleDef + ModuleType)
    - .planning/REQUIREMENTS.md (COD-03 wording — 12 modules typed constant matching prototype)
  </read_first>
  <action>
1. Read `teacher-admin/teacher-data.js` and locate the `MODULES` constant. Each entry has `id`, `num`, `title`, and `types` (or equivalent — match the prototype field names; coerce to `ModuleType[]`).

2. If `MODULES` does not exist or is not 12 entries, STOP and surface as a blocker — do NOT fabricate the catalog.

3. Create `src/features/teach/constants/modules.ts` with EXACTLY this structure (filling in the 12 real entries from the prototype):

```typescript
import type { ModuleDef, ModuleType } from '../api/types';

export type { ModuleDef, ModuleType };

// 12-module catalog mirroring teacher-admin/teacher-data.js MODULES (COD-03).
// Order is significant — consumers iterate this array to build the cohort
// progress matrix (one column per module, in module-num order).
export const MODULES: readonly ModuleDef[] = [
  { id: 'module-01', num: 1, title: '<REAL TITLE FROM PROTOTYPE>', types: ['conversation', 'recording'] },
  // ... entries 02 through 11 — transcribed exactly from teacher-data.js ...
  { id: 'module-12', num: 12, title: '<REAL TITLE FROM PROTOTYPE>', types: ['<REAL TYPES>'] }
] as const;

export function getModule(moduleId: string): ModuleDef | undefined {
  return MODULES.find((m) => m.id === moduleId);
}
```

Replace each `<REAL TITLE FROM PROTOTYPE>` and `<REAL TYPES>` placeholder with values transcribed from the prototype. After editing, no `<REAL` placeholder text may remain in the file.

Notes:
- Use `as const` on the array literal so types narrow correctly downstream.
- Re-export the types from `../api/types` for ergonomic imports.
- The `getModule` helper is used by Phase 2's matrix builder and Phase 3's submission-viewer header.
  </action>
  <acceptance_criteria>
    - `test -f src/features/teach/constants/modules.ts` succeeds
    - `grep -c "^export const MODULES" src/features/teach/constants/modules.ts` returns 1
    - `grep -c "id: 'module-01'" src/features/teach/constants/modules.ts` returns 1
    - `grep -c "id: 'module-12'" src/features/teach/constants/modules.ts` returns 1
    - `awk '/^export const MODULES/,/\] as const;/' src/features/teach/constants/modules.ts | grep -c "id: 'module-"` returns exactly 12
    - `grep -c '^export function getModule' src/features/teach/constants/modules.ts` returns 1
    - No literal placeholder text remains: `grep -c '<REAL' src/features/teach/constants/modules.ts` returns 0
    - `npx tsc --noEmit -p tsconfig.json` reports zero errors mentioning this file
  </acceptance_criteria>
  <verify>
    <automated>test -f src/features/teach/constants/modules.ts && [ "$(awk '/^export const MODULES/,/\] as const;/' src/features/teach/constants/modules.ts | grep -c \"id: 'module-\")" = "12" ] && ! grep -q '<REAL' src/features/teach/constants/modules.ts && npx --yes tsc --noEmit -p tsconfig.json 2>&1 | (! grep -E 'src/features/teach/constants/modules\.ts.*error')</automated>
  </verify>
  <done>Catalog written with all 12 entries transcribed from prototype, no placeholders remaining, tsc clean.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Write src/features/teach/api/service.ts (server-only stubs) and queries.ts (key factory)</name>
  <files>src/features/teach/api/service.ts, src/features/teach/api/queries.ts</files>
  <read_first>
    - src/features/demos/api/service.ts (reference pattern — current stubs)
    - src/features/demos/api/queries.ts (reference key factory shape)
    - src/features/teach/api/types.ts (just-written contracts)
    - src/features/teach/constants/modules.ts (just-written catalog)
    - .planning/codebase/CONVENTIONS.md (React Query + key-factory section)
  </read_first>
  <action>
**File 1 — `src/features/teach/api/service.ts`:** create with EXACTLY this content:

```typescript
import 'server-only';

// ============================================================
// Teach Admin — data access stubs (FND-03)
// ============================================================
// These functions own the read-side contracts the feature exposes.
// Phase 2 (Cohorts Hub) implements getCohorts + getCohort.
// Phase 3 (Learner Deep-Dive) implements getLearner + getSubmission.
// Each stub throws so accidental usage in early phases fails loudly
// rather than rendering empty pages.
// ============================================================

import type {
  Cohort,
  CohortDetail,
  LearnerDetail,
  SubmissionDetail
} from './types';

export async function getCohorts(): Promise<Cohort[]> {
  // TODO(Phase2 / COH-01): query distinct learners.cohort + aggregate submission counts via admin client
  throw new Error('getCohorts is not implemented — see Phase 2 plan (COH-01)');
}

export async function getCohort(cohortId: string): Promise<CohortDetail> {
  // TODO(Phase2 / COD-01..04): join learners + submissions, build module progress matrix
  throw new Error(`getCohort(${cohortId}) is not implemented — see Phase 2 plan (COD-01..04)`);
}

export async function getLearner(learnerId: string): Promise<LearnerDetail> {
  // TODO(Phase3 / LRN-01..03): fetch learner + submissions grouped by module
  throw new Error(`getLearner(${learnerId}) is not implemented — see Phase 3 plan (LRN-01..03)`);
}

export async function getSubmission(submissionId: string): Promise<SubmissionDetail> {
  // TODO(Phase3 / SPK-*, CNV-*): fetch submission + payload + sign audio URL via createSignedRecordingUrl
  throw new Error(
    `getSubmission(${submissionId}) is not implemented — see Phase 3 plan (SPK-*, CNV-*)`
  );
}
```

**File 2 — `src/features/teach/api/queries.ts`:** create with EXACTLY this content:

```typescript
import { queryOptions } from '@tanstack/react-query';

import { getCohort, getCohorts, getLearner, getSubmission } from './service';

// ============================================================
// Teach Admin — React Query key factory + query options (FND-03)
// ============================================================
// Mutation invalidation in Phase 3 (mark-as-reviewed) keys off
// teachKeys.all to refresh cohort matrix + learner list at once.
// ============================================================

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
    queryFn: () => getCohorts()
  });

export const cohortQueryOptions = (cohortId: string) =>
  queryOptions({
    queryKey: teachKeys.cohort(cohortId),
    queryFn: () => getCohort(cohortId)
  });

export const learnerQueryOptions = (learnerId: string) =>
  queryOptions({
    queryKey: teachKeys.learner(learnerId),
    queryFn: () => getLearner(learnerId)
  });

export const submissionQueryOptions = (submissionId: string) =>
  queryOptions({
    queryKey: teachKeys.submission(submissionId),
    queryFn: () => getSubmission(submissionId)
  });
```

Notes for executor:
- service.ts uses `import 'server-only'` because Phase 2 and Phase 3 implementations will use the admin client from Plan 02 (which is itself server-only). Stubbing this constraint now prevents downstream regression.
- queries.ts MUST NOT have `'server-only'` — query options are imported by client components via `useSuspenseQuery`.
- The service stubs throw at runtime; this is intentional — any premature wiring fails loudly. Phase 2/3 plans will replace these bodies, not the signatures.
  </action>
  <acceptance_criteria>
    - `test -f src/features/teach/api/service.ts && test -f src/features/teach/api/queries.ts` succeeds
    - `grep -c "^import 'server-only';" src/features/teach/api/service.ts` returns 1
    - `grep -c "^import 'server-only'" src/features/teach/api/queries.ts` returns 0  (queries.ts MUST NOT be server-only)
    - `grep -c '^export async function getCohorts' src/features/teach/api/service.ts` returns 1
    - `grep -c '^export async function getCohort' src/features/teach/api/service.ts` returns 1
    - `grep -c '^export async function getLearner' src/features/teach/api/service.ts` returns 1
    - `grep -c '^export async function getSubmission' src/features/teach/api/service.ts` returns 1
    - `grep -c "^export const teachKeys" src/features/teach/api/queries.ts` returns 1
    - `grep -c "all: \[\?'teach'\]\? as const" src/features/teach/api/queries.ts` returns 1
    - `grep -c "^export const cohortsQueryOptions" src/features/teach/api/queries.ts` returns 1
    - `grep -c "^export const cohortQueryOptions" src/features/teach/api/queries.ts` returns 1
    - `grep -c "^export const learnerQueryOptions" src/features/teach/api/queries.ts` returns 1
    - `grep -c "^export const submissionQueryOptions" src/features/teach/api/queries.ts` returns 1
    - `npx tsc --noEmit -p tsconfig.json` reports zero errors mentioning either file
  </acceptance_criteria>
  <verify>
    <automated>test -f src/features/teach/api/service.ts && test -f src/features/teach/api/queries.ts && grep -q "^import 'server-only';" src/features/teach/api/service.ts && grep -q "^export const teachKeys" src/features/teach/api/queries.ts && npx --yes tsc --noEmit -p tsconfig.json 2>&1 | (! grep -E 'src/features/teach/api/(service|queries)\.ts.*error')</automated>
  </verify>
  <done>service.ts (server-only stubs) and queries.ts (key factory + query options) both written; full project tsc reports no errors mentioning either file.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server (RSC / route handler) → service.ts | Service functions are server-only; bypassing this boundary is a build-time error |
| Client component → queries.ts | Client imports query options; queryFn runs on the server when used via prefetchQuery, on the client when used via useSuspenseQuery (post-hydration refetch) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-03-01 | Information Disclosure | Service stub leaks server-only code into client bundle | mitigate | `import 'server-only'` at top of service.ts; queries.ts imports service functions only inside `queryFn`, which Next.js code-splits out of the client bundle (same pattern as src/features/demos/api/queries.ts which is in production) |
| T-01-03-02 | Tampering | Module catalog mismatched with live data | mitigate | Catalog is transcribed from prototype `teacher-admin/teacher-data.js` (single source of truth per Decision in PROJECT.md); Task 2 acceptance check requires exactly 12 entries and no placeholder text |
| T-01-03-03 | Elevation of Privilege | Stub being used in production by accident | mitigate | Each stub throws an Error mentioning the requirement that should implement it; consumer pages will fail loudly at first request |
| T-01-03-04 | Repudiation | Stale type contract drifts from live schema | accept | Types reflect the schema as of plan 01 (review columns added); Phase 2/3 plans will diff and update before implementation |
</threat_model>

<verification>
- All 4 file-level acceptance criteria satisfied.
- `npx tsc --noEmit -p tsconfig.json` clean across feature directory.
- 5 must_have truths satisfied (file presence, key factory, stub throwing, types exported, catalog with 12 entries).
</verification>

<success_criteria>
1. `src/features/teach/` directory exists with `api/types.ts`, `api/service.ts`, `api/queries.ts`, `constants/modules.ts`.
2. `teachKeys` factory exists with `all`, `cohorts()`, `cohort(id)`, `learner(id)`, `submission(id)` helpers.
3. Module catalog has exactly 12 entries with `id`, `num`, `title`, `types` matching the prototype.
4. `tsc --noEmit` reports zero errors for any file under `src/features/teach/`.
5. `service.ts` is `'server-only'`; `queries.ts` is not.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations/01-03-SUMMARY.md` with:
- Tree of `src/features/teach/` after the changes
- Output of `npx tsc --noEmit -p tsconfig.json` filtered to teach paths
- Note any data shape that had to differ from the action spec to satisfy strict TS (and why)
</output>
