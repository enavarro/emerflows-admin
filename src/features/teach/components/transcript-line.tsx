'use client';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { RecordingTranscriptEntry } from '@/features/teach/api/types';

// SPK-03 / D-03: classification → left-border color (CLAUDE.md transcript
// color rules — strong = brand-sage, needs improvement = amber).
const BORDER_BY_CLASSIFICATION: Record<RecordingTranscriptEntry['classification'], string> = {
  strong: 'border-brand-sage',
  'needs improvement': 'border-amber-500'
};

interface TranscriptLineProps {
  entry: RecordingTranscriptEntry;
}

export function TranscriptLine({ entry }: TranscriptLineProps) {
  const borderClass = BORDER_BY_CLASSIFICATION[entry.classification];
  return (
    <div className={`border-l-2 ${borderClass} py-1 pl-3`}>
      <p className='text-foreground text-base leading-relaxed'>
        {entry.words.length > 0
          ? entry.words.map((w, i) => (
              <span key={i}>
                {i > 0 && ' '}
                {w.pronunciation ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className='decoration-brand-sage cursor-default underline decoration-dotted decoration-1'>
                        {w.word}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{w.pronunciation}</TooltipContent>
                  </Tooltip>
                ) : (
                  <span>{w.word}</span>
                )}
              </span>
            ))
          : entry.text}
      </p>
    </div>
  );
}
