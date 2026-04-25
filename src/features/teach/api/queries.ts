import { queryOptions } from '@tanstack/react-query';

import { getCohort, getCohorts, getLearner, getSubmission } from './service';

// ============================================================
// Teach Admin — React Query key factory + query options (FND-03)
// ============================================================
// Mutation invalidation in Phase 3 (mark-as-reviewed) keys off
// teachKeys.all to refresh cohort matrix + learner list at once.
// ============================================================

export const teachKeys = {
  all: ['teach'] as const,
  cohorts: () => [...teachKeys.all, 'cohorts'] as const,
  cohort: (cohortId: string) => [...teachKeys.all, 'cohort', cohortId] as const,
  learner: (learnerId: string) => [...teachKeys.all, 'learner', learnerId] as const,
  submission: (submissionId: string) =>
    [...teachKeys.all, 'submission', submissionId] as const
};

export const cohortsQueryOptions = () =>
  queryOptions({
    queryKey: teachKeys.cohorts(),
    queryFn: () => getCohorts()
  });

export const cohortQueryOptions = (cohortId: string) =>
  queryOptions({
    queryKey: teachKeys.cohort(cohortId),
    queryFn: () => getCohort(cohortId)
  });

export const learnerQueryOptions = (learnerId: string) =>
  queryOptions({
    queryKey: teachKeys.learner(learnerId),
    queryFn: () => getLearner(learnerId)
  });

export const submissionQueryOptions = (submissionId: string) =>
  queryOptions({
    queryKey: teachKeys.submission(submissionId),
    queryFn: () => getSubmission(submissionId)
  });
