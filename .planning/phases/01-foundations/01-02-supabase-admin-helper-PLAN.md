---
phase: 01-foundations
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/supabase/admin.ts
  - src/lib/supabase/__tests__/admin.server-only.test.ts
autonomous: true
requirements:
  - FND-05
must_haves:
  truths:
    - 'A server-only Supabase admin client helper exists at src/lib/supabase/admin.ts'
    - 'Importing it from a client component triggers a build-time error (server-only marker)'
    - 'The helper uses SUPABASE_SERVICE_ROLE_KEY (server env, not NEXT_PUBLIC_*)'
    - 'The helper exposes (a) a privileged Postgres client and (b) a typed signed-URL helper for the recordings bucket with TTL <= 5 minutes'
    - 'Production client bundle does not contain SUPABASE_SERVICE_ROLE_KEY (verified via build output search)'
  artifacts:
    - path: 'src/lib/supabase/admin.ts'
      provides: 'createAdminClient() and createSignedRecordingUrl() — server-only'
      exports:
        - 'createAdminClient'
        - 'createSignedRecordingUrl'
        - 'RECORDINGS_BUCKET'
        - 'DEFAULT_SIGNED_URL_TTL_SEC'
      min_lines: 40
  key_links:
    - from: 'src/lib/supabase/admin.ts'
      to: 'process.env.SUPABASE_SERVICE_ROLE_KEY'
      via: 'createClient (from @supabase/supabase-js)'
      pattern: "process\\.env\\.SUPABASE_SERVICE_ROLE_KEY"
    - from: 'src/lib/supabase/admin.ts'
      to: "import 'server-only'"
      via: 'top-of-file marker'
      pattern: "import\\s+'server-only'"
---

<objective>
Add a server-only Supabase admin client helper at `src/lib/supabase/admin.ts` that:
1. Wraps `createClient` from `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` for privileged reads (joins across `submissions`, `learners`, `profiles`).
2. Exposes a typed `createSignedRecordingUrl(path, ttlSec?)` helper that returns short-TTL signed URLs (default 5 min) from the private `recordings` bucket.
3. Is marked `import 'server-only'` so any accidental import from a client component fails at build time.

Purpose: Phases 2 and 3 will read submissions data and stream private audio to admins. The admin helper is the choke-point that owns the service-role key — every privileged read goes through this one file. Without `'server-only'`, any future code that accidentally imports it from a `'use client'` component would silently ship the service-role key in the browser bundle.

Output:
- `src/lib/supabase/admin.ts` — new module with `createAdminClient`, `createSignedRecordingUrl`, `RECORDINGS_BUCKET` const, `DEFAULT_SIGNED_URL_TTL_SEC` const
- `src/lib/supabase/__tests__/admin.server-only.test.ts` — Playwright/node smoke verifying client-bundle absence (deferred to verify task — no Vitest configured)
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/codebase/STACK.md
@.planning/codebase/INTEGRATIONS.md
@CLAUDE.md
@src/lib/supabase/client.ts
@src/lib/supabase/server.ts
@src/lib/supabase/middleware.ts

<interfaces>
<!-- Existing Supabase client surface — DO NOT touch these files. -->
<!-- src/lib/supabase/client.ts: createClient() => browser client (anon key) -->
<!-- src/lib/supabase/server.ts: async createClient() => SSR client (anon key, cookie-bound session) -->
<!-- src/lib/supabase/middleware.ts: updateSession(req) -->
<!-- @supabase/supabase-js v2.101.1 exports: -->
<!--   createClient<Database>(url, key, options): SupabaseClient<Database> -->
<!--   SupabaseClient<Database>.storage.from(bucket).createSignedUrl(path, expiresIn): Promise<{ data: { signedUrl: string } | null, error: Error | null }> -->
<!-- Recordings bucket: 'recordings' (per supabase/migrations/00002_create_recordings_bucket.sql) -->
<!-- Path pattern: recordings/<cohort>/<learner-uuid>/module-XX-attempt-N.webm (per AGENTS.md) -->
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Write src/lib/supabase/admin.ts with server-only marker</name>
  <files>src/lib/supabase/admin.ts</files>
  <read_first>
    - src/lib/supabase/client.ts (existing browser client pattern)
    - src/lib/supabase/server.ts (existing SSR client pattern, async + cookies)
    - .planning/codebase/INTEGRATIONS.md (Supabase env var conventions, recordings bucket)
    - CLAUDE.md (Constraints — service-role key MUST NOT leak to browser; signed URLs short TTL)
  </read_first>
  <action>
Create `src/lib/supabase/admin.ts` with EXACTLY this content (preserve formatting per project oxfmt rules — single quotes, 2-space indent, no trailing commas, semicolons):

```typescript
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
    throw new Error(
      `ttlSec must be between 1 and ${DEFAULT_SIGNED_URL_TTL_SEC} (got ${ttlSec})`
    );
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
```

Notes for executor:
- Do NOT modify `src/lib/supabase/client.ts` or `server.ts` — those are anon-key clients used elsewhere.
- The `'server-only'` package is already a transitive dep of Next.js — no install required. If the build complains it cannot resolve `server-only`, add it explicitly: `npm install server-only` (it is a standard Next.js helper).
- Singleton caching on `cachedAdminClient` is intentional — the service-role client maintains an internal connection pool; we want one per server instance.
  </action>
  <acceptance_criteria>
    - `test -f src/lib/supabase/admin.ts` succeeds
    - `grep -c "^import 'server-only';" src/lib/supabase/admin.ts` returns 1
    - `grep -c 'export function createAdminClient' src/lib/supabase/admin.ts` returns 1
    - `grep -c 'export async function createSignedRecordingUrl' src/lib/supabase/admin.ts` returns 1
    - `grep -c "export const RECORDINGS_BUCKET = 'recordings'" src/lib/supabase/admin.ts` returns 1
    - `grep -c 'export const DEFAULT_SIGNED_URL_TTL_SEC = 300' src/lib/supabase/admin.ts` returns 1
    - `grep -c 'process.env.SUPABASE_SERVICE_ROLE_KEY' src/lib/supabase/admin.ts` returns 1
    - `npx tsc --noEmit` (or project equivalent) reports zero errors for this file
  </acceptance_criteria>
  <verify>
    <automated>test -f src/lib/supabase/admin.ts && grep -q "^import 'server-only';" src/lib/supabase/admin.ts && grep -q 'export function createAdminClient' src/lib/supabase/admin.ts && grep -q 'export async function createSignedRecordingUrl' src/lib/supabase/admin.ts && npx --yes tsc --noEmit -p tsconfig.json 2>&1 | tee /tmp/tsc-admin.log | (! grep -E 'src/lib/supabase/admin\\.ts.*error' /tmp/tsc-admin.log)</automated>
  </verify>
  <done>File exists with the specified exports, server-only marker, and passes TypeScript strict-mode compilation.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Verify service-role key is absent from production client bundle</name>
  <files>scripts/verify-no-service-role-leak.mjs</files>
  <read_first>
    - src/lib/supabase/admin.ts (the file we just wrote)
    - next.config.ts (build configuration)
    - package.json (build script)
  </read_first>
  <action>
Create a verification script `scripts/verify-no-service-role-leak.mjs` that:
1. Runs `next build` (no-op if `.next` already exists and is fresh; otherwise builds).
2. Greps the `.next/static/**/*.js` output for the literal string `SUPABASE_SERVICE_ROLE_KEY` and for the actual env value if `SUPABASE_SERVICE_ROLE_KEY` is set in the environment.
3. Exits with code 0 if neither appears in the client bundle, code 1 otherwise.

Exact script content:

```javascript
#!/usr/bin/env node
// Verifies that SUPABASE_SERVICE_ROLE_KEY does not leak into the Next.js
// client bundle. Run after `next build` (or as a CI gate).

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const STATIC_DIR = '.next/static';

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walk(full);
    } else if (entry.endsWith('.js')) {
      yield full;
    }
  }
}

function main() {
  if (!existsSync(STATIC_DIR)) {
    console.error(`Missing ${STATIC_DIR}. Run \`next build\` first.`);
    process.exit(2);
  }

  const literalNeedle = 'SUPABASE_SERVICE_ROLE_KEY';
  const valueNeedle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

  const offenders = [];
  for (const file of walk(STATIC_DIR)) {
    const text = readFileSync(file, 'utf8');
    if (text.includes(literalNeedle)) offenders.push({ file, kind: 'literal' });
    if (valueNeedle && valueNeedle.length >= 20 && text.includes(valueNeedle)) {
      offenders.push({ file, kind: 'value' });
    }
  }

  if (offenders.length === 0) {
    console.log('OK — service-role key not present in client bundle.');
    process.exit(0);
  }

  console.error('LEAK DETECTED — service-role key present in client bundle:');
  for (const o of offenders) console.error(`  [${o.kind}] ${o.file}`);
  process.exit(1);
}

main();
```

Then run the verification once:

```bash
npm run build && node scripts/verify-no-service-role-leak.mjs
```

If the build fails, fix the failure (most likely cause: `'server-only'` package not installed — run `npm install server-only` and retry). If the leak check fails, do NOT proceed — investigate which client file imports `admin.ts` and refactor.
  </action>
  <acceptance_criteria>
    - `test -f scripts/verify-no-service-role-leak.mjs` succeeds
    - `npm run build` completes with exit code 0
    - `node scripts/verify-no-service-role-leak.mjs` exits 0 and prints `OK — service-role key not present in client bundle.`
    - `grep -rE 'from .@/lib/supabase/admin.|from .src/lib/supabase/admin.' src/ --include='*.tsx' --include='*.ts' | grep -v 'src/lib/supabase/admin' | xargs -I {} sh -c 'head -3 "{}" | grep -q "use client" && echo LEAK:{}' 2>/dev/null` returns no LEAK lines (no `'use client'` file imports admin.ts)
  </acceptance_criteria>
  <verify>
    <automated>test -f scripts/verify-no-service-role-leak.mjs && npm run build && node scripts/verify-no-service-role-leak.mjs</automated>
  </verify>
  <done>Build succeeds; verification script confirms zero occurrences of the service-role key string in the client bundle.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Server runtime → Postgres (service role) | The admin client bypasses RLS; trust = service-role key |
| Server runtime → Supabase Storage | Signed-URL generation uses service role; URL is then handed to the browser with short TTL |
| Server bundle → Client bundle | Next.js code-split must not include service-role key |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-02-01 | Information Disclosure | `SUPABASE_SERVICE_ROLE_KEY` leaked into client bundle | mitigate | `import 'server-only'` at top of admin.ts; build-time verification script greps `.next/static/**` for the literal string and the actual env value (Task 2) |
| T-01-02-02 | Elevation of Privilege | Service-role client used in unauthenticated route handler | mitigate | Helper does not authenticate the caller — comment on `createSignedRecordingUrl` mandates the calling RSC/route handler enforces admin role first; FND-02 layout gate provides the outer ring |
| T-01-02-03 | Information Disclosure | Long-lived signed URLs leak audio | mitigate | `DEFAULT_SIGNED_URL_TTL_SEC = 300` (5 min); `ttlSec` parameter is hard-capped at 300 with explicit error; satisfies SPK-02 |
| T-01-02-04 | Tampering | Path-traversal via crafted recording path (`../../`) | mitigate | `createSignedRecordingUrl` rejects paths starting with `/`; Supabase storage path resolution itself prevents escaping the bucket; further validation happens in the consuming Phase 3 viewer (path is derived from server-side `submissions.payload.audioPath`, not user input) |
| T-01-02-05 | Denial of Service | Misconfigured env crashes admin pages | accept | Helper throws on missing env at first invocation; route handlers should catch and 500; trade-off is fail-closed which is preferred over silent fallback to anon key |
</threat_model>

<verification>
- Task 1 acceptance criteria: file written with exports + server-only marker, tsc clean
- Task 2 acceptance criteria: build succeeds, leak-detection script exits 0
- All 5 must_haves satisfied
</verification>

<success_criteria>
1. `src/lib/supabase/admin.ts` exists with `createAdminClient`, `createSignedRecordingUrl`, `RECORDINGS_BUCKET`, `DEFAULT_SIGNED_URL_TTL_SEC` exports.
2. The file starts with `import 'server-only';`.
3. `npm run build` followed by `node scripts/verify-no-service-role-leak.mjs` reports the key absent from the client bundle.
4. No file with a `'use client'` directive imports `src/lib/supabase/admin.ts`.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations/01-02-SUMMARY.md` with:
- Path of admin.ts and the verification script
- Output of `node scripts/verify-no-service-role-leak.mjs`
- Whether `server-only` package needed explicit install
</output>
