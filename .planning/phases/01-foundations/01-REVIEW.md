---
phase: 01-foundations
type: code-review
status: has-issues-but-cr01-resolved
critical: 0
critical_resolved: 1
high: 1
medium: 4
low: 5
files_reviewed: 15
generated: 2026-04-25
updated: 2026-04-25
depth: standard
files_reviewed_list:
  - src/lib/supabase/admin.ts
  - src/lib/supabase/__tests__/admin.server-only.test.ts
  - src/lib/auth/require-admin.ts
  - src/lib/auth/__tests__/require-admin.test.ts
  - src/features/teach/api/types.ts
  - src/features/teach/api/service.ts
  - src/features/teach/api/queries.ts
  - src/features/teach/constants/modules.ts
  - src/app/dashboard/teach/layout.tsx
  - src/app/dashboard/teach/cohorts/page.tsx
  - src/components/icons.tsx
  - src/config/nav-config.ts
  - supabase/migrations/00010_add_submissions_review_columns.sql
  - scripts/verify-no-service-role-leak.mjs
findings:
  critical: 1
  warning: 5
  info: 5
  total: 11
---

# Code Review — Phase 01 Foundations

## Summary

Phase 01 builds the security and structural scaffolding for Teach Admin: a server-only Supabase admin client, an SSR `requireAdmin()` RBAC gate, the `teach` feature module skeleton, the schema migration adding review-tracking columns, the leak-verification CI script, and a single sidebar nav entry. The TypeScript surface is clean — strict types, named exports, brand-tokens used correctly, icons centralized through `@/components/icons`, and the `import 'server-only'` choke-point is present and tested. The Playwright static-source guards are a thoughtful adaptation given that Vitest is not installed.

However, the migration's column-pinning RLS policy is **functionally broken** and constitutes a critical security gap. PostgreSQL row-level-security policies do not distinguish OLD from NEW row state — every `column IS NOT DISTINCT FROM column` clause in `WITH CHECK` evaluates `NEW.column IS NOT DISTINCT FROM NEW.column`, which is always TRUE. Once an admin passes the `USING (public.is_admin())` gate, they can write to any column on `public.submissions` (including `payload`, `status`, `is_demo`, `learner_id`, etc.), not just the two review columns FND-04 mandates. The plan's static grep checks ("11 IS NOT DISTINCT FROM occurrences") confirmed the syntax shipped, but no live RLS scenario test was run (the SUMMARY explicitly notes the three Task 3 scenarios were auto-approved without execution). This must be fixed before Phase 03's mark-as-reviewed mutation ships, or worse, before a malicious admin account is created. Beyond that, a small set of warnings (incomplete path-traversal hardening, signature/contract mismatches with the documented `MarkReviewedInput`) and code-quality nits round out the findings.

All other security invariants are correctly implemented: the service-role key is owned by exactly one module guarded by `server-only` + a build-output grep CI gate; `requireAdmin()` uses the SSR anon-key client (not service role), validates JWTs via `getUser()` (not `getSession()`), and redirects every non-admin path; the layout + page double-gate is a sound defense-in-depth pattern.

## Files Reviewed

| File | Status | Notes |
|------|--------|-------|
| `src/lib/supabase/admin.ts` | 2 findings | Path-traversal hardening incomplete; `path` not type-narrowed before use in error message |
| `src/lib/supabase/__tests__/admin.server-only.test.ts` | clean | Comprehensive static guards |
| `src/lib/auth/require-admin.ts` | 2 findings | Non-null assertions instead of narrowing; redirect-after-unreachable shape |
| `src/lib/auth/__tests__/require-admin.test.ts` | clean | Static-source guards cover every plan invariant |
| `src/features/teach/api/types.ts` | 1 finding | `attemptNum` literal `1 \| 2` may not match wire format |
| `src/features/teach/api/service.ts` | clean | Stubs throw with TODO markers as planned |
| `src/features/teach/api/queries.ts` | 1 finding | Missing explicit return types on exported functions |
| `src/features/teach/constants/modules.ts` | clean | 12 entries, IDs match schema, types match wire format |
| `src/app/dashboard/teach/layout.tsx` | 1 finding | Missing explicit return type on default export |
| `src/app/dashboard/teach/cohorts/page.tsx` | 1 finding | Renders `<h1>` directly instead of `PageContainer` |
| `src/components/icons.tsx` | clean | `school` icon registered correctly under Misc |
| `src/config/nav-config.ts` | clean | Teach group placement and `access: { role: 'admin' }` correct |
| `supabase/migrations/00010_add_submissions_review_columns.sql` | 1 critical | RLS column-pinning is a no-op (NEW vs OLD not distinguishable) |
| `scripts/verify-no-service-role-leak.mjs` | 1 finding | Walks symlinks unguarded; minor robustness gap |

## Findings

### CRITICAL — RESOLVED

#### CR-01 — RLS column-pinning policy does not actually pin columns [RESOLVED 2026-04-25]

**Resolution:** Migration `00011_fix_submissions_admin_column_grants.sql` applied to live project `bohqhhpzsgmwsvqryhfw` via Supabase MCP. The fix adopts the reviewer's preferred approach (column-level GRANT UPDATE).

**Behavioral verification (run live):**
- Scenario A (admin UPDATE on `reviewed_at`/`reviewed_by`): under `SET LOCAL ROLE authenticated` + admin JWT claim, UPDATE without WHERE matched 68 rows successfully. Column-grant allows review columns. (Note: `UPDATE WHERE id = X` returns 0 rows for the authenticated role due to no SELECT policy — by design; admin app flow uses service-role admin client which bypasses RLS.)
- Scenario B (admin UPDATE on `status`): raises `42501: permission denied for table submissions`. Column-grant blocks at parser level, before RLS evaluation. ✓
- Scenario C (non-admin UPDATE on `reviewed_at`): RLS USING(`is_admin()`=false) → 0 rows updated, no error. ✓
- Structural verification: `information_schema.role_table_grants` shows no table-level UPDATE for `authenticated`/`anon`; `information_schema.column_privileges` shows UPDATE only on `reviewed_at` + `reviewed_by` for `authenticated`. ✓
- `mcp__claude_ai_Supabase__get_advisors security` reported no new warnings introduced by 00011.

The original CR-01 finding is preserved below for audit trail.

#### CR-01 — RLS column-pinning policy does not actually pin columns (original — superseded)

**File:** `supabase/migrations/00010_add_submissions_review_columns.sql:53-67`
**Severity:** Critical
**Impact:** Once an account passes `public.is_admin()`, the policy permits writes to **any** column on `public.submissions`. The intended "admins may UPDATE only `reviewed_at` + `reviewed_by`" guarantee is not enforced by the database. An admin could overwrite `payload`, `status`, `learner_id`, `module_id`, `attempt_num`, `created_at`, `source_submission_id`, or `is_demo` on any submission row — corrupting learner work, the demo-isolation flag, or the audit trail. FND-04's policy comment claims "all other columns must remain unchanged", which is documentation that the runtime behavior contradicts.

**Root cause:** PostgreSQL RLS `WITH CHECK` clauses do not have access to the OLD row. Every unqualified column reference in the clause resolves to the **NEW** row. The check `learner_id IS NOT DISTINCT FROM learner_id` therefore reduces to `NEW.learner_id IS NOT DISTINCT FROM NEW.learner_id`, which is always TRUE for any value (including NULL — that is the entire purpose of `IS NOT DISTINCT FROM`). The eight pinning lines are syntactically valid but semantically vacuous. RLS does not provide an OLD/NEW distinction; only triggers do.

**Why the static grep checks passed but the protection is absent:** the plan's acceptance criterion `IS NOT DISTINCT FROM count >= 8` confirmed the *syntax* shipped. The Task 3 RLS scenario tests (admin updates review cols → succeeds; admin updates `status` → blocked; non-admin updates anything → blocked) were auto-approved without execution under `--auto`. A live run of scenario 2 would have caught this immediately.

**Fix (preferred — column-level GRANTs):** PostgreSQL's column-level privilege system already implements this safely. Replace the `IS NOT DISTINCT FROM` block with:

```sql
-- Lock down what authenticated users can UPDATE on submissions to only the two review columns.
-- (Anon users get no UPDATE either way — this REVOKE is from authenticated.)
REVOKE UPDATE ON public.submissions FROM authenticated;
GRANT UPDATE (reviewed_at, reviewed_by) ON public.submissions TO authenticated;

-- The RLS policy then needs only to gate WHICH rows admins can touch:
DROP POLICY IF EXISTS submissions_admin_review_update ON public.submissions;

CREATE POLICY submissions_admin_review_update
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
```

With column-level privileges in place, an UPDATE statement that touches any non-review column raises `permission denied for column ...` before RLS even runs. The combination of GRANT (column gate) + RLS (row gate) is the canonical Postgres pattern for "admins may update specific columns on any row".

**Fix (alternative — BEFORE UPDATE trigger):** if the team prefers to keep RLS as the only gate, add a trigger that compares OLD vs NEW for every non-review column:

```sql
CREATE OR REPLACE FUNCTION public._submissions_block_non_review_updates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id                   IS DISTINCT FROM OLD.id
  OR NEW.learner_id           IS DISTINCT FROM OLD.learner_id
  OR NEW.module_id            IS DISTINCT FROM OLD.module_id
  OR NEW.type                 IS DISTINCT FROM OLD.type
  OR NEW.attempt_num          IS DISTINCT FROM OLD.attempt_num
  OR NEW.payload              IS DISTINCT FROM OLD.payload
  OR NEW.created_at           IS DISTINCT FROM OLD.created_at
  OR NEW.status               IS DISTINCT FROM OLD.status
  OR NEW.source_submission_id IS DISTINCT FROM OLD.source_submission_id
  OR NEW.is_demo              IS DISTINCT FROM OLD.is_demo
  THEN
    RAISE EXCEPTION 'submissions: only reviewed_at and reviewed_by may be updated' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER submissions_block_non_review_updates
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW EXECUTE FUNCTION public._submissions_block_non_review_updates();
```

Either approach is fine; column-level GRANTs are simpler, faster, and idiomatic. Either way, ship as `00011_fix_submissions_review_column_pinning.sql` (do not amend 00010 — it is already applied to live). Add a regression migration test that runs scenario 2 (admin attempting to update `status` is rejected) before considering FND-04 closed.

---

### HIGH (severity: high — Warning per code-review classification)

#### WR-01 — `MarkReviewedInput` contract drifts from REV-03 wording

**File:** `src/features/teach/api/types.ts:134-141`
**Severity:** High (Warning)
**Issue:** The mutation contract uses `reviewed: boolean` to distinguish review vs undo. REV-03 in `REQUIREMENTS.md` says "an 'Undo review' affordance (clears both columns)" — i.e., the undo path sets `reviewed_at = NULL` and `reviewed_by = NULL`. The boolean flag is fine, but the `MarkReviewedResponse` type returns `Pick<SubmissionSummary, 'id' | 'reviewedAt' | 'reviewedBy'>` where `reviewedAt: string | null` and `reviewedBy: string | null`. That works. The drift is more subtle: there is no documented invariant in the type or in JSDoc that the server enforces `reviewed_by = auth.uid()` (REV-01). A Phase 3 implementer reading only this file could plausibly accept a `reviewedBy` from the client. Document the contract:

**Fix:** Add an inline JSDoc to `MarkReviewedInput`:

```ts
/**
 * Mark-as-reviewed mutation input (REV-01..REV-03).
 *
 * The server (route handler / server action) MUST set:
 *   - reviewed === true  → reviewed_at = now(), reviewed_by = auth.uid()
 *   - reviewed === false → reviewed_at = NULL,  reviewed_by = NULL  (undo, REV-03)
 *
 * `reviewed_by` is NEVER taken from the client — it is always derived from
 * the authenticated session on the server.
 */
export interface MarkReviewedInput {
  submissionId: string;
  reviewed: boolean;
}
```

This locks Phase 03 in to the correct semantics before they implement.

---

### MEDIUM (severity: medium)

#### MD-01 — Path validation in `createSignedRecordingUrl` does not block `..` segments

**File:** `src/lib/supabase/admin.ts:79-81`
**Severity:** Medium
**Issue:** The helper rejects only paths that start with `/`. It does not reject:
- `../../../bucket-x/object` (parent-traversal)
- `cohort/../other-cohort/file.webm` (mid-path traversal)
- Backslashes (`cohort\..\..\file`) on environments that normalize them
- Empty path segments (`//file.webm` slips through after the first-char check)

The plan deviation note claims "Supabase storage path resolution already prevents bucket-escaping" — that is true at the bucket boundary, but the helper's stated job is *defense in depth* against bad caller-supplied paths. The current `payload.audioPath` for live data is server-controlled, so the runtime risk today is low; the defensive intent of the function is just incomplete.

**Fix:**

```ts
if (!path || path.startsWith('/') || path.includes('..') || path.includes('\\') || path.includes('//')) {
  throw new Error(`Invalid recording path: ${path}`);
}
```

Or use a positive allowlist matching the documented path shape:

```ts
const PATH_RE = /^[a-zA-Z0-9][a-zA-Z0-9_./-]*$/;
if (!path || !PATH_RE.test(path) || path.includes('..')) {
  throw new Error(`Invalid recording path: ${path}`);
}
```

#### MD-02 — `cohorts/page.tsx` renders `<h1>` directly instead of using `PageContainer`

**File:** `src/app/dashboard/teach/cohorts/page.tsx:12-19`
**Severity:** Medium
**Issue:** `CLAUDE.md` Critical Conventions: "Page headers — use `PageContainer` props (`pageTitle`, `pageDescription`, `pageHeaderAction`), never import `<Heading>` manually." This page renders a raw `<h1 className='text-2xl font-bold text-brand-teal'>Cohorts</h1>` and a `<p>`. Even as a Phase-1 stub, it sets a precedent the Phase-2 cohorts list will inherit if the structure is left in place. It also leaks the user's email or UUID into the rendered DOM (`Signed in as {user.email ?? user.id}`) which is fine for a debug stub but should not survive into Phase 2.

**Fix:** Wrap the page in `PageContainer` consistent with other dashboard pages and remove the email diagnostic before Phase 2:

```tsx
import { PageContainer } from '@/components/layout/page-container';
import { requireAdmin } from '@/lib/auth/require-admin';

export const metadata = { title: 'Cohorts — Teach Admin' };

export default async function CohortsPage() {
  await requireAdmin();
  return (
    <PageContainer
      pageTitle='Cohorts'
      pageDescription='Cohorts list ships in Phase 2.'
    />
  );
}
```

#### MD-03 — Non-null assertions (`user!`) in `requireAdmin` after redirect

**File:** `src/lib/auth/require-admin.ts:45,57`
**Severity:** Medium
**Issue:** The function uses `user!.id` and `user!` after the catch block because TypeScript cannot prove `user` is non-null past the inner `redirect()` (which throws but is typed `never` via the `next/navigation` declaration). Non-null assertions defeat the `unknown`/strict-narrowing posture that the project's TS rules require ("Avoid `any` in application code … Use `unknown` for external/untrusted input, narrow safely"). The bigger risk is structural: if a future refactor re-orders the catch block such that the `redirect` is conditional, the `!` silently masks the resulting `null` propagation.

**Fix:** Narrow without `!`:

```ts
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();

  const userResult = await getAuthUser(supabase);
  if (!userResult) redirect(SIGN_IN_PATH);
  const { user } = userResult;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    redirect(DENIED_TEACH_PATH);
  }

  return { user, role: 'admin' };
}

async function getAuthUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) return null;
    return { user: data.user };
  } catch (error: unknown) {
    if (isRedirectError(error)) throw error;
    return null;
  }
}
```

This eliminates both `!` assertions and the dead `redirect(SIGN_IN_PATH)` inside the `try` (line 31), which is unreachable today but lint-noisy.

#### MD-04 — `verify-no-service-role-leak.mjs` follows symlinks unconditionally

**File:** `scripts/verify-no-service-role-leak.mjs:10-19`
**Severity:** Medium
**Issue:** `walk()` uses `statSync` (which dereferences symlinks). If `.next/static` ever contains a symlink to a directory outside the build (unusual but possible in monorepos / vercel runtimes), the script will walk it and either time out or produce false positives/negatives. Also, the script's exit-2 on missing `.next/static` is correct, but the script has no opt-in flag to require the env value to be present — when `SUPABASE_SERVICE_ROLE_KEY` is not in env at script-runtime, the value-needle check is skipped silently. In CI, this could mask leaks if the secret is not exposed to the verification step.

**Fix:**

```js
import { lstatSync } from 'node:fs';

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = lstatSync(full);  // do NOT follow symlinks
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      yield* walk(full);
    } else if (entry.endsWith('.js')) {
      yield full;
    }
  }
}

// Optional: require the value-check in CI
const requireValue = process.env.LEAK_CHECK_REQUIRE_VALUE === '1';
if (requireValue && !valueNeedle) {
  console.error('LEAK_CHECK_REQUIRE_VALUE=1 but SUPABASE_SERVICE_ROLE_KEY is unset');
  process.exit(2);
}
```

---

### LOW (severity: low — Info per code-review classification)

#### IN-01 — `attemptNum: 1 | 2` literal type is too narrow for the wire format

**File:** `src/features/teach/api/types.ts:61`
**Issue:** The DB schema (`00001_create_foundation_schema.sql:20`) declares `attempt_num SMALLINT NOT NULL CHECK (attempt_num IN (1, 2))`. The literal type `1 | 2` is correct *today*, but if the constraint ever loosens (and the AI-generation pipeline could plausibly want a 3rd retry), every consumer breaks at the type boundary. Since this is a wire-format type derived from JSONB-adjacent data, prefer a documented `number` and validate via Zod at the boundary, matching project convention (CLAUDE.md: "Use `unknown` for external/untrusted input, narrow safely" — and the schema IS the boundary).

**Fix:** `attemptNum: number;` with a comment `// 1 or 2 today (DB CHECK constraint); validate via Zod at the boundary`.

#### IN-02 — Missing explicit return types on exported `queries.ts` factories

**File:** `src/features/teach/api/queries.ts:21,27,33,39`
**Issue:** Project rule (CLAUDE.md TypeScript section): "Explicit return types for exported functions." `cohortsQueryOptions`, `cohortQueryOptions`, `learnerQueryOptions`, `submissionQueryOptions` all rely on inference. Inference works here because of `queryOptions()`'s generic, but the convention is explicit.

**Fix:** Either annotate `: ReturnType<typeof queryOptions<...>>` or accept this as a deliberate exception for `queryOptions()` consumers and document the exception. Not blocking.

#### IN-03 — `TeachLayout` and `CohortsPage` lack explicit return type annotations

**File:** `src/app/dashboard/teach/layout.tsx:3`, `src/app/dashboard/teach/cohorts/page.tsx:7`
**Issue:** Same as IN-02. App Router pages/layouts typically rely on inference because the React types are awkward to spell, but the project convention is explicit.

**Fix:** `Promise<React.ReactElement>` (or accept the framework convention).

#### IN-04 — `cohorts/page.tsx` exposes user email/UUID in stub markup

**File:** `src/app/dashboard/teach/cohorts/page.tsx:17`
**Issue:** `Signed in as {user.email ?? user.id}` is a debug aid, not a production behavior. It does not leak data to other users (the page is admin-only), but it bakes a behavior into the stub that the Phase-2 implementer must remember to remove. Leave it for the stub period only.

**Fix:** Add a `// TODO(Phase2): remove debug greeting before COH-01 ships` comment, or remove now.

#### IN-05 — `requireAdmin` has unreachable `redirect(SIGN_IN_PATH)` on line 31

**File:** `src/lib/auth/require-admin.ts:31`
**Issue:** Line 31's `redirect(SIGN_IN_PATH)` inside the `try` block throws `NEXT_REDIRECT`. That throw is then caught on line 34, where `isRedirectError(error)` re-throws it. The flow is correct but the structure is hard to follow (a redirect that throws, gets caught, and re-throws). The MD-03 refactor removes this awkwardness.

**Fix:** See MD-03 (extract `getAuthUser` helper).

---

## Notes

### Security wins (good practice — recorded for posterity)

1. **`server-only` choke-point + build-output grep + Playwright spec.** Three independent layers protect the service-role key. The CI-gate script is a small but powerful invariant.
2. **`auth.getUser()` over `auth.getSession()`.** Correct — `getSession()` reads the cookie only and is forgeable; `getUser()` server-validates the JWT every call. The grep test enforces this invariant statically.
3. **Anon-key SSR client in `requireAdmin`.** The gate validates the caller's own session and lets RLS still apply to the profile read. Using the admin client here would defeat the purpose. The test asserts `createAdminClient` is never imported.
4. **Layout + page double-gate.** Defense-in-depth survives layout restructuring.
5. **`isRedirectError()` helper.** A naive `try { ... } catch { redirect(...) }` would swallow Next's `NEXT_REDIRECT` sentinel. Catching this correctly is subtle and well-handled here.
6. **Singleton service-role client.** `autoRefreshToken: false` + `persistSession: false` is the correct config for a non-interactive backend client.

### Items NOT in scope for this review

- Pre-existing icon entries beyond the new `school` registration.
- Pre-existing nav groups beyond the new `Teach` group.
- Behavioral redirect coverage (deferred to Phase 4 e2e per plan 01-04 SUMMARY).
- The `package-lock.json` autogenerated diff.
- `next.config.ts`, oxlint/oxfmt config, or any unchanged file.

---

_Reviewed: 2026-04-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
