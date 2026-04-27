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
  //
  // Use fetchQuery (NOT prefetchQuery): prefetchQuery SWALLOWS errors,
  // which means a failing service call (schema drift, RLS, transient
  // outage) is silently dropped from the dehydrated state and the
  // client falls through to the placeholder queryFn from CR-01 — which
  // throws the cryptic "missingPrefetch" error. fetchQuery propagates
  // the original error to Next.js's error boundary so the actual
  // failure is visible. The successful result is still inserted into
  // the cache, so dehydrate(queryClient) hydrates the client
  // identically to the prefetch path.
  const queryClient = getQueryClient();
  await queryClient.fetchQuery({
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
