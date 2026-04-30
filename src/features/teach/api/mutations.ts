import { mutationOptions } from '@tanstack/react-query';

import { getQueryClient } from '@/lib/query-client';
import { markReviewed } from './service-client';
import { teachKeys } from './queries';
import type {
  LearnerDetail,
  MarkReviewedInput,
  MarkReviewedResponse,
  SubmissionDetail
} from './types';

export const markReviewedMutation = mutationOptions<
  MarkReviewedResponse,
  Error,
  MarkReviewedInput
>({
  mutationFn: (input: MarkReviewedInput) => markReviewed(input),
  onSuccess: (response, variables) => {
    const queryClient = getQueryClient();
    const updated = response.submission;
    const { submissionId } = variables;

    // Patch the submission cache directly with the response payload so any
    // mounted reader (mark-reviewed button, submission-viewer body) re-renders
    // immediately. We cannot rely on invalidate-then-refetch here: queries.ts
    // installs throwing placeholder queryFns to enforce the prefetch contract,
    // so a refetch swallows itself and leaves stale data in the cache.
    queryClient.setQueryData<SubmissionDetail>(
      teachKeys.submission(submissionId),
      (prev) =>
        prev
          ? {
              ...prev,
              submission: {
                ...prev.submission,
                reviewedAt: updated.reviewedAt,
                reviewedBy: updated.reviewedBy
              }
            }
          : prev
    );

    // Same patch for any learner cache that already has this submission
    // (powers the sibling-switcher's submissionsByModule map).
    const learnerId =
      queryClient.getQueryData<SubmissionDetail>(teachKeys.submission(submissionId))
        ?.submission.learnerId;
    if (learnerId) {
      queryClient.setQueryData<LearnerDetail>(
        teachKeys.learner(learnerId),
        (prev) => {
          if (!prev) return prev;
          const next: Record<string, LearnerDetail['submissionsByModule'][string]> = {};
          for (const [moduleId, list] of Object.entries(prev.submissionsByModule)) {
            next[moduleId] = list.map((s) =>
              s.id === submissionId
                ? {
                    ...s,
                    reviewedAt: updated.reviewedAt,
                    reviewedBy: updated.reviewedBy
                  }
                : s
            );
          }
          return { ...prev, submissionsByModule: next };
        }
      );
    }

    // REV-02: mark cohort-level caches stale so the next visit to the cohort
    // matrix / cohorts list refetches. Active mounts of those queries fall
    // back to the silent-error path (placeholder queryFn), so this does not
    // visibly disturb the current page.
    queryClient.invalidateQueries({ queryKey: teachKeys.cohorts() });
    queryClient.invalidateQueries({ queryKey: teachKeys.all, refetchType: 'none' });
  }
});
