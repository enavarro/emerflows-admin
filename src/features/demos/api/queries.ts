import { queryOptions } from '@tanstack/react-query';
import { getSpend, listTokens } from './service';

export const demoKeys = {
  all: ['demos'] as const,
  tokens: () => [...demoKeys.all, 'tokens'] as const,
  spend: () => [...demoKeys.all, 'spend'] as const
};

export const tokensQueryOptions = () =>
  queryOptions({
    queryKey: demoKeys.tokens(),
    queryFn: () => listTokens()
  });

export const spendQueryOptions = () =>
  queryOptions({
    queryKey: demoKeys.spend(),
    queryFn: () => getSpend(),
    refetchInterval: 60_000
  });
