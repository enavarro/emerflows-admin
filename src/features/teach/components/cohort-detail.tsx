'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cohortQueryOptions } from '@/features/teach/api/queries';
import { LearnersTable } from '@/features/teach/components/learners-table';
import { ProgressMatrix } from '@/features/teach/components/progress-matrix';

interface CohortDetailProps {
  cohortId: string;
}

export function CohortDetail({ cohortId }: CohortDetailProps) {
  const { data: cohortDetail } = useSuspenseQuery(cohortQueryOptions(cohortId));
  const { cohort } = cohortDetail;

  // WR-01: PageContainer is owned by the parent route file so the page
  // header stays stable across the suspense boundary. We render the
  // dynamic description (which depends on cohort data) as a muted line
  // above the tabs — it appears once the query resolves, with no
  // header-level layout shift.
  //
  // UI-SPEC §Cohort detail page locks the description as
  // `{cohort.termHint} · {cohort.learnerCount} learners`. termHint is a
  // D-08 placeholder sourced from the service today; we fall back to
  // cohort.name if it's ever absent so the contract format stays intact.
  // Pluralize "learner(s)" so cohorts with exactly one learner read
  // correctly (IN-01).
  const learnerWord = cohort.learnerCount === 1 ? 'learner' : 'learners';
  const description = `${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} ${learnerWord}`;

  return (
    <div className='flex flex-col gap-4'>
      <p className='text-muted-foreground text-sm'>{description}</p>
      <Tabs defaultValue='learners' className='flex flex-col gap-4'>
        <TabsList>
          <TabsTrigger value='learners'>Learners</TabsTrigger>
          <TabsTrigger value='matrix'>Progress matrix</TabsTrigger>
        </TabsList>
        <TabsContent value='learners' className='m-0'>
          <LearnersTable cohortDetail={cohortDetail} />
        </TabsContent>
        <TabsContent value='matrix' className='m-0'>
          <ProgressMatrix cohortDetail={cohortDetail} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
