import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// Server-only Supabase admin client (FND-05)
// ============================================================
// This module owns the service-role key. It is the only place in the
// codebase that should reference SUPABASE_SERVICE_ROLE_KEY.
//
// The `import 'server-only'` directive above causes Next.js to throw at
// build time if this file is reached from a client component, which
// prevents accidental shipping of the service-role key to the browser.
//
// Use this client ONLY for privileged reads required by Teach Admin
// (e.g. signed URLs for the private recordings bucket, joins across
// submissions/learners/profiles where RLS would otherwise filter data
// the admin is allowed to see).
//
// For session-bound reads where RLS is the desired behavior, use the
// SSR client from src/lib/supabase/server.ts instead.
// ============================================================

export const RECORDINGS_BUCKET = 'recordings' as const;
export const DEFAULT_SIGNED_URL_TTL_SEC = 300; // 5 minutes — matches SPK-02

let cachedAdminClient: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client authenticated with the service-role key.
 * Throws at module-load time if the required env vars are missing.
 *
 * Server-only: import errors at build time if reached from a client component.
 */
export function createAdminClient(): SupabaseClient {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  cachedAdminClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });

  return cachedAdminClient;
}

interface SignedRecordingUrlResult {
  signedUrl: string;
  expiresAt: string;
}

/**
 * Generates a short-TTL signed URL for a private recordings-bucket object.
 * Caller is responsible for verifying admin-role before calling this — this
 * helper does NOT check auth. RLS is bypassed because we use the service
 * role; gating happens in the route handler / RSC that invokes us.
 *
 * @param path Object path inside the `recordings` bucket
 *             (e.g. `spring-2026/<learner-uuid>/module-01-attempt-1.webm`)
 * @param ttlSec Lifetime of the signed URL in seconds. Capped at 5 minutes
 *               to satisfy SPK-02. Pass a smaller value for tighter scoping.
 */
export async function createSignedRecordingUrl(
  path: string,
  ttlSec: number = DEFAULT_SIGNED_URL_TTL_SEC
): Promise<SignedRecordingUrlResult> {
  if (!path || path.startsWith('/')) {
    throw new Error(`Invalid recording path: ${path}`);
  }
  if (ttlSec <= 0 || ttlSec > DEFAULT_SIGNED_URL_TTL_SEC) {
    throw new Error(`ttlSec must be between 1 and ${DEFAULT_SIGNED_URL_TTL_SEC} (got ${ttlSec})`);
  }

  const client = createAdminClient();
  const { data, error } = await client.storage
    .from(RECORDINGS_BUCKET)
    .createSignedUrl(path, ttlSec);

  if (error || !data) {
    throw new Error(`Failed to sign recording URL: ${error?.message ?? 'unknown error'}`);
  }

  const expiresAt = new Date(Date.now() + ttlSec * 1000).toISOString();
  return { signedUrl: data.signedUrl, expiresAt };
}
