import { mutationOptions } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { mintToken, revokeToken } from './service';
import { demoKeys } from './queries';
import type { MintTokenInput } from './types';

export const mintTokenMutation = mutationOptions({
  mutationFn: (input: MintTokenInput) => mintToken(input),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: demoKeys.all });
  }
});

export const revokeTokenMutation = mutationOptions({
  mutationFn: (jti: string) => revokeToken(jti),
  onSuccess: () => {
    getQueryClient().invalidateQueries({ queryKey: demoKeys.all });
  }
});
