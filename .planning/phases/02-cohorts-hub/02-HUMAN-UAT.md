---
status: partial
phase: 02-cohorts-hub
source: [02-VERIFICATION.md]
started: 2026-04-27T00:00:00Z
updated: 2026-04-27T15:30:00Z
---

## Current Test

[testing complete — 4 passed, 1 pending (zero-state) accepted via static verification]

## Tests

### 1. Spring 2026 card displays real Supabase counts
expected: Card shows Spring 2026 with non-zero learnerCount, totalSubmissions, needsReview, reviewed values matching public.learners + public.submissions ground truth
result: pass
notes: "Counts match database. Includes demo learners — captured as Gap-01 enhancement (Phase 3 scope: tag demo learners visually)."

### 2. Playwright e2e spec passes against live dev server
expected: All 5 tests pass when run as `npx playwright test tests/e2e/teach-cohorts.spec.ts` with TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD env vars set
result: pass
notes: "5/5 passed in 21.7s (chromium). Covers cohorts list render, card click navigation, tabs render, learner row link pattern, M01..M12 matrix render."

### 3. Progress matrix renders three states + sticky positioning
expected: Three distinct visual states (not-started cream ring / submitted sage outline / reviewed filled sage) per D-16; M01..M12 column sticky on horizontal scroll; learner names sticky on vertical scroll
result: pass
notes: "User confirmed matrix loads after Grammarly hydration fix (9bed59bb). Visual fidelity acceptable."

### 4. Cohorts zero-state UI renders
expected: When getCohorts() returns [] (mock or empty cohort table), `/dashboard/teach/cohorts` renders empty-state card with heading 'No cohorts yet', body 'Cohorts appear here once learners are enrolled.', and Icons.school muted icon
result: pending
notes: "Static verification confirms code path is wired (cohorts-listing.tsx:12-25 + service.ts:37-39). User chose to trust static check rather than induce empty state. Open for future hands-on closure."

### 5. Cohort detail route resolves at /dashboard/teach/cohorts/spring-2026
expected: Visiting http://localhost:3000/dashboard/teach/cohorts/spring-2026 loads the cohort detail page with PageContainer header + tabs (Learners default + Progress matrix)
result: pass
notes: "Initial 404 was stale dev-server state (resolved by restart). Then placeholder error from CR-01 placeholder + schema drift (resolved by 83af248c — getCohort selected non-existent learners.level + submissions.submitted_at columns). Then click-on-tab silent failure from Grammarly hydration mismatch (resolved by 9bed59bb — added suppressHydrationWarning to <body>). All three issues fixed; route now loads cleanly."

## Summary

total: 5
passed: 4
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps

- truth: "Demo learners are visually distinguishable from real learners in the learner list"
  status: enhancement
  reason: "User reported during Test 1: counts include demo learners — would like to tag/badge demo learners in the learner list view"
  severity: minor
  test: 1
  scope: phase-3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Cohort detail route /dashboard/teach/cohorts/spring-2026 loads successfully for an admin"
  status: resolved
  reason: "User reported: 404 error → schema drift (PostgREST 42703 on learners.level + submissions.submitted_at) silently swallowed by prefetchQuery → CR-01 placeholder fired"
  severity: blocker
  test: 5
  root_cause: "Two bugs in series: (1) src/features/teach/api/service.ts queried columns that don't exist (learners.level, submissions.submitted_at — actual is created_at). prefetchQuery swallows errors and dehydrate drops failed queries, so the cache was empty and the placeholder queryFn fired with the cryptic 'queryFn was invoked, but data should have been hydrated' message. (2) Grammarly browser extension injected data-gr-* attributes on <body> before React hydrated, halting layout-subtree hydration → Tabs onValueChange never wired → silent click failures."
  artifacts:
    - path: "src/features/teach/api/service.ts"
      issue: "Selected non-existent columns; aliased created_at -> submitted_at on JS side"
    - path: "src/app/dashboard/teach/cohorts/page.tsx"
      issue: "prefetchQuery swallows errors — switched to fetchQuery"
    - path: "src/app/dashboard/teach/cohorts/[cohort]/page.tsx"
      issue: "Same prefetchQuery -> fetchQuery swap"
    - path: "src/app/layout.tsx"
      issue: "Added suppressHydrationWarning to <body> for browser-extension noise"
  missing: []
  debug_session: ".planning/debug/phase02-cohort-detail-hydration.md"
  fix_commits: ["83af248c", "9bed59bb"]
