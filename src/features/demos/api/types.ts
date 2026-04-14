export interface DemoToken {
  jti: string;
  label: string;
  url: string;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  revoked: boolean;
}

export interface MintTokenInput {
  label: string;
}

export interface MintTokenResponse {
  token: DemoToken;
}

export interface ListTokensResponse {
  tokens: DemoToken[];
}

export interface SpendResponse {
  date: string;
  spentCents: number;
  capCents: number;
}
