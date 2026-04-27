import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { Cohort } from '@/features/teach/api/types';

interface CohortCardProps {
  cohort: Cohort;
}

export function CohortCard({ cohort }: CohortCardProps) {
  return (
    <Link
      href={`/dashboard/teach/cohorts/${cohort.id}`}
      aria-label={`Open ${cohort.name}`}
      className='block focus:outline-none'
    >
      <Card className='cursor-pointer transition hover:-translate-y-0.5 hover:bg-brand-cream hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-teal'>
        <CardHeader className='flex flex-col gap-2'>
          <div className='flex items-center justify-between gap-2'>
            <Badge
              variant='outline'
              className='inline-flex items-center gap-1.5 text-xs uppercase tracking-wider'
            >
              <span
                className='h-1.5 w-1.5 rounded-full bg-brand-sage'
                aria-hidden='true'
              />
              Active
            </Badge>
            <Badge variant='secondary' className='text-xs'>
              B1–B2
            </Badge>
          </div>
          <h3 className='text-xl font-semibold leading-tight text-brand-teal'>
            {cohort.name}
          </h3>
          <p className='text-sm text-muted-foreground'>
            {cohort.termHint ?? 'Spring 2026'}
          </p>
        </CardHeader>

        <CardContent className='grid grid-cols-2 gap-4'>
          <Stat label='Students' value={String(cohort.learnerCount)} />
          <Stat label='Completion' value='0%' />
          <Stat label='Needs review' value={String(cohort.needsReview)} />
          <Stat label='Next' value='Module in progress' />
        </CardContent>

        <CardFooter className='flex items-center justify-end pt-0 text-xs text-brand-teal'>
          Open
          <Icons.chevronRight className='ml-1 h-3 w-3' aria-hidden='true' />
        </CardFooter>
      </Card>
    </Link>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-xs uppercase tracking-wider text-muted-foreground'>
        {label}
      </span>
      <span className='text-sm font-semibold tabular-nums text-brand-teal'>
        {value}
      </span>
    </div>
  );
}
