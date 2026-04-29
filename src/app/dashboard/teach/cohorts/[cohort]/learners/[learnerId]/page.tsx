import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { teachKeys } from '@/features/teach/api/queries';
import { getLearner } from '@/features/teach/api/service';
import { LearnerDetail } from '@/features/teach/components/learner-detail';

export const metadata = {
  title: 'Learner — Teach Admin'
};

interface LearnerDetailPageProps {
  params: Promise<{ cohort: string; learnerId: string }>;
}

export default async function LearnerDetailPage({ params }: LearnerDetailPageProps) {
  const { learnerId } = await params;
  // Defense-in-depth: layout already gates, but page-level guard is belt-and-suspenders.
  await requireAdmin();

  // PATTERNS.md §React Query Server-Prefetch: use fetchQuery here. The
  // alternative (prefetch helper) silently swallows errors — fetchQuery
  // propagates them to error.tsx and the resolved data populates both
  // the cache (for HydrationBoundary) AND a local variable for the
  // PageContainer header (avoids a "Loading…" flash on title).
  const queryClient = getQueryClient();
  const learnerDetail = await queryClient.fetchQuery({
    queryKey: teachKeys.learner(learnerId),
    queryFn: () => getLearner(learnerId)
  });

  // UI-SPEC §Surface 1 page header contract:
  //   pageTitle:       learner.name (e.g. "Ana García")
  //   pageDescription: "{cohort} · {level || '—'}"
  //   external_id:     supplemental <p> below header (only when non-null)
  const description = `${learnerDetail.learner.cohort} · ${learnerDetail.learner.level ?? '—'}`;

  return (
    <PageContainer
      pageTitle={learnerDetail.learner.name}
      pageDescription={description}
    >
      {learnerDetail.learner.externalId && (
        <p className='text-muted-foreground mt-1 font-mono text-xs'>
          {learnerDetail.learner.externalId}
        </p>
      )}
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<LearnerDetailBodySkeleton />}>
          <LearnerDetail learnerId={learnerId} />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

function LearnerDetailBodySkeleton() {
  return (
    <div className='flex flex-col gap-4'>
      <Skeleton className='h-32 w-full rounded-lg' />
      <Skeleton className='h-32 w-full rounded-lg' />
    </div>
  );
}
