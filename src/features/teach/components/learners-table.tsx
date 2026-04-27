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
import type { CohortDetail } from '@/features/teach/api/types';

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

  // WR-02: render exactly one <Link> per row using the stretched-link
  // pattern. The visible <Link> sits on the name cell and its
  // `after:absolute after:inset-0` pseudo-element expands the click target
  // to the entire row. The row gets `position: relative` so the
  // pseudo-element anchors to it, and remaining cells stay plain text —
  // no duplicate anchors, no `aria-hidden` link clones, single keyboard
  // stop per row.
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
          {learners.map((learner) => {
            const href = `/dashboard/teach/cohorts/${cohortId}/learners/${learner.id}`;
            return (
              <TableRow
                key={learner.id}
                className='hover:bg-brand-cream relative cursor-pointer transition'
              >
                <TableCell className='text-brand-teal font-medium'>
                  <Link
                    href={href}
                    aria-label={`Open ${learner.name}`}
                    className='focus-visible:ring-brand-teal after:absolute after:inset-0 focus:outline-none focus-visible:ring-2'
                  >
                    {learner.name}
                  </Link>
                </TableCell>
                <TableCell>{learner.level ?? '—'}</TableCell>
                <TableCell className='text-right tabular-nums'>
                  {learner.submissionCount}
                </TableCell>
                <TableCell>{formatLatestActivity(learner.latestActivityAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
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
