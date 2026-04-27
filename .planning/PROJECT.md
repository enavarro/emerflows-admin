# Emerflows Teach Admin

## What This Is

Internal admin section of the Emerflows English Course platform that lets administrators
review learner work across cohorts. Admins browse cohorts, drill into individual learners,
and inspect each submission — listening to speaking recordings, reading auto-classified
transcripts, and reviewing AI-generated coaching tips, conversational Q&A pairs, and
exercise summaries that the learner-facing app already produced and stored in Supabase.

## Core Value

An admin can open any learner's submission for any module and see everything the learner
produced (audio, transcript, AI coaching) plus mark it reviewed — without leaving the
dashboard or running SQL.

## Requirements

### Validated

<!-- Existing capabilities of the broader emerflows-admin platform (from codebase map). -->

- ✓ Next.js 16 + shadcn/ui dashboard shell with sidebar nav, layout, RBAC scaffolding
- ✓ Supabase auth (admin/educator roles via `public.profiles.role`) with SSR session
- ✓ React Query data layer pattern: `api/types.ts` → `api/service.ts` → `api/queries.ts`,
  hydration via `prefetchQuery` + `useSuspenseQuery`
- ✓ Demo platform (`/dashboard/demos`) — JWT minting, revocation, spend gauge
- ✓ Supabase tables `learners` (49 rows, cohort `spring-2026`), `submissions`
  (68 rows, type ∈ {`conversation`, `recording`}, payload JSONB), `profiles`
- ✓ Private `recordings` storage bucket; path pattern
  `recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm`
- ✓ RPCs: `get_upload_path`, `get_latest_submission`, `get_submitted_attempts`,
  `check_attempt_status`, plus demo variants and `save_*` writers
- ✓ Admin sees a `Teach` section in the sidebar nav and lands on a cohorts list
  *(Validated in Phase 2: cohorts-hub)*
- ✓ Admin sees all cohorts (currently just `spring-2026`) with learner counts and
  submission/review status summary
  *(Validated in Phase 2: cohorts-hub — 4/5 UAT pass + zero-state via static check)*
- ✓ Admin opens a cohort and sees its learners in a table plus a module-progress matrix
  (learner × module → submitted / reviewed / not-yet)
  *(Validated in Phase 2: cohorts-hub — Spring 2026 detail page with Learners + Progress matrix tabs)*

### Active

<!-- v1 hypotheses for the Teach Admin milestone. -->
- [ ] Admin opens a learner and sees that learner's submissions grouped by module, with
  type (speaking / conversation), attempt number, status, submitted-at
- [ ] Admin opens a speaking submission and listens to the audio (signed-URL playback)
  while reading the transcript with sentence-level classification (`strong` /
  `needs improvement`) and AI coaching tips (`pronunciation`, `delivery`)
- [ ] Admin opens a conversation submission and reads the polished introduction, the
  classified Q&A pairs with inline flags (issue + suggestion), and the exercise summary
- [ ] Admin marks a submission as reviewed; the action is recorded with reviewer identity
  and timestamp on `submissions`
- [ ] Only users with `profiles.role = 'admin'` can access `/dashboard/teach/*`;
  educators are redirected with a clear message
- [ ] Visual structure matches the prototype in `teacher-admin/` (cohort cards, learner
  table, submission viewer layout) using existing shadcn/ui primitives + brand tokens

### Out of Scope

<!-- v1 boundaries — keep the milestone shippable. -->

- Educator role gating beyond a deny-redirect — Defer until v2 (per user: "Later
  stages we can add teacher roles")
- Generating AI coaching tips, transcript classifications, polished introductions, or
  exercise summaries — These are produced upstream by the learner-facing app and stored
  in `submissions.payload`; Teach Admin is read-only over what's already there
- Editing or deleting submissions — Out of scope; mark-as-reviewed is the only mutation
- Educator notes / freeform feedback on submissions — Per user: "Marcos a review is
  enough no need to add some notes"
- Cohort wizard, invite flow, tweaks panel, class-wide trends, struggling-students
  detection — Prototype placeholders deferred to later milestones
- Multi-cohort architecture (separate `cohorts` and `modules` tables) — Single-tenant
  with cohort/module as text identifiers is sufficient at current scale
- Real-time updates / websockets — React Query refetch on focus is sufficient

## Context

**Prototype source:** `teacher-admin/` contains a 7-file, ~2,800-line React/JSX
prototype with custom CSS that defines the target IA and visual structure. It uses
seed data in `teacher-data.js`. Teach Admin must preserve the prototype's information
architecture (cohort cards, learner grid, module-progress matrix, submission viewer
with transcript + tips for speaking and intro + Q&A flags + summary for conversation)
while adapting to the production stack (shadcn/ui + Tailwind + brand tokens).

**Live data:** Supabase project `bohqhhpzsgmwsvqryhfw` (Emerflows English Course).
Currently 49 learners in cohort `spring-2026`, 68 submissions across module-01 only
(45 conversation, 23 recording). Recordings bucket has matching audio files.

**Payload shapes (already stored, no AI generation needed):**

- Recording payload: `{ tips: [{category, tip}], level, audioPath,
  recordingTranscript: [{text, classification, words: [{word, pronunciation}]}] }`
- Conversation payload: `{ introduction, conversationId,
  classifiedPairs: [{question, answer, flags: [{word, issue, suggestion}]}],
  exerciseSummary }`

**Existing feature analogs:** `src/features/demos/`, `src/features/users/` follow the
React Query + Zod + service+queries pattern documented in `CLAUDE.md`. Teach Admin
will follow the same conventions.

**Schema gap to close:** `submissions` has no `reviewed_at` / `reviewed_by` columns
yet — migration required for the mark-as-reviewed flow.

## Constraints

- **Tech stack**: Next.js 16 App Router + shadcn/ui + Tailwind 4 + TanStack React Query
  5 — Existing convention; documented in `CLAUDE.md` and codebase map
- **Data layer**: Supabase via `@supabase/ssr` with admin role enforced server-side —
  Established RBAC pattern from `docs/nav-rbac.md`
- **UI**: Use components from `src/components/ui/*` and the brand palette
  (`brand-teal`, `brand-sage`, `brand-beige`, `brand-cream`); icons only via
  `@/components/icons` — Project conventions in `CLAUDE.md`
- **Storage access**: Recordings bucket is private — must use signed URLs with short
  TTL; never expose service-role key to client
- **RLS**: All public tables have RLS enabled — admin reads must be policy-backed,
  not bypassed via service role from the client
- **Forms**: TanStack Form + Zod via `useAppForm` for any mutations — Project
  convention in `docs/forms.md`
- **Tests**: Playwright for critical flows (cohort → learner → submission viewer);
  existing harness lives at repo root

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| v1 is admin-only; educator scoping deferred | User explicit: "lets focus on admin to see everything. Later stages we can add teacher roles" | — Pending |
| Read-only viewer + mark-as-reviewed (no notes) | User explicit: "Marcos a review is enough no need to add some notes" | — Pending |
| Cohort and module identifiers stay as text columns (no separate `cohorts` / `modules` tables) | Single tenant, single cohort live, module catalog is small and stable; matches existing schema | — Pending |
| Reuse existing shadcn/ui primitives; do not port prototype CSS verbatim | User explicit: "Use existing components as long as it looks the same... very important to keep the same structure that we have in the prototype" — IA preserved, components project-native | — Pending |
| AI generation (tips, summaries, classification) is upstream; Teach Admin is purely a viewer | Payload already contains all AI output; user confirmed Q4 — generation is a separate phase | — Pending |
| Audio playback via signed URLs (short TTL) from private `recordings` bucket | Bucket is private; service role must not be exposed; aligns with security baseline | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-27 after Phase 2 (cohorts-hub) completion*
