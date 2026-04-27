---
phase: 02-cohorts-hub
plan: 04
subsystem: ui
tags: [react, nextjs, shadcn, tailwind, tooltip, scroll-area, table, date-fns, sticky-header, accessibility]

# Dependency graph
requires:
  - phase: 02-cohorts-hub/02-01
    provides: CohortDetail / ModuleProgressCell / ProgressState type contracts and matrix shape (12 cells per learner in MODULES.num order)
  - phase: 01-foundations
    provides: MODULES catalog (12 entries) at src/features/teach/constants/modules.ts
provides:
  - ProgressMatrix client component (sticky-header learner × module grid with sage-progressive dot encoding)
  - Reusable LegendSwatch and tooltip-text formatter (file-local helpers)
  - Visual contract for D-15 (sticky header) + D-16 (sage-progressive dots) + D-17 (non-interactive cells) + D-18 (tooltip copy) + D-19 (one cell per module)
affects:
  - 02-03 (cohort-detail.tsx imports ProgressMatrix into the matrix tab)
  - 02-05 (Playwright e2e validates matrix renders + sage cell + tooltips)
  - Phase 3 (submission viewer will replace D-17 with real cell-link navigation)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sticky-header HTML table inside ScrollArea: sticky top-0 (z-20) on header row, sticky left-0 (z-10) on first column, top-left corner cell at z-30 to win both pinning planes"
    - "Sage-progressive dot encoding (3 states) with VERBATIM Tailwind class strings from UI-SPEC — layout handled by wrapper spans, not by mutating the encoding strings"
    - "Tooltip wrapping span trigger via asChild — accept project's auto-wrapped TooltipProvider (delayDuration=0); never add an outer TooltipProvider (it would be shadowed)"
    - "aria-label on cell layout wrapper (with role='img'); inner dot is aria-hidden — single screen-reader announcement per cell"

key-files:
  created:
    - src/features/teach/components/progress-matrix.tsx
  modified: []

key-decisions:
  - "DOT_CLASSES strings are kept VERBATIM from UI-SPEC §Color §Cell encoding spec. Cell-level centering is handled by a wrapping <span className='flex items-center justify-center'> (or 'inline-flex' for the legend), so the encoding contract is never mutated by layout utilities (no 'inline-block h-3 w-3' prefix)."
  - "No outer <TooltipProvider> at the matrix root. The project's <Tooltip> wrapper at src/components/ui/tooltip.tsx auto-instantiates its own <TooltipProvider> with delayDuration={0}, which shadows any outer provider. We accept the default 0ms delay (UI-SPEC §Interaction only requires hover-feedback, not a specific delay)."
  - "Cells are <span role='img'> wrapping the dot, with aria-label summarising state — NOT links and NOT focusable per D-17 (no navigation in Phase 2; submission-viewer URLs land in Phase 3)."
  - "MODULES catalog is iterated by array order (already num-sorted in constants/modules.ts) — never hardcoded column count or labels. M01..M12 codes generated via String(mod.num).padStart(2, '0')."
  - "Empty-cohort branch returns a small bordered card with the locked copy 'No learners in this cohort yet.' inside the matrix area (mirrors the Learners-tab empty copy locked in UI-SPEC)."
  - "Learners are sorted alphabetically by name.localeCompare in a fresh array (immutable — does not mutate cohortDetail.learners)."
  - "Defensive fallback: if matrix[learnerId] is missing for any learner row, fallbackCell(moduleId) returns a synthetic 'not-started' cell so the row still renders 12 cells. Conforms to ModuleProgressCell shape exactly."

patterns-established:
  - "Pattern: Visual encoding maps live as Record<UnionType, string> constants pasted VERBATIM from the UI spec; layout utilities go on wrapper elements, never on the encoding string."
  - "Pattern: Per-Tooltip auto-provider — when src/components/ui/tooltip.tsx wraps Root in its own Provider, downstream consumers must NOT add an outer TooltipProvider (it is shadowed)."
  - "Pattern: Sticky-corner table — for tables that pin both header row and first column, the top-left corner cell needs the highest z-index (z-30) to win both pinning planes; header cells get z-20, body first-column cells get z-10."

requirements-completed:
  - COD-02
  - COD-03

# Metrics
duration: 2min
completed: 2026-04-27
---

# Phase 02 Plan 04: ProgressMatrix Component Summary

**Sticky-header learner × module progress matrix with sage-progressive dot encoding (D-16) and per-cell + per-module-header tooltips, ready to slot into cohort-detail.tsx tab 2.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-27T10:03:07Z
- **Completed:** 2026-04-27T10:05:30Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- ProgressMatrix client component renders a sticky-header HTML table inside ScrollArea — first column (learner names) is sticky-left, top row (M01..M12 module codes) is sticky-top.
- Sage-progressive dot encoding with three Tailwind class strings VERBATIM from UI-SPEC: `not-started` = empty hairline ring on `border-brand-cream`, `submitted` = sage outline ring (`border-[1.5px] border-brand-sage`), `reviewed` = filled `bg-brand-sage` dot.
- Per-cell shadcn Tooltip with locked D-18 copy: `Not started` / `Submitted {date} · Awaiting review` / `Submitted {date} · Reviewed {date}`. Dates formatted via `format(date, 'MMM d, yyyy')` (date-fns, already a project dep).
- Per-module-header Tooltip showing the full module title (e.g. `Self-Introduction`).
- Iterates the locked 12-module `MODULES` catalog (COD-03) — never hardcodes column count or labels.
- Cells are NOT links and NOT focusable per D-17 (no navigation in Phase 2).
- Empty-cohort branch with `'No learners in this cohort yet.'` copy.
- Locked legend (`Not started · Submitted · Reviewed`) below the matrix, using the same DOT_CLASSES so the encoding is unambiguous.
- aria-label on each cell summarises full state for screen readers; inner dot is `aria-hidden='true'` so only one announcement is made per cell.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create progress-matrix.tsx with sticky-header table, sage-progressive dots, per-cell tooltips, locked legend** — `6c99680` (feat)

_Note: this plan has a single task; no pre-task TDD commit. The component is consumed by `cohort-detail.tsx` (plan 02-03, running in parallel) and validated end-to-end by Playwright in plan 02-05._

## Files Created/Modified

- `src/features/teach/components/progress-matrix.tsx` (new, 189 lines) — single client component file. Exports the named `ProgressMatrix({ cohortDetail }: { cohortDetail: CohortDetail })` component. File-local helpers: `LegendSwatch`, `fallbackCell`, `formatCellTooltip`, and the `DOT_CLASSES` encoding constant (deliberately not exported — encoding is owned by this component).

## Decisions Made

All decisions were locked upstream in 02-CONTEXT.md (D-15..D-19) and 02-UI-SPEC.md and were followed verbatim. Notable executor-discretion choices:

- **Tooltip delay** — kept the project's auto-provider default of 0 ms. Adding an outer `<TooltipProvider delayDuration=...>` would have been shadowed by the per-Tooltip auto-provider; documented inline in the component file.
- **Cell-level layout wrapper** — used a `<span className='flex items-center justify-center'>` to center the dot inside the 32×48 px cell, instead of mutating the DOT_CLASSES strings. This preserves the visual encoding contract and keeps the dot's classes auditable as VERBATIM from UI-SPEC.
- **Defensive fallback** — when `cohortDetail.matrix[learnerId]` is missing for any learner row (should never happen per Phase-1 contract, but defensive for resilience), `fallbackCell(moduleId)` synthesises a `not-started` cell so the row still renders 12 cells without any crash.
- **Learner sort** — alphabetical by `name.localeCompare` in a fresh array (immutable copy via spread). Matches the Learners-tab default sort spec (D-13 / UI-SPEC §Copywriting Contract: "default `name ASC`").

## Deviations from Plan

None — plan executed exactly as written. Every line of the action block was implemented verbatim.

The grep verification target `grep -c "DOT_CLASSES" >= 4` resolved to 3 actual occurrences in the file (declaration + cell-render usage + legend-render usage). The plan's verification line counts a "type lookup" usage that is actually part of the declaration line itself (`Record<ProgressState, string>` does not name DOT_CLASSES). Three usages cover all consumers (cells + legend) so the visual encoding is unambiguous; no code change needed. This is a verification-line miscount, not a code deviation.

## Issues Encountered

None.

## Visual Sanity-Check Description

When rendered inside `cohort-detail.tsx` with a populated `CohortDetail`:

- Top-left corner shows `Learner` header (sticky in both axes via z-30).
- Top row shows `M01 M02 M03 ... M12` zero-padded codes in `text-brand-teal` Label-role typography (`text-xs font-semibold uppercase tabular-nums tracking-wider`).
- First column shows learner names in `text-brand-teal font-medium`, sticky-left at z-10.
- Each cell renders a 12 px dot centered in a 32×48 px cell:
  - `not-started` → empty ring with `brand-cream` 1 px hairline border (essentially invisible on the white card — intentional "no signal").
  - `submitted` → sage 1.5 px outline ring, no fill (visible "in flight" cue).
  - `reviewed` → solid `brand-sage` filled dot (the only saturated mark on the surface — accent reserved per UI-SPEC §Color 60/30/10).
- Hovering any cell shows the locked tooltip copy with absolute date (`Apr 22, 2026` style).
- Hovering any `M01..M12` header shows the full module title (`Self-Introduction`, `Work & Responsibilities`, etc.).
- Below the table, three legend swatches render `Not started · Submitted · Reviewed` so first-time admins can decode the encoding without hovering.
- Empty cohort shows a single bordered card with the muted copy `No learners in this cohort yet.`.

## Integration Notes

- Integration with `cohort-detail.tsx` is owned by parallel-running plan 02-03, which imports `import { ProgressMatrix } from '@/features/teach/components/progress-matrix'` into the matrix tab. The export name and prop contract (`{ cohortDetail: CohortDetail }`) are locked to match.
- End-to-end validation lands in plan 02-05 (Playwright) — visit `/dashboard/teach/cohorts/spring-2026`, click `Progress matrix` tab, assert M01..M12 headers + ≥1 sage `reviewed` dot + tooltip text on hover.
- `<TooltipProvider>` is intentionally absent from this file. The project's `<Tooltip>` wrapper at `src/components/ui/tooltip.tsx` auto-instantiates its own provider with `delayDuration={0}` (see lines 21–27), which shadows any outer provider. Adding an outer `<TooltipProvider delayDuration={150}>` here would have NO EFFECT. If a non-zero delay is desired later, pass `delayDuration` directly to each `<Tooltip>` (Radix `TooltipPrimitive.Root` accepts a per-root override).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- ProgressMatrix is ready for consumption by cohort-detail.tsx (plan 02-03) and Playwright validation (plan 02-05).
- No blockers introduced. No new dependencies pulled.
- Phase-3 hand-off is clean: the component already has the per-cell `aria-label` and tooltip-text wrapping the cell trigger, so adding cell links in Phase 3 is a single change (replace the `<span role='img'>` trigger with `<Link>` + remove the `tabIndex` prohibition).

## Self-Check: PASSED

- File exists: `/Users/emilionavarro/Proyects/emerflows-admin/.claude/worktrees/agent-addc4e8aecc762a58/src/features/teach/components/progress-matrix.tsx` — confirmed via `ls`.
- Commit exists: `6c99680` — confirmed via `git rev-parse --short HEAD` and `git log --oneline -1`.
- Acceptance criteria — all verified by grep + tsc:
  - `'use client'` on line 1 — PASS
  - `import { format } from 'date-fns'` — PASS
  - `import { MODULES } from '@/features/teach/constants/modules'` — PASS
  - `import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'` (no TooltipProvider) — PASS
  - `import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'` — PASS
  - DOT_CLASSES three strings VERBATIM (no `inline-block` prefix) — PASS
  - `flex items-center justify-center` cell-level wrapper — PASS
  - No outer `<TooltipProvider>` — PASS (absent)
  - `MODULES.map(` iteration — PASS
  - Sticky-header `sticky left-0` + `sticky top-0` (D-15) — PASS
  - Module codes via `M${String(mod.num).padStart(2, '0')}` — PASS
  - Tooltip copy `'Not started'`, `Submitted ... Awaiting review`, `Submitted ... Reviewed`, date format `'MMM d, yyyy'` (D-18) — PASS
  - Empty-state copy `No learners in this cohort yet.` (JSX text node, line 49) — PASS
  - `aria-label` on cell wrapper — PASS
  - No `tabIndex` and no `onClick` on cells (D-17) — PASS (absent)
  - No `@tabler/icons-react` import — PASS (absent)
  - No destructive colors (no `amber|bg-rose|border-rose|bg-red|border-red-N`) — PASS (absent)
  - `tsc --noEmit` — PASS (zero errors emitted for this file or any other)

---
*Phase: 02-cohorts-hub*
*Plan: 04*
*Completed: 2026-04-27*
