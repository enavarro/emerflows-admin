---
status: partial
phase: 02-cohorts-hub
source: [02-VERIFICATION.md]
started: 2026-04-27T00:00:00Z
updated: 2026-04-27T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Spring 2026 card displays real Supabase counts matching ground truth
expected: Card shows Spring 2026 with non-zero learnerCount, totalSubmissions, needsReview, reviewed values matching public.learners + public.submissions in the dev Supabase project (bohqhhpzsgmwsvqryhfw)
result: [pending]

### 2. Playwright e2e spec passes against live dev server
expected: All 5 tests pass when run as `npx playwright test tests/e2e/teach-cohorts.spec.ts` with TEST_ADMIN_EMAIL/TEST_ADMIN_PASSWORD env vars set: cohorts list, card click navigation, tabs render with Learners default, learner row link pattern, M01..M12 matrix render
result: [pending]

### 3. Progress matrix renders all three visual states + sticky positioning
expected: Three distinct visual states render correctly per D-16; module column M01..M12 sticky on horizontal scroll; learner names sticky on vertical scroll; reviewed cells show filled brand-sage dot, empty cells show cream hairline ring
result: [pending]

### 4. Cohorts zero-state UI renders correctly
expected: When getCohorts() returns [] (mock or empty cohort table), `/dashboard/teach/cohorts` renders empty-state card with heading 'No cohorts yet', body 'Cohorts appear here once learners are enrolled.', and Icons.school muted icon
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
