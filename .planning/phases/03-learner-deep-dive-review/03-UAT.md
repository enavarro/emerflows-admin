---
status: diagnosed
phase: 03-learner-deep-dive-review
source:
  - 03-01-service-and-queries-SUMMARY.md
  - 03-02-mark-reviewed-route-SUMMARY.md
  - 03-03-icon-registry-SUMMARY.md
  - 03-04-learner-detail-page-SUMMARY.md
  - 03-05-submission-viewer-speaking-SUMMARY.md
  - 03-06-conversation-viewer-and-mark-reviewed-SUMMARY.md
started: 2026-04-29T19:08:00Z
updated: 2026-04-30T08:30:00Z
---

## Current Test

[testing complete — 5 passed, 2 issues, 2 blocked, 1 skipped]

## Tests

### 1. Learner Detail Page Renders
expected: Admin lands on /dashboard/teach/cohorts/<cohort>/learners/<learnerId> and sees the learner's name in the header, cohort + level description, optional external_id, and one Card per touched module with rows sorted newest-first.
result: issue
reported: "learner page is working correctly and rows are displaying correctly, BUT navigation when viewing a submission is broken: from a conversation viewer I cannot go back nor switch to the recording for the same module. Within one module I should be able to flick between conversation and recording when both exist; if only one exists, breadcrumbs should let me go back. Also breadcrumbs should let me go back to all modules submitted by the learner. Separately: at some point the Cohorts/Teach section was not displaying in the sidebar."
severity: major
notes: "Page itself renders fine — issue is missing intra-module submission switcher on the viewer + missing breadcrumbs from viewer up to learner/cohort + intermittent sidebar Teach entry disappearance. Logged as three structured gaps."

### 2. Empty Learner State
expected: A learner with zero submissions shows the "No submissions yet" empty state with the clipboard (forms) icon — no module cards rendered.
result: pass

### 3. Submission Row → Viewer Navigation
expected: Clicking anywhere on a submission row navigates to /dashboard/teach/submissions/[id]; the entire row is the click target (stretched-link), focus ring wraps the row.
result: pass

### 4. Speaking Submission Viewer
expected: For a recording-type submission, viewer shows learner name in header, "M{NN} · <module title> · Attempt N" description, native <audio controls>, transcript lines with sage left border (strong) or amber border (needs improvement), per-word sage dotted underline on words with pronunciation, and a Coaching Tips card grouped pronunciation (mic icon) → delivery (sparkle icon).
result: pass

### 5. Audio Unavailable Graceful Degrade
expected: For a recording submission whose audio cannot be signed (or audioPath is missing), a brand-cream notice "Audio unavailable for this submission." replaces the audio Card, while the transcript and tips sections still render.
result: pass

### 6. Conversation Submission Viewer
expected: For a conversation-type submission, viewer shows brand-teal Polished Intro callout (cream italic body framed by typographic quote marks), then a divide-y Q&A stack with inline flag highlighting (amber dotted underline + click Popover showing Issue + monospace Suggestion), then an Exercise Summary card with sparkle icon. Empty intro/summary skip rendering instead of showing empty cards.
result: pass

### 7. Mark-Reviewed Flow (Idle → Reviewed)
expected: For an unreviewed submission, the page header action shows the brand-sage "Mark as reviewed" CTA. Clicking it disables the button and shows a spinner, then transitions to "Reviewed by instructor on <date>" + Undo. A sonner toast appears: "Submission marked as reviewed".
result: issue
reported: "{\"error\":\"Cannot coerce the result to a single JSON object\"} on POST /api/teach/submissions/14300bd3-e77f-44d1-8384-7dc06dbecf94/review — 500 Internal Server Error when clicking Mark as reviewed."
severity: blocker
notes: "Classic Supabase '.single()' on 0-row UPDATE return — likely RLS USING(is_admin()) is rejecting the row, OR the column-level GRANT is silently filtering, OR the user-session client lacks the necessary policy. Route handler at src/app/api/teach/submissions/[id]/review/route.ts uses .update().select().single() pattern; needs investigation. Blocks Tests 8 + 9."

### 8. Undo Review
expected: Clicking Undo on a reviewed submission shows a spinner, then reverts to the teal idle "Mark as reviewed" CTA. A sonner toast appears: "Review undone". No confirmation dialog shown.
result: blocked
blocked_by: prior-phase
reason: "Depends on Test 7 (Mark-Reviewed) succeeding — cannot exercise undo path while mark-reviewed itself returns 500."

### 9. Cache Invalidation Cascade
expected: After mark-reviewed (or undo) on a submission, navigating back to the learner detail page shows the row's Reviewed badge updated, and the cohort hub matrix shows the learner's reviewed/submitted state updated — no manual reload required.
result: blocked
blocked_by: prior-phase
reason: "Depends on Test 7 (Mark-Reviewed) succeeding — cache invalidation cannot be observed while the underlying mutation returns 500."

### 10. RBAC Redirect (Non-Admin)
expected: Visiting /dashboard/teach/cohorts/<cohort>/learners/<id> or /dashboard/teach/submissions/<id> as a non-admin redirects to /dashboard/overview?denied=teach. Unauthenticated visit redirects to /auth/sign-in.
result: skipped
reason: "Only one admin account available right now and no non-admin users exist. Deferred for future verification once a non-admin or educator account is provisioned. Tracked as Phase 4 / future-UAT to-do."

## Summary

total: 10
passed: 5
issues: 2
pending: 0
skipped: 1
blocked: 2

## Gaps

- truth: "POST /api/teach/submissions/[id]/review returns 200 with the updated submission row when an admin clicks Mark as reviewed; it does not throw a 500 with 'Cannot coerce the result to a single JSON object'."
  status: diagnosed
  reason: "User reported: 500 Internal Server Error with body {\"error\":\"Cannot coerce the result to a single JSON object\"} when clicking Mark as reviewed on submission 14300bd3-e77f-44d1-8384-7dc06dbecf94."
  severity: blocker
  test: 7
  root_cause: "submissions table has RLS enabled (00010:20) but NO `FOR SELECT` policy exists for the authenticated role. The route's `.update().select().single()` chain executes UPDATE...RETURNING, whose returned rows must pass the SELECT RLS policy. With no SELECT policy, RETURNING yields 0 rows and `.single()` throws PGRST116 — exactly the error message reported. Every read in service.ts uses createAdminClient (bypasses RLS), which is why the viewer loads but this route — the only authenticated-role read of submissions — fails."
  artifacts:
    - path: "supabase/migrations/00010_add_submissions_review_columns.sql"
      issue: "Enables RLS on submissions (line 20), but only an UPDATE policy is created — no FOR SELECT policy ever defined for authenticated role"
    - path: "supabase/migrations/00011_fix_submissions_admin_column_grants.sql"
      issue: "Defines submissions_admin_review_update (UPDATE only); SELECT gap unaddressed"
    - path: "src/app/api/teach/submissions/[id]/review/route.ts:56-61"
      issue: ".update().select().single() pattern triggers UPDATE...RETURNING that must pass SELECT RLS"
  missing:
    - "New migration 00013_add_submissions_admin_select_policy.sql creating: CREATE POLICY submissions_admin_select ON public.submissions FOR SELECT TO authenticated USING (public.is_admin());"
    - "Apply migration to live Supabase project"
    - "Verify mark-reviewed POST returns 200 with updated row"
  debug_session: .planning/debug/mark-reviewed-500.md

- truth: "From a submission viewer (recording or conversation) for a given learner+module, the user can switch to the OTHER submission type for the same module without bouncing back to the learner page."
  status: diagnosed
  reason: "User reported: 'when we are viewing one of the conversation I cannot go back or I cannot see the other... within one module, you enter the module and then you are able to flick back between the conversation and recording if they are available there.' No intra-module submission switcher exists on the viewer."
  severity: major
  test: 1
  root_cause: "Feature gap — Phase 03 was scoped per UI-SPEC §D-01 ('single-type body, no tabs') to a viewer that renders only the active submission. The viewer never queries for siblings and the RSC route does not prefetch the learner detail. Data needed already exists: getLearner().submissionsByModule[moduleId] yields every sibling — no new endpoint required."
  artifacts:
    - path: "src/features/teach/components/submission-viewer.tsx"
      issue: "Type-branching client router; no sibling fetch, no switcher"
    - path: "src/app/dashboard/teach/submissions/[id]/page.tsx"
      issue: "RSC route does not prefetch learnerQueryOptions(submission.learnerId)"
    - path: "src/features/teach/api/service.ts (getLearner lines 314-410)"
      issue: "Already aggregates submissionsByModule — UI just doesn't read it on viewer"
  missing:
    - "Prefetch teachKeys.learner(submission.learnerId) in submission viewer RSC route"
    - "New component sibling-type-switcher.tsx (ToggleGroup or Link-row) — hide when only one type exists"
    - "Render switcher above the type-branched body in submission-viewer.tsx (NOT in pageHeaderAction — already crowded)"
  debug_session: .planning/debug/missing-intra-module-switcher.md

- truth: "The submission viewer renders breadcrumbs that let the user navigate back up the hierarchy: Cohorts → <cohort> → <learner> → current submission. Also surfaces on the learner page back to Cohorts → <cohort>."
  status: diagnosed
  reason: "User reported: 'it should be on the navigation and the breadcrumbs as well to go back to see all the models submitted by the learner as well... if they are not available, but they should be on breadcrumbs to go back.' No breadcrumbs are rendered today on the viewer or learner page."
  severity: major
  test: 1
  root_cause: "Feature gap — Phase 3 scope did not include breadcrumbs for any teach route. shadcn Breadcrumb primitive AND a global <Breadcrumbs /> consumer exist (rendered in dashboard <Header>), but useBreadcrumbs() routeMapping has no entries for /dashboard/teach/* and no mechanism to surface route-resolved labels (cohort name, learner name, module title). Result: a path-segmenting fallback shows raw uuids/slugs."
  artifacts:
    - path: "src/components/ui/breadcrumb.tsx"
      issue: "Primitive present and unused on teach routes"
    - path: "src/components/breadcrumbs.tsx + src/components/layout/header.tsx:16"
      issue: "Global Breadcrumbs rendered in Header but useBreadcrumbs has hardcoded routeMapping (no teach routes), can't read dynamic labels"
    - path: "src/components/layout/page-container.tsx"
      issue: "No breadcrumb slot today"
    - path: "all 4 teach route page.tsx files"
      issue: "Pre-resolve learner.name, module.title, cohort label server-side already; just need to pass into a breadcrumb"
  missing:
    - "Add optional pageBreadcrumbs?: ReactNode slot to PageContainer"
    - "New TeachBreadcrumbs server component taking { label, href? }[]"
    - "Each teach route's page.tsx constructs its breadcrumb items from pre-resolved data"
    - "Hide global header <Breadcrumbs /> on /dashboard/teach/* paths to avoid double-application"
    - "Wire link shapes: Cohorts → /dashboard/teach/cohorts; Cohort → /.../cohorts/<learner.cohort>; Learner → /.../learners/<learner.id>; current = unlinked BreadcrumbPage"
  debug_session: .planning/debug/missing-breadcrumbs.md

- truth: "The 'Teach / Cohorts' entry in the sidebar consistently appears for admin users across all dashboard pages and after any auth/profile refresh."
  status: diagnosed
  reason: "User reported: 'on the main menu in the sidebar at some point it was not displaying the cohort section.' Intermittent — needs reproduction."
  severity: major
  test: 1
  root_cause: "Same bug as resolved session phase01-teach-nav-broken.md (2026-04-25). Two compounding layers: (a) recursive RLS policy on profiles caused useAuth() to fail with 'infinite recursion detected', leaving profile=null so useFilteredNavGroups strips the admin-gated Teach group; (b) React StrictMode double-effect aborted supabase.auth.getUser() in pre-fix use-auth.ts. THE FIX WAS ALREADY AUTHORED ON 2026-04-25 BUT NEVER COMMITTED — it currently lives only in the working tree (M src/hooks/use-auth.ts + ?? supabase/migrations/00012_fix_profiles_rls_select_policy.sql)."
  artifacts:
    - path: "src/hooks/use-auth.ts"
      issue: "Fix exists in working tree (getSession + cancelled flag + try/catch) but never committed; HEAD version still uses abort-prone getUser()"
    - path: "supabase/migrations/00012_fix_profiles_rls_select_policy.sql"
      issue: "Untracked file (?? in git status); migration was applied to live DB on 2026-04-25 but never git-add-ed"
    - path: "src/hooks/use-nav.ts:14"
      issue: "By-design admin filter that strips Teach when profile=null — surfaces symptom whenever auth race occurs"
    - path: "tests/e2e/teach-nav.spec.ts + playwright.config.ts"
      issue: "Untracked Playwright regression suite (3/3 pass) — should ship with the fix"
  missing:
    - "git add and commit src/hooks/use-auth.ts + supabase/migrations/00012_fix_profiles_rls_select_policy.sql"
    - "Optionally also commit tests/e2e/teach-nav.spec.ts and playwright.config.ts"
    - "Verify post-commit by running npx playwright test tests/e2e/teach-nav.spec.ts (expect 3/3 pass)"
    - "No new code required — the fix is fully authored, just needs to be in git"
  debug_session: .planning/debug/sidebar-teach-intermittent.md
