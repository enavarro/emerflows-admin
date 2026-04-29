'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { useSuspenseQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { learnerQueryOptions } from '@/features/teach/api/queries';
import { MODULES } from '@/features/teach/constants/modules';
import type { SubmissionSummary } from '@/features/teach/api/types';

interface LearnerDetailProps {
  learnerId: string;
}

export function LearnerDetail({ learnerId }: LearnerDetailProps) {
  const { data: learnerDetail } = useSuspenseQuery(learnerQueryOptions(learnerId));
  const { submissionsByModule } = learnerDetail;

  // D-08: render only modules where the learner has at least one submission.
  // Empty state: zero modules → centered message with Icons.forms (UI-SPEC §Surface 1).
  const moduleIds = Object.keys(submissionsByModule);
  if (moduleIds.length === 0) {
    return (
      <div className='bg-card flex flex-col items-center justify-center gap-3 rounded-md border py-12 text-center'>
        <Icons.forms className='text-muted-foreground h-8 w-8' aria-hidden='true' />
        <h2 className='text-brand-teal text-lg font-semibold'>No submissions yet</h2>
        <p className='text-muted-foreground max-w-sm text-sm'>
          This learner has not submitted any work yet.
        </p>
      </div>
    );
  }

  // D-05: sort modules by num ascending. Unknown moduleIds (defensive) sort last.
  const sortedModuleIds = moduleIds.toSorted((a, b) => {
    const ma = MODULES.find((m) => m.id === a)?.num ?? 99;
    const mb = MODULES.find((m) => m.id === b)?.num ?? 99;
    return ma - mb;
  });

  return (
    <div className='flex flex-col gap-4'>
      {sortedModuleIds.map((moduleId) => {
        const mod = MODULES.find((m) => m.id === moduleId);
        const code = mod ? `M${String(mod.num).padStart(2, '0')}` : moduleId;
        const title = mod?.title ?? '';
        // D-05 row sort: submittedAt DESC, attemptNum DESC tiebreaker.
        const subs = submissionsByModule[moduleId].toSorted((a, b) => {
          const tsCmp = (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
          return tsCmp !== 0 ? tsCmp : b.attemptNum - a.attemptNum;
        });
        return (
          <Card key={moduleId}>
            <CardHeader>
              <h2 className='text-brand-teal text-base font-semibold'>
                {code} · {title}
              </h2>
            </CardHeader>
            <CardContent className='flex flex-col'>
              {subs.map((submission, i) => (
                <div key={submission.id}>
                  {i > 0 && <Separator />}
                  <SubmissionRow submission={submission} />
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

interface SubmissionRowProps {
  submission: SubmissionSummary;
}

// Stretched-link pattern from learners-table.tsx lines 53-67: single <Link>
// per row, after:absolute after:inset-0 expands the click target to the
// whole row, parent gets `relative`. Single keyboard stop per row.
function SubmissionRow({ submission }: SubmissionRowProps) {
  const href = `/dashboard/teach/submissions/${submission.id}`;
  const dateLabel = formatSubmittedAt(submission.submittedAt);
  return (
    <div className='hover:bg-brand-cream relative flex flex-wrap items-center gap-2 py-3 transition'>
      <Link
        href={href}
        aria-label={`Open submission ${submission.id}`}
        className='focus-visible:ring-brand-teal after:absolute after:inset-0 focus:outline-none focus-visible:ring-2'
      >
        <span className='sr-only'>Open submission</span>
      </Link>
      <Badge variant='outline'>
        {submission.type === 'recording' ? 'Recording' : 'Conversation'}
      </Badge>
      <Badge variant='secondary'>Att {submission.attemptNum}</Badge>
      <Badge variant='outline'>{submission.status}</Badge>
      {submission.reviewedAt ? (
        <Badge className='bg-brand-sage/20 text-brand-teal border-brand-sage'>
          Reviewed
        </Badge>
      ) : (
        <Badge variant='outline' className='text-muted-foreground'>
          Needs review
        </Badge>
      )}
      <span className='text-muted-foreground ml-auto text-sm'>{dateLabel}</span>
    </div>
  );
}

function formatSubmittedAt(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return format(date, 'MMM d, yyyy');
}
