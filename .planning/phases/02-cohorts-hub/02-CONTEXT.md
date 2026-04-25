# Phase 2: Cohorts Hub - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Two read-only admin pages:

1. `/dashboard/teach/cohorts` — cohorts list with one card per distinct
   `learners.cohort` value, showing aggregate counts (learner count, total
   submissions, needs-review, reviewed). Faithful to `teacher-admin/teacher-admin.jsx`
   prototype IA, using shadcn/ui primitives + brand tokens.

2. `/dashboard/teach/cohorts/[cohort]` — cohort detail page with tabbed UI:
   - **Learners** tab: table of learners in this cohort (name, level, submission
     count, latest activity), each row linking to the Phase-3 learner detail URL.
   - **Progress matrix** tab: learner × module grid (12 module columns × N learner
     rows) showing per-cell state `not-started` / `submitted` / `reviewed`.

In scope: cohort listing + cohort detail UI; real Supabase queries replacing the
Phase-1 service stubs (`getCohorts`, `getCohort`); disabled placeholder buttons
for "+ New cohort" and "Export" to preserve prototype IA.

Out of scope (other phases):
- Learner detail page and submission viewer (Phase 3)
- Mark-as-reviewed mutation (Phase 3)
- Cohort wizard, CSV export, teachers/educator scoping (deferred to v2 milestones)
- Status filter chips, teacher elements on cohort card (no data today)

</domain>

<decisions>
## Implementation Decisions

### Cohort Aggregate Query Strategy

- **D-01:** Two-trip query inside `getCohorts()` service:
  (1) `SELECT cohort, COUNT(*) AS learner_count FROM learners GROUP BY cohort`
  (2) Bulk submissions query joining via `learner_id IN (...)` and aggregating
  `total / needs_review / reviewed` per cohort in Node. No Postgres view, no RPC,
  no schema change. Why: at projected scale (~4 cohorts/year × 100 students =
  ~400 learners/cohort, single-digit cohorts active concurrently), the simplest
  approach wins. Promote to a view/RPC later only if profiling shows it's slow.

### Counts Semantics

- **D-02:** `Cohort.totalSubmissions` = `COUNT DISTINCT (learner_id, module_id, type)`
  for learners in the cohort — i.e. unique assignments completed, NOT raw attempts.
  A learner submitting `module-01` recording twice counts as 1.
- **D-03:** `Cohort.needsReview` = count of submissions where `reviewed_at IS NULL`.
  No status filter — keep it as simple as possible (two states only: reviewed or
  not). Future automation may replace manual review entirely.
- **D-04:** `Cohort.reviewed` = count of submissions where `reviewed_at IS NOT NULL`.
- **D-05:** `ModuleProgressCell.state` derived from the LATEST submission per
  `(learner, module)`:
  - `not-started` = no submission row
  - `submitted` = latest submission has `reviewed_at IS NULL`
  - `reviewed` = latest submission has `reviewed_at IS NOT NULL`
  Earlier attempts (reviewed or not) do not affect cell state — latest wins.

### Cohort Card Content (Faithful to Prototype, with Honest Placeholders)

- **D-06:** Cards mirror `teacher-admin/teacher-admin.jsx` `CohortCard` IA:
  status pill, level range badge, term, students count, completion %, needs-review,
  next-module hint. Fields we don't track are explicit placeholders (not faked).
- **D-07:** Status defaults to `Active` for every cohort (single status today).
  Status filter chips on the cohorts list are REMOVED for v1 (only one status).
- **D-08:** Level range, term hint, next-module fields render as static
  placeholder strings (e.g. `B1–B2`, `Spring 2026`, `Module in progress`) so the
  card visually echoes the prototype but reads honest. Promote to real fields
  when those columns are added to the schema.
- **D-09:** "Completion" = placeholder field labeled `Completion`, value `0%`.
  No real metric tracked yet.
- **D-10:** Teachers row on cohort card — REMOVED. Only one teacher today;
  re-introduce when educator scoping (v2 EDU-01..02) ships.
- **D-11:** "+ New cohort" CTA — render as a DISABLED `<Button>` (not removed).
  Preserves prototype IA; clicking does nothing in v1.
- **D-12:** "Export" / "Export CSV" buttons — render as DISABLED `<Button>`s
  (same rationale as D-11).

### Cohort Detail Page IA

- **D-13:** Cohort detail page uses `<Tabs>` (shadcn) — closer to the prototype's
  tabbed admin hub. Two tabs in v1:
  1. `Learners` (default, active on load) — full learner table for this cohort.
     Acts as the "Student pool" view (all students in this cohort).
  2. `Progress matrix` — learner × module grid.
- **D-14:** Cohort detail header uses `PageContainer` with:
  - `pageTitle` = cohort name (e.g. "Spring 2026")
  - `pageDescription` = level/term placeholder string
  - `pageHeaderAction` = optional disabled "Export" button (matches D-12)

### Module Progress Matrix UX

- **D-15:** Layout = sticky-header HTML table with dot cells:
  - First column = learner name (sticky-left when horizontally scrolling)
  - Top row = module short labels `M01..M12` (sticky-top when vertically scrolling)
  - Cells contain a colored dot indicating state
- **D-16:** Cell encoding (sage-progressive):
  - `not-started` = empty hairline ring (cream/muted border, no fill)
  - `submitted` = sage outline ring (no fill)
  - `reviewed` = filled `brand-sage` dot
- **D-17:** Cell click behavior — NO navigation in Phase 2. Cells are not
  interactive links (avoids 404 risk before Phase 3 submission viewer ships).
  The learner row link in the Learners tab is the only navigation to Phase 3
  (per ROADMAP.md success criterion 3 — "URL only — page wired in Phase 3").
- **D-18:** Hover tooltip on EVERY cell using shadcn `<Tooltip>` primitive:
  - `not-started` → "Not started"
  - `submitted` → "Submitted {date} · Awaiting review"
  - `reviewed` → "Submitted {date} · Reviewed {date}"
  No reviewer name in v1 (saves a `profiles` join; not necessary per user).
- **D-19:** Cell granularity = ONE cell per module (12 columns), not per
  `(module, type)`. Type info available on the learner detail page in Phase 3.

### Claude's Discretion

The following are not user-facing decisions; downstream agents pick sensible defaults:

- Learner table sort order — default `name ASC`, no URL sync via nuqs in v1
  (plain table; promote to nuqs if needed when sorting is added).
- Loading states — `<Suspense fallback>` skeletons matching `src/components/ui/skeleton.tsx`
  patterns used in `src/features/demos/components/demos-listing.tsx`.
- Empty states — text + icon, following any existing empty-state pattern in
  `src/features/users/` or `src/features/demos/`. Cohorts-list zero-state copy:
  "No cohorts yet. Cohorts appear here once learners are enrolled."
- Tooltip implementation — shadcn `<Tooltip>` from `src/components/ui/tooltip.tsx`.
- Brand color usage — `brand-cream` for empty/muted cell rings, `brand-sage` for
  filled/reviewed states, `brand-teal` for primary headings, `brand-beige` for
  page background (per CLAUDE.md color rules).
- Server-side pagination — none in v1. Cohorts list is small (1 today, ≤10
  projected); learner table is ≤100 per cohort. Client-side rendering OK.
- Test coverage — Playwright happy-path test for `/dashboard/teach/cohorts`
  (loads, shows spring-2026 card with real counts) and `/dashboard/teach/cohorts/spring-2026`
  (loads, both tabs render, matrix shows ≥1 sage cell).

### Folded Todos

None — todo backlog count is 0 at phase start.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase Scope & Requirements

- `.planning/PROJECT.md` — vision, constraints, key decisions, payload shapes
- `.planning/REQUIREMENTS.md` — full requirement IDs (this phase: FND-03,
  COH-01..03, COD-01..04)
- `.planning/ROADMAP.md` — Phase 2 section: goal, success criteria, requirements
  list, UI hint
- `CLAUDE.md` — project conventions (color tokens, icon registry, React Query
  pattern, page header convention, formatting, single-quotes, no trailing comma)

### Phase 1 Foundations (Locked Contracts)

- `src/features/teach/api/types.ts` — `Cohort`, `CohortDetail`, `LearnerRow`,
  `ModuleProgressCell`, `ProgressState`, `ModuleType`, `ModuleDef` interfaces.
  Phase 2 implementations MUST conform to these — do NOT modify type shapes.
- `src/features/teach/api/service.ts` — `getCohorts()` and `getCohort(cohortId)`
  stubs. Phase 2 fills these in. The `import 'server-only'` marker MUST stay.
- `src/features/teach/api/queries.ts` — `teachKeys` query-key factory and
  `cohortsQueryOptions()`, `cohortQueryOptions(cohortId)`. Phase 2 components
  consume these via `useSuspenseQuery`/`prefetchQuery`.
- `src/features/teach/constants/modules.ts` — `MODULES` 12-entry catalog.
  Matrix iterates this in `num` order to build columns.
- `.planning/phases/01-foundations/01-03-SUMMARY.md` — full rationale for the
  type/contract decisions Phase 1 locked.
- `src/lib/auth/require-admin.ts` — RBAC gate already wired in
  `src/app/dashboard/teach/layout.tsx`. Phase 2 inherits gating; no extra work.
- `docs/nav-rbac.md` — RBAC pattern documentation.

### Existing Code Patterns (To Mirror)

- `src/features/demos/components/demos-listing.tsx` — canonical RSC prefetch +
  `HydrationBoundary` + `<Suspense>` + `useSuspenseQuery` pattern. Phase 2
  components MUST follow this shape.
- `src/features/demos/api/queries.ts` — query-key factory + `queryOptions`
  wrapper pattern (already mirrored in `teach/api/queries.ts`).
- `src/features/users/components/user-listing.tsx` — table-based listing pattern.
- `src/components/layout/page-container.tsx` — `pageTitle`, `pageDescription`,
  `pageHeaderAction` props. Use this for both Phase 2 page headers.
- `.planning/codebase/CONVENTIONS.md` — naming, imports, code style reference.
- `.planning/codebase/ARCHITECTURE.md` — RSC/Client Component boundaries.

### Prototype Reference (IA Source of Truth)

- `teacher-admin/teacher-admin.jsx` — `CohortCard`, `CohortsGrid`, `AdminHub`
  components define the visual IA we mirror (cards, stats header, tabs).
- `teacher-admin/teacher-list.jsx` — `SubmissionsView` + `StatCard` + table
  layout patterns (Topbar, filters, table-card structure).
- `teacher-admin/teacher-data.js` — original `MODULES` catalog (already mapped
  into our `module-01..module-12` schema in `constants/modules.ts`).

### Supabase / Data Layer

- `supabase/migrations/00010_*.sql` (or current latest from Phase 1) — verify
  `submissions.reviewed_at` and `submissions.reviewed_by` columns exist.
- `supabase/migrations/00012_fix_profiles_rls_select_policy.sql` — current RLS
  state on `profiles` (relevant if a `profiles` join is ever needed; D-18 says
  no in v1).
- Tables touched (read-only via admin client): `public.learners`,
  `public.submissions`. RLS already permits admin reads (Phase 1 work).

### UI Primitives (Allowed)

- `src/components/ui/card.tsx` — cohort cards
- `src/components/ui/tabs.tsx` — cohort detail tabs (D-13)
- `src/components/ui/table.tsx` — learner table + progress matrix
- `src/components/ui/tooltip.tsx` — matrix cell hover (D-18)
- `src/components/ui/badge.tsx` — status / level / type badges on cards
- `src/components/ui/button.tsx` — disabled placeholders (D-11, D-12)
- `src/components/ui/skeleton.tsx` — Suspense fallbacks
- `src/components/icons.tsx` — ALL icons via `Icons.iconName` (CLAUDE.md rule)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `requireAdmin()` (`src/lib/auth/require-admin.ts`) — already invoked in
  `src/app/dashboard/teach/layout.tsx`; Phase 2 routes inherit the gate.
- `teachKeys`, `cohortsQueryOptions`, `cohortQueryOptions`
  (`src/features/teach/api/queries.ts`) — ready to consume.
- `getCohorts`, `getCohort` stubs (`src/features/teach/api/service.ts`) — Phase 2
  replaces the throwing bodies with real Supabase queries.
- `MODULES` (`src/features/teach/constants/modules.ts`) — 12-entry catalog,
  matrix column source.
- Type contracts (`src/features/teach/api/types.ts`) — `Cohort`, `CohortDetail`,
  `LearnerRow`, `ModuleProgressCell`, `ProgressState`.
- `getQueryClient` (`src/lib/query-client.ts`) — server-side QueryClient.
- `PageContainer` (`src/components/layout/page-container.tsx`) — page header.
- shadcn primitives (see canonical_refs UI Primitives list).

### Established Patterns

- **RSC prefetch + hydration boundary:** Server component calls
  `void queryClient.prefetchQuery(...)` then wraps children in
  `<HydrationBoundary state={dehydrate(queryClient)}>`. Children are client
  components using `useSuspenseQuery(...)` inside `<Suspense fallback>`.
  Reference: `src/features/demos/components/demos-listing.tsx`.
- **Server-only service module:** `import 'server-only'` at top of `service.ts`;
  `queries.ts` closure-imports the service so Next.js code-splits it out of the
  client bundle. Already applied in `src/features/teach/api/service.ts`.
- **Color usage:** Page bg `brand-beige`, card bg white/`brand-cream`, primary
  ink `brand-teal`, accent `brand-sage` for "good/done" signals.
- **Imports:** `@/` path alias only; no relative `../../../`.
- **Format:** single quotes, JSX single quotes, no trailing comma, 2-space.

### Integration Points

- Existing route file `src/app/dashboard/teach/cohorts/page.tsx` — REPLACE the
  Phase-1 stub with the real cohorts-listing server component.
- New route `src/app/dashboard/teach/cohorts/[cohort]/page.tsx` — server
  component that prefetches `cohortQueryOptions(cohortId)` and hydrates a
  client component with the tabbed Learners + Progress matrix UI.
- New `src/features/teach/components/` directory — house cohorts-listing,
  cohort-card, cohort-detail (tabs wrapper), learners-table, progress-matrix
  client components.
- Service body for `getCohorts` and `getCohort` MUST use the server-only Supabase
  admin client helper from FND-05 (Phase 1).

</code_context>

<specifics>
## Specific Ideas

- Visually faithful to `teacher-admin/teacher-admin.jsx` `CohortCard` — status
  pill, level badge, term hint, students/completion/needs-review/next stats
  grid, but using shadcn primitives + brand tokens (NOT prototype CSS).
- Disabled buttons for "+ New cohort" and "Export" preserve prototype IA without
  building features that aren't ready.
- Sage-progressive matrix dots: empty ring → outline ring → filled dot. Reads
  as "no work → in flight → done" without amber/red urgency cues.

</specifics>

<deferred>
## Deferred Ideas

(Captured here so future phases / milestones know they were considered.)

### v2 Milestone candidates

- **Educator scoping (EDU-01..02)** — teachers row on cohort cards, status
  filter chips, multi-status (active/upcoming/archived) cohort lifecycle.
- **Cohort wizard** — currently a disabled "+ New cohort" placeholder button.
- **CSV export** — currently a disabled "Export" placeholder button.
- **Real "Completion %" metric** — currently a `0%` placeholder. Needs a
  defined formula (submissions completed / expected).
- **Type-split matrix cells** — one cell per (module, type) instead of one per
  module. Punted in v1 (D-19) — type info visible on learner detail (Phase 3).
- **Submission viewer link from matrix cells** — would 404 today; ships when
  Phase 3 lands (D-17).
- **Sort/filter URL state via nuqs on learner table** — plain table for v1.
- **Server-side pagination on learner / cohort lists** — not needed at projected
  scale; revisit if cohorts grow past ~20 active or learners past ~500.

### Reviewed Todos (not folded)

None — todo backlog count was 0 at phase start.

</deferred>

---

*Phase: 02-cohorts-hub*
*Context gathered: 2026-04-25*
