'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import { CohortCard } from '@/features/teach/components/cohort-card';
import { cohortsQueryOptions } from '@/features/teach/api/queries';

export function CohortsListing() {
  const { data: cohorts } = useSuspenseQuery(cohortsQueryOptions());

  if (cohorts.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 rounded-md border bg-card py-12 text-center'>
        <Icons.school
          className='h-8 w-8 text-muted-foreground'
          aria-hidden='true'
        />
        <h2 className='text-lg font-semibold text-brand-teal'>No cohorts yet</h2>
        <p className='max-w-sm text-sm text-muted-foreground'>
          Cohorts appear here once learners are enrolled.
        </p>
      </div>
    );
  }

  return (
    <div
      className='grid gap-6'
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
    >
      {cohorts.map((cohort) => (
        <CohortCard key={cohort.id} cohort={cohort} />
      ))}
    </div>
  );
}
