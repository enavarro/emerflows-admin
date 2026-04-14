import { Suspense } from 'react';
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { spendQueryOptions, tokensQueryOptions } from '../api/queries';
import { SpendGauge } from './spend-gauge';
import { TokensTable } from './tokens-table';

export default function DemosListingPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(tokensQueryOptions());
  void queryClient.prefetchQuery(spendQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='space-y-6'>
        <Suspense fallback={<div className='bg-muted h-24 animate-pulse rounded-md' />}>
          <SpendGauge />
        </Suspense>
        <Suspense fallback={<div className='bg-muted h-48 animate-pulse rounded-md' />}>
          <TokensTable />
        </Suspense>
      </div>
    </HydrationBoundary>
  );
}
