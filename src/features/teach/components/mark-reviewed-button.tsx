'use client';

// TEMPORARY STUB — Plan 03-06 replaces this with the real mark-reviewed
// control (Mark as reviewed / Reviewed by instructor + Undo). Kept here so
// Plan 03-05's submission viewer route compiles in isolation.

import type { SubmissionSummary } from '@/features/teach/api/types';

interface MarkReviewedButtonProps {
  submission: SubmissionSummary;
}

export function MarkReviewedButton({ submission: _submission }: MarkReviewedButtonProps) {
  return (
    <span className='text-muted-foreground text-xs'>Mark-reviewed (Plan 06)</span>
  );
}
