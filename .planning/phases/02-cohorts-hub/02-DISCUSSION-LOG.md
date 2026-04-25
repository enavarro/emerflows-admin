# Phase 2: Cohorts Hub - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 02-cohorts-hub
**Areas discussed:** Cohort aggregate query strategy; Counts semantics; Cohort card content fidelity; Cohort detail page IA; Module progress matrix UX

---

## 1. Cohort aggregate query strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Postgres view / RPC | One DB roundtrip; one row per distinct cohort with all aggregates pre-computed server-side. | |
| Two-trip in Node service | (1) distinct cohorts + per-cohort learner counts, (2) bulk submissions counts; aggregated in Node. No schema change. | ✓ |
| PostgREST grouped query with count filters | Single query using `count` filter aggregations via PostgREST. No view needed. | |

**User's choice:** Two-trip in Node service — "as simple as possible".
**Notes:** User confirmed projected scale is ~4 cohorts/year × 100 students = ~400 learners/cohort, still single-digit cohorts active concurrently. Simplicity wins; promote to a view/RPC later only if profiling shows it's slow.

---

## 2. Counts semantics

### 2a. `Cohort.totalSubmissions`

| Option | Description | Selected |
|--------|-------------|----------|
| Count all submission rows | Every attempt counted (learner submitting twice = 2). | |
| Count distinct (learner_id, module_id, type) | Unique assignments completed (learner submitting twice = 1). | ✓ |

**User's choice:** Count assignments completed, not raw attempts. "If the learner has submitted twice, we only get one each assignment completed."

### 2b. `Cohort.needsReview`

| Option | Description | Selected |
|--------|-------------|----------|
| `status='submitted' AND reviewed_at IS NULL` | Filter on status column. | |
| `reviewed_at IS NULL` | Two states only: reviewed or not. | ✓ |

**User's choice:** `reviewed_at IS NULL`. "It's only two status: review it or not. This functionality can be as simple as possible because we might in the future stop having manual reviews with the agent that does the review."

### 2c. `Cohort.reviewed`

| Option | Description | Selected |
|--------|-------------|----------|
| `reviewed_at IS NOT NULL` | Standard. | ✓ |

**User's choice:** `reviewed_at IS NOT NULL`.

### 2d. Matrix cell state derivation

| Option | Description | Selected |
|--------|-------------|----------|
| ANY submission ever | If any attempt ever happened, cell = submitted/reviewed. | |
| Latest submission only | State derived from the most recent submission per (learner, module). | ✓ |

**User's choice:** Latest submission. "Submitted is that the student has submitted derived from the last submission."

---

## 3. Cohort card content fidelity to prototype

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal honest | Name + 4 counts only. | |
| Faithful to prototype with placeholders | Mirror prototype IA; fields we don't track render as static placeholders. | ✓ |
| Hybrid | Real counts foreground, faded placeholders behind. | |

**User's choice:** Faithful to prototype with placeholders. Specific clarifications:
- Teachers card and teacher filter → REMOVED (only one teacher today).
- Student pool view → KEPT, scoped to "all students in this cohort" (lives on cohort detail Learners tab).
- "School completion" → renamed to "Completion", placeholder value `0`.
- "+ New cohort" button → DISABLED placeholder (preserves IA).
- "Export" button → DISABLED placeholder.

**Notes:** User reaffirmed PROJECT.md preference for prototype fidelity. The disabled-button approach keeps the IA intact without shipping unfinished features.

---

## 4. Cohort detail page IA

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrollable page | Stats header → learner table → matrix below. | |
| Tabs (Learners / Progress matrix) | Closer to prototype's tabbed admin hub. | ✓ |
| Side-by-side desktop layout | Table left, matrix right. | |

**User's choice:** Tabs, closer to prototype.

---

## 5. Module progress matrix UX

### 5a. Layout shape

| Option | Description | Selected |
|--------|-------------|----------|
| A. Sticky-header table | Semantic table with sticky first column + header. Status badges/text in cells. | |
| B. Compact dot grid | One row of 12 dots per learner; module shown only on hover. | |
| C. Hybrid (sticky table + dot cells) | Semantic table skeleton, but cells are colored dots. | ✓ |

**User's choice:** C — sticky-header table with dot cells.

### 5b. Cell visual encoding

| Option | not-started | submitted | reviewed | Selected |
|--------|-------------|-----------|----------|----------|
| A. Sage-progressive | empty hairline ring | sage outline ring | filled sage dot | ✓ |
| B. Traffic-light | grey/cream | amber | sage | |
| C. Teal-build | empty | teal outline | filled teal | |

**User's choice:** A — sage-progressive.

### 5c. Cell click behavior in Phase 2

| Option | Description | Selected |
|--------|-------------|----------|
| A. Non-interactive | Cells are static dots. | |
| B. Wired-but-may-404 | Each cell links to Phase-3 submission viewer (404s today). | |
| Modified B | Hover-only — no link, no 404 risk. | ✓ |

**User's choice:** B modified — hover behavior, no link to a 404 route. "5c: B with a hover instead of a link to 404."
**Notes:** No clickable cells in Phase 2. The learner row link in the Learners tab remains the only navigation path to Phase 3 (per ROADMAP.md success criterion 3, "URL only — page wired in Phase 3").

### 5d. Hover tooltip content

| Option | Description | Selected |
|--------|-------------|----------|
| All three states with full info (incl. reviewer name) | not-started, submitted (date), reviewed (date + reviewer name) | |
| All three states, dates only (no reviewer name) | not-started, submitted (date), reviewed (both dates) | ✓ |
| Reviewed states only | Skip tooltip on not-started cells. | |

**User's choice:** All three, dates only. "All three but no need to add the reviewed name, not necessary the name."
**Notes:** Saves a `profiles` join.

### 5e. Cell granularity

| Option | Description | Selected |
|--------|-------------|----------|
| A. One cell per module | 12 columns regardless of type. | ✓ |
| B. One cell per (module, type) | Up to 24 columns. | |
| C. One cell per module with sub-dot per type | Compact + precise. | |

**User's choice:** A — one cell per module. Type-split deferred.

---

## Claude's Discretion

(User did not weigh in on these; sensible defaults applied per CONTEXT.md.)

- Learner table sort order — default `name ASC`.
- nuqs URL sync on table state — deferred until needed.
- Loading states — `<Suspense>` skeletons matching `src/features/demos/` pattern.
- Empty states — text + icon, "No cohorts yet" copy.
- Tooltip primitive — shadcn `<Tooltip>`.
- Pagination — none in v1 (small data).
- Test scope — Playwright happy-path on both routes.

---

## Deferred Ideas

(Noted for future phases / milestones — see CONTEXT.md `<deferred>` section.)

- Educator scoping (v2 — EDU-01..02): teachers row, status chips, lifecycle.
- Cohort wizard: currently a disabled placeholder button.
- CSV export: currently a disabled placeholder button.
- Real Completion % metric: currently a `0%` placeholder.
- Type-split matrix cells: deferred — punted in v1 (D-19).
- Submission viewer link from matrix cells: deferred to Phase 3.
- Sort/filter URL state via nuqs: deferred — plain table for v1.
- Server-side pagination: deferred — revisit if scale grows past ~20 cohorts or ~500 learners/cohort.
