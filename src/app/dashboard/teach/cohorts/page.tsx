import { requireAdmin } from '@/lib/auth/require-admin';

export const metadata = {
  title: 'Cohorts — Teach Admin'
};

export default async function CohortsPage() {
  // Defense-in-depth: layout already gates, but page-level guard prevents
  // accidental exposure if layout is ever removed or restructured.
  const { user } = await requireAdmin();

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold text-brand-teal'>Cohorts</h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Cohorts list ships in Phase 2. Signed in as {user.email ?? user.id}.
      </p>
    </div>
  );
}
