'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface PolishedIntroCalloutProps {
  introduction: string;
}

export function PolishedIntroCallout({ introduction }: PolishedIntroCalloutProps) {
  return (
    <Card className='bg-brand-teal text-brand-cream'>
      <CardHeader>
        <h3 className='text-brand-cream/60 text-xs font-semibold uppercase tracking-wider'>
          Polished Self-Introduction
        </h3>
      </CardHeader>
      <CardContent>
        <blockquote className='text-brand-cream text-base italic leading-relaxed'>
          &ldquo;{introduction}&rdquo;
        </blockquote>
      </CardContent>
    </Card>
  );
}
