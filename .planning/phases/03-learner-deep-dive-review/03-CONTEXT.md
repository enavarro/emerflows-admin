# Phase 3: Learner Deep-Dive & Review - Context

**Gathered:** 2026-04-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Three new admin surfaces that close the core-value loop:

1. `/dashboard/teach/cohorts/[cohort]/learners/[learnerId]` — learner detail page
   with profile summary (name, cohort, level, external_id when present) and
   submissions grouped into cards per module (only modules with submissions),
   each row badge-annotated and linking to the submission viewer.

2. `/dashboard/teach/submissions/[id]` — single submission viewer that renders
   ONE body shape based on `submission.type`:
   - `recording` → header + native `<audio>` player + color-coded transcript
     with per-word pronunciation tooltips + AI coaching tips grouped by category.
   - `conversation` → header + polished introduction callout + ordered Q&A pairs
     with inline `{word, issue, suggestion}` flag highlighting + exercise
     summary card.

3. `POST /api/teach/submissions/[id]/review` — server-side mark-as-reviewed
   route handler that toggles `reviewed_at` / `reviewed_by` on `submissions`
   using the user-session Supabase client (RLS-enforced). Wired client-side via
   `useMutation` with `mutationOptions` and `qc.invalidateQueries({ queryKey:
   teachKeys.all })` on success — same shape as `src/features/demos/`.

In scope: implement `getLearner()` and `getSubmission()` service functions
(currently throwing stubs in `src/features/teach/api/service.ts`); add
`markReviewed()` service + mutation; new components (learner-detail,
submission-viewer-recording, submission-viewer-conversation, mark-reviewed
control); audio signed-URL fetch via existing `createSignedRecordingUrl`
helper from Phase 1.

Out of scope (other phases / milestones):
- Cross-assignment AI metrics (prototype "AI tips" tab) — payload doesn't
  contain those signals.
- Educator notes / freeform feedback — PROJECT-level out of scope.
- Editing or deleting submissions — read-only viewer per PROJECT.
- Click-to-jump-on-transcript — payload has no per-line timestamps.
- Reviewer name resolution via profiles JOIN — deferred (D-06).
- Visual fidelity polish across all surfaces, end-to-end Playwright spec —
  Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Submission Viewer IA

- **D-01:** `/dashboard/teach/submissions/[id]` renders a SINGLE-TYPE body —
  conditionally branches on `submission.type`, no tabs. `recording` → speaking
  viewer (audio + transcript + tips). `conversation` → conversation viewer
  (polished intro + Q&A + summary). A shared `PageContainer` header on top
  carries learner name, module label, attempt number, and the
  Mark-reviewed / Reviewed-by-instructor + Undo control via
  `pageHeaderAction`. Rationale: real submissions are single-type per row;
  the prototype's tabs were a fixture artifact, not a data shape.

### Audio Player (Speaking Viewer)

- **D-02:** Native HTML5 `<audio controls>` element with `src` set to the
  short-TTL signed URL produced by `createSignedRecordingUrl()` (TTL ≤ 5 min,
  per Phase-1 helper). No custom waveform, no custom speed buttons (browsers
  expose 0.5–2x via context menu). Free accessibility (keyboard, screen
  readers, native scrub). Ships fast, zero bespoke JS. SPK-06 unavailable
  state: when `audioPath` is null/empty OR signed-URL fetch fails, render a
  small "Audio unavailable for this submission" notice in the player slot
  while still rendering the transcript section.

### Per-Word Pronunciation Hints (SPK-04)

- **D-03:** Each word in `recordingTranscript[].words[]` renders as a
  `<Tooltip>` trigger using existing `src/components/ui/tooltip.tsx` (same
  primitive Phase 2 used for matrix cells). Hover shows the pronunciation
  hint. Words with hints get a subtle dotted-underline (or sage accent) to
  signal interactivity; words without hints render as plain text. Zero visual
  noise when not hovering.

### Mark-as-Reviewed Mutation

- **D-04:** `POST /api/teach/submissions/[id]/review` Route Handler is the
  mutation transport — matches the demos pattern explicitly required by
  REV-04. Body: `{ reviewed: boolean }` validated with Zod. The handler:
  (1) creates the user-session Supabase client via `createClient()` from
  `src/lib/supabase/server`, (2) verifies session + `requireAdmin()`,
  (3) UPDATEs `submissions` SET `reviewed_at = now() / null`,
  `reviewed_by = auth.uid() / null` WHERE id = params.id (RLS + Phase-1
  column-level grant enforce admin-only and column whitelist),
  (4) returns the updated `Pick<SubmissionSummary, 'id' | 'reviewedAt' |
  'reviewedBy'>` per `MarkReviewedResponse` contract. Client-side:
  `markReviewedMutation` in `src/features/teach/api/mutations.ts` using
  `mutationOptions`; `onSuccess` calls
  `getQueryClient().invalidateQueries({ queryKey: teachKeys.all })` so the
  cohort matrix, learner page, and viewer all refresh on next view (REV-02).
  Sonner toast on success ("Submission marked reviewed") and error
  (`error.message`).
- **D-04a:** Use the user-session Supabase client (NOT the admin/service-role
  client) for this mutation — `auth.uid()` flows naturally as `reviewed_by`,
  RLS policies activate, and the column-level grant from Phase 1 enforces
  the column whitelist. No service-role escalation.
- **D-04b:** Optimistic update is NOT in v1 — mutation invalidates and refetches
  on success. Add later if profiling shows it feels slow.

### Reviewer Name Display (REV-03)

- **D-06:** "Reviewed by instructor on \<date\>" — generic instructor label,
  no `profiles` JOIN, no name resolution. Rationale: single-admin reality
  today (one to three people forever expected); the JOIN cost isn't worth
  the visual gain. Document as a future swap-in: when admin pool grows,
  promote `SubmissionDetail.reviewer?: { id: string; name: string }` to
  populate from a `profiles` JOIN at fetch time.

### Undo Review UX (REV-03)

- **D-07:** Instant undo + sonner toast. Click "Undo review" → immediate
  mutation (`{ reviewed: false }` → clears both `reviewed_at` and
  `reviewed_by`) → toast "Review undone" with no confirmation dialog.
  Symmetrical with mark-reviewed UX. Matches the demos `revokeToken`
  single-click pattern. Cheap to redo if mis-clicked.

### Learner Detail Page Layout

- **D-05:** Cards per module on `/learners/[id]`. One `<Card>` per module the
  learner has touched, sorted by module number (ascending). Card title =
  `M{NN} · {ModuleDef.title}`. Inside each card, rows for each submission —
  newest attempt first within a module (sort by `submittedAt DESC` then
  `attemptNum DESC` as tiebreaker). Row content: type badge
  (`Recording` / `Conversation`), `Att N`, submitted-at date,
  status badge, reviewed/pending indicator. Whole row is clickable → links
  to `/dashboard/teach/submissions/[id]`.
- **D-08:** Render ONLY modules where the learner has at least one submission.
  No "no submissions yet" placeholder cards for the other 11 modules. Keeps
  the page focused on what's been done. Today only `module-01` has data, so
  most learners will see exactly one card.

### Profile Summary (LRN-01)

- **D-09:** Profile summary renders at the top of the learner page, above the
  module cards: name (heading), cohort (badge), level (badge if present, '—'
  fallback if not), external_id (small mono-text label, hidden if null).
  Use `PageContainer` with `pageTitle = learner.name`,
  `pageDescription = '{cohort} · {level || '—'} · {external_id || ''}'`.

### Audio-Unavailable Handling (SPK-06)

- **D-10:** When `payload.audioPath` is null/missing OR
  `createSignedRecordingUrl()` returns an error, render a muted
  brand-cream notice card in the audio slot: "Audio unavailable for this
  submission" + `<Icon.alert />`. The transcript section MUST still render.
  The mark-reviewed control MUST still work. This is a graceful-degrade
  contract per ROADMAP success criterion 2.

### Claude's Discretion

The following are not user-facing decisions; downstream agents (researcher /
planner / implementer) pick sensible defaults using existing project patterns:

- **AI coaching tips layout (SPK-05):** Likely flat vertical list of tip cards
  grouped by category with a small badge per tip showing its category
  (`pronunciation` | `delivery`) — pattern mirrors `src/features/demos/`
  card layout. Open to an accordion variant if visual density becomes an issue.
- **Q&A inline flag highlight (CNV-03):** Likely amber `#F59E0B` underline
  on the flagged span (per CLAUDE.md transcript color rules: amber = vague /
  needs improvement). Click or hover surfaces a popover with `issue` +
  `suggestion`. Apply pattern: `<span className='underline decoration-amber-500
  decoration-2'>{flaggedWord}</span>` followed by an inline
  `<Popover>` from `src/components/ui/popover.tsx`.
- **Polished introduction callout (CNV-02):** Likely a `<Card>` with
  `bg-brand-teal text-brand-cream` (matching CLAUDE.md DarkCard pattern)
  and quote marks framing the body — visually distinct from the white
  Q&A pair cards below.
- **Mark-reviewed control placement:** Top-right of the viewer header via
  `PageContainer.pageHeaderAction` (consistent with existing project
  convention; never import `<Heading>` manually).
- **Loading states:** `<Suspense fallback>` skeleton matching
  `src/components/ui/skeleton.tsx` patterns used in
  `src/features/demos/components/demos-listing.tsx`. Same for learner page
  and viewer.
- **Error boundaries:** Per-route `error.tsx` mirroring
  `src/app/dashboard/teach/cohorts/error.tsx` from Phase 2.
- **Empty states:**
  - Learner with zero submissions → "No submissions yet for this learner."
  - Submission viewer 404 / not found → "Submission not found." with link
    back to the learner page.
- **Server-side prefetch + hydration boundary:** Required for both new pages,
  mirroring `demos-listing.tsx` shape (`void prefetchQuery(...)` →
  `<HydrationBoundary state={dehydrate(qc)}>` → client `useSuspenseQuery`).
- **Query keys:** Extend `teachKeys` in
  `src/features/teach/api/queries.ts` with `learner(id)` and
  `submission(id)` variants. Mutation invalidates `teachKeys.all`.
- **Form validation:** Mark-reviewed body validated with a Zod schema in the
  route handler — `z.object({ reviewed: z.boolean() })`. No form UI
  needed (single button click, no fields).
- **Brand color usage:** White card backgrounds for content,
  `brand-teal` for the polished-intro callout (DarkCard-style),
  `brand-sage` for "reviewed" success indicators, amber for needs-improvement
  / flag highlights, `brand-cream` for muted notices (audio unavailable).
- **Test coverage:** Keep Phase 3 plans limited to integration-friendly
  Playwright smoke at the end (per Phase 4 ownership). Component-level unit
  tests aren't required — match Phase 2's coverage shape.
- **Tooltip implementation:** All hovers use shadcn `<Tooltip>` from
  `src/components/ui/tooltip.tsx`.
- **Icons:** All icons via `Icons.iconName` from `src/components/icons.tsx`
  (CLAUDE.md rule).

### Folded Todos

None — todo backlog count was 0 at phase start.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements

- `.planning/PROJECT.md` — vision, constraints, payload shapes, key decisions
- `.planning/REQUIREMENTS.md` — full requirement IDs (this phase: LRN-01..03,
  SPK-01..06, CNV-01..04, REV-01..04)
- `.planning/ROADMAP.md` — Phase 3 section: goal, success criteria, requirements
  list, UI hint
- `CLAUDE.md` — project conventions (color tokens, transcript color rules,
  icon registry, React Query pattern, page header convention, formatting)

### Phase 1 Foundations (Locked Contracts)

- `src/features/teach/api/types.ts` — `LearnerDetail`, `SubmissionDetail`,
  `SubmissionSummary`, `RecordingPayload`, `ConversationPayload`,
  `RecordingTranscriptEntry`, `RecordingTranscriptWord`, `RecordingTip`,
  `ClassifiedPair`, `ConversationFlag`, `MarkReviewedInput`,
  `MarkReviewedResponse`. Phase 3 implementations MUST conform to these — do
  NOT modify type shapes. The `SubmissionPayload` discriminated union narrows
  on `submission.type` at the call site.
- `src/features/teach/api/service.ts` — `getLearner()` and `getSubmission()`
  stubs that throw with explicit Phase 3 references. Phase 3 fills these in.
  `import 'server-only'` MUST stay.
- `src/features/teach/api/queries.ts` — `teachKeys` query-key factory; extend
  with `learner(id)` and `submission(id)` query options.
- `src/features/teach/constants/modules.ts` — `MODULES` 12-entry catalog.
  Use to render module titles on learner page (lookup by `module_id`).
- `src/lib/supabase/admin.ts` — `createAdminClient()` for server-side reads
  AND `createSignedRecordingUrl(path, ttlSec)` for audio playback. TTL
  default ≤ 300s per FND-05.
- `src/lib/supabase/server.ts` — `createClient()` for user-session
  Supabase client (used in mark-reviewed route handler — D-04a).
- `src/lib/auth/require-admin.ts` — RBAC gate; `/dashboard/teach/*` segment
  layout already invokes it. Mark-reviewed route handler MUST also call it
  defensively.
- `supabase/migrations/00010_*.sql` — schema source for `submissions.reviewed_at`
  + `reviewed_by` columns + admin-only column-level UPDATE grant + RLS policy.
  Verify these are in place before implementing the mutation.

### Phase 2 Cohorts Hub (Recently Locked)

- `.planning/phases/02-cohorts-hub/02-CONTEXT.md` — D-01..D-19 cohort matrix
  decisions; D-05 (latest-wins per learner+module) shape mirrors what Phase 3
  needs for grouping submissions.
- `.planning/phases/02-cohorts-hub/02-VERIFICATION.md` — passing reference for
  the service-implementation pattern (real Supabase queries replacing throwing
  stubs).
- `src/features/teach/components/cohorts-listing.tsx`,
  `cohort-detail.tsx`, `learners-table.tsx`, `progress-matrix.tsx` —
  recent component shape patterns Phase 3 mirrors.

### Existing Code Patterns (To Mirror)

- `src/features/demos/api/mutations.ts` — canonical `mutationOptions` +
  `onSuccess: invalidateQueries({ queryKey: <feature>.all })` pattern.
  Phase 3 `markReviewedMutation` MUST follow this shape (REV-04).
- `src/features/demos/api/service.ts` — `apiClient<T>(path, init)` calling
  `/api/<feature>/...` route handlers from the client. Phase 3 `markReviewed()`
  follows this transport pattern.
- `src/app/api/demos/route.ts` and `src/app/api/demos/[jti]/route.ts` —
  Route Handler shape: Zod validation, session check, return JSON.
  Phase 3's `/api/teach/submissions/[id]/review/route.ts` mirrors this.
- `src/features/demos/components/demos-listing.tsx` — RSC prefetch +
  `HydrationBoundary` + `<Suspense>` + `useSuspenseQuery` pattern. Phase 3
  pages MUST follow this shape.
- `src/components/layout/page-container.tsx` — `pageTitle`,
  `pageDescription`, `pageHeaderAction` props. Use this for both Phase 3
  page headers (learner page + submission viewer).
- `.planning/codebase/CONVENTIONS.md` — naming, imports, code style.
- `.planning/codebase/ARCHITECTURE.md` — RSC vs Client Component boundaries.

### Prototype Reference (IA Source of Truth)

- `teacher-admin/teacher-detail.jsx` — `SubmissionDetail` component:
  speaking viewer (lines 97–192) defines audio + transcript + tips IA;
  conversation viewer (lines 194–259) defines polished intro callout + Q&A
  pairs + summary IA. Color/scrub/waveform details DO NOT carry over (D-02);
  only the IA does.
- `teacher-admin/teacher-list.jsx` — `SubmissionsView`: prototype's
  per-learner submission list informs the cards-per-module shape (D-05).
- `teacher-admin/teacher-data.js` — fixture for prototype payload shape;
  the real schema in `types.ts` is canonical, but cross-check shapes match.

### UI Primitives (Allowed)

- `src/components/ui/card.tsx` — module cards, tip cards, summary cards
- `src/components/ui/badge.tsx` — type / attempt / status / reviewed badges
- `src/components/ui/button.tsx` — Mark-reviewed / Undo controls
- `src/components/ui/tooltip.tsx` — per-word pronunciation hints (D-03)
- `src/components/ui/popover.tsx` — Q&A flag detail (Claude's discretion)
- `src/components/ui/skeleton.tsx` — Suspense fallbacks
- `src/components/ui/separator.tsx` — section dividers
- `src/components/icons.tsx` — ALL icons via `Icons.iconName` (CLAUDE.md rule)
- `sonner` (already wired) — success / error toasts on mutation

### Supabase / Data Layer

- Tables touched (admin client read): `public.learners`, `public.submissions`,
  `storage.objects` (signed URL).
- Tables touched (user-session client write): `public.submissions`
  (column whitelist: `reviewed_at`, `reviewed_by` only — Phase 1 grant).
- RLS already permits admin reads and admin column-restricted updates
  (Phase 1 work).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `requireAdmin()` (`src/lib/auth/require-admin.ts`) — already gating
  `/dashboard/teach/*`; Phase 3 routes inherit. The mark-reviewed route
  handler MUST also invoke it defensively.
- `createAdminClient()` and `createSignedRecordingUrl()`
  (`src/lib/supabase/admin.ts`) — server-only data + audio access. The
  signed-URL helper enforces TTL ≤ 300s and matches the bucket path pattern
  `recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm`.
- `createClient()` (`src/lib/supabase/server.ts`) — user-session client for
  the mutation (D-04a).
- `teachKeys` (`src/features/teach/api/queries.ts`) — extend with
  `learner(id)` and `submission(id)` keys. Mutation invalidates
  `teachKeys.all`.
- `getLearner`, `getSubmission` stubs (`src/features/teach/api/service.ts`)
  — Phase 3 replaces the throwing bodies with real Supabase queries.
- `MODULES` (`src/features/teach/constants/modules.ts`) — module id → title
  lookup for learner-page card titles.
- Type contracts (`src/features/teach/api/types.ts`) — full payload + summary
  + mutation contracts already defined.
- `getQueryClient` (`src/lib/query-client.ts`) — server-side QueryClient.
- `PageContainer` (`src/components/layout/page-container.tsx`) — page header.
- `apiClient<T>` (`src/lib/api-client.ts`) — fetch wrapper used by demos
  service to call `/api/...` route handlers.
- shadcn primitives (see canonical_refs UI Primitives list).
- `sonner` toast — already imported via `<Toaster>` in root layout; use
  `import { toast } from 'sonner'` in mutation `onSuccess`/`onError`.

### Established Patterns

- **RSC prefetch + hydration boundary:** Server component calls
  `void queryClient.prefetchQuery(...)` then wraps children in
  `<HydrationBoundary state={dehydrate(queryClient)}>`. Children are client
  components using `useSuspenseQuery(...)` inside `<Suspense fallback>`.
  Reference: `src/features/demos/components/demos-listing.tsx`.
- **Mutation pattern:** `mutationOptions({ mutationFn, onSuccess })` exported
  from `api/mutations.ts`; consumed via
  `useMutation(mutationOptions(...))` in client component. Reference:
  `src/features/demos/api/mutations.ts` + consumer in
  `src/features/demos/components/`.
- **Route Handler shape:** `export async function POST(req, { params })` in
  `src/app/api/<feature>/.../route.ts`; Zod validation; session +
  RBAC checks; Supabase query; JSON response with `success: true | false`
  envelope.
- **Server-only service module:** `import 'server-only'` at top of
  `service.ts`; `queries.ts` closure-imports the service so Next.js
  code-splits it out of the client bundle.
- **Color usage:** Page bg `brand-beige`, content cards white,
  callout cards `brand-teal` (dark) for emphasis, `brand-cream` for muted
  notices, `brand-sage` for success indicators, amber for needs-improvement
  / flag highlights.
- **Imports:** `@/` path alias only; no relative `../../../`.
- **Format:** single quotes, JSX single quotes, no trailing comma, 2-space.

### Integration Points

- New route `src/app/dashboard/teach/cohorts/[cohort]/learners/[learnerId]/page.tsx`
  — server component that prefetches `learnerQueryOptions(learnerId)` and
  hydrates a client component with the cards-per-module layout.
- New route `src/app/dashboard/teach/submissions/[id]/page.tsx` — server
  component that prefetches `submissionQueryOptions(id)` and hydrates a
  client component that branches on `submission.type` to render the
  speaking or conversation viewer.
- New route handler `src/app/api/teach/submissions/[id]/review/route.ts` —
  POST endpoint for the mark-reviewed mutation.
- New `src/features/teach/components/` files: `learner-detail.tsx`,
  `submission-viewer-recording.tsx`, `submission-viewer-conversation.tsx`,
  `mark-reviewed-button.tsx`, plus small subcomponents
  (`transcript-line.tsx`, `pronunciation-tooltip.tsx`,
  `qa-pair.tsx`, `polished-intro-callout.tsx`,
  `tip-card.tsx`, `audio-unavailable-notice.tsx`).
- New `src/features/teach/api/mutations.ts` — `markReviewedMutation`
  exported via `mutationOptions`.
- Service body for `getLearner` + `getSubmission` MUST use the server-only
  Supabase admin client helper from FND-05 (Phase 1).
- Mutation route handler MUST use the user-session Supabase client (D-04a).
- The cohort detail matrix from Phase 2 will reflect new `reviewed` state on
  next view because `teachKeys.all` invalidation cascades to
  `cohortQueryOptions(cohortId)` (REV-02 wiring).

</code_context>

<specifics>
## Specific Ideas

- Single-type body — no tabs — because real submissions are single-type per
  row (D-01).
- Native HTML5 `<audio controls>` — accessibility for free, no waveform
  rebuild (D-02).
- Hover tooltip per word for pronunciation hints — discoverable without
  cluttering the transcript (D-03).
- Route handler at `/api/teach/submissions/[id]/review` mirroring demos
  precedent — REV-04 explicit (D-04).
- Generic "Reviewed by instructor on \<date\>" — single-admin reality;
  promote to JOIN later (D-06).
- Instant undo, no confirmation — matches mark-reviewed click symmetry (D-07).
- Cards per module on learner page, only modules with submissions —
  focus on what's been done (D-05, D-08).
- Audio-unavailable graceful degrade — transcript still renders, mutation
  still works (D-10).

</specifics>

<deferred>
## Deferred Ideas

(Captured here so future phases / milestones know they were considered.)

### v2 Milestone candidates

- **Reviewer name resolution via profiles JOIN** — currently "Reviewed by
  instructor" generic label (D-06). Promote when admin pool grows past 2–3.
  Type contract (`SubmissionDetail.reviewer?: { id, name }`) is already
  forward-compatible — only the JOIN + UI label swap is needed.
- **Cross-assignment AI metrics tab** — prototype's "AI tips" tab with
  cross-module signals (estimated level trend, words-per-minute, filler
  rate, lexical variety, pause ratio, confidence). Out of scope for v1
  because the payload doesn't carry these signals; would need a separate
  AI pipeline.
- **Click-to-jump on transcript** — would need per-line timestamps
  (`recordingTranscript[].t`) added to the payload by the upstream learner
  app. Not a Teach Admin change.
- **Custom audio waveform UI** — prototype-fidelity but no functional gain
  over native `<audio controls>`. Revisit if a UX research signal indicates
  admins want it.
- **Optimistic mark-reviewed update** — current mutation invalidates and
  refetches (D-04b). Add `onMutate` / rollback logic if the mutation feels
  slow at scale.
- **"X of 12 modules complete" learner-page summary** — small curriculum
  progress chip; v1 just shows the cards (D-08).
- **AI tips accordion variant** — currently flat list per Claude's
  discretion. Switch to accordion if visual density becomes an issue.

### Reviewed Todos (not folded)

None — todo backlog count was 0 at phase start.

</deferred>

---

*Phase: 03-learner-deep-dive-review*
*Context gathered: 2026-04-29*
