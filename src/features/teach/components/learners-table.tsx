'use client';

import { useState } from 'react';

import Link from 'next/link';
import { differenceInDays, format, formatDistanceToNowStrict } from 'date-fns';

import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { CohortDetail } from '@/features/teach/api/types';

type SortCol = 'name' | 'level' | 'externalId' | 'submissions' | 'latestActivity';
type SortDir = 'asc' | 'desc';

interface LearnersTableProps {
  cohortDetail: CohortDetail;
}

export function LearnersTable({ cohortDetail }: LearnersTableProps) {
  const cohortId = cohortDetail.cohort.id;
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const hasExternalId = cohortDetail.learners.some((l) => l.externalId);

  const learners = [...cohortDetail.learners].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'name':
        cmp = a.name.localeCompare(b.name);
        break;
      case 'level':
        cmp = (a.level ?? '').localeCompare(b.level ?? '');
        break;
      case 'externalId':
        cmp = (a.externalId ?? '').localeCompare(b.externalId ?? '');
        break;
      case 'submissions':
        cmp = a.submissionCount - b.submissionCount;
        break;
      case 'latestActivity':
        cmp = (a.latestActivityAt ?? '').localeCompare(b.latestActivityAt ?? '');
        break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

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
            <SortableHead col='name' label='Name' current={sortCol} dir={sortDir} onSort={handleSort} />
            <SortableHead col='level' label='Level' current={sortCol} dir={sortDir} onSort={handleSort} />
            {hasExternalId && (
              <SortableHead col='externalId' label='ID' current={sortCol} dir={sortDir} onSort={handleSort} />
            )}
            <SortableHead col='submissions' label='Submissions' current={sortCol} dir={sortDir} onSort={handleSort} />
            <SortableHead col='latestActivity' label='Latest activity' current={sortCol} dir={sortDir} onSort={handleSort} />
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
                {hasExternalId && (
                  <TableCell className='text-muted-foreground text-xs tabular-nums'>
                    {learner.externalId ?? '—'}
                  </TableCell>
                )}
                <TableCell className='tabular-nums'>{learner.submissionCount}</TableCell>
                <TableCell>{formatLatestActivity(learner.latestActivityAt)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

interface SortableHeadProps {
  col: SortCol;
  label: string;
  current: SortCol;
  dir: SortDir;
  onSort: (col: SortCol) => void;
}

function SortableHead({ col, label, current, dir, onSort }: SortableHeadProps) {
  const active = col === current;
  const SortIcon = active ? (dir === 'asc' ? Icons.chevronUp : Icons.chevronDown) : Icons.chevronsUpDown;

  return (
    <TableHead>
      <button
        type='button'
        onClick={() => onSort(col)}
        className='hover:text-foreground flex cursor-pointer items-center gap-1 select-none'
      >
        {label}
        <SortIcon className={`h-3.5 w-3.5 shrink-0 ${active ? 'opacity-100' : 'opacity-40'}`} />
      </button>
    </TableHead>
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
