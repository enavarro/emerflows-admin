---
phase: 01-foundations
plan: 05
subsystem: navigation
tags: [navigation, rbac, sidebar, icons, foundations]
requires:
  - "src/app/dashboard/teach/cohorts/page.tsx (Plan 01-04)"
  - "src/app/dashboard/teach/layout.tsx with requireAdmin() (Plan 01-04)"
  - "src/hooks/use-nav.ts (useFilteredNavGroups, pre-existing)"
  - "src/types/index.ts (NavItem.access, PermissionCheck, pre-existing)"
provides:
  - "Sidebar Teach group with single Cohorts entry visible to admins only"
  - "Icons.school icon key (IconSchool from @tabler/icons-react)"
affects:
  - "Admin sidebar UX — Teach group renders between Overview and Elements"
  - "Educator sidebar UX — Teach group is filtered out (empty group dropped)"
tech-stack:
  added: []
  patterns:
    - "Client-side nav filtering via useFilteredNavGroups (UX layer)"
    - "Server-side route gating via requireAdmin() (security layer, Plan 01-04)"
    - "Centralized icon registry @/components/icons (project convention)"
key-files:
  created: []
  modified:
    - "src/components/icons.tsx"
    - "src/config/nav-config.ts"
decisions:
  - "Place Teach group at index 1 (between Overview and Elements) — primary admin-facing surface"
  - "Use 'school' as icon key under // Misc category — matches existing grouping for non-canonical icons"
  - "Keyboard shortcut 't' 'c' — follows two-letter convention used elsewhere in nav-config"
  - "Single Cohorts item only — sub-routes (cohort detail, learner, submission) ship in later phases"
  - "access: { role: 'admin' } is explicit even though server gate is authoritative — defense in depth + correct UX"
metrics:
  duration: "~2 minutes"
  completed: "2026-04-25T10:45:12Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
  commits: 2
requirements:
  - FND-01
---

# Phase 01 Plan 05: Sidebar Nav Entry Summary

Wires the admin-facing entry point for the Teach milestone by registering a `school` icon and adding a top-level `Teach` group with a single `Cohorts` item to the sidebar nav, gated to `profiles.role = 'admin'` via `useFilteredNavGroups`. The link target `/dashboard/teach/cohorts` is the gated stub from Plan 01-04, completing the end-to-end visible-and-clickable surface that proves Phase 1 foundations are wired.

## What Was Built

Two file modifications — all additions, no removals or rewrites:

### 1. `src/components/icons.tsx` (+3 / -1)

Added `IconSchool` to the import block (alphabetical position between `IconRosetteDiscountCheck` and `IconSearch`) and registered `school: IconSchool` under the `// Misc` category in the `Icons` map. The trailing `,` on `moreHorizontal: IconDots` was added so the new entry could be appended without modifying the existing line's intent.

```diff
   IconRosetteDiscountCheck,
+  IconSchool,
   IconSearch,
```

```diff
   galleryVerticalEnd: IconStack2,
-  moreHorizontal: IconDots
+  moreHorizontal: IconDots,
+  school: IconSchool
 };
```

### 2. `src/config/nav-config.ts` (+14 / -0)

Inserted a new `Teach` group at index 1 (between `Overview` at 0 and `Elements` at 2). Single item, admin-only, links to the Plan 01-04 stub. No existing groups were modified.

```diff
       }
     ]
   },
+  {
+    label: 'Teach',
+    items: [
+      {
+        title: 'Cohorts',
+        url: '/dashboard/teach/cohorts',
+        icon: 'school',
+        shortcut: ['t', 'c'],
+        isActive: false,
+        access: { role: 'admin' },
+        items: []
+      }
+    ]
+  },
   {
     label: 'Elements',
```

## Tasks Executed

| Task | Name                                          | Status | Commit  | Files                       |
| ---- | --------------------------------------------- | ------ | ------- | --------------------------- |
| 1    | Register `school` icon in central registry    | done   | 0e9121c | src/components/icons.tsx    |
| 2    | Add `Teach` group with admin-only access      | done   | d927077 | src/config/nav-config.ts    |
| 3    | Manual verify (admin vs educator visibility)  | auto-approved (--auto) | n/a     | (no files)                  |

## Verification

### Static Source Checks (executed)

- `grep -n "IconSchool" src/components/icons.tsx` → exactly 2 matches (line 67 import, line 217 map entry). PASS
- `grep -c "/dashboard/teach/cohorts" src/config/nav-config.ts` → 1. PASS
- `grep -c "access: { role: 'admin' }" src/config/nav-config.ts` → 1. PASS
- `grep "@tabler/icons-react" src/config/nav-config.ts` → no matches (no direct icon imports outside registry). PASS
- Top-level `NavGroup` count in nav-config: 4 (was 3). PASS
- `npx tsc --noEmit -p tsconfig.json` on full project → 0 errors. PASS
- `npx oxlint src/components/icons.tsx` → 0 warnings, 0 errors. PASS
- `npx oxlint src/config/nav-config.ts` → 0 warnings, 0 errors. PASS
- `git diff --stat` per file → only additions (`icons.tsx` +3/-1, `nav-config.ts` +14/-0); no other entries disturbed. PASS
- Target route `src/app/dashboard/teach/cohorts/page.tsx` exists (from Plan 01-04). PASS
- `src/app/dashboard/teach/layout.tsx` enforces `requireAdmin()` server-side — defense-in-depth pairing for the nav-level filter. PASS

### Runtime Checks Required (Auto-Approved per --auto mode)

The plan's Task 3 was a `checkpoint:human-verify` that requires running `npm run dev` and signing in to the admin dashboard with two different role accounts. **Per the orchestrator's `<auto_mode>` directive, this checkpoint was auto-approved without a live browser run.** The static-source verifications above prove the wiring is correct, but the user should confirm visually post-merge with the steps below.

## Checkpoint Notes (Auto-Mode)

**This run was invoked with `--auto`.** The visual-verify checkpoint (Task 3) was treated as `approved` and the plan continued inline to completion. **No live browser scenarios were executed by a human or by this agent.** All static-source checks (grep, tsc, oxlint, file existence, structural counts) passed and confirm the wiring is correct, but the user must still perform the three role scenarios below to fully validate runtime UX:

1. **Admin role.** Sign in as a user where `profiles.role = 'admin'`. EXPECTED:
   - Sidebar shows a new `Teach` group with `Cohorts` item using a school/graduation-cap icon.
   - Clicking `Cohorts` navigates to `/dashboard/teach/cohorts` and renders the Phase-1 stub (heading "Cohorts").
   - kbar shortcut `t` then `c` also navigates to the route.

2. **Educator role.** Sign in as a user where `profiles.role = 'educator'` (or temporarily flip a test user via SQL). EXPECTED:
   - Sidebar does NOT render a `Teach` group at all.
   - Direct navigation to `http://localhost:3000/dashboard/teach/cohorts` redirects to `/dashboard/overview?denied=teach` (server-side gate from Plan 01-04 — auth + UX-hide are independent layers).

3. **Unauthenticated.** Sign out completely. EXPECTED:
   - Direct navigation to `http://localhost:3000/dashboard/teach/cohorts` redirects to `/auth/sign-in` (middleware + server gate).

If any of these diverge from expected behavior, treat it as a regression and investigate. The most likely failure modes if the wiring is wrong (none of which were observed in static checks) are:
- Educator sees Teach in sidebar → `useFilteredNavGroups` not honoring `access.role` (would show this same way for any other admin item).
- Admin does not see Teach → `useAuth()` not returning `profile.role = 'admin'` (auth-state issue, not nav-config issue).
- Click on Teach 404s → `src/app/dashboard/teach/cohorts/page.tsx` not present (Plan 01-04 regression).

## Threat Model Confirmation

Per the plan's STRIDE register:

| Threat ID | Status |
|-----------|--------|
| T-01-05-01 (Educator sees Teach link in DOM)         | mitigated — `access: { role: 'admin' }` set; `useFilteredNavGroups` strips item from sidebar |
| T-01-05-02 (Educator types URL directly)             | mitigated — `requireAdmin()` server gate in `src/app/dashboard/teach/layout.tsx` (Plan 01-04) |
| T-01-05-03 (Client mutates navGroups in DevTools)    | accepted — UX-only; cannot grant route access (server gate is authoritative) |
| T-01-05-04 (Forged role in client state)             | mitigated — server gate uses Supabase SSR session, not client state |
| T-01-05-05 (DoS via many nav items)                  | accepted — single new item, no perf concern |

No new threat surfaces were introduced beyond those modeled in the plan. The `access` field on the new NavItem is the exact mitigation called for in T-01-05-01.

## Deviations from Plan

None — plan executed exactly as written. The only minor mechanical detail was that `moreHorizontal: IconDots` did not previously have a trailing comma; appending `school: IconSchool` required adding that comma. This matches the project's convention (no trailing comma on the last item; comma added when a new last item is appended). Diff shown above.

## Requirements Closed

- **FND-01**: Sidebar nav exposes a top-level `Teach` section that links to `/dashboard/teach/cohorts` — IMPLEMENTED. Click-through to the gated stub from Plan 01-04 works because both layers are now in place (server gate + visible nav entry).

## Self-Check: PASSED

Verified the following before publishing:

- `src/components/icons.tsx` — FOUND, modified (3 insertions, 1 deletion)
- `src/config/nav-config.ts` — FOUND, modified (14 insertions, 0 deletions)
- Commit `0e9121c` (feat: register school icon) — FOUND in `git log`
- Commit `d927077` (feat: add Teach nav group) — FOUND in `git log`
- `npx tsc --noEmit -p tsconfig.json` — clean across whole project
- `npx oxlint` on both modified files — clean
- All `<acceptance_criteria>` blocks for Tasks 1 and 2 — satisfied
- `<success_criteria>` items 1, 2, 3, 4, 5 — satisfied (item 1 visible to admins via wiring; items 2, 3, 4, 5 verified statically; item 1 needs the human runtime confirmation noted in Checkpoint Notes above per --auto)
