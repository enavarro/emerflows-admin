# Roadmap: Emerflows Teach Admin

## Overview

Teach Admin is a brownfield milestone delivered as four additive phases on top of the
existing Next.js 16 + Supabase emerflows-admin app. We start by adding the foundations
(sidebar entry, server-side admin RBAC, feature scaffold, schema migration for the
review columns, and a server-only Supabase admin helper). We then build the read-only
admin browse surfaces (cohorts list and cohort detail with learner table + module
progress matrix). Next we ship the learner-deep-dive surfaces (learner detail page
plus the speaking and conversation submission viewers) together with the
mark-as-reviewed mutation, since they share the signed-URL playback flow, payload
rendering, and the cache invalidation that flows back into the matrix. Finally we
polish for visual fidelity against the `teacher-admin/` prototype, lock down
loading/error/empty states, and run an end-to-end Playwright smoke covering
cohort → learner → submission → review.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundations** - Nav entry, admin RBAC, feature scaffold, review-columns migration, server admin helper *(completed 2026-04-25)*
- [x] **Phase 2: Cohorts Hub** - Cohorts list page and cohort detail with learner table + module progress matrix *(completed 2026-04-25)*
- [x] **Phase 3: Learner Deep-Dive & Review** - Learner detail, speaking + conversation viewers, mark-as-reviewed mutation, per-page breadcrumbs, per-submission sibling switcher *(completed 2026-04-30)*
- [ ] **Phase 4: Visual Fidelity & Verification** - Prototype-faithful structure, loading/error/empty states, icon-registry compliance, e2e smoke

## Phase Details

### Phase 1: Foundations
**Goal**: Establish the routing, RBAC, data-access scaffolding, and schema changes that the rest of Teach Admin builds on, without shipping any user-facing screens beyond the sidebar entry point.
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05
**Success Criteria** (what must be TRUE):
  1. An admin user sees a `Teach` entry in the sidebar nav that links to `/dashboard/teach/cohorts`; non-admins do not see it.
  2. Hitting any `/dashboard/teach/*` route as a non-admin server-redirects to a clear deny message; admins pass through.
  3. A `src/features/teach/` (or `cohorts/`) feature module exists with `api/types.ts`, `api/service.ts`, `api/queries.ts` (and key factory) following the project convention — even if surfaces are stubbed.
  4. `public.submissions` has `reviewed_at timestamptz` and `reviewed_by uuid` columns (FK to `auth.users.id`, nullable) with an RLS policy/RPC that lets admins update only those two columns; verified via psql/Supabase SQL editor.
  5. A server-only Supabase admin helper exists in `src/lib/supabase/` (or feature `api/`) and is importable in route handlers / server components without leaking the service-role key to the client bundle.
**Plans**: 5 plans
- [x] 01-01-PLAN.md (Wave 1) — Migration 00010: add `submissions.reviewed_at` + `reviewed_by` columns and admin-only RLS policy [FND-04]
- [x] 01-02-PLAN.md (Wave 1) — Server-only Supabase admin helper with signed-URL utility (TTL ≤ 300s) [FND-05]
- [x] 01-03-PLAN.md (Wave 1) — `src/features/teach/` scaffold: types, service stubs, queries with key factory, 12-module catalog [FND-03]
- [x] 01-04-PLAN.md (Wave 2) — Server-side `requireAdmin()` helper + `/dashboard/teach/*` segment layout that gates non-admins [FND-02]
- [x] 01-05-PLAN.md (Wave 3) — Sidebar `Teach` entry linking to `/dashboard/teach/cohorts` with admin-only access guard [FND-01]
**UI hint**: yes

### Phase 2: Cohorts Hub
**Goal**: Admins can browse cohorts and drill into a cohort to see its learners and per-module progress, matching the prototype's information architecture.
**Depends on**: Phase 1
**Requirements**: COH-01, COH-02, COH-03, COD-01, COD-02, COD-03, COD-04
**Success Criteria** (what must be TRUE):
  1. An admin loads `/dashboard/teach/cohorts` and sees a non-empty card for `spring-2026` with learner count and submission counts (total / needs-review / reviewed) that match Supabase ground truth.
  2. The cohorts list renders an explicit zero-state when no cohorts/learners exist (verified by mocking or filtering).
  3. An admin opens `/dashboard/teach/cohorts/spring-2026` and sees a learner table with name, level (when present), submission count, and latest activity timestamp; each row links to that learner's detail page (URL only — page wired in Phase 3).
  4. The cohort detail shows a learner × module progress matrix where each cell renders one of `not-started` / `submitted` / `reviewed`, derived from `submissions.status` + `reviewed_at`, using the 12-module typed catalog.
  5. Cohort-card and cohort-detail UI uses only `src/components/ui/*` primitives and brand tokens — no raw prototype CSS classes — and visually echoes the `teacher-admin/` prototype's structure.
**Plans**: 5 plans
- [x] 02-01-PLAN.md (Wave 1) — Replace getCohorts/getCohort service stubs with real Supabase queries (D-01..D-05) [COD-03]
- [x] 02-02-PLAN.md (Wave 2) — Cohorts list page + cohort card + error.tsx (D-06..D-12, COH-01..03) [COH-01, COH-02, COH-03]
- [x] 02-03-PLAN.md (Wave 2) — Cohort detail dynamic route + tabs wrapper + learners table (D-13, D-14, COD-01, COD-04) [COD-01, COD-04]
- [x] 02-04-PLAN.md (Wave 2) — Progress matrix client component with sticky-header + sage-progressive dots + tooltips (D-15..D-19) [COD-02, COD-03]
- [x] 02-05-PLAN.md (Wave 3) — Playwright happy-path e2e covering both routes + matrix render
**UI hint**: yes

### Phase 3: Learner Deep-Dive & Review
**Goal**: Admins can open any learner, drill into any speaking or conversation submission, see everything the learner produced (audio, transcript, AI coaching, polished intro, classified Q&A, summary), and mark the submission reviewed — closing the core-value loop.
**Depends on**: Phase 2
**Requirements**: LRN-01, LRN-02, LRN-03, SPK-01, SPK-02, SPK-03, SPK-04, SPK-05, SPK-06, CNV-01, CNV-02, CNV-03, CNV-04, REV-01, REV-02, REV-03, REV-04
**Success Criteria** (what must be TRUE):
  1. An admin opens `/dashboard/teach/cohorts/spring-2026/learners/[learnerId]` and sees the learner's profile summary (name, cohort, level, external_id when present) plus submissions grouped by module — sorted by module number — with badges for type, attempt, status, submitted-at, and reviewed state; each row links to the submission viewer.
  2. Opening a `recording` submission renders the speaking viewer with a header (learner + module + attempt), an audio player streaming via a server-issued signed URL (TTL ≤ 5 min) from the private `recordings` bucket, a color-coded transcript (sage = strong, amber = needs improvement) with per-word pronunciation hints, and AI coaching tips grouped by category — and degrades gracefully to "audio unavailable" when `audioPath` is missing while still rendering the transcript.
  3. Opening a `conversation` submission renders the conversation viewer with the polished introduction in a visually distinct callout, ordered Q&A pairs with inline `{word, issue, suggestion}` flags highlighting the flagged span, and a clearly labeled exercise-summary card at the bottom.
  4. Clicking "Mark as reviewed" on either viewer writes `reviewed_at = now()` / `reviewed_by = auth.uid()` to the submission, invalidates React Query caches so the cohort matrix and learner list reflect the new state on next view, and replaces the button with "Reviewed by <admin> on <date>" plus an "Undo review" affordance that clears both columns.
  5. The review mutation uses `useMutation` with the same patterns as `src/features/demos/` (key-factory invalidation, toast on success/error).
**Plans**: 6 plans
- [ ] 03-01-PLAN.md (Wave 1) — Implement getLearner + getSubmission service bodies (LRN-*, SPK-*, CNV-* data layer) [LRN-01, LRN-02, LRN-03, SPK-01, SPK-02, SPK-03, SPK-04, SPK-05, SPK-06, CNV-01, CNV-02, CNV-03, CNV-04]
- [ ] 03-02-PLAN.md (Wave 1) — POST /api/teach/submissions/[id]/review route + service-client + markReviewedMutation [REV-01, REV-02, REV-04]
- [ ] 03-03-PLAN.md (Wave 1) — Extend Icons registry (mic, sparkle alias, messageSquare alias, fileX, undo) []
- [ ] 03-04-PLAN.md (Wave 2) — Learner detail page (route + error.tsx + cards-per-module client component) [LRN-01, LRN-02, LRN-03]
- [ ] 03-05-PLAN.md (Wave 2) — Submission viewer route + speaking viewer (audio + transcript + tips) [SPK-01, SPK-02, SPK-03, SPK-04, SPK-05, SPK-06]
- [ ] 03-06-PLAN.md (Wave 2) — Conversation viewer + mark-reviewed control (CNV-* + REV-03 UI) [CNV-01, CNV-02, CNV-03, CNV-04, REV-03]
**UI hint**: yes

### Phase 4: Visual Fidelity & Verification
**Goal**: Lock down the prototype-faithful look across all Teach Admin surfaces, ensure every screen handles loading / error / empty states correctly, and prove the cohort → learner → submission → review flow with an end-to-end Playwright test.
**Depends on**: Phase 3
**Requirements**: VIS-01, VIS-02, VIS-03, VIS-04
**Success Criteria** (what must be TRUE):
  1. Side-by-side comparison against `teacher-admin/` confirms structural parity: cohorts grid, cohort detail with learner table + matrix, learner detail with module-grouped submissions, and submission viewer with header + body sections — all using `src/components/ui/*` primitives and brand tokens (`brand-teal`, `brand-sage`, `brand-beige`, `brand-cream`).
  2. Every Teach Admin page renders a Suspense fallback during initial load, an error boundary on data-fetch failure, and an explicit zero-state when its dataset is empty — verified by inducing each state.
  3. A grep over `src/features/teach/` (or feature path) finds zero direct imports from `@tabler/icons-react`; all icons come from `@/components/icons`.
  4. A new Playwright spec (e.g., `tests/e2e/teach.spec.ts`) drives the full flow as an admin user: open cohorts list → open `spring-2026` → open a learner → open a speaking submission → mark as reviewed → confirm matrix reflects the change → undo review → confirm reverted.
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundations | 0/5 | Not started | - |
| 2. Cohorts Hub | 0/TBD | Not started | - |
| 3. Learner Deep-Dive & Review | 0/6 | Not started | - |
| 4. Visual Fidelity & Verification | 0/TBD | Not started | - |

## Backlog

### Phase 999.2: Learner level computation feature (BACKLOG)

**Goal:** Compute and persist `learners.level` (e.g., CEFR A1..C2) automatically from learner submissions. Today the schema has no `level` column, so the cohort-detail learners table renders `—` in every row. Surfaced during Phase 2 UAT — user wants level computed by a periodic/triggered process rather than manually entered.

**Why this matters:**
- Phase 2 UI already has a `Level` column locked (`learners-table.tsx:46`); making it data-driven closes the visual gap and prevents teachers from interpreting a placeholder as missing data.
- Phase 3 learner detail surfaces `learner.level` per requirement LRN-01; needs a value to display.
- Auto-computation removes admin toil and keeps level current as learners progress.

**Open questions to resolve in /gsd-discuss-phase:**
- **Scoring rubric:** Which submission signals feed the level? Conversational fluency score, exercise accuracy, vocabulary range, error density? Average vs latest vs trend?
- **CEFR mapping:** What thresholds map a score to A1/A2/B1/B2/C1/C2? Do we need linguist input or can we derive from existing AI-coaching tip categories?
- **Trigger model (user suggested two options):**
  - (a) Cron job on a fixed cadence (e.g., weekly Sunday 02:00 UTC) — simple, predictable, cheap.
  - (b) Event-triggered: re-compute when a learner submits N (≥2?) new submissions since last computation — fresher levels, more compute, needs idempotency.
  - Hybrid: event-triggered with a max-staleness backstop cron.
- **Scope of recompute:** Always recompute from full history vs incremental update keyed on `last_level_computed_at`?
- **Storage:** New column `learners.level` (text or enum), plus `learners.level_computed_at` and `learners.level_source` (audit trail).
- **Manual override:** Admins may want to override the computed level (e.g., placement test). Should the column hold the override and computation populate a separate `level_computed` field?

**Implementation skeleton:**
- (a) Migration: `ALTER TABLE learners ADD COLUMN level text NULL, ADD COLUMN level_computed_at timestamptz NULL, ADD COLUMN level_source text NULL CHECK (level_source IN ('computed','manual'))`
- (b) Edge function `compute-learner-level` (Supabase): pulls a learner's submissions, runs scoring rubric, writes back. Idempotent.
- (c) Trigger: choose (a)/(b)/hybrid above. If cron — Supabase pg_cron or external scheduler. If event — DB trigger that enqueues a job, processed async.
- (d) Update `service.ts:getCohort()` and Phase 3 `getLearner()` to surface `level` from the column (already shape-compatible).
- (e) Optional: admin override UI in Phase 4+ to set `level_source='manual'`.

**Requirements:** TBD (LRN-01 depends on it being filled when present)
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.1: Schema — denormalized `submissions.cohort` column with FK + backfill (BACKLOG)

**Goal:** Add a denormalized `cohort` column to `public.submissions` so cohort-scoped queries don't have to two-trip through `learners`. Surfaced during Phase 2 UAT — user explicitly requested this for future implementations to avoid coupling all cohort lookups through learner aggregation.

**Why this matters:**
Today, `service.ts:getCohort(cohortId)` does:
1. `SELECT id FROM learners WHERE cohort = $1` — get learnerIds
2. `SELECT ... FROM submissions WHERE learner_id IN (learnerIds)` — attribute submissions to the cohort

This pattern works but couples every submission-level feature to learner aggregation. Adding `submissions.cohort` enables single-trip queries, simpler RLS policies, easier exports/analytics, and reduced surface area for cohort-move bugs.

**Migration outline:**
- (a) `ALTER TABLE submissions ADD COLUMN cohort text NULL`
- (b) Backfill: `UPDATE submissions s SET cohort = l.cohort FROM learners l WHERE s.learner_id = l.id`
- (c) `ALTER TABLE submissions ALTER COLUMN cohort SET NOT NULL` + add FK constraint to a cohorts table (or check constraint if cohorts remain string-keyed)
- (d) Update insert/update flows in app + edge functions to set `cohort` on submission creation
- (e) Decide cohort-move semantics: cascading UPDATE on `learners.cohort` change, or freeze at submission-time

**Requirements:** TBD
**Plans:** 0 plans

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
