'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ClassifiedPair, ConversationFlag } from '@/features/teach/api/types';

interface QAPairProps {
  pair: ClassifiedPair;
  index: number;
}

interface AnswerFragment {
  text: string;
  flag?: ConversationFlag;
}

// Build an ordered array of fragments for the answer string.
// For each flag with a non-empty `word`, find the FIRST occurrence in the
// remaining unmatched answer text and split there. Flags with empty word
// are pair-level (no inline highlight) — skip per UI-SPEC line 427.
function splitAnswer(answer: string, flags: ConversationFlag[]): AnswerFragment[] {
  const inlineFlags = flags.filter((f) => f.word && f.word.length > 0);
  if (inlineFlags.length === 0) {
    return [{ text: answer }];
  }

  const fragments: AnswerFragment[] = [];
  let cursor = 0;
  for (const flag of inlineFlags) {
    const idx = answer.indexOf(flag.word, cursor);
    if (idx < 0) continue; // word not found — skip silently (defensive)
    if (idx > cursor) {
      fragments.push({ text: answer.slice(cursor, idx) });
    }
    fragments.push({ text: flag.word, flag });
    cursor = idx + flag.word.length;
  }
  if (cursor < answer.length) {
    fragments.push({ text: answer.slice(cursor) });
  }
  return fragments;
}

export function QAPair({ pair, index }: QAPairProps) {
  const fragments = splitAnswer(pair.answer, pair.flags);
  return (
    <div className='flex flex-col gap-2 py-4 first:pt-0 last:pb-0'>
      <p className='text-muted-foreground text-xs font-semibold uppercase tracking-wider'>
        Q{index + 1}
      </p>
      <p className='text-muted-foreground text-sm'>{pair.question}</p>
      <p className='text-muted-foreground mt-1 text-xs font-semibold uppercase tracking-wider'>
        Answer
      </p>
      <p className='text-foreground text-base leading-relaxed'>
        {fragments.map((frag, i) =>
          frag.flag ? (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <span className='decoration-amber-500 cursor-pointer underline decoration-dotted decoration-2'>
                  {frag.text}
                </span>
              </PopoverTrigger>
              <PopoverContent className='w-72 p-3'>
                <p className='text-muted-foreground mb-1 text-xs uppercase tracking-wider'>
                  Issue
                </p>
                <p className='text-foreground mb-2 text-sm'>{frag.flag.issue}</p>
                <p className='text-muted-foreground mb-1 text-xs uppercase tracking-wider'>
                  Suggestion
                </p>
                <p className='text-foreground font-mono text-sm'>{frag.flag.suggestion}</p>
              </PopoverContent>
            </Popover>
          ) : (
            <span key={i}>{frag.text}</span>
          )
        )}
      </p>
    </div>
  );
}
