---
phase: 02-cohorts-hub
verified: 2026-04-27T15:00:00Z
status: human_needed
score: 5/5 must-haves verified (automated)
overrides_applied: 0
human_verification:
  - test: "Load /dashboard/teach/cohorts as admin and confirm the Spring 2026 card displays real Supabase counts matching ground truth"
    expected: "Card shows Spring 2026 with non-zero learnerCount, totalSubmissions, needsReview, reviewed values matching public.learners + public.submissions in the dev Supabase project (bohqhhpzsgmwsvqryhfw)"
    why_human: "Plan 02-01 explicitly skipped service-level tests (no infra) and Wave-3 e2e was not run with Supabase env vars in this verification pass. Real data accuracy can only be verified by manual smoke against live data."
  - test: "Run npx playwright test tests/e2e/teach-cohorts.spec.ts with TEST_ADMIN_EMAIL/PASSWORD env vars set"
    expected: "All 5 tests pass: cohorts list, card click navigation, tabs render with Learners default, learner row link pattern, M01..M12 matrix render"
    why_human: "Spec exists and is type-clean but cannot be executed by the verifier without live admin credentials and a running dev server"
  - test: "Visit /dashboard/teach/cohorts/spring-2026, switch to the Progress matrix tab and visually verify a learner with reviewed submissions shows a filled brand-sage dot, while empty cells show the cream hairline ring"
    expected: "Three distinct visual states render correctly per D-16; module column M01..M12 sticky on horizontal scroll; learner names sticky on vertical scroll"
    why_human: "Visual fidelity (dot encoding correctness, sticky positioning under scroll, hover tooltip copy) cannot be verified programmatically — requires browser inspection"
  - test: "Mock getCohorts() to return [] (e.g. point to an empty cohort table or stub the function) and load /dashboard/teach/cohorts"
    expected: "Empty-state card renders with heading 'No cohorts yet', body 'Cohorts appear here once learners are enrolled.', and Icons.school muted icon"
    why_human: "Plan 02-05 explicitly excluded the zero-state from automated e2e (would require destructive mutation of live Supabase). Code path verified statically; runtime render of the zero-state requires manual verification."
---

# Phase 2: Cohorts Hub Verification Report

**Phase Goal:** Admins can browse cohorts and drill into a cohort to see its learners and per-module progress, matching the prototype's information architecture.

**Verified:** 2026-04-27T15:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

Roadmap Success Criteria + merged PLAN frontmatter must-haves.

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Admin loads `/dashboard/teach/cohorts` and sees a non-empty card for `spring-2026` with learner count and submission counts matching Supabase ground truth | VERIFIED (code) — needs runtime check | `src/app/dashboard/teach/cohorts/page.tsx` prefetches `getCohorts()`; `cohort-card.tsx` renders `cohort.learnerCount`, `cohort.needsReview` via real service queries against `learners`/`submissions` tables (D-01..D-04 aggregation in `service.ts:25-102`). Real-data ground truth match flagged for human verification. |
| 2  | Cohorts list renders an explicit zero-state when no cohorts/learners exist | VERIFIED | `cohorts-listing.tsx:12-25` — `if (cohorts.length === 0) return <empty-state>` with locked copy `No cohorts yet` + `Cohorts appear here once learners are enrolled.` + `Icons.school`. `service.ts:37-39` returns `[]` on empty learner rows. |
| 3  | Admin opens `/dashboard/teach/cohorts/spring-2026` and sees a learner table with Name, Level, Submissions, Latest activity columns; each row links to that learner's detail page | VERIFIED | `learners-table.tsx:43-50` renders all four locked column headers; `:53,60` row link `href={/dashboard/teach/cohorts/${cohortId}/learners/${learner.id}}` (COD-04). PageContainer in route file renders cohort name (humanized slug). |
| 4  | Cohort detail shows a learner × module progress matrix where each cell renders one of `not-started`/`submitted`/`reviewed`, derived from `submissions.status` + `reviewed_at`, using the 12-module typed catalog | VERIFIED | `progress-matrix.tsx:34-38` — `DOT_CLASSES` map encodes all three states with locked Tailwind classes from UI-SPEC §Color §Cell encoding. `:75,108` iterates `MODULES.map((mod) => …)` for both header row and per-learner cells. `service.ts:237-274` derives state from `latest.reviewed_at === null ? 'submitted' : 'reviewed'` with D-05 latest-wins reducer. `MODULES` constant has 12 entries (verified via grep). |
| 5  | Cohort-card and cohort-detail UI uses only `src/components/ui/*` primitives and brand tokens — no raw prototype CSS classes | VERIFIED | All five components import only from `@/components/ui/*` (Card, Badge, Button, Tabs, Table, Tooltip, ScrollArea, Alert) and `@/components/icons`. `grep "from '@tabler/icons-react'"` returns nothing for all five files. Brand tokens (`brand-teal`, `brand-sage`, `brand-cream`, `brand-beige`) used throughout; no prototype CSS classes (no `teacher-admin/` imports). |

**Score:** 5/5 truths verified by static code analysis. Truth 1 contains a runtime data-accuracy assertion that requires manual verification against the live dev Supabase project.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/features/teach/api/service.ts` | Real getCohorts + getCohort implementations replacing throwing stubs | VERIFIED | 290 lines; `import 'server-only'` line 1; contains `createAdminClient`, `from('learners')`, `from('submissions')`, `MODULES.map`, `latestByLearnerModule`, all three ProgressState branches, dedupe-key marker, both `if (learnersError)`/`if (subsError)` loud-failure branches. Phase-3 stubs preserved (`grep -c "is not implemented"` = 2). |
| `src/features/teach/api/queries.ts` | Cache-key factory + queryOptions for cohorts/cohort/learner/submission | VERIFIED | 74 lines; CR-01 pattern applied — queryFn is a placeholder that throws `missingPrefetch(...)`; route files inline the `prefetchQuery({ queryKey, queryFn: () => getX() })` pattern. Service is NEVER imported here, so client bundle stays clean. |
| `src/app/dashboard/teach/cohorts/page.tsx` | RSC route — prefetches cohortsQueryOptions and renders PageContainer + CohortsListing inside HydrationBoundary | VERIFIED | 79 lines; contains `await requireAdmin()`, `void queryClient.prefetchQuery({ queryKey: teachKeys.cohorts(), queryFn: () => getCohorts() })`, `<HydrationBoundary state={dehydrate(queryClient)}>`, `<Suspense fallback={<CohortsGridSkeleton />}>`, PageContainer with locked `pageTitle='Cohorts'` + `pageDescription='Browse cohorts and drill into a cohort to review learner progress.'`, two disabled buttons with `disabled`/`aria-disabled='true'`/`title='Coming soon'`, Export icon at `h-4 w-4`. |
| `src/app/dashboard/teach/cohorts/error.tsx` | Route segment error boundary | VERIFIED | 19 lines; line 1 `'use client';`; uses Alert variant=destructive, Icons.alertCircle, locked copy `Could not load cohorts` and `Refresh the page to try again. If the problem persists, contact support.` |
| `src/app/dashboard/teach/cohorts/[cohort]/page.tsx` | Dynamic RSC route — awaits params, prefetches cohortQueryOptions, renders CohortDetail | VERIFIED | 72 lines; contains `params: Promise<{ cohort: string }>`, `await params`, `await requireAdmin()`, `void queryClient.prefetchQuery({ queryKey: teachKeys.cohort(cohortId), queryFn: () => getCohort(cohortId) })`, `<CohortDetail cohortId={cohortId} />`. WR-01 refactor: PageContainer rendered HERE at the route level (not inside the client component) using `humanizeCohortId(cohortId)` for stable pageTitle. Export button preserved with `h-4 w-4` icon. |
| `src/app/dashboard/teach/cohorts/[cohort]/error.tsx` | Route segment error boundary | VERIFIED | 19 lines; line 1 `'use client';`; locked copy `Could not load cohort` (singular) + Icons.alertCircle. |
| `src/features/teach/components/cohorts-listing.tsx` | Client component — useSuspenseQuery + grid renderer + empty state | VERIFIED | 38 lines; `'use client'` line 1; `useSuspenseQuery(cohortsQueryOptions())`; locked empty-state copy + `Icons.school`; grid uses `repeat(auto-fill, minmax(340px, 1fr))` per UI-SPEC. |
| `src/features/teach/components/cohort-card.tsx` | Presentational Card — status pill, level badge, name, 4-stat grid, Open chevron | VERIFIED | 82 lines; wraps Card in `<Link href=/dashboard/teach/cohorts/${cohort.id} aria-label='Open ${cohort.name}'>`; all four stat labels (Students, Completion, Needs review, Next); placeholders D-08/D-09 (`B1–B2`, `0%`, `Module in progress`); `bg-brand-sage` status dot; `text-brand-teal` ink; `hover:bg-brand-cream` lift; `Icons.chevronRight` 12px Open affordance. |
| `src/features/teach/components/cohort-detail.tsx` | Client wrapper — useSuspenseQuery + Tabs (LearnersTable + ProgressMatrix) | VERIFIED | 50 lines; `'use client'`; `useSuspenseQuery(cohortQueryOptions(cohortId))`; `defaultValue='learners'`; both tab labels `Learners` + `Progress matrix`. WR-01 refactor: PageContainer moved to route file; description rendered as `<p className='text-muted-foreground text-sm'>{description}</p>` above Tabs with IN-01 pluralization (`learner` vs `learners`). |
| `src/features/teach/components/learners-table.tsx` | Plain shadcn Table — 4 columns + row link | VERIFIED | 91 lines; `'use client'`; all four locked column headers in correct order; `tabular-nums` on Submissions; `hover:bg-brand-cream` row affordance; WR-02 stretched-link pattern (single `<Link>` per row with `after:absolute after:inset-0`); locked empty-state copy `No learners in this cohort yet.`; `localeCompare` default name-ASC sort via `toSorted()` (immutability). Date formatting per UI-SPEC (≤7d relative / ≤30d MMM d / >30d MMM d, yyyy). |
| `src/features/teach/components/progress-matrix.tsx` | Sticky-header learner × module grid with tooltips + legend | VERIFIED | 196 lines; `'use client'`; `MODULES.map` for both header and per-row cells; `DOT_CLASSES` VERBATIM from UI-SPEC; sticky positioning (top-0 z-30 corner / top-0 z-20 module headers / left-0 z-10 learner column); per-cell + per-module-header Tooltips; locked legend (Not started · Submitted · Reviewed); locked tooltip copy with `MMM d, yyyy` format; aria-label cell summaries; no `tabIndex`/`onClick` (D-17). WR-04 fix: plain `overflow-auto` div replaces Radix ScrollArea for sticky reliability. |
| `src/features/teach/lib/format.ts` | Pure helper — humanizeCohortId | VERIFIED | New file (created via WR-01 fix); no `'server-only'` marker so route file can use it for stable pre-suspense pageTitle. Pure function, 25 lines. |
| `tests/e2e/teach-cohorts.spec.ts` | Playwright spec covering cohorts list + cohort detail happy path | VERIFIED (static) — runtime not executed | 149 lines; defines 5 tests inside `test.describe('Phase 2 — Cohorts Hub happy path', ...)`; reuses `signInAsAdmin` env-var pattern from `teach-nav.spec.ts`; assertions pinned to UI-SPEC locked strings (`Open ${COHORT_NAME}`, `Learners`, `Progress matrix`, `M01`/`M12`, legend labels) and D-16 Tailwind classes (`border-brand-cream`, `border-brand-sage`, `bg-brand-sage`); learner row regex pattern `^/dashboard/teach/cohorts/${COHORT_ID}/learners/[\w-]+$`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/dashboard/teach/cohorts/page.tsx` | service `getCohorts()` | Inline `prefetchQuery({ queryKey: teachKeys.cohorts(), queryFn: () => getCohorts() })` | WIRED | Verified at line 27-30. CR-01 fix replaced the original `prefetchQuery(cohortsQueryOptions())` so the service is imported only at the route level (RSC), keeping the client bundle clean. |
| `cohorts-listing.tsx` | `cohortsQueryOptions()` | `useSuspenseQuery(cohortsQueryOptions())` | WIRED | Verified at line 10. Resolves synchronously from hydrated cache. |
| `cohort-card.tsx` | `/dashboard/teach/cohorts/{id}` | `<Link href={`/dashboard/teach/cohorts/${cohort.id}`}>` | WIRED | Verified at line 19-22. `aria-label='Open ${cohort.name}'` for screen readers. |
| `app/dashboard/teach/cohorts/[cohort]/page.tsx` | service `getCohort(cohortId)` | Inline `prefetchQuery({ queryKey: teachKeys.cohort(cohortId), queryFn: () => getCohort(cohortId) })` | WIRED | Verified at line 31-35. |
| `cohort-detail.tsx` | LearnersTable + ProgressMatrix | `<TabsContent value='learners'><LearnersTable .../></TabsContent>` and `<TabsContent value='matrix'><ProgressMatrix .../></TabsContent>` | WIRED | Verified at lines 41-46. |
| `learners-table.tsx` | `/dashboard/teach/cohorts/{id}/learners/{learnerId}` | `<Link href={/dashboard/teach/cohorts/${cohortId}/learners/${learner.id}}>` | WIRED | Verified at lines 53-66 (stretched-link pattern). Phase-3 wires the destination page; URL-only verification by spec. |
| `progress-matrix.tsx` | `MODULES` catalog | `MODULES.map((mod) => …)` (twice — header + body) | WIRED | Verified at lines 75 and 108. 12-module catalog confirmed via `grep -E "^\s*\{ id:" src/features/teach/constants/modules.ts` = 12 entries. |
| `progress-matrix.tsx` | `Tooltip` primitive | `<Tooltip><TooltipTrigger asChild>...</TooltipTrigger><TooltipContent>...</TooltipContent></Tooltip>` on every cell + every module header | WIRED | Verified at lines 84-91 (header) and 117-131 (cell). |
| `service.ts` | `createAdminClient` singleton | `import { createAdminClient } from '@/lib/supabase/admin'` + `const client = createAdminClient()` in both functions | WIRED | Verified at line 23, 26, 123. |
| `service.ts` | `MODULES` catalog | `import { MODULES } from '@/features/teach/constants/modules'` + `MODULES.map((mod) => …)` in matrix builder | WIRED | Verified at line 22, 254. |
| `service.ts` | Supabase tables | `client.from('learners')` + `client.from('submissions')` (twice each) | WIRED | Verified at lines 30, 54, 127, 154. Filters via `.eq('cohort', cohortId)` and `.in('learner_id', learnerIds)` are parameterized. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `cohorts-listing.tsx` | `cohorts: Cohort[]` | `useSuspenseQuery(cohortsQueryOptions())` resolved from cache hydrated by RSC `prefetchQuery → getCohorts()` → real Supabase queries against `learners` + `submissions` | YES (DB query) | FLOWING (subject to runtime check on real data accuracy) |
| `cohort-detail.tsx` | `cohortDetail: CohortDetail` | `useSuspenseQuery(cohortQueryOptions(cohortId))` resolved from cache hydrated by RSC `prefetchQuery → getCohort(cohortId)` → real Supabase queries with `.eq('cohort', cohortId)` | YES (DB query) | FLOWING |
| `learners-table.tsx` | `cohortDetail.learners: LearnerRow[]` | Prop from cohort-detail — real data flows through; sorted by name via `toSorted` | YES | FLOWING |
| `progress-matrix.tsx` | `cohortDetail.matrix: Record<string, ModuleProgressCell[]>` | Prop from cohort-detail; matrix built server-side in `service.ts:252-274` from real submissions, with D-05 latest-wins reducer | YES | FLOWING |

No artifact is statically empty or hardcoded. The data path runs end-to-end from Supabase → service → React Query cache → client component → DOM.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles | `npx tsc --noEmit` | Caller-reported PASS (per /gsd-code-review-fix output) | PASS |
| Production build emits | `npx next build` | Caller-reported PASS in 4.4s after CR-01 fix (28 static pages) | PASS |
| Lint clean | `npx oxlint src/features/teach src/app/dashboard/teach tests/e2e/teach-cohorts.spec.ts` | Caller-reported PASS (0 warnings, 0 errors on phase scope) | PASS |
| Module catalog has 12 entries | `grep -E "^\s*\{ id:" src/features/teach/constants/modules.ts \| wc -l` | 12 | PASS |
| Phase-3 stubs preserved | `grep -c "is not implemented" src/features/teach/api/service.ts` | 2 (getLearner + getSubmission) | PASS |
| `import 'server-only'` preserved | `grep "import 'server-only'" src/features/teach/api/service.ts` | line 1 match | PASS |
| No tabler icons leak | `grep "from '@tabler/icons-react'"` across all five Phase-2 component files | empty | PASS |
| All ProgressState branches present | `grep -E "'not-started'\|'submitted'\|'reviewed'" src/features/teach/api/service.ts` | all three present | PASS |
| Spec runs end-to-end against live data | `npx playwright test tests/e2e/teach-cohorts.spec.ts` | NOT RUN — no live dev server + admin credentials available to verifier | SKIP (routed to human verification) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COH-01 | 02-02, 02-05 | Cohorts list with one card per cohort + counts | SATISFIED | `cohort-card.tsx` renders `cohort.learnerCount` + `cohort.needsReview`; `service.ts:25-102` produces real counts per D-01..D-04. Live-data accuracy = human check. |
| COH-02 | 02-02, 02-05 | Zero-state when no cohorts/learners | SATISFIED (code) | `cohorts-listing.tsx:12-25` zero-state with locked copy. Plan 02-05 explicitly excluded zero-state from e2e (would require live-data mutation); routed to human verification. |
| COH-03 | 02-02, 02-05 | Prototype-faithful card IA via shadcn primitives + brand tokens | SATISFIED | `cohort-card.tsx` uses Card/Badge/Icons + brand tokens; status pill + level badge + name + term hint + 4-stat grid + Open chevron. |
| COD-01 | 02-03, 02-05 | Learners table with Name, Level, Submissions, Latest activity | SATISFIED | `learners-table.tsx:43-50` all four columns; data sourced from `getCohort()`. |
| COD-02 | 02-03, 02-04, 02-05 | Learner × module progress matrix with three states | SATISFIED | `progress-matrix.tsx:34-38` `DOT_CLASSES` map encodes all three states; `service.ts:237-274` derives state from `submissions.reviewed_at`. |
| COD-03 | 02-01, 02-04, 02-05 | 12-module typed catalog | SATISFIED | `MODULES` constant verified to have 12 entries; both `service.ts:254` and `progress-matrix.tsx:75,108` iterate `MODULES.map((mod) => …)`. |
| COD-04 | 02-03, 02-05 | Each learner row links to learner detail page | SATISFIED | `learners-table.tsx:53,60-66` href `/dashboard/teach/cohorts/${cohortId}/learners/${learner.id}`. URL only — Phase 3 will wire the destination page. |

All seven requirement IDs declared in PLAN frontmatter are accounted for. REQUIREMENTS.md traceability table already marks COH-01..03 + COD-01..04 as Complete (lines 120-126).

No ORPHANED requirements detected for Phase 2.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/features/teach/api/service.ts` | 280, 286 | `throw new Error(...is not implemented...)` | INFO | Intentional — Phase-3 stubs preserved per plan; loud-failure pattern documented in summary. Not a regression. |
| `src/features/teach/api/queries.ts` | 44-49 | `missingPrefetch()` throws "queryFn was invoked, but data should have been hydrated from the server" | INFO | Intentional — CR-01 fix pattern; placeholder queryFn documents the bundle-safety contract. Never invoked at runtime when route correctly prefetches. |

No blocker or warning anti-patterns. No TODO/FIXME/PLACEHOLDER comments in production code paths. No empty handlers, no static empty data passed to rendering, no console.log in shipped code.

### Human Verification Required

#### 1. Verify real-data accuracy of Spring 2026 card counts

**Test:** Sign in as admin, load `/dashboard/teach/cohorts`, and inspect the Spring 2026 card.
**Expected:** `learnerCount` matches `SELECT COUNT(*) FROM public.learners WHERE cohort = 'spring-2026'`. `totalSubmissions` matches `SELECT COUNT(DISTINCT (learner_id, module_id, type)) FROM public.submissions WHERE learner_id IN (those learners)`. `needsReview`/`reviewed` split matches `reviewed_at IS NULL` counts.
**Why human:** Plan 02-01 explicitly skipped service-level integration tests (no infra in this repo). The verifier has no live Supabase access. Only manual smoke confirms D-01..D-04 semantics produce correct numbers against live ground truth.

#### 2. Run the Playwright e2e spec end-to-end

**Test:** `TEST_ADMIN_EMAIL=... TEST_ADMIN_PASSWORD=... npx playwright test tests/e2e/teach-cohorts.spec.ts` (with dev server running).
**Expected:** All 5 tests pass — cohorts list visible with Spring 2026 card; card click navigates to `/dashboard/teach/cohorts/spring-2026`; tabs render with Learners default-active; learner row href matches the Phase-3 URL pattern; matrix tab renders M01..M12 + legend + at least one D-16 dot.
**Why human:** Verifier cannot start a dev server or use admin credentials. Spec is type-clean and statically verified, but execution proves runtime wiring.

#### 3. Visually verify the matrix renders the three D-16 states correctly under scroll

**Test:** Open `/dashboard/teach/cohorts/spring-2026`, switch to Progress matrix tab, scroll horizontally and vertically.
**Expected:** Sticky learner column (left) and sticky module-code header (top) hold position; reviewed cells show filled `bg-brand-sage` dots; submitted cells show `border-brand-sage` outline rings; not-started cells show `border-brand-cream` hairline rings; hovering any cell shows the locked tooltip copy (`Not started` / `Submitted Apr 22, 2026 · Awaiting review` / `Submitted Apr 22, 2026 · Reviewed Apr 23, 2026`); hovering any module header shows the full module title.
**Why human:** Visual fidelity (colour rendering, sticky positioning under scroll, tooltip popup behaviour) is not verifiable via grep or static type checks.

#### 4. Verify the zero-state UI when getCohorts returns empty

**Test:** Temporarily mock `getCohorts()` to return `[]` (e.g. by editing `service.ts` locally and restarting dev) and load `/dashboard/teach/cohorts`.
**Expected:** Empty-state card appears centered with `Icons.school` muted icon, heading `No cohorts yet`, body `Cohorts appear here once learners are enrolled.` Verifies COH-02 runtime render.
**Why human:** Plan 02-05 explicitly excluded the zero-state from automated e2e (would require destructive live-Supabase mutation). Static code path verified; runtime presentation requires manual smoke.

### Gaps Summary

No gaps were detected by static verification. All five roadmap success criteria are satisfied at the code-and-wiring level, all seven requirement IDs are accounted for, all artifacts exist and are wired, no stubs leak into rendered output, and no anti-patterns block goal achievement. Status is `human_needed` solely because four runtime aspects (live-data accuracy, e2e execution, visual fidelity, zero-state render) cannot be confirmed without a running browser + live Supabase access — confirming them is the developer's responsibility before closing the phase.

---

_Verified: 2026-04-27T15:00:00Z_
_Verifier: Claude (gsd-verifier)_
