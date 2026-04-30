'use client';

import Link from 'next/link';

import { Icons } from '@/components/icons';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { ModuleType, SubmissionSummary } from '@/features/teach/api/types';

interface SiblingTypeSwitcherProps {
  // All submissions for the same (learnerId, moduleId) — typically 0..4 entries.
  siblings: SubmissionSummary[];
  // Type currently being viewed; the inactive type becomes the link target.
  currentType: ModuleType;
}

export function SiblingTypeSwitcher({
  siblings,
  currentType
}: SiblingTypeSwitcherProps) {
  const latest = pickLatestPerType(siblings);
  const recording = latest.recording;
  const conversation = latest.conversation;

  // Hide entirely when only one type exists.
  if (!recording || !conversation) {
    return null;
  }

  return (
    <div className='flex items-center gap-2'>
      <span className='text-muted-foreground text-xs uppercase tracking-wider'>
        Module submissions
      </span>
      <ToggleGroup type='single' value={currentType} aria-label='Submission type'>
        <ToggleGroupItem
          value='recording'
          aria-label='View recording submission'
          asChild={currentType !== 'recording'}
        >
          {currentType === 'recording' ? (
            <span className='flex items-center gap-1'>
              <Icons.mic className='h-3 w-3' aria-hidden='true' />
              Recording
            </span>
          ) : (
            <Link
              href={`/dashboard/teach/submissions/${recording.id}`}
              className='flex items-center gap-1'
            >
              <Icons.mic className='h-3 w-3' aria-hidden='true' />
              Recording
            </Link>
          )}
        </ToggleGroupItem>
        <ToggleGroupItem
          value='conversation'
          aria-label='View conversation submission'
          asChild={currentType !== 'conversation'}
        >
          {currentType === 'conversation' ? (
            <span className='flex items-center gap-1'>
              <Icons.chat className='h-3 w-3' aria-hidden='true' />
              Conversation
            </span>
          ) : (
            <Link
              href={`/dashboard/teach/submissions/${conversation.id}`}
              className='flex items-center gap-1'
            >
              <Icons.chat className='h-3 w-3' aria-hidden='true' />
              Conversation
            </Link>
          )}
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

interface LatestPerType {
  recording?: SubmissionSummary;
  conversation?: SubmissionSummary;
}

// Reduce a list of submissions to at most one per type (latest by
// submittedAt DESC, attemptNum DESC tiebreaker — matching the row sort in
// learner-detail.tsx:52-55).
export function pickLatestPerType(
  submissions: SubmissionSummary[] | undefined
): LatestPerType {
  if (!submissions || submissions.length === 0) {
    return {};
  }
  const sorted = [...submissions].sort((a, b) => {
    const tsCmp = (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
    return tsCmp !== 0 ? tsCmp : b.attemptNum - a.attemptNum;
  });
  const result: LatestPerType = {};
  for (const s of sorted) {
    if (s.type === 'recording' && !result.recording) {
      result.recording = s;
    } else if (s.type === 'conversation' && !result.conversation) {
      result.conversation = s;
    }
  }
  return result;
}
