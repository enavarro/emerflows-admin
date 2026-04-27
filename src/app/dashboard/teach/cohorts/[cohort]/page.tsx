import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { cohortQueryOptions } from '@/features/teach/api/queries';
import { CohortDetail } from '@/features/teach/components/cohort-detail';

export const metadata = {
  title: 'Cohort — Teach Admin'
};

interface CohortDetailPageProps {
  params: Promise<{ cohort: string }>;
}

export default async function CohortDetailPage({ params }: CohortDetailPageProps) {
  const { cohort: cohortId } = await params;
  // Defense-in-depth: layout already gates, but page-level guard is belt-and-suspenders.
  await requireAdmin();

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(cohortQueryOptions(cohortId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CohortDetailSkeleton />}>
        <CohortDetail cohortId={cohortId} />
      </Suspense>
    </HydrationBoundary>
  );
}

function CohortDetailSkeleton() {
  // Placeholder for the entire page (header + tabs) while the client suspends.
  // Mirrors UI-SPEC §Loading state for the cohort detail page.
  return (
    <div className='flex flex-col gap-4 p-4 md:px-6'>
      <Skeleton className='h-10 w-72' />
      <Skeleton className='h-5 w-96' />
      <Skeleton className='h-10 w-64' />
      <Skeleton className='h-64 w-full' />
    </div>
  );
}
