import { Icons } from '@/components/icons';

// D-10 / SPK-06 / UI-SPEC §Surface 2 §Section 1: brand-cream notice
// rendered in the audio slot when signedAudioUrl is undefined (audioPath
// missing OR sign failure). No `'use client'` — this is a pure render
// component with no hooks or interactivity.
export function AudioUnavailableNotice() {
  return (
    <div className='bg-brand-cream text-muted-foreground flex items-center gap-3 rounded-md p-4 text-sm'>
      <Icons.alertCircle className='h-4 w-4 shrink-0' aria-hidden='true' />
      <span>Audio unavailable for this submission.</span>
    </div>
  );
}
