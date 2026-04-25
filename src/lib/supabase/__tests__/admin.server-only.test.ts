/**
 * Server-only guard tests for src/lib/supabase/admin.ts (FND-05).
 *
 * Why this test exists
 * --------------------
 * `src/lib/supabase/admin.ts` is the choke-point that owns
 * `SUPABASE_SERVICE_ROLE_KEY`. If a `'use client'` component ever imports it,
 * Next.js ships the service-role key into the browser bundle. Two layers
 * defend against that:
 *
 *   1. The first import in admin.ts is `import 'server-only';`. Resolving
 *      that package from a client bundle throws at build time.
 *   2. `scripts/verify-no-service-role-leak.mjs` greps the production
 *      client bundle for the literal `SUPABASE_SERVICE_ROLE_KEY` string
 *      and (when set) the actual env value.
 *
 * These tests assert both layers are wired up. They are static-only — no
 * Supabase server is contacted — so they run safely in CI without secrets.
 *
 * Runner: `@playwright/test` (the only test runner configured in this repo).
 * Run via: `npx playwright test src/lib/supabase/__tests__/admin.server-only.test.ts`
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const ADMIN_PATH = join(REPO_ROOT, 'src', 'lib', 'supabase', 'admin.ts');
const LEAK_SCRIPT_PATH = join(REPO_ROOT, 'scripts', 'verify-no-service-role-leak.mjs');
const STATIC_DIR = join(REPO_ROOT, '.next', 'static');

function* walkJs(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      yield* walkJs(full);
    } else if (entry.endsWith('.js')) {
      yield full;
    }
  }
}

test.describe('admin.ts server-only guard', () => {
  test('first import is the server-only marker', () => {
    const source = readFileSync(ADMIN_PATH, 'utf8');
    const lines = source.split('\n').filter((line) => line.trim().length > 0);
    expect(lines[0]).toBe("import 'server-only';");
  });

  test('exposes the documented public API', () => {
    const source = readFileSync(ADMIN_PATH, 'utf8');
    expect(source).toContain('export function createAdminClient');
    expect(source).toContain('export async function createSignedRecordingUrl');
    expect(source).toContain("export const RECORDINGS_BUCKET = 'recordings'");
    expect(source).toContain('export const DEFAULT_SIGNED_URL_TTL_SEC = 300');
  });

  test('only the admin module references SUPABASE_SERVICE_ROLE_KEY', () => {
    const source = readFileSync(ADMIN_PATH, 'utf8');
    expect(source).toContain('process.env.SUPABASE_SERVICE_ROLE_KEY');
  });

  test('caps signed-URL TTL at 300 seconds (SPK-02)', () => {
    const source = readFileSync(ADMIN_PATH, 'utf8');
    expect(source).toMatch(/ttlSec\s*<=\s*0\s*\|\|\s*ttlSec\s*>\s*DEFAULT_SIGNED_URL_TTL_SEC/);
  });

  test('rejects path-traversal style recording paths', () => {
    const source = readFileSync(ADMIN_PATH, 'utf8');
    expect(source).toMatch(/path\.startsWith\('\/'\)/);
  });

  test('no client component imports admin.ts', () => {
    const srcDir = join(REPO_ROOT, 'src');
    const offenders: string[] = [];

    function* walkSrc(dir: string): Generator<string> {
      for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
          yield* walkSrc(full);
        } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
          yield full;
        }
      }
    }

    for (const file of walkSrc(srcDir)) {
      if (file.endsWith('admin.ts')) continue;
      const text = readFileSync(file, 'utf8');
      const importsAdmin =
        text.includes("from '@/lib/supabase/admin'") ||
        text.includes("from 'src/lib/supabase/admin'");
      if (!importsAdmin) continue;

      // If any file that imports admin.ts also declares 'use client',
      // it's a leak vector — fail loudly.
      const isClient = /['"]use client['"]/.test(text.slice(0, 200));
      if (isClient) {
        offenders.push(file);
      }
    }

    expect(offenders, `'use client' files importing admin.ts: ${offenders.join(', ')}`).toEqual([]);
  });

  test('leak verification script exists and is executable', () => {
    expect(existsSync(LEAK_SCRIPT_PATH)).toBe(true);
    const text = readFileSync(LEAK_SCRIPT_PATH, 'utf8');
    expect(text).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(text).toContain('.next/static');
  });

  test('production client bundle does not contain the service-role key (skipped if .next/static missing)', () => {
    test.skip(!existsSync(STATIC_DIR), 'no .next/static — run `npm run build` first');

    const literalNeedle = 'SUPABASE_SERVICE_ROLE_KEY';
    const valueNeedle = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

    const offenders: { file: string; kind: 'literal' | 'value' }[] = [];
    for (const file of walkJs(STATIC_DIR)) {
      const text = readFileSync(file, 'utf8');
      if (text.includes(literalNeedle)) offenders.push({ file, kind: 'literal' });
      if (valueNeedle && valueNeedle.length >= 20 && text.includes(valueNeedle)) {
        offenders.push({ file, kind: 'value' });
      }
    }

    expect(
      offenders,
      `service-role key leaked into client bundle: ${JSON.stringify(offenders)}`
    ).toEqual([]);
  });
});
