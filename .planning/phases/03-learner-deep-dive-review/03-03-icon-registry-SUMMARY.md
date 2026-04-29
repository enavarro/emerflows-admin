---
phase: 03
plan: 03
subsystem: ui-infra
tags: [infra, icons, registry, ui]
dependency_graph:
  requires: []
  provides:
    - "Icons.mic"
    - "Icons.messageSquare"
    - "Icons.fileX"
    - "Icons.sparkle"
    - "Icons.undo"
  affects:
    - "Wave 2: 03-04, 03-05, 03-06 can import these from @/components/icons"
tech_stack:
  added: []
  patterns:
    - "Icon registry alias keys (e.g. messageSquare → IconMessage) for UI-SPEC name parity"
key_files:
  created: []
  modified:
    - "src/components/icons.tsx"
decisions:
  - "Used `IconArrowBackUp` (semantically correct undo arrow) for `Icons.undo` rather than rotated arrowRight"
  - "Added two pure aliases (`messageSquare` and `sparkle`) so consumer JSX matches UI-SPEC verbatim — no need to change UI-SPEC names downstream"
  - "Kept pre-existing aliases (`spinner` = loader, `forms` = clipboardList, `chat` = message) unchanged — Wave 2 consumers will import the existing keys directly"
metrics:
  duration: "~2min"
  completed: "2026-04-29"
  tasks_completed: 1
  files_modified: 1
---

# Phase 3 Plan 03: Icon Registry Extension Summary

Added the icon names referenced by Phase 3 UI-SPEC that were missing from the `Icons` registry, so Wave 2 plans (04 — Learner detail page; 05 — Submission Viewer Speaking; 06 — Conversation Viewer + Mark Reviewed) can import everything from `@/components/icons` without ever touching `@tabler/icons-react` directly (CLAUDE.md rule).

## What Changed

**File modified:** `src/components/icons.tsx` (+8 lines, 0 deletions)

### New tabler imports (3)

| Import | Source | Used by registry key |
|--------|--------|----------------------|
| `IconArrowBackUp` | `@tabler/icons-react` | `undo` |
| `IconFileX` | `@tabler/icons-react` | `fileX` |
| `IconMicrophone` | `@tabler/icons-react` | `mic` |

All three were verified to exist in `@tabler/icons-react@3.40.0` (the project's installed version) before being added — no missing-export risk.

### New `Icons` object entries (5)

| Registry key | Tabler component | Group | Purpose |
|--------------|------------------|-------|---------|
| `mic` | `IconMicrophone` | Communication | UI-SPEC §Surface 2 §Section 3 — pronunciation tip category icon |
| `messageSquare` | `IconMessage` (alias of existing `chat`) | Communication | UI-SPEC §Component Inventory — alias so consumer code matches UI-SPEC verbatim |
| `fileX` | `IconFileX` | Files | UI-SPEC §Error states — "Submission not found" 404 viewer empty state |
| `sparkle` | `IconSparkles` (alias of existing `sparkles`) | Commerce / Plans | UI-SPEC §Surface 2 + §Surface 3 — delivery tip category icon and exercise summary card icon |
| `undo` | `IconArrowBackUp` | Actions | UI-SPEC §Surface 4 — "Undo review" ghost button icon |

## Decisions Made

1. **`undo` → `IconArrowBackUp`** (not `IconArrowRight` rotated). The patterns map suggested rotating `arrowRight` as a fallback, but `IconArrowBackUp` is the semantically correct tabler icon for an undo affordance. No CSS rotation hack needed.

2. **Two pure aliases (`messageSquare`, `sparkle`)** — instead of asking Wave 2 to call `Icons.chat` or `Icons.sparkles`, we added trivial aliases pointing to the same tabler icon. This keeps consumer JSX matching the UI-SPEC verbatim and makes the design contract round-trip.

3. **Kept existing aliases unchanged** for `Icons.spinner` (= `IconLoader2`), `Icons.forms` (= `IconClipboardText`), `Icons.chat` (= `IconMessage`), and `Icons.sparkles` (= `IconSparkles`). UI-SPEC also references `Icons.loader` and `Icons.clipboardList` — Wave 2 plans will simply import the pre-existing `spinner` and `forms` keys directly (per the patterns map deviation table).

## UI-SPEC Name → Registry Key Reference (for Plans 04-06)

This is the canonical mapping Wave 2 should use. UI-SPEC sometimes uses slightly different names; the registry entry on the right is what to actually `import { Icons } from '@/components/icons'` and use.

| UI-SPEC name | Registry key (this is what you call) | Tabler icon |
|--------------|--------------------------------------|-------------|
| `Icons.alertCircle` | `Icons.alertCircle` | `IconAlertCircle` |
| `Icons.arrowRight` | `Icons.arrowRight` | `IconArrowRight` |
| `Icons.check` | `Icons.check` | `IconCheck` |
| `Icons.clipboardList` | **`Icons.forms`** *(pre-existing alias)* | `IconClipboardText` |
| `Icons.fileX` | `Icons.fileX` *(NEW)* | `IconFileX` |
| `Icons.loader` | **`Icons.spinner`** *(pre-existing alias)* | `IconLoader2` |
| `Icons.messageSquare` | `Icons.messageSquare` *(NEW alias)* | `IconMessage` |
| `Icons.mic` | `Icons.mic` *(NEW)* | `IconMicrophone` |
| `Icons.sparkle` | `Icons.sparkle` *(NEW alias)* | `IconSparkles` |
| `Icons.sparkles` | `Icons.sparkles` *(pre-existing)* | `IconSparkles` |
| `Icons.undo` | `Icons.undo` *(NEW)* | `IconArrowBackUp` |

**Wave 2 rule:** Always `import { Icons } from '@/components/icons'`. Never `import { ... } from '@tabler/icons-react'`. The registry resolves every name in UI-SPEC.

## Verification

| Check | Result |
|-------|--------|
| `grep "mic: IconMicrophone"` | line 152 |
| `grep "fileX: IconFileX"` | line 165 |
| `grep "undo: IconArrowBackUp"` | line 178 |
| `grep "sparkle: IconSparkles"` | line 201 |
| `grep "messageSquare: IconMessage"` | line 151 |
| `grep -c "IconMicrophone\|IconFileX\|IconArrowBackUp"` | 6 (3 imports + 3 usages — exact expected count) |
| `npx tsc --noEmit` | exit 0 (no type errors) |
| `npm run build` | exit 0 (Next.js production build success, all 28 pages generated) |
| Pre-existing entries `spinner`, `forms`, `chat`, `sparkles`, `arrowRight` | unchanged (verified by reading file) |
| No trailing comma after last key (`school: IconSchool`) | confirmed line 225 |

## Threat Model Compliance

- **T-03-16 (Tampering / malicious icon source):** mitigated. All three new imports come from the project's existing `@tabler/icons-react@3.40.0` dependency. No new packages added, no new icon sources introduced.
- **T-03-17 (Information Disclosure):** N/A — pure presentation registry, no data flow.
- **No new threat surface introduced** — this is a purely internal UI registry change with no network, auth, or data implications.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- File `src/components/icons.tsx` exists and contains all 5 new entries (verified via grep + Read tool)
- Commit `bc36f85f` exists in git log (verified via `git rev-parse --short HEAD`)
- Build and TypeScript check passed with exit code 0
- No unintended file deletions (`git diff --diff-filter=D HEAD~1 HEAD` returned empty)
