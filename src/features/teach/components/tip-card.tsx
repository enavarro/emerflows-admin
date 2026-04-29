'use client';

interface TipCardProps {
  tip: string;
}

// UI-SPEC §Surface 2 §Section 3 (line 325): muted background, prose body,
// no per-tip category badge — category is rendered as a group header in
// the parent (submission-viewer-recording.tsx).
export function TipCard({ tip }: TipCardProps) {
  return (
    <div className='bg-muted/30 text-foreground rounded-md border p-3 text-sm leading-relaxed'>
      {tip}
    </div>
  );
}
