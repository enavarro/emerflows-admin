import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { teachKeys } from '@/features/teach/api/queries';
import { getCohort } from '@/features/teach/api/service';
import { CohortDetail } from '@/features/teach/components/cohort-detail';
import { TeachBreadcrumbs } from '@/features/teach/components/teach-breadcrumbs';
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

  // Server-side prefetch: queries.ts intentionally does NOT import the
  // server-only service (CR-01) so client bundles stay clean. The route
  // wires queryFn -> getCohort() here, in RSC, where server-only is fine.
  //
  // Use fetchQuery (NOT prefetchQuery): prefetchQuery is documented to
  // SWALLOW errors — if getCohort() throws (e.g. schema drift, RLS
  // failure, transient outage), the cache stores a failed-query state,
  // dehydrate() drops it (only successful queries are serialized by
  // default), the client cache is empty for the cohort key, and
  // useSuspenseQuery falls through to the placeholder queryFn from
  // CR-01 — which throws the cryptic "missingPrefetch" error to the
  // route's error boundary. fetchQuery propagates the original error
  // up to Next.js's error boundary so the actual failure (column not
  // found, RLS denied, network, etc.) is visible in dev logs.
  //
  // The successful result is automatically inserted into the
  // queryClient cache by fetchQuery, so dehydrate(queryClient) still
  // serializes it for the client — same hydration path as before.
  const queryClient = getQueryClient();
  await queryClient.fetchQuery({
    queryKey: teachKeys.cohort(cohortId),
    queryFn: () => getCohort(cohortId)
  });

  // WR-01: render PageContainer at the route level (not inside the suspense
  // child) so the page header is stable across loading/loaded states. The
  // title uses humanizeCohortId(cohortId) until the client query resolves —
  // for typical slugs (e.g. `spring-2026`) this matches the resolved
  // `cohort.name` so there is no visible jump.
  const cohortLabel = humanizeCohortId(cohortId);
  const breadcrumbItems = [
    { label: 'Cohorts', href: '/dashboard/teach/cohorts' },
    { label: cohortLabel }
  ];

  return (
    <PageContainer
      pageTitle={cohortLabel}
      pageBreadcrumbs={<TeachBreadcrumbs items={breadcrumbItems} />}
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
