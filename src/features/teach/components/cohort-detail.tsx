'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
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

  // UI-SPEC §Cohort detail page locks the description as
  // `{cohort.termHint} · {cohort.learnerCount} learners`. termHint is a D-08 placeholder
  // sourced from the service today; we fall back to cohort.name if it's ever absent so
  // the contract format stays intact.
  return (
    <PageContainer
      pageTitle={cohort.name}
      pageDescription={`${cohort.termHint ?? cohort.name} · ${cohort.learnerCount} learners`}
      pageHeaderAction={
        <Button variant='outline' disabled aria-disabled='true' title='Coming soon'>
          <Icons.upload className='mr-1 h-4 w-4' aria-hidden='true' />
          Export
        </Button>
      }
    >
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
    </PageContainer>
  );
}
