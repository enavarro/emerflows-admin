'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { markReviewedMutation } from '@/features/teach/api/mutations';
import { submissionQueryOptions } from '@/features/teach/api/queries';
import type { SubmissionSummary } from '@/features/teach/api/types';

interface MarkReviewedButtonProps {
  submissionId: string;
  // Server-resolved snapshot used as initial fallback so the header renders
  // with no flash before HydrationBoundary populates the singleton cache.
  initialSubmission: SubmissionSummary;
}

export function MarkReviewedButton({
  submissionId,
  initialSubmission
}: MarkReviewedButtonProps) {
  // Subscribe to the submission cache so post-mutation setQueryData updates
  // trigger a re-render. enabled:false prevents the throwing placeholder
  // queryFn in queries.ts from running — this hook is purely a cache reader.
  const { data: detail } = useQuery({
    ...submissionQueryOptions(submissionId),
    enabled: false
  });
  const submission = detail?.submission ?? initialSubmission;

  const mutation = useMutation({
    ...markReviewedMutation,
    onSuccess: (_data, vars) =>
      toast.success(vars.reviewed ? 'Submission marked as reviewed' : 'Review undone'),
    onError: (err) => toast.error(err.message)
  });

  const handleMark = () =>
    mutation.mutate({ submissionId: submission.id, reviewed: true });
  const handleUndo = () =>
    mutation.mutate({ submissionId: submission.id, reviewed: false });

  // State: reviewed — show "Reviewed by instructor on <date>" + Undo (D-06, D-07).
  if (submission.reviewedAt) {
    const formatted = format(new Date(submission.reviewedAt), 'MMM d, yyyy');
    return (
      <div className='flex items-center gap-3'>
        <span className='text-muted-foreground flex items-center gap-2 text-sm'>
          <Icons.check className='text-brand-sage h-4 w-4' aria-hidden='true' />
          Reviewed by instructor on {formatted}
        </span>
        <Button
          variant='ghost'
          size='sm'
          onClick={handleUndo}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <Icons.spinner className='h-3 w-3 animate-spin' aria-hidden='true' />
          ) : (
            <>
              <Icons.undo className='mr-1 h-3 w-3' aria-hidden='true' />
              Undo
            </>
          )}
        </Button>
      </div>
    );
  }

  // State: idle (or pending) — show teal CTA button.
  return (
    <Button
      onClick={handleMark}
      disabled={mutation.isPending}
      className='bg-brand-teal hover:bg-brand-teal/90 text-white'
    >
      {mutation.isPending ? (
        <>
          <Icons.spinner className='mr-2 h-4 w-4 animate-spin' aria-hidden='true' />
          Saving…
        </>
      ) : (
        <>
          <Icons.check className='mr-2 h-4 w-4' aria-hidden='true' />
          Mark as reviewed
        </>
      )}
    </Button>
  );
}
