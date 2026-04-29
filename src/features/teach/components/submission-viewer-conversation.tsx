'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { submissionQueryOptions } from '@/features/teach/api/queries';
import type { ConversationPayload } from '@/features/teach/api/types';
import { PolishedIntroCallout } from './polished-intro-callout';
import { QAPair } from './qa-pair';

interface SubmissionViewerConversationProps {
  submissionId: string;
}

export function SubmissionViewerConversation({ submissionId }: SubmissionViewerConversationProps) {
  const { data: detail } = useSuspenseQuery(submissionQueryOptions(submissionId));
  // detail.submission.type narrowed to 'conversation' by the parent router.
  const payload = detail.payload as ConversationPayload;
  const pairCount = payload.classifiedPairs.length;

  return (
    <div className='flex flex-col gap-6'>
      {/* Section 1 — Polished Introduction (CNV-02). Omit when empty. */}
      {payload.introduction && payload.introduction.length > 0 && (
        <PolishedIntroCallout introduction={payload.introduction} />
      )}

      {/* Section 2 — Q&A Pairs (CNV-03) */}
      <Card>
        <CardHeader>
          <h3 className='text-muted-foreground text-sm font-semibold uppercase tracking-wider'>
            Conversation Q&amp;A
          </h3>
          <p className='text-muted-foreground text-xs'>{pairCount} pairs</p>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col divide-y'>
            {payload.classifiedPairs.map((pair, i) => (
              <QAPair key={i} pair={pair} index={i} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Exercise Summary (CNV-04). Omit when empty. */}
      {payload.exerciseSummary && payload.exerciseSummary.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className='text-muted-foreground flex items-center gap-2 text-sm font-semibold uppercase tracking-wider'>
              <Icons.sparkle className='h-4 w-4' aria-hidden='true' />
              Exercise Summary
            </h3>
          </CardHeader>
          <CardContent>
            <p className='text-foreground text-base italic leading-relaxed'>
              &ldquo;{payload.exerciseSummary}&rdquo;
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
