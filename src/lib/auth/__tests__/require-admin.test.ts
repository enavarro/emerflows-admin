/**
 * Static-source guard tests for src/lib/auth/require-admin.ts (FND-02).
 *
 * Why this test exists
 * --------------------
 * `requireAdmin()` is the server-side RBAC gate that every `/dashboard/teach/*`
 * route depends on. It MUST:
 *   1. Live behind `import 'server-only'` so it never ships to the client bundle.
 *   2. Use the SSR (anon-key) Supabase client, NOT the service-role admin client —
 *      the gate must validate the caller's own session, not a privileged one.
 *   3. Use `auth.getUser()` (server-validates the JWT against Supabase), NEVER
 *      `auth.getSession()` (cookie-only, forgeable).
 *   4. Redirect on every non-admin / unauthenticated path — no "default allow"
 *      branch may exist.
 *
 * These tests are static source inspections — they read the file as text and
 * assert structural invariants. No Supabase server is contacted, no React tree
 * is rendered. They run safely in CI without secrets.
 *
 * Runner: `@playwright/test` (the only test runner configured in this repo;
 * matches the precedent at src/lib/supabase/__tests__/admin.server-only.test.ts).
 * Run via: `npx playwright test src/lib/auth/__tests__/require-admin.test.ts`
 *
 * Behavioral redirect coverage (unauth → /auth/sign-in, educator → denied,
 * admin → pass-through) is verified by manual smoke test in Phase 1 and by
 * Playwright browser tests in Phase 4 — see plan 01-04 verification section.
 */

import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..', '..');
const REQUIRE_ADMIN_PATH = join(REPO_ROOT, 'src', 'lib', 'auth', 'require-admin.ts');
const TEACH_LAYOUT_PATH = join(REPO_ROOT, 'src', 'app', 'dashboard', 'teach', 'layout.tsx');
const TEACH_COHORTS_PAGE_PATH = join(
  REPO_ROOT,
  'src',
  'app',
  'dashboard',
  'teach',
  'cohorts',
  'page.tsx'
);

test.describe('require-admin.ts server-only RBAC gate', () => {
  test('first import is the server-only marker', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    const lines = source.split('\n').filter((line) => line.trim().length > 0);
    expect(lines[0]).toBe("import 'server-only';");
  });

  test('exposes the documented public API', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain('export async function requireAdmin');
    expect(source).toContain('export interface AdminSession');
  });

  test('uses the SSR (anon-key) Supabase client, not the service-role admin client', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain("from '@/lib/supabase/server'");
    expect(source).not.toContain("from '@/lib/supabase/admin'");
    expect(source).not.toContain('createAdminClient');
  });

  test('validates the JWT via getUser(), never getSession()', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain('supabase.auth.getUser()');
    expect(source).not.toContain('getSession');
  });

  test('queries profiles.role for the authenticated user', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain(".from('profiles')");
    expect(source).toContain(".select('role')");
    expect(source).toMatch(/\.eq\(\s*'id'\s*,\s*user!?\.id\s*\)/);
  });

  test('redirects unauthenticated callers to /auth/sign-in', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain("redirect(SIGN_IN_PATH)");
    expect(source).toMatch(/SIGN_IN_PATH\s*=\s*'\/auth\/sign-in'/);
  });

  test('redirects non-admins to /dashboard/overview?denied=teach', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain('redirect(DENIED_TEACH_PATH)');
    expect(source).toMatch(/DENIED_TEACH_PATH\s*=\s*'\/dashboard\/overview\?denied=teach'/);
  });

  test('only returns AdminSession on the explicit admin branch', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    // The only `return` in the function body must be the AdminSession success
    // path. Everything else funnels through `redirect()` which throws.
    expect(source).toMatch(/return\s*\{\s*user:\s*user!?\s*,\s*role:\s*'admin'\s*\}/);
    expect(source).toMatch(/profile\.role\s*!==\s*'admin'/);
  });

  test('preserves NEXT_REDIRECT sentinel in catch blocks', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain('isRedirectError');
    expect(source).toContain('NEXT_REDIRECT');
  });

  test('imports redirect from next/navigation', () => {
    const source = readFileSync(REQUIRE_ADMIN_PATH, 'utf8');
    expect(source).toContain("import { redirect } from 'next/navigation'");
  });

  test('teach layout exists, is a Server Component, and calls requireAdmin', () => {
    expect(existsSync(TEACH_LAYOUT_PATH)).toBe(true);
    const source = readFileSync(TEACH_LAYOUT_PATH, 'utf8');
    // Server Component: NEVER carries the 'use client' directive.
    expect(/['"]use client['"]/.test(source.slice(0, 200))).toBe(false);
    expect(source).toContain("from '@/lib/auth/require-admin'");
    expect(source).toContain('await requireAdmin()');
    expect(source).toContain('export default async function');
  });

  test('teach cohorts stub page exists, is a Server Component, and calls requireAdmin', () => {
    expect(existsSync(TEACH_COHORTS_PAGE_PATH)).toBe(true);
    const source = readFileSync(TEACH_COHORTS_PAGE_PATH, 'utf8');
    expect(/['"]use client['"]/.test(source.slice(0, 200))).toBe(false);
    expect(source).toContain("from '@/lib/auth/require-admin'");
    expect(source).toContain('await requireAdmin()');
    expect(source).toContain('export default async function');
  });

  test('no client component imports require-admin.ts', () => {
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
      if (file.endsWith('require-admin.ts')) continue;
      if (file.includes('__tests__')) continue;
      const text = readFileSync(file, 'utf8');
      const importsRequireAdmin =
        text.includes("from '@/lib/auth/require-admin'") ||
        text.includes("from 'src/lib/auth/require-admin'");
      if (!importsRequireAdmin) continue;

      const isClient = /['"]use client['"]/.test(text.slice(0, 200));
      if (isClient) {
        offenders.push(file);
      }
    }

    expect(
      offenders,
      `'use client' files importing require-admin.ts: ${offenders.join(', ')}`
    ).toEqual([]);
  });
});
