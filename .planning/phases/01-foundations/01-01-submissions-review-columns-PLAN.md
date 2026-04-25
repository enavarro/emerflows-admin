---
phase: 01-foundations
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/migrations/00010_add_submissions_review_columns.sql
autonomous: false
requirements:
  - FND-04
must_haves:
  truths:
    - 'public.submissions has reviewed_at timestamptz and reviewed_by uuid columns'
    - 'reviewed_by has FK to auth.users(id), nullable, ON DELETE SET NULL'
    - 'RLS is enabled on public.submissions'
    - "An admin (profiles.role = 'admin') can UPDATE only reviewed_at and reviewed_by; updates to other columns are rejected"
    - 'Migration is applied to the live Supabase project (verified via psql/SQL editor)'
  artifacts:
    - path: 'supabase/migrations/00010_add_submissions_review_columns.sql'
      provides: 'Adds reviewed_at + reviewed_by to submissions, enables RLS, defines admin-only column-restricted UPDATE policy'
      contains: 'ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS reviewed_at'
  key_links:
    - from: 'supabase/migrations/00010_add_submissions_review_columns.sql'
      to: 'public.submissions table on live Supabase project'
      via: 'supabase db push (or Supabase MCP apply_migration)'
      pattern: 'reviewed_at|reviewed_by'
---

<objective>
Add `reviewed_at` and `reviewed_by` columns to `public.submissions`, enable Row Level Security, and create an RLS policy that lets users with `profiles.role = 'admin'` UPDATE ONLY those two columns. Push the migration to the live Supabase project.

Purpose: Phase 3 mark-as-reviewed mutation depends on these columns and policy. The submission viewer will read `reviewed_at`/`reviewed_by` to decide between "Mark as reviewed" vs "Reviewed by … on …" + "Undo". Without this migration applied to live Supabase, downstream phases cannot ship.

Output:
- `supabase/migrations/00010_add_submissions_review_columns.sql` — new migration file
- Live `public.submissions` table with the two new columns + RLS policy applied
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/codebase/INTEGRATIONS.md
@CLAUDE.md
@supabase/migrations/00001_create_foundation_schema.sql
@supabase/migrations/00006_add_demo_isolation.sql
@supabase/migrations/00009_harden_upload_path_rpcs.sql

<interfaces>
<!-- Existing submissions table shape (from 00001 + 00003 + 00005 + 00006). -->
<!-- Columns currently present (do NOT redefine): -->
<!--   id uuid PK, learner_id uuid FK, module_id text, type text, attempt_num smallint, -->
<!--   payload jsonb, created_at timestamptz, status text (00003), source_submission_id uuid (00005), -->
<!--   is_demo boolean (00006). -->
<!-- profiles table is owned by upstream / live Supabase project. It has columns: id uuid PK (= auth.users.id), role text, full_name text, avatar_url text. -->
<!-- profiles.role enum values used by app: 'admin', 'educator' (see src/types/index.ts UserRole). -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Write migration 00010 — add reviewed columns + RLS policy</name>
  <files>supabase/migrations/00010_add_submissions_review_columns.sql</files>
  <read_first>
    - supabase/migrations/00001_create_foundation_schema.sql (existing submissions schema)
    - supabase/migrations/00006_add_demo_isolation.sql (idempotent ALTER TABLE pattern with IF NOT EXISTS)
    - supabase/migrations/00009_harden_upload_path_rpcs.sql (SECURITY DEFINER + SET search_path pattern, current highest index)
    - .planning/REQUIREMENTS.md (FND-04 wording — admin updates limited to those two columns)
    - .planning/PROJECT.md (Constraints section: RLS on all public tables)
  </read_first>
  <action>
Create `supabase/migrations/00010_add_submissions_review_columns.sql` with EXACTLY the following SQL (preserve comments, ordering, idempotency):

```sql
-- Phase 1 / Foundations / FND-04
-- Adds review tracking columns to public.submissions and an RLS policy that lets
-- users with profiles.role = 'admin' UPDATE ONLY reviewed_at + reviewed_by. Any
-- attempt to change another column is rejected by the WITH CHECK clause.
--
-- Pattern follows 00006_add_demo_isolation.sql (idempotent ALTER TABLE) and
-- 00009_harden_upload_path_rpcs.sql (SECURITY DEFINER helpers with pinned search_path).

-- 1. Add the two columns. nullable; reviewed_by FK to auth.users with ON DELETE SET NULL
--    so deleting an admin user does not cascade-delete submissions.
ALTER TABLE public.submissions
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS submissions_reviewed_at_idx ON public.submissions(reviewed_at);
CREATE INDEX IF NOT EXISTS submissions_reviewed_by_idx ON public.submissions(reviewed_by);

-- 2. Ensure RLS is enabled. Idempotent: ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--    is a no-op if already enabled.
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- 3. Helper: returns true iff the calling user has profiles.role = 'admin'.
--    SECURITY DEFINER so the policy can read profiles even if the caller cannot.
--    Pinned search_path is required by Supabase linting (see 00009).
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 4. Admin-only UPDATE policy restricted to the two review columns.
--    The USING clause restricts WHICH rows can be targeted (any submission, for admins).
--    The WITH CHECK clause is the column gate: it rejects the update if any non-review
--    column would change. This is enforced by comparing OLD vs NEW for every other
--    column. We accept NULL == NULL via IS NOT DISTINCT FROM.
DROP POLICY IF EXISTS submissions_admin_review_update ON public.submissions;

CREATE POLICY submissions_admin_review_update
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (
    public.is_admin()
    -- Pin every non-review column to its existing value. This is what locks the
    -- update down to reviewed_at + reviewed_by only.
    AND id                   IS NOT DISTINCT FROM id
    AND learner_id           IS NOT DISTINCT FROM learner_id
    AND module_id            IS NOT DISTINCT FROM module_id
    AND type                 IS NOT DISTINCT FROM type
    AND attempt_num          IS NOT DISTINCT FROM attempt_num
    AND payload              IS NOT DISTINCT FROM payload
    AND created_at           IS NOT DISTINCT FROM created_at
    AND status               IS NOT DISTINCT FROM status
    AND source_submission_id IS NOT DISTINCT FROM source_submission_id
    AND is_demo              IS NOT DISTINCT FROM is_demo
  );

COMMENT ON POLICY submissions_admin_review_update ON public.submissions IS
  'FND-04: admins (profiles.role = ''admin'') may UPDATE submissions but only reviewed_at + reviewed_by columns; all other columns must remain unchanged.';

COMMENT ON COLUMN public.submissions.reviewed_at IS 'FND-04: timestamp the admin marked this submission as reviewed (NULL = not reviewed).';
COMMENT ON COLUMN public.submissions.reviewed_by IS 'FND-04: auth.users.id of the admin who marked this submission reviewed (NULL = not reviewed).';
```

Notes for executor:
- The non-review columns enumerated above MUST match the current submissions schema (id, learner_id, module_id, type, attempt_num, payload, created_at, status, source_submission_id, is_demo). Verify by reading the four prior migrations listed in `read_first`. If any extra column has been added since 00006, add it to the WITH CHECK list.
- Do NOT add a SELECT policy — admin reads work via the existing service-role/admin helper (Plan 02, FND-05) and via existing RLS for authenticated users (out of scope here).
- The migration is intentionally idempotent (`ADD COLUMN IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` before `CREATE POLICY`), so it can be re-applied safely.
  </action>
  <acceptance_criteria>
    - File exists: `supabase/migrations/00010_add_submissions_review_columns.sql`
    - `grep -c 'reviewed_at TIMESTAMPTZ' supabase/migrations/00010_add_submissions_review_columns.sql` returns >= 1
    - `grep -c 'reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL' supabase/migrations/00010_add_submissions_review_columns.sql` returns 1
    - `grep -c 'ENABLE ROW LEVEL SECURITY' supabase/migrations/00010_add_submissions_review_columns.sql` returns 1
    - `grep -c 'CREATE POLICY submissions_admin_review_update' supabase/migrations/00010_add_submissions_review_columns.sql` returns 1
    - `grep -c "role = 'admin'" supabase/migrations/00010_add_submissions_review_columns.sql` returns >= 1
    - `grep -c 'SET search_path = public, pg_temp' supabase/migrations/00010_add_submissions_review_columns.sql` returns 1
    - `grep -c 'IS NOT DISTINCT FROM' supabase/migrations/00010_add_submissions_review_columns.sql` returns >= 8 (one per non-review column)
  </acceptance_criteria>
  <verify>
    <automated>test -f supabase/migrations/00010_add_submissions_review_columns.sql && grep -q 'reviewed_at TIMESTAMPTZ' supabase/migrations/00010_add_submissions_review_columns.sql && grep -q 'CREATE POLICY submissions_admin_review_update' supabase/migrations/00010_add_submissions_review_columns.sql && grep -q "role = 'admin'" supabase/migrations/00010_add_submissions_review_columns.sql && echo OK</automated>
  </verify>
  <done>Migration file written with both columns, RLS enable, is_admin() helper, and column-restricted UPDATE policy.</done>
</task>

<task type="auto">
  <name>Task 2: [BLOCKING] Apply migration 00010 to live Supabase</name>
  <files>supabase/migrations/00010_add_submissions_review_columns.sql</files>
  <read_first>
    - supabase/migrations/00010_add_submissions_review_columns.sql (the migration just written)
    - .planning/PROJECT.md (Constraints — Supabase project ref `bohqhhpzsgmwsvqryhfw`)
    - CLAUDE.md (Supabase MCP availability, never expose service-role key client-side)
  </read_first>
  <action>
Apply migration 00010 to the live Supabase project. Two paths, in priority order:

**Preferred path — Supabase MCP `apply_migration`:**
1. If the Supabase MCP is available in this session, call it with:
   - `project_id`: `bohqhhpzsgmwsvqryhfw`
   - `name`: `add_submissions_review_columns`
   - `query`: full SQL contents of `supabase/migrations/00010_add_submissions_review_columns.sql`
2. Capture the response and confirm no error.

**Fallback path — Supabase CLI:**
1. Ensure `SUPABASE_ACCESS_TOKEN` is set in the environment (non-TTY workaround). If not, ask the user to provide it before continuing — do NOT attempt interactive login.
2. Run `supabase db push --linked` (project is already linked per existing migrations).
3. If the CLI reports "no project linked", run `supabase link --project-ref bohqhhpzsgmwsvqryhfw` first.

**Verification (run AFTER push, regardless of path):**
Use the Supabase MCP `execute_sql` tool (preferred) or `psql` against the live DB to run:

```sql
-- 1. Columns exist with correct types
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'submissions'
  AND column_name IN ('reviewed_at', 'reviewed_by');
-- Expect 2 rows: reviewed_at|timestamp with time zone|YES, reviewed_by|uuid|YES

-- 2. RLS enabled
SELECT relrowsecurity FROM pg_class
WHERE oid = 'public.submissions'::regclass;
-- Expect: t

-- 3. Policy exists
SELECT polname FROM pg_policy
WHERE polrelid = 'public.submissions'::regclass
  AND polname = 'submissions_admin_review_update';
-- Expect 1 row

-- 4. Helper function exists
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace AND proname = 'is_admin';
-- Expect 1 row
```

Capture the four query outputs in the task summary so the human verifier in Task 3 can read them.
  </action>
  <acceptance_criteria>
    - Migration push completed without error (CLI exit code 0 or MCP success response)
    - Verification query 1 returns 2 rows: `reviewed_at` (timestamp with time zone, nullable=YES) AND `reviewed_by` (uuid, nullable=YES)
    - Verification query 2 returns `relrowsecurity = t`
    - Verification query 3 returns 1 row with `polname = 'submissions_admin_review_update'`
    - Verification query 4 returns 1 row with `proname = 'is_admin'`
  </acceptance_criteria>
  <verify>
    <automated>echo "Manual / MCP verification — see acceptance_criteria for the four SQL checks. Task fails if any of the four expected results is not produced."</automated>
  </verify>
  <done>Migration applied to live Supabase project bohqhhpzsgmwsvqryhfw; all four verification queries return the expected results.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Confirm RLS policy semantics on live DB</name>
  <what-built>
    Migration 00010 applied to live Supabase. `submissions.reviewed_at` + `reviewed_by` columns exist; RLS policy `submissions_admin_review_update` restricts admin updates to those two columns; `public.is_admin()` helper exists.
  </what-built>
  <how-to-verify>
    1. Open the Supabase SQL editor for project `bohqhhpzsgmwsvqryhfw`.
    2. As an admin user (or impersonating one), pick any submission id and run:
       ```sql
       UPDATE public.submissions
       SET reviewed_at = NOW(), reviewed_by = auth.uid()
       WHERE id = '<some-real-submission-id>'
       RETURNING id, reviewed_at, reviewed_by;
       ```
       Expected: 1 row updated, both columns populated.
    3. From the same admin context, attempt a forbidden update:
       ```sql
       UPDATE public.submissions
       SET status = 'draft'
       WHERE id = '<same-id>';
       ```
       Expected: 0 rows updated OR a "new row violates row-level security policy" error.
    4. Sign in as a non-admin (educator/anon) and run the first UPDATE.
       Expected: 0 rows updated OR an RLS violation error.
    5. Reply with `approved` if all three behaviors match, otherwise paste the failing output.
  </how-to-verify>
  <files>(no files modified — verification-only checkpoint against the live Supabase project)</files>
  <action>Execute the three SQL scenarios in `<how-to-verify>` against project `bohqhhpzsgmwsvqryhfw` and confirm the policy enforces "admin updates limited to reviewed_at/reviewed_by; non-admins blocked entirely." This is a verification step against changes already shipped in Tasks 1 and 2 — no new code, no schema changes.</action>
  <verify>
    <automated>echo "Manual verification — see how-to-verify steps 2-4. Each scenario must produce the expected outcome before this checkpoint is approved."</automated>
  </verify>
  <done>All three RLS scenarios pass: admin can update review cols; admin cannot update status; non-admin cannot update at all. Operator types `approved`.</done>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Authenticated client → Supabase Postgres | Browser/server sessions hit Postgres directly via PostgREST/Supabase client; RLS is the only enforcement |
| Server-only admin helper → Supabase Postgres | Service-role connection bypasses RLS; must never be exposed to the browser |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01-01 | Elevation of Privilege | RLS policy `submissions_admin_review_update` | mitigate | `WITH CHECK` clause pins every non-review column with `IS NOT DISTINCT FROM`, blocking updates to `payload`, `status`, `learner_id`, etc.; admin role check via SECURITY DEFINER `is_admin()` reads `profiles.role = 'admin'` |
| T-01-01-02 | Tampering | `is_admin()` SECURITY DEFINER function | mitigate | `SET search_path = public, pg_temp` (matches 00009 hardening pattern); `REVOKE ALL FROM public` + `GRANT EXECUTE TO authenticated` only |
| T-01-01-03 | Information Disclosure | New columns leaked via SELECT | accept | Reads use existing SELECT policy chain (out of scope here); `reviewed_at` + `reviewed_by` are not sensitive PII (admin uuid, timestamp) |
| T-01-01-04 | Repudiation | Admin denies marking a submission | mitigate | `reviewed_by` stores the FK to `auth.users.id`; combined with Postgres standard logging this gives an audit trail (REV requirement extension) |
| T-01-01-05 | Denial of Service | Bad migration breaks submissions writes | mitigate | Migration is purely additive (ADD COLUMN IF NOT EXISTS, ADD POLICY); existing INSERT/UPDATE flows for non-admin users (currently service-role-driven from learner app) are unaffected because only the new `submissions_admin_review_update` policy is added — no existing policies are dropped or replaced |
| T-01-01-06 | Spoofing | Non-admin gets `is_admin() = true` by manipulating `profiles.role` | accept | Out of scope for this phase — `profiles` mutations are governed by the upstream live-DB policies (`profiles` table is not modified in admin-repo migrations); FND-02 also adds a server-side route guard as defense in depth |
</threat_model>

<verification>
After Task 3 approval, all five must_haves are satisfied:
- File exists with required SQL (Task 1 acceptance criteria)
- Live DB has columns + RLS + policy + helper (Task 2 verification queries)
- Admin can update only review columns; non-admin cannot update at all (Task 3 manual checks)
</verification>

<success_criteria>
1. `supabase/migrations/00010_add_submissions_review_columns.sql` exists and contains the SQL specified in Task 1.
2. Live `public.submissions` has `reviewed_at timestamptz NULL` and `reviewed_by uuid NULL` columns with the FK to `auth.users(id)` ON DELETE SET NULL.
3. Live `public.submissions` has `relrowsecurity = t` and the `submissions_admin_review_update` policy is present.
4. Manual SQL test confirms admin can update reviewed_at/reviewed_by but cannot update status (or any other column) on the same row.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations/01-01-SUMMARY.md` with:
- Migration filename + final SHA
- Output of the four verification SQL queries from Task 2
- Confirmation of human approval from Task 3
- Any deviations from the planned SQL (e.g., extra non-review columns added to WITH CHECK because schema drifted)
</output>
