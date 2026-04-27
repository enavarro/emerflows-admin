import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { cohortQueryOptions } from '@/features/teach/api/queries';
import { CohortDetail } from '@/features/teach/components/cohort-detail';
import { humanizeCohortId } from '@/features/teach/lib/format';

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

  // WR-01: render PageContainer at the route level (not inside the suspense
  // child) so the page header is stable across loading/loaded states. The
  // title uses humanizeCohortId(cohortId) until the client query resolves —
  // for typical slugs (e.g. `spring-2026`) this matches the resolved
  // `cohort.name` so there is no visible jump.
  return (
    <PageContainer
      pageTitle={humanizeCohortId(cohortId)}
      pageHeaderAction={
        <Button variant='outline' disabled aria-disabled='true' title='Coming soon'>
          <Icons.upload className='mr-1 h-4 w-4' aria-hidden='true' />
          Export
        </Button>
      }
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<CohortDetailBodySkeleton />}>
          <CohortDetail cohortId={cohortId} />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

function CohortDetailBodySkeleton() {
  // Header is now rendered statically at the route level (above), so the
  // skeleton only fills the body region (description + tabs + content).
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-5 w-96' />
      <Skeleton className='h-10 w-64' />
      <Skeleton className='h-64 w-full' />
    </div>
  );
}
