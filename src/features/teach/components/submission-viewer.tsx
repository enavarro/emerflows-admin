'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { submissionQueryOptions } from '@/features/teach/api/queries';
import { SubmissionViewerRecording } from './submission-viewer-recording';
import { SubmissionViewerConversation } from './submission-viewer-conversation';

interface SubmissionViewerProps {
  submissionId: string;
}

export function SubmissionViewer({ submissionId }: SubmissionViewerProps) {
  // Reads from the cache populated by the RSC route's fetchQuery — synchronous
  // resolution via the HydrationBoundary, so the missingPrefetch placeholder
  // queryFn in queries.ts is never invoked.
  const { data: detail } = useSuspenseQuery(submissionQueryOptions(submissionId));

  // D-01: branch on submission.type — single body, no tabs.
  if (detail.submission.type === 'recording') {
    return <SubmissionViewerRecording submissionId={submissionId} />;
  }
  return <SubmissionViewerConversation submissionId={submissionId} />;
}
