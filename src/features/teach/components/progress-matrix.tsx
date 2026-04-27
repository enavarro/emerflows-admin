'use client';

import { format } from 'date-fns';

import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { MODULES } from '@/features/teach/constants/modules';
import type {
  CohortDetail,
  ModuleProgressCell,
  ProgressState
} from '@/features/teach/api/types';

interface ProgressMatrixProps {
  cohortDetail: CohortDetail;
}

// D-16 LOCKED: sage-progressive cell encoding — class strings VERBATIM from
// UI-SPEC §Color §Cell encoding spec. Layout (centering inside the cell) is
// handled by the parent <span className='flex items-center justify-center'>.
// DO NOT prepend layout utilities like 'inline-block' to these strings — they
// are the visual encoding contract.
const DOT_CLASSES: Record<ProgressState, string> = {
  'not-started': 'h-3 w-3 rounded-full border border-brand-cream bg-transparent',
  submitted: 'h-3 w-3 rounded-full border-[1.5px] border-brand-sage bg-transparent',
  reviewed: 'h-3 w-3 rounded-full bg-brand-sage border-0'
};

export function ProgressMatrix({ cohortDetail }: ProgressMatrixProps) {
  const learners = cohortDetail.learners.toSorted((a, b) =>
    a.name.localeCompare(b.name)
  );

  if (learners.length === 0) {
    return (
      <div className='rounded-md border bg-card p-8 text-center text-sm text-muted-foreground'>
        No learners in this cohort yet.
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <div className='rounded-md border bg-card'>
        <ScrollArea className='w-full'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className='sticky left-0 top-0 z-30 min-w-[200px] bg-card text-brand-teal'
                  scope='col'
                >
                  Learner
                </TableHead>
                {MODULES.map((mod) => {
                  const code = `M${String(mod.num).padStart(2, '0')}`;
                  return (
                    <TableHead
                      key={mod.id}
                      className='sticky top-0 z-20 h-10 w-12 bg-card text-center text-brand-teal'
                      scope='col'
                      aria-label={`Module ${mod.num} — ${mod.title}`}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className='inline-block text-xs font-semibold uppercase tabular-nums tracking-wider'>
                            {code}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{mod.title}</TooltipContent>
                      </Tooltip>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {learners.map((learner) => {
                const cells = cohortDetail.matrix[learner.id] ?? [];
                return (
                  <TableRow key={learner.id}>
                    <TableCell
                      className='sticky left-0 z-10 min-w-[200px] bg-card font-medium text-brand-teal'
                      scope='row'
                    >
                      {learner.name}
                    </TableCell>
                    {MODULES.map((mod, colIdx) => {
                      const cell = cells[colIdx] ?? fallbackCell(mod.id);
                      const tooltipText = formatCellTooltip(cell);
                      const ariaLabel = `${learner.name} — Module ${mod.num} — ${tooltipText}`;
                      return (
                        <TableCell
                          key={`${learner.id}-${mod.id}`}
                          className='h-8 w-12 text-center'
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              {/* Layout wrapper centers the dot inside the cell.
                                  The dot's own className is VERBATIM from UI-SPEC
                                  (no layout utilities). */}
                              <span
                                className='flex items-center justify-center'
                                aria-label={ariaLabel}
                                role='img'
                              >
                                <span className={DOT_CLASSES[cell.state]} aria-hidden='true' />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>{tooltipText}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ScrollBar orientation='horizontal' />
        </ScrollArea>
      </div>

      {/* Locked legend (UI-SPEC §Copywriting Contract: Matrix legend) */}
      <div className='flex flex-wrap items-center gap-4 px-1 text-xs text-muted-foreground'>
        <LegendSwatch state='not-started' label='Not started' />
        <LegendSwatch state='submitted' label='Submitted' />
        <LegendSwatch state='reviewed' label='Reviewed' />
      </div>
    </div>
  );
}

interface LegendSwatchProps {
  state: ProgressState;
  label: string;
}

function LegendSwatch({ state, label }: LegendSwatchProps) {
  return (
    <span className='inline-flex items-center gap-2'>
      {/* Same pattern as cell: layout wrapper carries flex/inline-flex; dot stays VERBATIM. */}
      <span className='inline-flex items-center justify-center' aria-hidden='true'>
        <span className={DOT_CLASSES[state]} />
      </span>
      {label}
    </span>
  );
}

function fallbackCell(moduleId: string): ModuleProgressCell {
  return {
    moduleId,
    state: 'not-started',
    submissionId: null,
    submittedAt: null,
    reviewedAt: null
  };
}

// D-18 LOCKED: tooltip copy.
function formatCellTooltip(cell: ModuleProgressCell): string {
  if (cell.state === 'not-started') {
    return 'Not started';
  }
  const submittedDate = cell.submittedAt
    ? format(new Date(cell.submittedAt), 'MMM d, yyyy')
    : 'unknown date';
  if (cell.state === 'submitted') {
    return `Submitted ${submittedDate} · Awaiting review`;
  }
  // reviewed
  const reviewedDate = cell.reviewedAt
    ? format(new Date(cell.reviewedAt), 'MMM d, yyyy')
    : 'unknown date';
  return `Submitted ${submittedDate} · Reviewed ${reviewedDate}`;
}
