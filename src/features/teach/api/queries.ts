import { queryOptions } from '@tanstack/react-query';

// ============================================================
// Teach Admin — React Query key factory + query options (FND-03)
// ============================================================
// Mutation invalidation in Phase 3 (mark-as-reviewed) keys off
// teachKeys.all to refresh cohort matrix + learner list at once.
//
// IMPORTANT: `./service` is `'server-only'`. To keep this module safely
// importable from `'use client'` components (e.g. cohorts-listing.tsx,
// cohort-detail.tsx), we MUST NOT statically import the service here.
// Each `queryFn` dynamic-imports the service so Next.js code-splits it
// out of the client bundle (see PATTERNS.md). On the server (RSC
// prefetch), the dynamic import resolves synchronously; on the client,
// `queryFn` is never invoked because data is hydrated from the server.
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
    queryFn: async () => {
      const { getCohorts } = await import('./service');
      return getCohorts();
    }
  });

export const cohortQueryOptions = (cohortId: string) =>
  queryOptions({
    queryKey: teachKeys.cohort(cohortId),
    queryFn: async () => {
      const { getCohort } = await import('./service');
      return getCohort(cohortId);
    }
  });

export const learnerQueryOptions = (learnerId: string) =>
  queryOptions({
    queryKey: teachKeys.learner(learnerId),
    queryFn: async () => {
      const { getLearner } = await import('./service');
      return getLearner(learnerId);
    }
  });

export const submissionQueryOptions = (submissionId: string) =>
  queryOptions({
    queryKey: teachKeys.submission(submissionId),
    queryFn: async () => {
      const { getSubmission } = await import('./service');
      return getSubmission(submissionId);
    }
  });
