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
