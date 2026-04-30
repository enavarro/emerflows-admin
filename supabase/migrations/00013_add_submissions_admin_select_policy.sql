-- Phase 3 / Gap closure / UAT Test 7 BLOCKER
-- Adds the missing FOR SELECT RLS policy on public.submissions for authenticated
-- admins. Without this policy, RLS-default-deny gives authenticated users zero
-- rows even when they own (or are admins for) the data — and PostgREST applies
-- SELECT RLS to UPDATE...RETURNING. The mark-reviewed route at
-- src/app/api/teach/submissions/[id]/review/route.ts chains
-- .update().select().single() against the user-session client (D-04a). With no
-- SELECT policy, RETURNING yields 0 rows and .single() throws PGRST116
-- "Cannot coerce the result to a single JSON object" — exactly the symptom
-- reported in UAT Test 7.
--
-- Why authenticated-only and admin-gated:
--   The rest of the application reads submissions via createAdminClient()
--   (service-role, bypasses RLS). The user-session path is exercised only by
--   the mark-reviewed route (admin only, defended by requireAdmin() at the
--   handler entry and by submissions_admin_review_update on UPDATE). So the
--   SELECT policy mirrors that gate: only admins, via the same SECURITY DEFINER
--   public.is_admin() helper used by the UPDATE policy and the profiles SELECT
--   policy (00012). is_admin() does not recurse — it queries profiles without
--   re-entering the profiles RLS engine.
--
-- Pattern follows 00012_fix_profiles_rls_select_policy.sql (DROP IF EXISTS to
-- support re-application; CREATE POLICY ... FOR SELECT TO authenticated USING
-- (public.is_admin())).

-- 1. Drop any prior named variant so this migration is safe to re-run.
DROP POLICY IF EXISTS submissions_admin_select ON public.submissions;

-- 2. Create the SELECT policy. Admins (profiles.role = 'admin') get unrestricted
--    SELECT access; non-admins get zero rows (RLS default-deny). Required so
--    PostgREST UPDATE...RETURNING from the mark-reviewed route can return the
--    just-updated row to the route handler.
CREATE POLICY submissions_admin_select
  ON public.submissions
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY submissions_admin_select ON public.submissions IS
  'Phase 3 gap closure: admins (profiles.role = ''admin'') may SELECT any submission row.
   Required so PostgREST UPDATE...RETURNING from the mark-reviewed route
   (src/app/api/teach/submissions/[id]/review/route.ts) can return the updated row
   under user-session RLS. Uses public.is_admin() (SECURITY DEFINER, non-recursive).';
