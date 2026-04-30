'use client';

import Link from 'next/link';

import { Icons } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { SubmissionSummary } from '@/features/teach/api/types';

interface SiblingTypeSwitcherProps {
  // All submissions for the same (learnerId, moduleId) — typically 1..4 entries.
  siblings: SubmissionSummary[];
  // Id of the submission currently being viewed; that button renders inert.
  currentSubmissionId: string;
}

export function SiblingTypeSwitcher({
  siblings,
  currentSubmissionId
}: SiblingTypeSwitcherProps) {
  const ordered = orderSubmissions(siblings);

  if (ordered.length === 0) {
    return null;
  }

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-muted-foreground text-xs uppercase tracking-wider'>
        Module submissions
      </span>
      <ToggleGroup
        type='single'
        value={currentSubmissionId}
        aria-label='Submission type'
        className='flex-wrap'
      >
        {ordered.map((s) => {
          const isActive = s.id === currentSubmissionId;
          const Icon = s.type === 'recording' ? Icons.mic : Icons.chat;
          const typeLabel = s.type === 'recording' ? 'Recording' : 'Conversation';
          const ariaLabel = `View ${typeLabel} attempt ${s.attemptNum}`;
          const inner = (
            <>
              <Icon className='h-3 w-3' aria-hidden='true' />
              {typeLabel} · Att {s.attemptNum}
            </>
          );
          return (
            <ToggleGroupItem
              key={s.id}
              value={s.id}
              aria-label={ariaLabel}
              asChild={!isActive}
            >
              {isActive ? (
                <span className='flex items-center gap-1'>{inner}</span>
              ) : (
                <Link
                  href={`/dashboard/teach/submissions/${s.id}`}
                  className='flex items-center gap-1'
                >
                  {inner}
                </Link>
              )}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}

// Order submissions for display. Recordings come before conversations
// (matches the natural learner workflow), and within a type, attempt 1
// before attempt 2. Pure function — exported for unit testing.
export function orderSubmissions(
  submissions: SubmissionSummary[] | undefined
): SubmissionSummary[] {
  if (!submissions || submissions.length === 0) return [];
  return [...submissions].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'recording' ? -1 : 1;
    }
    return a.attemptNum - b.attemptNum;
  });
}
