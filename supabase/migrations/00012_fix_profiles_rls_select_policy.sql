-- Fix: profiles RLS SELECT policy infinite recursion
--
-- Problem:
--   The "Admins can read all profiles" SELECT policy on public.profiles is recursive:
--
--     USING (EXISTS (
--       SELECT 1 FROM profiles p
--       WHERE p.id = auth.uid() AND p.role = 'admin'
--     ))
--
--   The sub-SELECT against profiles re-triggers the same policy on every row, which
--   PostgreSQL detects as infinite recursion. Any client-side query against profiles
--   (e.g. the useAuth() hook reading profile.role via the anon-key browser client)
--   fails with: "infinite recursion detected in policy for relation profiles".
--
--   Consequence: useAuth() returns profile = null. useFilteredNavGroups filters out
--   every admin-only nav item — the Teach group never appears for admins, and the
--   /dashboard/teach/cohorts route, while wired up correctly server-side, has no
--   sidebar entry pointing to it on the client.
--
--   Server-side requireAdmin() is unaffected because it calls public.is_admin(),
--   which is SECURITY DEFINER and bypasses RLS entirely.
--
-- Fix:
--   Drop the recursive policy and re-create it using the existing SECURITY DEFINER
--   public.is_admin() function. is_admin() resolves admin status without re-entering
--   the RLS engine, so no recursion is possible. The "Users can read own profile"
--   policy (USING auth.uid() = id) is already non-recursive and is left in place.
--
-- Safety:
--   - Only SELECT (read) policies are touched. INSERT/UPDATE/DELETE unaffected.
--   - Final policy set on public.profiles after this migration:
--       * "Users can read own profile"   USING (auth.uid() = id)
--       * "Admins can read all profiles" USING (public.is_admin())
--       * "Users can update own profile" (unchanged)
--   - Admins keep their ability to read every profile row (needed by Phase 02
--     Cohorts Hub and Phase 03 Learner Deep-Dive admin views).

-- 1. Enable RLS on profiles (idempotent — safe if already enabled).
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop the recursive admin-read policy. Drop other historically-named variants
--    too so this migration is safe to re-run on other environments where the
--    policy may have been seeded under a different name.
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_read_all ON public.profiles;

-- 3. Re-create the admin-read policy using is_admin() (SECURITY DEFINER, no recursion).
CREATE POLICY "Admins can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

COMMENT ON POLICY "Admins can read all profiles" ON public.profiles IS
  'Admins may SELECT any profile row. Uses public.is_admin() (SECURITY DEFINER) to
   avoid infinite recursion on the profiles table itself. Required for admin-only
   views (Cohorts Hub, Learner Deep-Dive) and for the client-side useAuth() hook to
   successfully read profile.role and populate the nav RBAC filter.';
