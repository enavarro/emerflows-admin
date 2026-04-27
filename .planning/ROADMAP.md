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
- [ ] **Phase 2: Cohorts Hub** - Cohorts list page and cohort detail with learner table + module progress matrix
- [ ] **Phase 3: Learner Deep-Dive & Review** - Learner detail page, speaking + conversation submission viewers, mark-as-reviewed mutation
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
- [ ] 02-05-PLAN.md (Wave 3) — Playwright happy-path e2e covering both routes + matrix render
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
**Plans**: TBD
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
| 3. Learner Deep-Dive & Review | 0/TBD | Not started | - |
| 4. Visual Fidelity & Verification | 0/TBD | Not started | - |
