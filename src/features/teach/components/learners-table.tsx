'use client';

import Link from 'next/link';
import { differenceInDays, format, formatDistanceToNowStrict } from 'date-fns';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { CohortDetail, LearnerRow } from '@/features/teach/api/types';

interface LearnersTableProps {
  cohortDetail: CohortDetail;
}

export function LearnersTable({ cohortDetail }: LearnersTableProps) {
  const cohortId = cohortDetail.cohort.id;
  // Default sort: name ASC (CONTEXT.md Discretion). toSorted() avoids in-place mutation.
  const learners = cohortDetail.learners.toSorted((a, b) => a.name.localeCompare(b.name));

  if (learners.length === 0) {
    return (
      <div className='bg-card text-muted-foreground rounded-md border p-8 text-center text-sm'>
        No learners in this cohort yet.
      </div>
    );
  }

  return (
    <div className='bg-card rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Level</TableHead>
            <TableHead className='text-right tabular-nums'>Submissions</TableHead>
            <TableHead>Latest activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {learners.map((learner) => (
            <LearnerLinkRow key={learner.id} cohortId={cohortId} learner={learner} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface LearnerLinkRowProps {
  cohortId: string;
  learner: LearnerRow;
}

function LearnerLinkRow({ cohortId, learner }: LearnerLinkRowProps) {
  const href = `/dashboard/teach/cohorts/${cohortId}/learners/${learner.id}`;
  return (
    <TableRow className='hover:bg-brand-cream cursor-pointer transition'>
      <TableCell className='text-brand-teal font-medium'>
        <Link
          href={href}
          aria-label={`Open ${learner.name}`}
          className='focus-visible:ring-brand-teal block focus:outline-none focus-visible:ring-2'
        >
          {learner.name}
        </Link>
      </TableCell>
      <TableCell>
        <Link href={href} tabIndex={-1} aria-hidden='true' className='block'>
          {learner.level ?? '—'}
        </Link>
      </TableCell>
      <TableCell className='text-right tabular-nums'>
        <Link href={href} tabIndex={-1} aria-hidden='true' className='block'>
          {learner.submissionCount}
        </Link>
      </TableCell>
      <TableCell>
        <Link href={href} tabIndex={-1} aria-hidden='true' className='block'>
          {formatLatestActivity(learner.latestActivityAt)}
        </Link>
      </TableCell>
    </TableRow>
  );
}

function formatLatestActivity(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const days = Math.abs(differenceInDays(new Date(), date));
  if (days <= 7) return formatDistanceToNowStrict(date, { addSuffix: true });
  if (days <= 30) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}
