---
phase: 03-learner-deep-dive-review
plan: 06
subsystem: ui
tags: [conversation-viewer, mark-reviewed, popover, sonner, mutation-consumer, tanstack-query]

# Dependency graph
requires:
  - phase: 03-learner-deep-dive-review/01
    provides: submissionQueryOptions populated by RSC fetchQuery cache
  - phase: 03-learner-deep-dive-review/02
    provides: markReviewedMutation + POST /api/teach/submissions/[id]/review
  - phase: 03-learner-deep-dive-review/03
    provides: Icons.sparkle, Icons.undo, Icons.spinner, Icons.check via registry
  - phase: 03-learner-deep-dive-review/05
    provides: submission-viewer.tsx router + RSC route + stub files to overwrite
provides:
  - Conversation submission viewer (CNV-01..CNV-04)
  - Mark-reviewed control with three states (REV-03)
  - PolishedIntroCallout reusable card component
  - QAPair reusable component with inline flag highlighting
  - splitAnswer helper (left-to-right flag word matcher)
affects: [phase-04-visual-fidelity, phase-04-playwright]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Mutation consumer via useMutation({ ...mutationOptions, onSuccess, onError })"
    - "Sonner toasts on success/error with vars-based copy switching"
    - "Inline flag highlighting via Popover (click-triggered) with answer fragment splitting"
    - "Stub-then-replace coordination — Plan 05 ships stubs at the same path/export name, Plan 06 overwrites in place"

key-files:
  created:
    - src/features/teach/components/polished-intro-callout.tsx
    - src/features/teach/components/qa-pair.tsx
  modified:
    - src/features/teach/components/mark-reviewed-button.tsx
    - src/features/teach/components/submission-viewer-conversation.tsx

key-decisions:
  - "D-06 honored: generic 'Reviewed by instructor on <date>' label; no profiles JOIN"
  - "D-07 honored: instant undo with sonner toast, no confirmation dialog"
  - "splitAnswer uses indexOf with cursor advancement — terminates after at most flags.length iterations regardless of input (T-03-36 mitigation)"
  - "Empty-word flags filtered before split loop — pair-level flags do not anchor inline (UI-SPEC line 427)"
  - "Mark-reviewed disables both mark AND undo paths via mutation.isPending to prevent double-submission"
  - "Skip-when-empty for both polished introduction AND exercise summary — no empty cards rendered"

patterns-established:
  - "Conversation viewer composition: PolishedIntroCallout → Q&A Card (divide-y stack) → Exercise Summary"
  - "FlagSpan via Popover (NOT Tooltip) — click-triggered for larger content surface and to avoid accidental hover triggers"
  - "Three-state mutation button: idle CTA → pending spinner → success indicator + undo"

requirements-completed: [CNV-01, CNV-02, CNV-03, CNV-04, REV-03]

# Metrics
duration: 4min
completed: 2026-04-29
---

# Phase 03 Plan 06: Conversation Viewer & Mark-Reviewed Summary

**Three-section conversation viewer (intro callout → divide-y Q&A with click-popover flag highlighting → exercise summary) plus three-state mark-reviewed control wired to Plan 02's mutation with sonner toasts.**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-29T12:38:00Z (approx)
- **Completed:** 2026-04-29T12:42:06Z
- **Tasks:** 3
- **Files modified:** 4 (2 stub overwrites + 2 net-new)

## Accomplishments

- Replaced Plan 05 `mark-reviewed-button.tsx` stub with full three-state implementation (idle / pending / reviewed-with-undo) wired to `markReviewedMutation`
- Replaced Plan 05 `submission-viewer-conversation.tsx` stub with three-section composition (polished intro / Q&A / exercise summary)
- Created `PolishedIntroCallout` — brand-teal DarkCard with cream italic body and typographic quote marks
- Created `QAPair` with inline flag highlighting via click-triggered Popover; `splitAnswer` helper walks the answer left-to-right matching each flag word exactly once
- Closed Phase 3's CNV-01..CNV-04 + REV-03 requirement bundle; the entire learner deep-dive + review surface is now ship-ready pending Phase 4 visual polish + Playwright

## Task Commits

Each task committed atomically:

1. **Task 1: Wire mark-reviewed button to mutation** — `a22aa44b` (feat)
2. **Task 2: Add polished intro + QA pair sub-components** — `a8397525` (feat)
3. **Task 3: Implement conversation submission viewer** — `8a5d3c4b` (feat)

**Plan metadata:** Pending final commit (this SUMMARY + STATE/ROADMAP updates)

## Files Created/Modified

- `src/features/teach/components/mark-reviewed-button.tsx` — Three-state mark-reviewed control (idle CTA, pending spinner, reviewed + undo) wired via `useMutation({ ...markReviewedMutation })` with sonner toasts. Replaces Plan 05 stub.
- `src/features/teach/components/submission-viewer-conversation.tsx` — Conversation viewer composing PolishedIntroCallout + Q&A Card (divide-y QAPair stack) + Exercise Summary Card with sparkle icon. Replaces Plan 05 stub.
- `src/features/teach/components/polished-intro-callout.tsx` — Brand-teal DarkCard with cream italic blockquote framed by typographic quote marks. NEW.
- `src/features/teach/components/qa-pair.tsx` — Question + answer block with inline flag highlighting; `splitAnswer` helper splits the answer string into ordered fragments at each flag word; flagged fragments render as Popover triggers (click) with amber dotted underline; popover content shows Issue + monospace Suggestion. NEW.

## Mark-Reviewed Mutation Flow (End-to-End)

1. **Click "Mark as reviewed"** in `pageHeaderAction` → `mutation.mutate({ submissionId, reviewed: true })`
2. Button switches to disabled `Saving…` + `Icons.spinner` (animate-spin)
3. `markReviewedMutation.mutationFn` calls `markReviewed(input)` from `service-client.ts`
4. `apiClient` POSTs to `/api/teach/submissions/[id]/review` with `{ reviewed: true }`
5. Route handler (Plan 02) runs `requireAdmin()`, parses Zod schema, executes user-session Supabase UPDATE (RLS + column-level GRANT enforce admin-only and column whitelist)
6. Server returns `{ submission: { id, reviewedAt, reviewedBy } }`
7. `onSuccess` runs: `getQueryClient().invalidateQueries({ queryKey: teachKeys.all })` — cohort matrix, learner page, AND viewer all refetch on next view
8. Sonner toast: `"Submission marked as reviewed"` (or `"Review undone"` for undo path)
9. After cache invalidation, the parent `submission-viewer.tsx` `useSuspenseQuery` receives a fresh `SubmissionDetail` whose `submission.reviewedAt` is now non-null — `MarkReviewedButton` re-renders into the reviewed state showing "Reviewed by instructor on Apr 29, 2026" + Undo

Undo flow is symmetric: `mutate({ reviewed: false })` clears both columns; sonner toast `"Review undone"`; button reverts to teal idle CTA. No confirmation dialog (D-07).

## Q&A Flag Splitting Algorithm

`splitAnswer(answer: string, flags: ConversationFlag[])` returns an ordered array of `AnswerFragment` objects, each with `text` and an optional `flag`.

```
1. Filter inline flags: keep only those with non-empty `word`
   (UI-SPEC line 427: pair-level flags with empty word skip inline highlight)
2. If no inline flags remain → return [{ text: answer }]  (single fragment, plain text)
3. Walk flags in array order, advancing a `cursor` index through the answer string
4. For each flag:
   a. idx = answer.indexOf(flag.word, cursor)
   b. If idx < 0 → silently skip (defensive — flag word not present)
   c. If idx > cursor → push pre-text fragment { text: answer.slice(cursor, idx) }
   d. Push flagged fragment { text: flag.word, flag }
   e. cursor = idx + flag.word.length
5. After loop, if cursor < answer.length → push trailing fragment
```

**Termination guarantees (T-03-36 mitigation):**
- Loop iterates exactly `inlineFlags.length` times — bounded by input
- Each iteration either advances `cursor` by `flag.word.length ≥ 1` OR skips (no infinite loop)
- `indexOf` from `cursor` ensures left-to-right monotone progression — a flag word can never match earlier than the previous flag's match

**Defensive cases handled:**
- Empty `flags[]` → plain text rendering
- Flag word not present in answer → silently skipped
- Flag word repeated across answer → matches FIRST occurrence at-or-after `cursor`
- Pair-level flag (empty word) → filtered out before loop

## Decisions Made

- Used `Icons.spinner` (registry alias for `IconLoader2`) and `Icons.undo` (`IconArrowBackUp` from Plan 03) per the icon mapping note in PATTERNS.md — UI-SPEC's `Icons.loader` and `Icons.undo` names are honored via the registry's existing aliases
- Chose `Popover` (not `Tooltip`) for flag detail per UI-SPEC line 425 — click-triggered, larger content surface
- Used `font-mono` only for the suggestion display per UI-SPEC line 420; issue and labels use the default font

## Deviations from Plan

None — plan executed exactly as written. The four-file overwrite-and-create flow worked as Plan 05 designed.

## Issues Encountered

None. Both Plan 05 stubs had matching export names + prop shapes, so the router (`submission-viewer.tsx`) and the RSC route (`/dashboard/teach/submissions/[id]/page.tsx`) compile unchanged after the overwrites.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

**Phase 3 surface complete.** All routes wired:
- `/dashboard/teach/cohorts` (Phase 2)
- `/dashboard/teach/cohorts/[cohort]` (Phase 2)
- `/dashboard/teach/cohorts/[cohort]/learners/[learnerId]` (Plan 03-04)
- `/dashboard/teach/submissions/[id]` (Plan 03-05 + 03-06)
- `POST /api/teach/submissions/[id]/review` (Plan 03-02)

**Ready for Phase 4 (Visual Fidelity & Verification):**
- Playwright smoke spec for cohort → learner → submission → mark-reviewed → undo
- VIS-01..VIS-04 polish pass — verify brand-token usage, prototype IA preservation, loading/empty states
- Optional: optimistic update layer on the mark-reviewed mutation if profiling shows it feels slow (D-04b deferred)

**Self-Check: PASSED**

Files verified to exist:
- src/features/teach/components/mark-reviewed-button.tsx
- src/features/teach/components/submission-viewer-conversation.tsx
- src/features/teach/components/polished-intro-callout.tsx
- src/features/teach/components/qa-pair.tsx

Commits verified to exist in git log:
- a22aa44b (Task 1)
- a8397525 (Task 2)
- 8a5d3c4b (Task 3)

Build verified: `npm run build` exits 0; TypeScript check exits 0.

Stub markers verified absent:
- `Mark-reviewed (Plan 06)` — REMOVED
- `Conversation viewer (Plan 06)` — REMOVED

---
*Phase: 03-learner-deep-dive-review*
*Completed: 2026-04-29*
