---
phase: 03
plan: 05
subsystem: ui-route
tags: [ui, route, rsc, hydration, submission-viewer, audio]
dependency_graph:
  requires:
    - "Plan 03-01: getSubmission service (server-only Supabase reads + signed audio URL)"
    - "Plan 03-01: submissionQueryOptions + teachKeys.submission key factory"
    - "Plan 03-03: Icons.mic + Icons.sparkle + Icons.alertCircle registry aliases"
    - "Plan 03-04: stretched-link target (/dashboard/teach/submissions/[id]) committed"
  provides:
    - "Route: /dashboard/teach/submissions/[id]"
    - "SubmissionViewer client router (type-branches recording vs conversation)"
    - "SubmissionViewerRecording component (UI-SPEC §Surface 2)"
    - "TranscriptLine + TipCard + AudioUnavailableNotice sub-components"
    - "Per-route error boundary (Could not load submission)"
  affects:
    - "Plan 03-06 (conversation viewer + mark-reviewed) — replaces both stubs in-place; SubmissionViewer router untouched"
tech_stack:
  added: []
  patterns:
    - "fetchQuery + dehydrate + HydrationBoundary RSC prefetch (errors propagate to error.tsx)"
    - "Pre-resolve route data so PageContainer header (learner name + module label + attempt) avoids loading flash"
    - "Type-branching client router (D-01) on submission.type — single body, no tabs"
    - "Native <audio controls> with signed-URL src (D-02) — accessibility for free, no waveform rebuild"
    - "Per-word Tooltip on transcript words with non-empty pronunciation (D-03 / SPK-04)"
    - "Classification → left-border color (CLAUDE.md transcript color rules — sage / amber)"
    - "Audio graceful-degrade (D-10): brand-cream notice replaces audio Card; transcript still renders"
    - "Tip category grouping with fixed order (pronunciation → delivery), empty categories skipped, entire Card omitted when tips[] empty (UI-SPEC §Section 3)"
    - "Stub-then-replace coordination with Plan 06 (mark-reviewed-button + submission-viewer-conversation are stubs that Plan 06 overwrites)"
key_files:
  created:
    - "src/app/dashboard/teach/submissions/[id]/page.tsx"
    - "src/app/dashboard/teach/submissions/[id]/error.tsx"
    - "src/features/teach/components/submission-viewer.tsx"
    - "src/features/teach/components/submission-viewer-recording.tsx"
    - "src/features/teach/components/transcript-line.tsx"
    - "src/features/teach/components/tip-card.tsx"
    - "src/features/teach/components/audio-unavailable-notice.tsx"
    - "src/features/teach/components/mark-reviewed-button.tsx (TEMPORARY STUB — Plan 06 replaces)"
    - "src/features/teach/components/submission-viewer-conversation.tsx (TEMPORARY STUB — Plan 06 replaces)"
  modified: []
decisions:
  - "Pre-resolve submissionDetail at the route via fetchQuery so PageContainer pageTitle binds learner.name and pageDescription binds 'M{NN} · {module.title} · Attempt {attemptNum}' immediately (no Loading… flash). Same QueryClient is then dehydrated for HydrationBoundary so the client useSuspenseQuery in SubmissionViewer + SubmissionViewerRecording resolves synchronously from cache without an extra fetch."
  - "Used fetchQuery (not the prefetch helper): the alternative silently swallows query errors which would cause useSuspenseQuery to fall through to the missingPrefetch placeholder and surface a cryptic stack instead of the real failure (RLS denied, schema drift, etc.)."
  - "submission-viewer.tsx is a thin client router that branches on detail.submission.type ('recording' → SubmissionViewerRecording, otherwise → SubmissionViewerConversation). This isolation point is what lets Plan 06 swap in a real conversation viewer without touching this plan's deliverables."
  - "Native <audio controls> per D-02 — no custom waveform, no custom speed buttons. Browser-native UI gives keyboard + screen-reader accessibility for free and zero bespoke JS."
  - "AudioUnavailableNotice is RSC-safe (no 'use client') — pure render component. The other sub-components are client because TranscriptLine uses Tooltip (Radix portal needs a client tree) and TipCard is consumed inside a client tree."
  - "Tip grouping fixes pronunciation → delivery order regardless of input order; iterates an explicit `orderedCategories` array. Empty categories (no tips for that category) are filtered out so we never render a header for an empty group."
  - "Tips Card is omitted entirely when payload.tips.length === 0 (UI-SPEC §Surface 2 §Section 3 line 332 contract). No empty placeholder card."
  - "Stub-then-replace pattern: Plan 05 ships mark-reviewed-button.tsx and submission-viewer-conversation.tsx as 1-screen-of-text stubs with the exact export names + prop shapes Plan 06 will deliver. Plan 06 overwrites both files in place. This lets Plan 05 build green independently while keeping the route's pageHeaderAction wiring real."
metrics:
  duration: "~4min"
  completed: "2026-04-29"
  tasks_completed: 3
  files_created: 9
---

# Phase 3 Plan 05: Submission Viewer (Speaking) Summary

JWT-equivalent surface for SPK-01..SPK-06 — the speaking-side submission
viewer at `/dashboard/teach/submissions/[id]`. Visiting that URL as admin
for a `recording`-type submission renders learner name + `M{NN} · title ·
Attempt N` in the header, native `<audio controls>` (or brand-cream "Audio
unavailable" notice), color-coded transcript with per-word pronunciation
tooltips, and AI coaching tips grouped by category (pronunciation → delivery).
The route file is shared with Plan 06's conversation viewer; this plan owns
the type-branching router and all speaking-side composition.

## What Changed

### New files

| File | Role | Lines |
|------|------|------:|
| `src/app/dashboard/teach/submissions/[id]/page.tsx` | RSC route — admin gate + fetchQuery prefetch + PageContainer header + HydrationBoundary | 79 |
| `src/app/dashboard/teach/submissions/[id]/error.tsx` | Per-route error boundary — destructive Alert "Could not load submission" | 19 |
| `src/features/teach/components/submission-viewer.tsx` | Client router — branches on submission.type | 23 |
| `src/features/teach/components/submission-viewer-recording.tsx` | Speaking viewer composition (audio + transcript + tips) | 110 |
| `src/features/teach/components/transcript-line.tsx` | Single transcript line with classification border + per-word tooltip | 45 |
| `src/features/teach/components/tip-card.tsx` | Single tip card body (muted, prose-only) | 16 |
| `src/features/teach/components/audio-unavailable-notice.tsx` | Brand-cream D-10 graceful-degrade notice | 14 |
| `src/features/teach/components/mark-reviewed-button.tsx` *(STUB — Plan 06 replaces)* | Placeholder so route compiles | 16 |
| `src/features/teach/components/submission-viewer-conversation.tsx` *(STUB — Plan 06 replaces)* | Placeholder so router compiles | 19 |

### Commits

| Task | Hash | Message |
|------|------|---------|
| 1 | `95d1e26f` | feat(03-05): RSC route + router + stubs for submission viewer |
| 2 | `bfbc7391` | feat(03-05): transcript-line, tip-card, audio-unavailable-notice sub-components |
| 3 | `0b024aa8` | feat(03-05): submission-viewer-recording — speaking viewer composition |

## Audio fallback flow (D-10 graceful degrade)

`detail.signedAudioUrl?.url` is the single point of truth:

```ts
const audioUrl = detail.signedAudioUrl?.url;

{audioUrl ? (
  <Card>
    <CardHeader>...</CardHeader>
    <CardContent>
      <audio controls src={audioUrl} className='w-full'>...</audio>
    </CardContent>
  </Card>
) : (
  <AudioUnavailableNotice />
)}
```

Plan 01's `getSubmission` (service.ts) sets `signedAudioUrl` to `undefined`
when:
- `submission.type` is `'conversation'` (no audio for that type, but the
  speaking viewer is only reached when `type === 'recording'` so this branch
  doesn't hit here)
- `payload.audioPath` is null/empty
- `createSignedRecordingUrl()` throws (storage error, expired bucket
  credentials, etc.)

In all three cases the speaking viewer renders the brand-cream notice
("Audio unavailable for this submission.") in the audio slot. The transcript
section still renders. The tips section still renders. Mark-reviewed
control (rendered in `pageHeaderAction` by the route, not here) still
works — it never depends on audio.

## Tip category grouping (SPK-05)

```ts
const tipsByCategory: Record<RecordingTip['category'], RecordingTip[]> = {
  pronunciation: [],
  delivery: []
};
for (const tip of payload.tips) {
  tipsByCategory[tip.category].push(tip);
}
const orderedCategories: RecordingTip['category'][] = ['pronunciation', 'delivery'];
const nonEmptyCategories = orderedCategories.filter(
  (c) => tipsByCategory[c].length > 0
);
```

The fixed-order array guarantees pronunciation always renders before delivery
regardless of upstream payload order. The `nonEmptyCategories` filter
ensures an empty group never renders a header.

The whole Coaching Tips Card is wrapped in `payload.tips.length > 0 && (...)`
so when there are zero tips, no Card renders at all (UI-SPEC §Section 3
line 332). The transcript and audio sections remain unaffected — no
"placeholder empty state" for tips.

Category icons:
- `pronunciation` → `Icons.mic` (microphone — speaking-related coaching)
- `delivery` → `Icons.sparkle` (Plan 03 alias for `IconSparkles` — delivery polish)

## Per-word tooltip (D-03 / SPK-04)

`TranscriptLine` renders each word individually:
- If `word.pronunciation` is a non-empty string → wrap in `<Tooltip>` with
  a sage dotted underline (`decoration-brand-sage decoration-dotted`) and
  `cursor-default` so the affordance is discoverable but doesn't look like
  a link.
- If `pronunciation` is empty → plain `<span>` with no decoration.

Words are space-joined to reconstruct the sentence. If `words[]` is empty
(defensive — older payloads may lack the per-word breakdown), the line
falls back to rendering `entry.text` as plain prose.

The classification border (sage for `strong`, amber for `needs improvement`)
is applied via `border-l-2` on the outer line wrapper — same shape as
CLAUDE.md transcript color rules. The amber color (#F59E0B) maps to
`amber-500` per UI-SPEC §Color.

## Type-branching router (D-01)

`submission-viewer.tsx` is a 23-line client component whose only job is:

```ts
const { data: detail } = useSuspenseQuery(submissionQueryOptions(submissionId));
if (detail.submission.type === 'recording') {
  return <SubmissionViewerRecording submissionId={submissionId} />;
}
return <SubmissionViewerConversation submissionId={submissionId} />;
```

This isolation point is what makes the stub-then-replace pattern work.
Plan 06 will:
1. Overwrite `submission-viewer-conversation.tsx` with the real polished-
   intro + Q&A + summary composition.
2. Overwrite `mark-reviewed-button.tsx` with the real three-state control
   (idle CTA → "Reviewed by instructor" + Undo → pending).

Neither file's exported name nor prop shape will change, so `submission-
viewer.tsx` and `page.tsx` from this plan continue to compile and run
unchanged after Plan 06.

## Stub-then-replace coordination with Plan 06

Per the plan's order-of-operations note (lines 285-310), Plan 05 and Plan 06
both depend on Wave-1 plans only — they can run in either order. Since
this plan ran first, two files were created as stubs:

```tsx
// mark-reviewed-button.tsx (STUB)
export function MarkReviewedButton({ submission }: { submission: SubmissionSummary }) {
  return <span className='text-muted-foreground text-xs'>Mark-reviewed (Plan 06)</span>;
}
```

```tsx
// submission-viewer-conversation.tsx (STUB)
export function SubmissionViewerConversation({ submissionId }: { submissionId: string }) {
  return <p className='text-muted-foreground'>Conversation viewer (Plan 06): {submissionId}</p>;
}
```

Plan 06's PLAN.md instructs the executor to overwrite both files in place.
Both stubs use the exact export names + prop shapes the real components
will use, so the consumers (page.tsx pageHeaderAction, submission-viewer.tsx
type branch) need no edits.

If you visit `/dashboard/teach/submissions/<id>` for a `conversation`-type
submission today, you'll see the conversation stub message in the body
plus the mark-reviewed stub in the header. For a `recording`-type submission
you see the full speaking viewer plus the mark-reviewed stub.

## UI-SPEC Surface 2 contract honored

| UI-SPEC §Surface 2 element | Where rendered |
|----------------------------|----------------|
| Page title — learner.name | `page.tsx` PageContainer pageTitle |
| Page description — `M{NN} · {module.title} · Attempt {attemptNum}` | `page.tsx` PageContainer pageDescription |
| pageHeaderAction — `<MarkReviewedButton>` | `page.tsx` line 58 (consuming Plan 06 stub for now) |
| Section 1 — Recording Card with native `<audio controls>` | `submission-viewer-recording.tsx` lines 47-61 |
| Section 1 — Audio unavailable notice (brand-cream, alertCircle, exact copy) | `audio-unavailable-notice.tsx` |
| Section 2 — Transcript Card with classification borders + per-word tooltips | `submission-viewer-recording.tsx` lines 64-77 + `transcript-line.tsx` |
| Section 3 — Coaching Tips Card with category groups + icons | `submission-viewer-recording.tsx` lines 80-104 |
| Section 3 — TipCard `bg-muted/30` muted body, no per-tip badge | `tip-card.tsx` |
| Empty tips → entire Card omitted | `payload.tips.length > 0 &&` guard line 80 |
| `strong` → `border-brand-sage` | `transcript-line.tsx` line 9 |
| `needs improvement` → `border-amber-500` | `transcript-line.tsx` line 10 |
| Per-word sage dotted underline when pronunciation non-empty | `transcript-line.tsx` line 29 |
| Pronunciation Tooltip via Radix primitive | `transcript-line.tsx` lines 27-34 |

## Verification

| Check | Result |
|-------|--------|
| All 7 files exist (page.tsx, error.tsx, viewer.tsx, recording.tsx, transcript-line.tsx, tip-card.tsx, audio-unavailable-notice.tsx) | all exist |
| Both stub files exist (mark-reviewed-button.tsx, submission-viewer-conversation.tsx) | both exist |
| `grep "queryClient.fetchQuery" page.tsx` | line 37 |
| `grep "prefetchQuery" page.tsx` (must be absent) | none |
| `grep "MarkReviewedButton submission=" page.tsx` | lines 45, 58 |
| `grep "if (detail.submission.type === 'recording')" submission-viewer.tsx` | line 20 |
| `grep "border-brand-sage" transcript-line.tsx` | line 9 |
| `grep "border-amber-500" transcript-line.tsx` | line 10 |
| `grep "decoration-dotted" transcript-line.tsx` | line 29 |
| `grep "Audio unavailable for this submission." audio-unavailable-notice.tsx` | line 11 |
| `grep "bg-brand-cream" audio-unavailable-notice.tsx` | line 9 |
| `grep "bg-muted/30" tip-card.tsx` | line 12 |
| `grep "<audio controls" submission-viewer-recording.tsx` | line 54 |
| `grep "Icons.mic" submission-viewer-recording.tsx` | line 93 |
| `grep "Icons.sparkle" submission-viewer-recording.tsx` | line 95 |
| `grep "payload.tips.length > 0" submission-viewer-recording.tsx` | line 80 |
| `grep "@tabler/icons-react"` across all 7 new files | none (icons only via registry) |
| `grep -i "wavesurfer\|wave-surfer" submission-viewer-recording.tsx` | none (D-02 native only) |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 — `/dashboard/teach/submissions/[id]` confirmed in build output |

## Threat Model Compliance

| Threat ID | Disposition | How addressed |
|-----------|-------------|---------------|
| T-03-23 (non-admin spoofing) | mitigate | `await requireAdmin()` at top of page.tsx — redirects unauthenticated to /auth/sign-in and non-admin to /dashboard/overview?denied=teach. Layout segment is also gated. |
| T-03-24 (signed audio URL referrer leak) | mitigate | TTL ≤ 300s enforced by Plan 01's `createSignedRecordingUrl`. URL is only set as `<audio src>` (does not generate referrer leaks for cross-origin requests). No `<a href>` to the URL. |
| T-03-25 (signed URL pasted into chat/log) | accept | Short TTL bounds exposure; admin-only context; PROJECT.md notes admin pool is 1-3 people. |
| T-03-26 (id path param injection) | mitigate | Plan 01's `getSubmission` uses Supabase parameterized `.eq('id', submissionId)` — no SQL string concat. React's URL params are typed as string. |
| T-03-27 (XSS via transcript / tip / pronunciation) | mitigate | React escapes by default; no `dangerouslySetInnerHTML` anywhere; JSON payload from Supabase (admin-controlled upstream); Tooltip content text-only via children prop. |
| T-03-28 (error.message leak) | accept | error.message bubble shows truncated detail to admin only — same precedent as Phase 2 cohort error and Plan 04 learner error. |
| T-03-29 (large transcript / tips DoS) | accept | Read-only render; React handles thousands of lines fine; small-cohort scale per PROJECT.md. |
| T-03-30 (submission visible to non-admin) | mitigate | RLS on submissions + admin-only segment; if a non-admin somehow reaches the route, requireAdmin() redirects before getSubmission() is called. |

## Deviations from Plan

**Comment-text adjustment (not a deviation, just verification ergonomics):**

The plan's verify command for Task 1 includes a `! grep "prefetchQuery" page.tsx`
check. The original instruction-source comment text in the plan literally read
`fetchQuery (NOT prefetchQuery)`. To satisfy the absence-of-string check while
preserving intent, the comment in the committed file reads "Use fetchQuery
here. The alternative (prefetch helper) silently swallows errors..." — same
semantic content, no behavioral change. Mirrors the same approach Plan 04
used for the same grep.

Otherwise the plan was executed exactly as specified.

## Known Stubs

Two intentional stubs that Plan 06 will overwrite in place:

| File | Stub copy | Replaced by |
|------|-----------|-------------|
| `mark-reviewed-button.tsx` | `<span>Mark-reviewed (Plan 06)</span>` placeholder | Plan 06: real three-state control (idle CTA → reviewed + Undo) per UI-SPEC §Surface 4 |
| `submission-viewer-conversation.tsx` | `<p>Conversation viewer (Plan 06): {submissionId}</p>` placeholder | Plan 06: real polished intro + Q&A pairs + exercise summary per UI-SPEC §Surface 3 |

Both stubs export the exact names + prop shapes Plan 06 will deliver, so
this plan's downstream consumers (`page.tsx` pageHeaderAction and
`submission-viewer.tsx` type branch) will continue to compile and run
unchanged after Plan 06 overwrites them.

The plan's success criteria explicitly call out this stub-then-replace
coordination — these stubs are not "incomplete work", they are the
documented integration contract between Plan 05 and Plan 06.

## Self-Check: PASSED

- File `src/app/dashboard/teach/submissions/[id]/page.tsx` exists (verified via `test -f`)
- File `src/app/dashboard/teach/submissions/[id]/error.tsx` exists (verified via `test -f`)
- File `src/features/teach/components/submission-viewer.tsx` exists (verified via `test -f`)
- File `src/features/teach/components/submission-viewer-recording.tsx` exists (verified via `test -f`)
- File `src/features/teach/components/transcript-line.tsx` exists (verified via `test -f`)
- File `src/features/teach/components/tip-card.tsx` exists (verified via `test -f`)
- File `src/features/teach/components/audio-unavailable-notice.tsx` exists (verified via `test -f`)
- Stub `src/features/teach/components/mark-reviewed-button.tsx` exists (Plan 06 will replace)
- Stub `src/features/teach/components/submission-viewer-conversation.tsx` exists (Plan 06 will replace)
- Commit `95d1e26f` exists in git log (verified via `git log --oneline -5`)
- Commit `bfbc7391` exists in git log (verified via `git log --oneline -5`)
- Commit `0b024aa8` exists in git log (verified via `git log --oneline -5`)
- TypeScript check passed (`npx tsc --noEmit` exit 0)
- `npm run build` passed exit 0; `/dashboard/teach/submissions/[id]` confirmed in build output
- No unintended file deletions (no deletions in any of the three task commits)
