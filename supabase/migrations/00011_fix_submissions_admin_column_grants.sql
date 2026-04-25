-- Phase 1 / Foundations / FND-04 (corrective)
-- Replaces the broken column-pinning policy from 00010 with the canonical Postgres
-- mechanism: column-level GRANT UPDATE.
--
-- Why this migration exists:
--   00010 used `WITH CHECK (... AND col IS NOT DISTINCT FROM col ...)` to try to pin
--   every non-review column to its old value. PostgreSQL RLS WITH CHECK only sees the
--   NEW row — there is no OLD reference in scope. Every `NEW.col IS NOT DISTINCT FROM
--   NEW.col` reduces to TRUE, so the column-pinning was a no-op. Any admin who passed
--   the is_admin() gate could write every column on submissions, violating FND-04.
--
-- How this fix works:
--   1. REVOKE UPDATE on the table from authenticated/anon. Without table-level UPDATE,
--      no UPDATE statement reaches the planner — it is rejected with insufficient_privilege.
--   2. GRANT UPDATE only on the two review columns to authenticated. Statements that
--      touch any other column raise insufficient_privilege at parse/execute time —
--      BEFORE RLS even runs.
--   3. Replace the policy with simple is_admin() gates. The column restriction is
--      enforced by the GRANT, not by the policy expression.
--
-- service_role and postgres still have full UPDATE (they don't go through `authenticated`)
-- so backend admin operations and RPC SECURITY DEFINER functions are unaffected.

-- 1. Drop the broken policy first.
DROP POLICY IF EXISTS submissions_admin_review_update ON public.submissions;

-- 2. Revoke table-wide UPDATE from the user-facing PostgREST roles.
REVOKE UPDATE ON public.submissions FROM authenticated;
REVOKE UPDATE ON public.submissions FROM anon;

-- 3. Re-grant UPDATE only on the two review columns to authenticated.
--    (anon never needs to write reviewed_at/reviewed_by — only signed-in admins do.)
GRANT UPDATE (reviewed_at, reviewed_by) ON public.submissions TO authenticated;

-- 4. Recreate the admin-only RLS policy. Column restriction is now handled by the GRANT,
--    so USING and WITH CHECK only need to verify the caller is an admin.
CREATE POLICY submissions_admin_review_update
  ON public.submissions
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

COMMENT ON POLICY submissions_admin_review_update ON public.submissions IS
  'FND-04: admins (profiles.role = ''admin'') may UPDATE submissions; column-level GRANT
   restricts UPDATE privilege to reviewed_at + reviewed_by only — attempts to write any
   other column raise insufficient_privilege at the parser, before RLS runs. Replaces
   the broken IS NOT DISTINCT FROM column-pinning from 00010 (NEW vs NEW always TRUE).';
