'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { spendQueryOptions } from '../api/queries';

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function SpendGauge() {
  const { data } = useSuspenseQuery(spendQueryOptions());
  const { date, spentCents, capCents } = data;
  const pct = capCents > 0 ? Math.min(100, (spentCents / capCents) * 100) : 0;
  const over = capCents > 0 && spentCents >= capCents;

  return (
    <div className='space-y-2 rounded-md border p-4'>
      <div className='flex items-baseline justify-between'>
        <div>
          <div className='text-sm font-medium'>Estimated demo spend today</div>
          <div className='text-muted-foreground text-xs'>
            {date} · estimate from per-call averages, not vendor-billed
          </div>
        </div>
        <div className='text-right'>
          <div className='text-2xl font-semibold'>{fmt(spentCents)}</div>
          <div className='text-muted-foreground text-xs'>cap {fmt(capCents)}</div>
        </div>
      </div>
      <div className='bg-muted h-2 w-full overflow-hidden rounded-full'>
        <div
          className={over ? 'bg-destructive h-full' : 'bg-primary h-full'}
          style={{ width: `${pct}%` }}
        />
      </div>
      {over && (
        <div className='text-destructive text-xs'>
          Daily cap reached — new billable calls will return 429 until UTC midnight.
        </div>
      )}
    </div>
  );
}
