---
status: partial
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
  status: failed
  reason: "User reported: 500 Internal Server Error with body {\"error\":\"Cannot coerce the result to a single JSON object\"} when clicking Mark as reviewed on submission 14300bd3-e77f-44d1-8384-7dc06dbecf94. This is the canonical Supabase signal for `.single()` against a 0-row UPDATE return — RLS, column-level GRANT, or session-user policy is filtering the returning rows. Likely fix: investigate RLS USING(is_admin()) for the user-session client + GRANT(reviewed_at, reviewed_by) policy + verify user IS admin via profiles role check at write time."
  severity: blocker
  test: 7
  artifacts: ["src/app/api/teach/submissions/[id]/review/route.ts", "supabase/migrations/00010_add_submissions_review_columns.sql", "supabase/migrations/00012_fix_profiles_rls_select_policy.sql"]
  missing: []

- truth: "From a submission viewer (recording or conversation) for a given learner+module, the user can switch to the OTHER submission type for the same module without bouncing back to the learner page."
  status: failed
  reason: "User reported: 'when we are viewing one of the conversation I cannot go back or I cannot see the other... within one module, you enter the module and then you are able to flick back between the conversation and recording if they are available there.' No intra-module submission switcher exists on the viewer."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "The submission viewer renders breadcrumbs that let the user navigate back up the hierarchy: Cohorts → <cohort> → <learner> → current submission. Also surfaces on the learner page back to Cohorts → <cohort>."
  status: failed
  reason: "User reported: 'it should be on the navigation and the breadcrumbs as well to go back to see all the models submitted by the learner as well... if they are not available, but they should be on breadcrumbs to go back.' No breadcrumbs are rendered today on the viewer or learner page."
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "The 'Teach / Cohorts' entry in the sidebar consistently appears for admin users across all dashboard pages and after any auth/profile refresh."
  status: failed
  reason: "User reported: 'on the main menu in the sidebar at some point it was not displaying the cohort section.' Intermittent — needs reproduction; likely RBAC nav filter race or auth/profile stale state."
  severity: major
  test: 1
  artifacts: []
  missing: []
