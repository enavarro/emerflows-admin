# Requirements: Emerflows Teach Admin

**Defined:** 2026-04-25
**Core Value:** An admin can open any learner's submission for any module and see everything the learner produced (audio, transcript, AI coaching) plus mark it reviewed — without leaving the dashboard or running SQL.

## v1 Requirements

### Foundations

- [ ] **FND-01**: Sidebar nav exposes a top-level `Teach` section that links to `/dashboard/teach/cohorts`
- [ ] **FND-02**: All `/dashboard/teach/*` routes are gated server-side; only users with `profiles.role = 'admin'` get access (others redirect with a clear message)
- [ ] **FND-03**: A new `teach` (or `cohorts`) feature module under `src/features/` follows the project's `api/types.ts` → `api/service.ts` → `api/queries.ts` convention with shared key factory
- [ ] **FND-04**: Database migration adds `reviewed_at timestamptz` and `reviewed_by uuid` (FK to `auth.users.id`, nullable) columns to `public.submissions`, plus an RLS policy and/or RPC permitting admins to update only those two columns
- [ ] **FND-05**: Server-only Supabase admin client helper exists for Teach Admin reads (signed URLs, queries) without leaking service-role key to the browser

### Cohorts

- [x] **COH-01**: Admin sees a cohorts list page at `/dashboard/teach/cohorts` with one card per distinct `learners.cohort` value, showing learner count and aggregate submission counts (total / needs-review / reviewed)
- [x] **COH-02**: Cohorts list shows zero-state messaging when no cohorts/learners exist
- [x] **COH-03**: Cohorts list reflects the prototype's cohort-card information architecture (name, term hint, status, counts) using shadcn/ui primitives + brand tokens

### Cohort Detail

- [x] **COD-01**: Admin opens `/dashboard/teach/cohorts/[cohort]` and sees a learners table with name, level (if available), submission count, latest activity timestamp
- [x] **COD-02**: Cohort detail includes a learner × module progress matrix indicating per-cell state: not-started / submitted / reviewed (derived from `submissions.status` + `reviewed_at`)
- [x] **COD-03**: Module catalog used by the matrix is a typed constant on the client/server (12 modules with `id`, `num`, `title`, supported `types`) matching the prototype's `MODULES` list
- [x] **COD-04**: Each learner row links to that learner's detail page

### Learner Detail

- [x] **LRN-01**: Admin opens `/dashboard/teach/cohorts/[cohort]/learners/[learnerId]` and sees the learner's profile summary (name, cohort, level, external_id when present)
- [x] **LRN-02**: Learner page lists submissions grouped by module, sorted by module number, with badges for type (`speaking` / `conversation`), attempt number, status, submitted-at, and reviewed state
- [x] **LRN-03**: Each submission row links to the submission viewer with the submission id

### Submission Viewer — Speaking (recording)

- [x] **SPK-01**: Speaking viewer at `/dashboard/teach/submissions/[id]` (type=`recording`) shows learner + module + attempt header
- [x] **SPK-02**: Audio player streams the recording via a server-issued signed URL (TTL ≤ 5 minutes) from the private `recordings` bucket; path resolved from `payload.audioPath` or derived from `recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm`
- [x] **SPK-03**: Transcript renders one block per `recordingTranscript` entry, color-coded by `classification` (`strong` = sage; `needs improvement` = amber) per the project's transcript color rules
- [x] **SPK-04**: Per-word pronunciation hints from `recordingTranscript[].words[]` are surfaced on hover/inline next to the relevant word
- [x] **SPK-05**: AI coaching tips render grouped by `category` (`pronunciation`, `delivery`) with the tip text rendered as readable prose
- [x] **SPK-06**: Viewer handles missing `audioPath` gracefully (show "audio unavailable" message; transcript still renders)

### Submission Viewer — Conversation

- [x] **CNV-01**: Conversation viewer at `/dashboard/teach/submissions/[id]` (type=`conversation`) shows learner + module + attempt header
- [x] **CNV-02**: Polished introduction (`payload.introduction`) renders in a "polished version" callout, visually distinct from raw answers
- [x] **CNV-03**: Q&A pairs render in order, each showing the question, the learner's answer, and any inline flags (`{word, issue, suggestion}`) highlighting the flagged span
- [x] **CNV-04**: Exercise summary (`payload.exerciseSummary`) renders in a clearly labeled summary card at the bottom

### Review Action

- [ ] **REV-01**: Each submission viewer has a "Mark as reviewed" button (admin only); clicking it sets `reviewed_at = now()` and `reviewed_by = auth.uid()` on `submissions`
- [ ] **REV-02**: After a successful mark-reviewed, the React Query cache invalidates so the cohort matrix and learner submission list reflect the new state on next view
- [ ] **REV-03**: When already reviewed, the button is replaced by a "Reviewed by <admin> on <date>" indicator and an "Undo review" affordance (clears both columns)
- [ ] **REV-04**: Mutation uses `useMutation` and TanStack patterns consistent with `src/features/demos/`

### Visual Fidelity & Polish

- [ ] **VIS-01**: Pages preserve the prototype's structure: cohorts grid, cohort detail with learner table + matrix, learner detail with module-grouped submissions, submission viewer with header + body sections
- [ ] **VIS-02**: Components use existing `src/components/ui/*` primitives and brand tokens (`brand-teal`, `brand-sage`, `brand-beige`, `brand-cream`); no raw prototype CSS classes are imported
- [ ] **VIS-03**: All pages render proper loading (Suspense fallbacks) and error states; empty datasets render explicit zero-states
- [ ] **VIS-04**: Icons used by Teach Admin are imported only from `@/components/icons` (project convention)

## v2 Requirements

Deferred to future milestones; tracked but not in current roadmap.

### Educator Scoping

- **EDU-01**: Educators can access Teach Admin and see only cohorts/learners they own
- **EDU-02**: Cohort assignment to educators (cohort↔educator junction)

### Class Trends

- **TRN-01**: Class-wide vocab gaps view
- **TRN-02**: Class-wide grammar errors view
- **TRN-03**: Filler words frequency view
- **TRN-04**: Struggling-students surface

### Educator Notes

- **NOTE-01**: Educator can attach freeform notes to a submission
- **NOTE-02**: Notes are visible to other educators reviewing the same learner

### Cohort & Module Management

- **MGT-01**: Create / archive cohorts via admin UI
- **MGT-02**: Manage module catalog (add, reorder, retire modules)
- **MGT-03**: Invite teachers to a cohort

### AI Generation

- **AI-01**: Backend pipeline that produces transcript classification, tips, polished introduction, classified pairs, and summaries from raw learner output (currently produced by upstream learner app)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Educator role gating logic | Deferred — admin-only for v1 (user explicit) |
| Editing or deleting submissions | Read-only viewer is sufficient (user explicit) |
| Educator notes / freeform feedback on submissions | Mark-as-reviewed is the only mutation (user explicit) |
| Cohort wizard, invite flow, tweaks panel | Prototype placeholders, not in v1 (user: "placeholders that can be developed later on") |
| Class-wide trends, vocab gaps, struggling-students | Defer to v2 milestone |
| AI generation of tips/summaries/classification | Already produced upstream and stored in `submissions.payload`; viewer is read-only |
| Multi-cohort `cohorts` and `modules` tables | Single tenant + small stable module catalog — text identifiers sufficient |
| Real-time updates (websockets) | React Query refetch-on-focus is sufficient |
| Mobile-optimized layout | Desktop-first; admin tool, not learner-facing |
| Bulk-review actions | Single-submission review is sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Pending |
| FND-02 | Phase 1 | Pending |
| FND-03 | Phase 1 | Pending |
| FND-04 | Phase 1 | Pending |
| FND-05 | Phase 1 | Pending |
| COH-01 | Phase 2 | Complete |
| COH-02 | Phase 2 | Complete |
| COH-03 | Phase 2 | Complete |
| COD-01 | Phase 2 | Complete |
| COD-02 | Phase 2 | Complete |
| COD-03 | Phase 2 | Complete |
| COD-04 | Phase 2 | Complete |
| LRN-01 | Phase 3 | Complete |
| LRN-02 | Phase 3 | Complete |
| LRN-03 | Phase 3 | Complete |
| SPK-01 | Phase 3 | Complete |
| SPK-02 | Phase 3 | Complete |
| SPK-03 | Phase 3 | Complete |
| SPK-04 | Phase 3 | Complete |
| SPK-05 | Phase 3 | Complete |
| SPK-06 | Phase 3 | Complete |
| CNV-01 | Phase 3 | Complete |
| CNV-02 | Phase 3 | Complete |
| CNV-03 | Phase 3 | Complete |
| CNV-04 | Phase 3 | Complete |
| REV-01 | Phase 3 | Pending |
| REV-02 | Phase 3 | Pending |
| REV-03 | Phase 3 | Pending |
| REV-04 | Phase 3 | Pending |
| VIS-01 | Phase 4 | Pending |
| VIS-02 | Phase 4 | Pending |
| VIS-03 | Phase 4 | Pending |
| VIS-04 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 33 total
- Mapped to phases: 33 (100%)
- Unmapped: 0

---
*Requirements defined: 2026-04-25*
*Last updated: 2026-04-25 after roadmap mapping (33/33 mapped to 4 phases)*
