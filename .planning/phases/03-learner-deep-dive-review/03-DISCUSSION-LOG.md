# Phase 3: Learner Deep-Dive & Review - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 03-learner-deep-dive-review
**Areas discussed:** Submission viewer IA, Audio player + transcript sync, Mark-as-reviewed mutation transport, Learner page + reviewer display + Undo

---

## Submission Viewer IA

### Q1: How should /dashboard/teach/submissions/[id] render the body when there's only one type per submission?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-type body (Recommended) | Render only the type-specific viewer based on submission.type. recording → audio + transcript + tips. conversation → polished intro + Q&A + summary. Shared header on top. | ✓ |
| Tabs (prototype-faithful) | Always render tabs (Speaking / Conversation / AI tips). Disable or hide the irrelevant tab when single-type. | |
| Sectioned (no tabs) | Render every section inline as a vertical scroll, no tab navigation. | |

**User's choice:** Single-type body
**Notes:** Real submissions are single-type per row; the prototype's tabs were a fixture artifact, not a data shape. Cleaner — no empty/disabled tabs, fewer states to maintain.

---

## Audio Player + Transcript Sync

### Q1: Audio player approach for the speaking viewer?

| Option | Description | Selected |
|--------|-------------|----------|
| Native `<audio controls>` (Recommended) | Browser-native HTML5 player with src=signedAudioUrl. Free accessibility. Built-in play/pause/seek. No waveform, no custom speed buttons. Ships fast, zero JS. | ✓ |
| Native + speed buttons | Native + small bar of speed buttons (0.75x / 1x / 1.25x / 1.5x) wired via audioRef.playbackRate. | |
| Custom waveform (prototype-fidelity) | Custom-styled player with fake waveform bars + speed pills + scrubber, matching the prototype. | |
| Native + Download button | Native `<audio controls>` plus a separate "Download .webm" button that opens the signed URL in a new tab. | |

**User's choice:** Native `<audio controls>`
**Notes:** Free accessibility (keyboard, screen readers, native scrub). No bespoke JS. Click-to-jump on transcript not possible anyway (no per-line timestamps in payload).

### Q2: How should per-word pronunciation hints (SPK-04: payload.recordingTranscript[].words[]) display?

| Option | Description | Selected |
|--------|-------------|----------|
| Hover tooltip per word (Recommended) | Each word in the transcript is a `<Tooltip>` trigger; hovering shows the pronunciation hint. Uses existing tooltip primitive. | ✓ |
| Inline phonetic subscript | Phonetic hint rendered inline beneath each annotated word (smaller font). Always visible. | |
| Sidebar list | Words-with-hints rendered as a separate sidebar list (word · pronunciation), independent of transcript. | |
| Skip per-word display in v1 | Render the transcript without per-word hints in v1; defer SPK-04 to Phase 4 visual polish. | |

**User's choice:** Hover tooltip per word
**Notes:** Zero visual noise when not hovering. Reuses src/components/ui/tooltip.tsx — same primitive Phase 2 used for matrix cells.

---

## Mark-as-Reviewed Mutation Transport

### Q1: How should the mark-as-reviewed mutation be wired?

| Option | Description | Selected |
|--------|-------------|----------|
| Route Handler — matches demos (Recommended) | POST /api/teach/submissions/[id]/review with body { reviewed: boolean } — matches demos pattern per REV-04. Zod validation, user-session Supabase client (auth.uid() flows naturally), RLS + column-level grant enforce. useMutation invalidates teachKeys.all. | ✓ |
| Server Action ('use server') | Next 16 server action invoked directly from the client component via useMutation. No /api route. | |
| Route Handler + optimistic update | Route handler (same as Recommended) plus optimistic update in useMutation onMutate. | |

**User's choice:** Route Handler — matches demos
**Notes:** REV-04 explicitly requires the demos pattern. User-session client (not admin) ensures auth.uid() flows naturally as reviewed_by. Optimistic update deferred — add later if profiling shows it feels slow.

---

## Learner Page + Reviewer Display + Undo

### Q1: How should submissions group on /learners/[id]?

| Option | Description | Selected |
|--------|-------------|----------|
| Cards per module (Recommended) | One card per module-with-submissions, sorted by module number. Inside the card, rows for each submission (newest attempt first). | ✓ |
| Single table grouped by module | One `<Table>` with a sticky module header row separating groups. | |
| Accordion per module | Collapsible accordion (shadcn) — click to expand a module's submissions. | |

**User's choice:** Cards per module
**Notes:** Matches prototype's grouped-by-module IA. Each row clickable to /submissions/[id].

### Q2: How should reviewer name resolve for the 'Reviewed by <admin> on <date>' indicator (REV-03)?

| Option | Description | Selected |
|--------|-------------|----------|
| JOIN profiles on reviewed_by (Recommended) | Fetch the reviewer name as part of getSubmission(). Add reviewer?: { id, name } to SubmissionDetail. | |
| Show 'Reviewed by you' if uuid matches current user, else fetch | Optimization: when reviewed_by === auth.uid() show 'Reviewed by you'. Otherwise fetch. | |
| Show raw uuid prefix | Show 'Reviewed by abc12345 on …' (first 8 chars of uuid). | |
| Other (free text) | User explicitly chose generic "Reviewed by instructor" label. | ✓ |

**User's choice (free text):** "Okay, who preview it is not important at this point so we can have something I think generic, like we only have one admin at the moment and my wife it's not gonna be more than two or three people. this project is not going to be live for 20 admins. So leave this as a note that we can have for you by instructor I mean it's good enough"
**Decision applied:** Generic "Reviewed by instructor on `<date>`" label. No profiles JOIN. Documented as future swap-in when admin pool grows past 2–3.
**Notes:** Cheaper to ship; honest with current single-admin reality.

### Q3: How should the Undo review affordance work (REV-03)?

| Option | Description | Selected |
|--------|-------------|----------|
| Instant undo + toast (Recommended) | Click 'Undo review' → immediate mutation → sonner toast 'Review undone'. | ✓ |
| Confirmation dialog before undo | Click 'Undo review' → AlertDialog 'Undo review for this submission?' [Cancel | Undo]. | |
| Soft confirm via toast 'Undo' button | Hide the Undo button behind a kebab menu, or only show it via a toast immediately after marking. | |

**User's choice:** Instant undo + toast
**Notes:** Symmetrical with mark-reviewed UX (also one click + toast). Matches demos revoke-token single-click pattern.

### Q4 (follow-up): For the 'Cards per module' learner page — should it render all 12 modules from MODULES catalog, or only modules that have at least one submission?

| Option | Description | Selected |
|--------|-------------|----------|
| Only modules with submissions (Recommended) | Render a card only when the learner has ≥1 submission for that module. | ✓ |
| All 12 modules with placeholders | Render every module in MODULES order; modules without submissions show a faint 'No submissions yet' card. | |
| Only with submissions + 'X of 12 modules complete' summary | Cards only for modules with submissions, plus a small header line. | |

**User's choice:** Only modules with submissions
**Notes:** Cleaner; admins see what's been done, not what hasn't. Today only module-01 has data.

---

## Final Check: More gray areas or ready for context?

| Option | Description | Selected |
|--------|-------------|----------|
| Ready for context (Recommended) | Lock the 8 decisions captured so far; let Claude pick sensible defaults for AI tips grouping, Q&A flag highlight, polished-intro callout, audio-unavailable state, mark-reviewed button placement. | ✓ |
| Discuss flag/highlight visual treatment | Open a discussion specifically about Q&A inline flags and polished-intro callout styling. | |
| Discuss mark-reviewed button placement | Where exactly the controls live (header, sticky bar, footer). | |
| Discuss AI coaching tips layout (SPK-05) | How tips group: flat list, two columns, or accordion. | |

**User's choice:** Ready for context

---

## Claude's Discretion

The following are explicitly left for downstream agents to decide using existing project patterns:

- AI coaching tips layout (SPK-05) — likely flat list with category badges
- Q&A inline flag highlight style (CNV-03) — likely amber underline + popover
- Polished introduction callout treatment (CNV-02) — likely brand-teal DarkCard with quotes
- Mark-reviewed button placement — PageContainer.pageHeaderAction slot
- Loading states / Suspense fallbacks — match demos-listing.tsx skeleton pattern
- Error boundaries — per-route error.tsx mirroring Phase 2
- Empty states — text + back-link
- Query key extensions — `teachKeys.learner(id)`, `teachKeys.submission(id)`
- Mutation invalidation — `teachKeys.all` (cascades to cohort + learner)
- Test coverage — Phase 4 owns the end-to-end Playwright; Phase 3 component
  unit tests not required (match Phase 2 coverage shape)

## Deferred Ideas

- Reviewer name resolution via profiles JOIN (D-06 future swap-in)
- Cross-assignment AI metrics tab (out of scope — no payload signals)
- Click-to-jump on transcript (needs per-line timestamps in payload)
- Custom audio waveform UI (no functional gain over native)
- Optimistic mark-reviewed update (D-04b — add if mutation feels slow)
- "X of 12 modules complete" learner-page summary (v2 polish)
- AI tips accordion variant (Claude's discretion default = flat list)
