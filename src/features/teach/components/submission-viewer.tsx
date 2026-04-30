'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { learnerQueryOptions, submissionQueryOptions } from '@/features/teach/api/queries';
import { SiblingTypeSwitcher } from './sibling-type-switcher';
import { SubmissionViewerRecording } from './submission-viewer-recording';
import { SubmissionViewerConversation } from './submission-viewer-conversation';

interface SubmissionViewerProps {
  submissionId: string;
}

export function SubmissionViewer({ submissionId }: SubmissionViewerProps) {
  // Both queries below resolve synchronously from the QueryClient cache
  // populated by the RSC route's fetchQuery + HydrationBoundary; the
  // missingPrefetch placeholder queryFn in queries.ts is never invoked.
  const { data: detail } = useSuspenseQuery(submissionQueryOptions(submissionId));
  const { data: learnerDetail } = useSuspenseQuery(
    learnerQueryOptions(detail.submission.learnerId)
  );

  const siblings =
    learnerDetail.submissionsByModule[detail.submission.moduleId] ?? [];

  return (
    <div className='flex flex-col gap-6'>
      <SiblingTypeSwitcher
        siblings={siblings}
        currentType={detail.submission.type}
      />

      {/* D-01: branch on submission.type — single body, no tabs. */}
      {detail.submission.type === 'recording' ? (
        <SubmissionViewerRecording submissionId={submissionId} />
      ) : (
        <SubmissionViewerConversation submissionId={submissionId} />
      )}
    </div>
  );
}
