'use client';

import { useSuspenseQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { submissionQueryOptions } from '@/features/teach/api/queries';
import type { RecordingPayload, RecordingTip } from '@/features/teach/api/types';
import { TranscriptLine } from './transcript-line';
import { TipCard } from './tip-card';
import { AudioUnavailableNotice } from './audio-unavailable-notice';

interface SubmissionViewerRecordingProps {
  submissionId: string;
}

const TIP_CATEGORY_LABEL: Record<RecordingTip['category'], string> = {
  pronunciation: 'Pronunciation',
  delivery: 'Delivery'
};

export function SubmissionViewerRecording({ submissionId }: SubmissionViewerRecordingProps) {
  const { data: detail } = useSuspenseQuery(submissionQueryOptions(submissionId));
  // detail.submission.type is narrowed to 'recording' by the parent router
  // (submission-viewer.tsx). The payload cast is safe; service.ts (Plan 01)
  // attaches the matching shape.
  const payload = detail.payload as RecordingPayload;
  const audioUrl = detail.signedAudioUrl?.url;

  // SPK-05: group tips by category. Iterate categories in fixed order so
  // pronunciation always appears before delivery. Empty categories are
  // skipped (no header for an empty group).
  const tipsByCategory: Record<RecordingTip['category'], RecordingTip[]> = {
    pronunciation: [],
    delivery: []
  };
  for (const tip of payload.tips) {
    tipsByCategory[tip.category].push(tip);
  }
  const orderedCategories: RecordingTip['category'][] = ['pronunciation', 'delivery'];
  const nonEmptyCategories = orderedCategories.filter((c) => tipsByCategory[c].length > 0);

  return (
    <div className='flex flex-col gap-6'>
      {/* Section 1 — Audio (D-02, D-10, SPK-02, SPK-06) */}
      {audioUrl ? (
        <Card>
          <CardHeader>
            <h3 className='text-muted-foreground text-sm font-semibold uppercase tracking-wider'>
              Recording
            </h3>
          </CardHeader>
          <CardContent>
            <audio controls src={audioUrl} className='w-full'>
              Your browser does not support the audio element.
            </audio>
          </CardContent>
        </Card>
      ) : (
        <AudioUnavailableNotice />
      )}

      {/* Section 2 — Transcript (SPK-03, SPK-04) */}
      <Card>
        <CardHeader>
          <h3 className='text-muted-foreground text-sm font-semibold uppercase tracking-wider'>
            Transcript
          </h3>
        </CardHeader>
        <CardContent>
          <div className='flex flex-col gap-3'>
            {payload.recordingTranscript.map((entry, i) => (
              <TranscriptLine key={i} entry={entry} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 3 — Coaching Tips (SPK-05). Omit entirely when empty. */}
      {payload.tips.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className='text-muted-foreground text-sm font-semibold uppercase tracking-wider'>
              Coaching Tips
            </h3>
          </CardHeader>
          <CardContent>
            <div className='flex flex-col gap-6'>
              {nonEmptyCategories.map((category) => (
                <div key={category} className='flex flex-col gap-3'>
                  <p className='text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-wider'>
                    {category === 'pronunciation' ? (
                      <Icons.mic className='h-3 w-3' aria-hidden='true' />
                    ) : (
                      <Icons.sparkle className='h-3 w-3' aria-hidden='true' />
                    )}
                    {TIP_CATEGORY_LABEL[category]}
                  </p>
                  {tipsByCategory[category].map((tip, i) => (
                    <TipCard key={i} tip={tip.tip} />
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
