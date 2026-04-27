import { queryOptions } from '@tanstack/react-query';

import type {
  Cohort,
  CohortDetail,
  LearnerDetail,
  SubmissionDetail
} from './types';

// ============================================================
// Teach Admin — React Query key factory + query options (FND-03)
// ============================================================
// Mutation invalidation in Phase 3 (mark-as-reviewed) keys off
// teachKeys.all to refresh cohort matrix + learner list at once.
//
// CR-01: `./service` is `'server-only'`. This module is imported by
// `'use client'` components (e.g. cohorts-listing.tsx, cohort-detail.tsx)
// AND by server route files. It MUST NOT pull `service.ts` into the
// client bundle — even a dynamic `import('./service')` is traced by
// Turbopack as a module dependency and triggers the server-only guard.
//
// Pattern: queries.ts owns ONLY the cache key + a placeholder queryFn
// that throws. Server prefetch routes call the service directly via
// `prefetchQuery({ queryKey, queryFn })` (see app/dashboard/teach/...).
// On the client, hydration installs the server-prefetched data into the
// React Query cache, so `useSuspenseQuery` resolves synchronously and
// the placeholder queryFn is NEVER invoked.
//
// If you ever see "teach query missing prefetch" thrown at runtime, it
// means a client component called `useSuspenseQuery(xQueryOptions(...))`
// without a matching server-side `prefetchQuery` — fix the route, not
// this file.
// ============================================================

export const teachKeys = {
  all: ['teach'] as const,
  cohorts: () => [...teachKeys.all, 'cohorts'] as const,
  cohort: (cohortId: string) => [...teachKeys.all, 'cohort', cohortId] as const,
  learner: (learnerId: string) => [...teachKeys.all, 'learner', learnerId] as const,
  submission: (submissionId: string) =>
    [...teachKeys.all, 'submission', submissionId] as const
};

function missingPrefetch(label: string): never {
  throw new Error(
    `teach: ${label} queryFn was invoked, but data should have been hydrated from the server. ` +
      `Add a matching prefetchQuery({ queryKey, queryFn: () => get${label.charAt(0).toUpperCase() + label.slice(1)}(...) }) to the route file.`
  );
}

export const cohortsQueryOptions = () =>
  queryOptions<Cohort[]>({
    queryKey: teachKeys.cohorts(),
    queryFn: () => missingPrefetch('cohorts')
  });

export const cohortQueryOptions = (cohortId: string) =>
  queryOptions<CohortDetail>({
    queryKey: teachKeys.cohort(cohortId),
    queryFn: () => missingPrefetch(`cohort(${cohortId})`)
  });

export const learnerQueryOptions = (learnerId: string) =>
  queryOptions<LearnerDetail>({
    queryKey: teachKeys.learner(learnerId),
    queryFn: () => missingPrefetch(`learner(${learnerId})`)
  });

export const submissionQueryOptions = (submissionId: string) =>
  queryOptions<SubmissionDetail>({
    queryKey: teachKeys.submission(submissionId),
    queryFn: () => missingPrefetch(`submission(${submissionId})`)
  });
