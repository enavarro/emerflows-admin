'use client';

// TEMPORARY STUB — Plan 03-06 replaces this with the real conversation
// viewer (polished introduction callout + Q&A pairs + exercise summary).
// Kept here so Plan 03-05's submission-viewer.tsx router compiles in
// isolation; the type-branching switch in submission-viewer.tsx imports
// this name directly.

interface SubmissionViewerConversationProps {
  submissionId: string;
}

export function SubmissionViewerConversation({
  submissionId
}: SubmissionViewerConversationProps) {
  return (
    <p className='text-muted-foreground'>
      Conversation viewer (Plan 06): {submissionId}
    </p>
  );
}
