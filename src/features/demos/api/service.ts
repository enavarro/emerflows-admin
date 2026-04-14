// Client-side service. Talks to /api/demos route handlers, which do the
// privileged work (Supabase auth check, JWT signing, Redis writes).

import { apiClient } from '@/lib/api-client';
import type { ListTokensResponse, MintTokenInput, MintTokenResponse, SpendResponse } from './types';

export async function listTokens(): Promise<ListTokensResponse> {
  return apiClient<ListTokensResponse>('/demos');
}

export async function mintToken(input: MintTokenInput): Promise<MintTokenResponse> {
  return apiClient<MintTokenResponse>('/demos', {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function revokeToken(jti: string): Promise<void> {
  await apiClient<{ ok: true }>(`/demos/${encodeURIComponent(jti)}`, {
    method: 'DELETE'
  });
}

export async function getSpend(): Promise<SpendResponse> {
  return apiClient<SpendResponse>('/demos/spend');
}
