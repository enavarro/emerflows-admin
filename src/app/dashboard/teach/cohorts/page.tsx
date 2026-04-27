import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { teachKeys } from '@/features/teach/api/queries';
import { getCohorts } from '@/features/teach/api/service';
import { CohortsListing } from '@/features/teach/components/cohorts-listing';

export const metadata = {
  title: 'Cohorts — Teach Admin'
};

export default async function CohortsPage() {
  // Defense-in-depth: layout already gates, but page-level guard prevents
  // accidental exposure if the segment layout is ever removed or restructured.
  await requireAdmin();

  // Server-side prefetch: queries.ts intentionally does NOT import the
  // server-only service (CR-01) so client bundles stay clean. The route
  // wires queryFn -> getCohorts() here, in RSC, where server-only is fine.
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery({
    queryKey: teachKeys.cohorts(),
    queryFn: () => getCohorts()
  });

  return (
    <PageContainer
      pageTitle='Cohorts'
      pageDescription='Browse cohorts and drill into a cohort to review learner progress.'
      pageHeaderAction={
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            disabled
            aria-disabled='true'
            title='Coming soon'
          >
            <Icons.upload className='mr-1 h-4 w-4' aria-hidden='true' />
            Export
          </Button>
          <Button
            variant='default'
            disabled
            aria-disabled='true'
            title='Coming soon'
          >
            + New cohort
          </Button>
        </div>
      }
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<CohortsGridSkeleton />}>
          <CohortsListing />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

function CohortsGridSkeleton() {
  return (
    <div
      className='grid gap-6'
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
    >
      <Skeleton className='h-56 rounded-xl' />
      <Skeleton className='h-56 rounded-xl' />
      <Skeleton className='h-56 rounded-xl' />
    </div>
  );
}
