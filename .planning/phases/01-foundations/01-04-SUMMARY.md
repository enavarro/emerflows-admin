---
phase: 01-foundations
plan: 04
subsystem: auth
tags: [rbac, supabase, server-component, ssr, auth, security, next.js, app-router]

requires:
  - phase: 01-foundations
    plan: 02
    provides: src/lib/supabase/server.ts (SSR anon-key client) — already in repo, not consumed from plan 02
  - phase: 00-bootstrap
    provides: profiles table with role column ('admin' | 'educator')
provides:
  - server-only requireAdmin() RBAC gate at src/lib/auth/require-admin.ts
  - AdminSession interface (named return type for the helper)
  - /dashboard/teach/* route segment gated by requireAdmin() in the layout
  - stub /dashboard/teach/cohorts page so the gate has a real route to protect
  - Playwright static-source guard tests covering server-only invariants
affects: [02-cohorts-hub, 03-learner-deep-dive, submission-viewer, review-action]

tech-stack:
  added: []
  patterns:
    - "Server-only RBAC gate: import 'server-only' + redirect()-only failure paths"
    - "Defense-in-depth: layout gate + page-level requireAdmin() in case layout is restructured"
    - "auth.getUser() over auth.getSession(): always validate JWT against Supabase"
    - "SSR anon-key client for self-session checks (NOT service-role) so RLS still applies"
    - "NEXT_REDIRECT sentinel preservation in catch blocks via isRedirectError()"
    - "Static-source guard tests via Playwright (project's only configured runner)"

key-files:
  created:
    - src/lib/auth/require-admin.ts
    - src/lib/auth/__tests__/require-admin.test.ts
    - src/app/dashboard/teach/layout.tsx
    - src/app/dashboard/teach/cohorts/page.tsx
  modified: []

key-decisions:
  - "Used SSR anon-key client (createClient from @/lib/supabase/server) NOT service-role admin client — checking the caller's own session, not bypassing RLS"
  - "auth.getUser() over auth.getSession() — server-validates JWT against Supabase; getSession only reads cookies and is forgeable"
  - "Defense-in-depth: page-level requireAdmin() call mirrors the layout gate so the protection survives layout restructuring"
  - "Used Playwright (project's only test runner) for static-source guard tests — vitest is not installed; mirrors precedent at src/lib/supabase/__tests__/admin.server-only.test.ts"
  - "isRedirectError() helper inspects the digest property to preserve NEXT_REDIRECT sentinels in catch blocks; prevents accidentally swallowing redirects as 'errors'"
  - "AdminSession type uses Extract<UserRole, 'admin'> so the success branch is statically narrowed to literal 'admin'"

patterns-established:
  - "Server-only RBAC choke-point at src/lib/auth/require-admin.ts — every Teach Admin RSC/route handler imports this single helper"
  - "Layout-as-gate pattern: src/app/dashboard/teach/layout.tsx is the canonical place for segment-wide auth checks"
  - "Static-source guard tests for server-only modules — assert structural invariants (import order, getUser usage, no service-role import) without standing up a real Supabase backend"

requirements-completed:
  - FND-02

duration: 2m 53s
completed: 2026-04-25
---

# Phase 01 Plan 04: Teach RBAC Gate Summary

**Server-side RBAC gate at `src/lib/auth/require-admin.ts` validates the caller's own Supabase session via SSR anon-key client + `auth.getUser()`, then enforces `profiles.role = 'admin'`; consumed by a new `/dashboard/teach/*` segment layout (and a stub `/cohorts` page) so unauthenticated users redirect to `/auth/sign-in` and non-admins redirect to `/dashboard/overview?denied=teach`.**

## Performance

- **Duration:** 2m 53s
- **Started:** 2026-04-25T10:21:53Z
- **Completed:** 2026-04-25T10:24:46Z
- **Tasks:** 2 plan tasks (TDD: RED test + GREEN implementation per task)
- **Files created:** 4 (1 helper, 1 test, 1 layout, 1 page)
- **Files modified:** 0

## Accomplishments

- Established the canonical server-only RBAC gate that every `/dashboard/teach/*` route depends on (FND-02).
- The gate uses the SSR anon-key Supabase client — RLS still applies; the gate validates the caller's own JWT via `auth.getUser()` (not the cookie-only `getSession()`).
- Three explicit redirect paths cover every non-admin case:
  - unauthenticated → `/auth/sign-in`
  - profile lookup failed (DB error or row missing) → `/dashboard/overview?denied=teach`
  - profile.role !== 'admin' → `/dashboard/overview?denied=teach`
- Defense-in-depth: layout gate + page-level guard so removing the layout cannot accidentally expose the route.
- `import 'server-only'` at the top of the helper guarantees a build-time error if any client component ever tries to import it.
- 13 Playwright static-source guard tests verify every structural invariant (server-only marker, anon-key client usage, getUser/profiles.role check, redirect paths, NEXT_REDIRECT preservation, no client component imports the helper).

## Task Commits

Each task was committed atomically (TDD RED + GREEN per task; Task 1's RED test file is shared with Task 2):

1. **Task 1 RED — failing static-source guards** — `a44cf95` (test)
2. **Task 1 GREEN — requireAdmin() helper** — `18c4f6e` (feat)
3. **Task 2 GREEN — teach segment layout + cohorts stub page** — `6b0460c` (feat)

The Task 2 RED is implicit: the same test file from `a44cf95` already asserts both teach files exist — those two tests fail until `6b0460c` lands.

## Files Created

- `src/lib/auth/require-admin.ts` — Server-only RBAC gate (FND-02). Exports `requireAdmin()` and `AdminSession`.
- `src/lib/auth/__tests__/require-admin.test.ts` — 13 Playwright static-source guard tests asserting structural invariants of the helper, the layout, and the cohorts page.
- `src/app/dashboard/teach/layout.tsx` — Server Component segment layout that calls `await requireAdmin()` before rendering nested routes.
- `src/app/dashboard/teach/cohorts/page.tsx` — Stub Cohorts page (real UI ships in Phase 2). Calls `requireAdmin()` independently as defense-in-depth.

## Files Modified

None — this plan only adds new files.

## Tree of Affected Directories

```
src/lib/auth/
├── __tests__/
│   └── require-admin.test.ts
└── require-admin.ts

src/app/dashboard/teach/
├── cohorts/
│   └── page.tsx
└── layout.tsx
```

## Decisions Made

- **SSR anon-key client, not service-role.** The whole point of FND-02 is that the user's own session is validated. Using `createAdminClient` (service role) would bypass RLS and defeat the purpose. The helper imports from `@/lib/supabase/server`, not `@/lib/supabase/admin`.
- **`auth.getUser()` over `auth.getSession()`.** `getUser()` validates the JWT against Supabase on every call; `getSession()` only reads the cookie and is forgeable. Documented in the helper's JSDoc and asserted by the test suite.
- **Defense-in-depth at the page level.** The cohorts page calls `requireAdmin()` independently of the layout. Removing the layout (or restructuring `app/dashboard/teach/`) cannot accidentally expose the route.
- **Playwright instead of vitest.** Vitest is not installed in this project. The only configured test runner is `@playwright/test` (already used by `src/lib/supabase/__tests__/admin.server-only.test.ts`). Static-source inspection tests run safely in CI without secrets and cover the structural invariants the plan requires. Behavioral redirect coverage moves to manual smoke (Phase 1) and Playwright browser tests (Phase 4).
- **`isRedirectError()` helper.** Next.js's `redirect()` works by throwing a `NEXT_REDIRECT` sentinel. A naive `try { ... } catch { redirect(SIGN_IN_PATH) }` would swallow that sentinel and convert a successful auth into a redirect-to-sign-in. The helper inspects `error.digest` and re-throws when the digest starts with `'NEXT_REDIRECT'`.
- **`Extract<UserRole, 'admin'>` for the return type.** `AdminSession.role` is statically narrowed to the string literal `'admin'` so callers can `switch` on it without ever seeing `'educator'`.

## Confirmation of Plan Invariants

- `getSession` does **not** appear in any of the three new files (verified by grep).
- `'use client'` does **not** appear in any of the three new files (verified by grep).
- `createAdminClient` does **not** appear in any of the three new files (verified by grep). The helper imports `createClient` from `@/lib/supabase/server`, NOT from `@/lib/supabase/admin`.
- `import 'server-only';` is the first non-blank line of `require-admin.ts` (verified by grep + Playwright test).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used Playwright for tests instead of vitest**
- **Found during:** Task 1 RED setup
- **Issue:** The plan specifies "vitest-style tests with redirect mocks". Vitest is not installed in this project (`package.json` has `@playwright/test` only). Following the plan literally would require introducing a new test framework just for two test files.
- **Fix:** Wrote `@playwright/test` static-source guard tests mirroring the precedent at `src/lib/supabase/__tests__/admin.server-only.test.ts`. Behavioral redirect tests (which require mocking `redirect` and `createClient`) are deferred to Phase 4's Playwright browser tests, where the actual redirect flow can be exercised end-to-end against a running app — a higher-fidelity check than mock-based unit tests.
- **Files affected:** src/lib/auth/__tests__/require-admin.test.ts
- **Verification:** All 13 tests pass via `npx playwright test src/lib/auth/__tests__/require-admin.test.ts`.
- **Committed in:** a44cf95 (RED), 18c4f6e (Task 1 GREEN), 6b0460c (Task 2 GREEN — final test passes)

---

**Total deviations:** 1 auto-fixed (blocking — wrong test runner specified in plan).
**Impact on plan:** Test coverage strategy adapted to project's actual infrastructure. Static-source guards cover every structural invariant the plan listed (server-only marker, anon-key client, getUser usage, redirect paths, no `'use client'`). Behavioral coverage of the three redirect paths is intentionally deferred to Phase 4 Playwright e2e per the plan's own `<verification>` section ("manual smoke covers the 3 redirect paths").

## Issues Encountered

- **Worktree was not aligned to the expected base commit.** `git merge-base HEAD 87156b5...` returned `b08f959`. Hard-reset to `87156b5` per the worktree-base-check protocol. This is a fresh worktree with no user changes; reset was safe.
- **Pre-commit hook blocks `--no-verify`.** Local user-level hook `block-no-verify@1.1.2` rejects the `--no-verify` flag despite the parallel-execution protocol asking for it. Committed without the flag; husky pre-commit hook is non-executable in the worktree so it was ignored anyway. No semantic effect.

## Verification Output

```
$ npx tsc --noEmit -p tsconfig.json
(exit 0 — zero errors)

$ npx oxlint src/lib/auth src/app/dashboard/teach
Found 0 warnings and 0 errors.
Finished in 103ms on 4 files using 10 threads.

$ npx playwright test src/lib/auth/__tests__/require-admin.test.ts
Running 13 tests using 1 worker
  ✓ first import is the server-only marker (1ms)
  ✓ exposes the documented public API (0ms)
  ✓ uses the SSR (anon-key) Supabase client, not the service-role admin client (1ms)
  ✓ validates the JWT via getUser(), never getSession() (0ms)
  ✓ queries profiles.role for the authenticated user (0ms)
  ✓ redirects unauthenticated callers to /auth/sign-in (0ms)
  ✓ redirects non-admins to /dashboard/overview?denied=teach (0ms)
  ✓ only returns AdminSession on the explicit admin branch (0ms)
  ✓ preserves NEXT_REDIRECT sentinel in catch blocks (0ms)
  ✓ imports redirect from next/navigation (0ms)
  ✓ teach layout exists, is a Server Component, and calls requireAdmin (0ms)
  ✓ teach cohorts stub page exists, is a Server Component, and calls requireAdmin (1ms)
  ✓ no client component imports require-admin.ts (8ms)
  13 passed (387ms)
```

## TDD Gate Compliance

- **RED gate:** `a44cf95` — `test(01-04): add failing static-source guards for requireAdmin RBAC gate`. Confirmed failing before implementation (require-admin.ts did not exist).
- **GREEN gate (Task 1):** `18c4f6e` — `feat(01-04): add server-only requireAdmin() RBAC gate`. 11/13 tests passed (the 2 remaining tests verify Task 2 artifacts).
- **GREEN gate (Task 2):** `6b0460c` — `feat(01-04): gate /dashboard/teach segment with requireAdmin`. 13/13 tests pass.
- **REFACTOR gate:** Not needed — implementation matched the plan's verbatim spec; no cleanup pass produced changes.

## Threat Surface Scan

No new threat surfaces beyond those documented in the plan's `<threat_model>`. Mitigations applied:

| Threat ID    | Disposition | Implementation                                                                                                                                       |
|--------------|-------------|------------------------------------------------------------------------------------------------------------------------------------------------------|
| T-01-04-01   | mitigate    | `auth.getUser()` server-validates the JWT; grep test asserts `getSession` is never used                                                              |
| T-01-04-02   | mitigate    | Function only returns `AdminSession` on `profile.role === 'admin'`; every other branch calls `redirect(DENIED_TEACH_PATH)`. No "default allow" path. |
| T-01-04-03   | mitigate    | `import 'server-only'` line 1 of require-admin.ts; layout/page are Server Components (asserted by grep test)                                         |
| T-01-04-04   | mitigate    | `profileError` triggers `redirect(DENIED_TEACH_PATH)` without including the error in the redirect URL or response                                    |
| T-01-04-05   | accept      | RLS on `profiles` is upstream's responsibility — out of scope per plan                                                                               |
| T-01-04-06   | accept      | One getUser() + one profiles SELECT per request — acceptable for low-QPS admin tool                                                                  |
| T-01-04-07   | accept      | Audit logging deferred per plan                                                                                                                      |

## Next Phase Readiness

- Plan 02-01 (cohorts list page) can land its real implementation under `/dashboard/teach/cohorts` knowing the segment is RBAC-gated. The stub page becomes the real page in Phase 2.
- Plan 03-01+ (learner deep-dive, submission viewer) can scaffold under `/dashboard/teach/cohorts/[cohort]/...` and inherit the gate from the segment layout — no per-route auth boilerplate needed.
- Plan 03 review action (REV-01) can call `requireAdmin()` from its server action / route handler to enforce admin-only mutations server-side, on top of the layout gate.
- The `?denied=teach` query parameter is a stable contract — Phase 2's `/dashboard/overview` page can read it and render a clear "you don't have access to Teach Admin" toast/banner if desired (deferred; not blocking).

## Self-Check

- [x] `src/lib/auth/require-admin.ts` exists — `FOUND`
- [x] `src/lib/auth/__tests__/require-admin.test.ts` exists — `FOUND`
- [x] `src/app/dashboard/teach/layout.tsx` exists — `FOUND`
- [x] `src/app/dashboard/teach/cohorts/page.tsx` exists — `FOUND`
- [x] Commit `a44cf95` exists — `FOUND` (test: failing static-source guards)
- [x] Commit `18c4f6e` exists — `FOUND` (feat: requireAdmin helper)
- [x] Commit `6b0460c` exists — `FOUND` (feat: teach segment layout + cohorts stub)
- [x] tsc passes — exit 0
- [x] oxlint passes — 0 warnings, 0 errors
- [x] All 13 Playwright static-source tests pass

## Self-Check: PASSED

---
*Phase: 01-foundations*
*Plan: 04*
*Completed: 2026-04-25*
