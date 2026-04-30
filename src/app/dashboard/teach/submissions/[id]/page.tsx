import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';

import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getQueryClient } from '@/lib/query-client';
import { teachKeys } from '@/features/teach/api/queries';
import { getSubmission } from '@/features/teach/api/service';
import { MODULES } from '@/features/teach/constants/modules';
import { SubmissionViewer } from '@/features/teach/components/submission-viewer';
import { MarkReviewedButton } from '@/features/teach/components/mark-reviewed-button';
import { TeachBreadcrumbs } from '@/features/teach/components/teach-breadcrumbs';
import { humanizeCohortId } from '@/features/teach/lib/format';

export const metadata = {
  title: 'Submission — Teach Admin'
};

interface SubmissionViewerPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionViewerPage({ params }: SubmissionViewerPageProps) {
  const { id } = await params;
  // Defense-in-depth: layout already gates dashboard/teach/*, but page-level
  // requireAdmin() is belt-and-suspenders.
  await requireAdmin();

  // Use fetchQuery here. The alternative (prefetch helper) silently swallows
  // errors, which would cause useSuspenseQuery on the client to fall through
  // to the missingPrefetch placeholder and surface a cryptic stack instead of
  // the real failure. fetchQuery propagates real errors to error.tsx AND
  // returns the data so we can populate the PageContainer header without a
  // Loading… flash. The same QueryClient is then dehydrated for
  // HydrationBoundary so the client useSuspenseQuery resolves synchronously
  // without a second fetch.
  const queryClient = getQueryClient();
  const submissionDetail = await queryClient.fetchQuery({
    queryKey: teachKeys.submission(id),
    queryFn: () => getSubmission(id)
  });

  // UI-SPEC §Surface 2/3 page header:
  //   pageTitle:       learner.name
  //   pageDescription: "M{NN} · {module.title} · Attempt {attemptNum}"
  //   pageHeaderAction: <MarkReviewedButton submission={submissionDetail.submission} />
  const mod = MODULES.find((m) => m.id === submissionDetail.submission.moduleId);
  const code = mod
    ? `M${String(mod.num).padStart(2, '0')}`
    : submissionDetail.submission.moduleId;
  const title = mod?.title ?? '';
  const description = `${code} · ${title} · Attempt ${submissionDetail.submission.attemptNum}`;

  const cohortSlug = submissionDetail.learner.cohort;
  const cohortLabel = humanizeCohortId(cohortSlug);
  const moduleSegment = title ? `${code} - ${title}` : code;
  const breadcrumbItems = [
    { label: 'Cohorts', href: '/dashboard/teach/cohorts' },
    { label: cohortLabel, href: `/dashboard/teach/cohorts/${cohortSlug}` },
    {
      label: submissionDetail.learner.name,
      href: `/dashboard/teach/cohorts/${cohortSlug}/learners/${submissionDetail.learner.id}`
    },
    { label: moduleSegment }
  ];

  return (
    <PageContainer
      pageTitle={submissionDetail.learner.name}
      pageDescription={description}
      pageBreadcrumbs={<TeachBreadcrumbs items={breadcrumbItems} />}
      pageHeaderAction={
        <MarkReviewedButton submission={submissionDetail.submission} />
      }
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<SubmissionViewerBodySkeleton />}>
          <SubmissionViewer submissionId={id} />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}

function SubmissionViewerBodySkeleton() {
  return (
    <div className='flex flex-col gap-6'>
      <Skeleton className='h-24 w-full rounded-lg' />
      <Skeleton className='h-64 w-full rounded-lg' />
      <Skeleton className='h-32 w-full rounded-lg' />
    </div>
  );
}
