---
phase: 01-foundations
plan: 04
type: execute
wave: 2
depends_on: [01-03]
files_modified:
  - src/app/dashboard/teach/layout.tsx
  - src/app/dashboard/teach/cohorts/page.tsx
  - src/lib/auth/require-admin.ts
autonomous: true
requirements: [FND-02]
must_haves:
  truths:
    - "Unauthenticated users hitting /dashboard/teach/* redirect to /auth/sign-in"
    - "Authenticated users without profiles.role = 'admin' redirect to /dashboard/overview?denied=teach"
    - "Authenticated admins pass through to the teach route children"
    - "RBAC check runs server-side using Supabase SSR client (anon key, not service role)"
    - "Stub /dashboard/teach/cohorts page exists so the gate has a route to protect"
  artifacts:
    - path: "src/lib/auth/require-admin.ts"
      provides: "Server-only requireAdmin() helper that returns the admin user or redirects"
      exports: ["requireAdmin"]
    - path: "src/app/dashboard/teach/layout.tsx"
      provides: "Server layout that calls requireAdmin() before rendering Teach routes"
      contains: "requireAdmin"
    - path: "src/app/dashboard/teach/cohorts/page.tsx"
      provides: "Stub cohorts page so the gate protects a real route"
      contains: "export default"
  key_links:
    - from: "src/app/dashboard/teach/layout.tsx"
      to: "src/lib/auth/require-admin.ts"
      via: "import"
      pattern: "from '@/lib/auth/require-admin'"
    - from: "src/lib/auth/require-admin.ts"
      to: "src/lib/supabase/server.ts"
      via: "import"
      pattern: "from '@/lib/supabase/server'"
    - from: "src/lib/auth/require-admin.ts"
      to: "next/navigation redirect"
      via: "redirect()"
      pattern: "redirect\\("
---

<objective>
Establish server-side RBAC for every `/dashboard/teach/*` route so that only admins
(profiles.role = 'admin') can reach Teach Admin surfaces. Non-admins redirect with a
clear deny reason; unauthenticated users redirect to sign-in. The gate must use the
SSR Supabase client (anon key) — never the service-role admin client — to validate the
caller's own session, and must never be a client-side check.

Purpose: FND-02 — security boundary that everything else in this milestone depends on.
Output: A reusable `requireAdmin()` helper, a Teach segment layout that calls it on
every render of every nested route, and a stub `/dashboard/teach/cohorts` page so the
gate has a real route to guard.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/ARCHITECTURE.md
@docs/nav-rbac.md
@CLAUDE.md
@src/lib/supabase/server.ts
@src/lib/supabase/middleware.ts
@src/hooks/use-auth.ts
@src/app/dashboard/layout.tsx

<interfaces>
<!-- The executor MUST NOT explore the codebase to discover these. They are the contract. -->

From src/lib/supabase/server.ts (already exists):
```typescript
export async function createClient(): Promise<SupabaseClient>;
// Uses NEXT_PUBLIC_SUPABASE_ANON_KEY + cookies(). Anon-key SSR client.
// Returns a Supabase client that respects RLS for the calling user.
```

From src/types/index.ts (already exists):
```typescript
export type UserRole = 'admin' | 'educator';
```

From `next/navigation` (Next.js 16):
```typescript
import { redirect } from 'next/navigation';
// redirect(path: string): never — throws NEXT_REDIRECT, propagates as expected
```

From `@supabase/supabase-js` (via `createClient()` above):
```typescript
const supabase = await createClient();
const { data: { user }, error } = await supabase.auth.getUser();
// IMPORTANT: use getUser() (server-validates session) not getSession() (cookie-only)
```

profiles table shape (relevant columns only):
```sql
-- profiles is created upstream (not in this repo's migrations)
-- columns relevant here:
--   id        uuid (FK to auth.users.id)
--   role      text  -- 'admin' | 'educator'
```
</interfaces>

<read_first_global>
The executor must read these BEFORE writing any task code:
- `src/lib/supabase/server.ts` — confirm `createClient()` signature and that it is async.
- `src/lib/supabase/middleware.ts` — note that middleware already redirects unauthenticated users on `/dashboard/*`; this layer adds role enforcement on top.
- `docs/nav-rbac.md` — confirm `'admin' | 'educator'` role values match the profiles.role check in this plan.
- `src/app/dashboard/layout.tsx` — confirm the parent dashboard layout is already an async Server Component, so this nested layout can be too.
</read_first_global>

</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create requireAdmin() server helper</name>
  <files>src/lib/auth/require-admin.ts, src/lib/auth/require-admin.test.ts</files>
  <read_first>
    - src/lib/supabase/server.ts (full file) — to confirm `createClient()` returns an awaitable client
    - src/types/index.ts (UserRole) — to confirm 'admin' | 'educator' literal union
  </read_first>
  <behavior>
    - Test 1: when `supabase.auth.getUser()` returns no user, requireAdmin() must call `redirect('/auth/sign-in')` (next/navigation). Mock `redirect` to throw a sentinel error so we can assert.
    - Test 2: when getUser() returns a user but profiles row is missing, requireAdmin() must call `redirect('/dashboard/overview?denied=teach')`.
    - Test 3: when getUser() returns a user and profiles.role === 'educator', requireAdmin() must call `redirect('/dashboard/overview?denied=teach')`.
    - Test 4: when getUser() returns a user and profiles.role === 'admin', requireAdmin() must return `{ user, role: 'admin' }` without redirecting.
    - Test 5: when getUser() throws or returns an error object, requireAdmin() must call `redirect('/auth/sign-in')` (treat error as unauthenticated, do NOT leak the error to the route).
  </behavior>
  <action>
Create `src/lib/auth/require-admin.ts` with EXACTLY this content (whitespace and quotes per project oxfmt config — single quotes, semicolons, 2-space indent):

```typescript
import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

const SIGN_IN_PATH = '/auth/sign-in';
const DENIED_TEACH_PATH = '/dashboard/overview?denied=teach';

export interface AdminSession {
  user: User;
  role: Extract<UserRole, 'admin'>;
}

/**
 * Server-only RBAC gate for Teach Admin surfaces.
 * - Redirects unauthenticated callers to /auth/sign-in.
 * - Redirects authenticated non-admins to /dashboard/overview?denied=teach.
 * - Returns the validated admin session on success.
 *
 * MUST be called from Server Components, Route Handlers, or Server Actions.
 * MUST NOT be called from client components — `import 'server-only'` enforces this.
 */
export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();

  let user: User | null = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user) {
      redirect(SIGN_IN_PATH);
    }
    user = data.user;
  } catch (error: unknown) {
    if (isRedirectError(error)) {
      throw error;
    }
    redirect(SIGN_IN_PATH);
  }

  // user is non-null here (redirect would have thrown otherwise).
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .maybeSingle();

  if (profileError) {
    // Treat lookup failure as denial — never leak to the route.
    redirect(DENIED_TEACH_PATH);
  }

  if (!profile || profile.role !== 'admin') {
    redirect(DENIED_TEACH_PATH);
  }

  return { user: user!, role: 'admin' };
}

/**
 * Detect Next.js's internal redirect sentinel so we don't swallow it in catch blocks.
 * Next throws an error with `digest` starting with 'NEXT_REDIRECT'.
 */
function isRedirectError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === 'string' && digest.startsWith('NEXT_REDIRECT');
}
```

Then create `src/lib/auth/require-admin.test.ts` with vitest-style tests covering the 5 behaviors above. Mock `next/navigation` `redirect` to throw `Error('NEXT_REDIRECT:' + path)` and mock `@/lib/supabase/server` `createClient` to return a fake client whose `auth.getUser()` and `from('profiles').select(...).eq(...).maybeSingle()` are configurable per test.

Constraints:
- Use `getUser()` (server-validates the JWT against Supabase) — NEVER `getSession()` (reads cookie only, can be forged).
- The helper file MUST start with `import 'server-only';` so accidental client imports fail at build time.
- The helper MUST NOT use `createAdminClient()` from Plan 02. The whole point of FND-02 is that the user's own session is checked — using the service role client would bypass RLS and defeat the purpose.
- No catch-and-swallow: every error path either re-throws a NEXT_REDIRECT sentinel or calls `redirect()` itself.
- Return type is `AdminSession` (named interface) — no inline anonymous return type.
  </action>
  <acceptance_criteria>
    - File `src/lib/auth/require-admin.ts` exists and starts with `import 'server-only';`
    - Exports the named function `requireAdmin` and the named interface `AdminSession`.
    - Imports `createClient` from `@/lib/supabase/server` (NOT from `@/lib/supabase/admin`).
    - Calls `supabase.auth.getUser()` (NOT `getSession()`).
    - Queries `profiles` table by `id = user.id` and checks `role === 'admin'`.
    - On any failure path, calls `redirect()` from `next/navigation` — never returns null/undefined.
    - `isRedirectError()` helper correctly preserves NEXT_REDIRECT sentinels in catch blocks.
    - Test file exists and all 5 behaviors above pass.
    - `npx tsc --noEmit` reports zero errors for `src/lib/auth/require-admin.ts`.
    - oxlint reports zero errors for the new file.
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E 'require-admin' || echo 'OK: no tsc errors in require-admin'</automated>
  </verify>
  <done>requireAdmin() helper exists, server-only, type-safe, with tests covering all 4 redirect/pass paths plus the error path.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Add /dashboard/teach segment layout that calls requireAdmin()</name>
  <files>src/app/dashboard/teach/layout.tsx, src/app/dashboard/teach/cohorts/page.tsx</files>
  <read_first>
    - src/app/dashboard/layout.tsx — confirm parent layout is async Server Component (no 'use client'), so nested teach layout inherits SidebarProvider/Header context.
    - src/lib/auth/require-admin.ts (just created in Task 1) — confirm exported name and return type.
  </read_first>
  <behavior>
    - Test 1: navigating to /dashboard/teach/cohorts as an unauthenticated user redirects to /auth/sign-in (manual check; no automated browser test in this plan — Playwright covered in Phase 4).
    - Test 2: navigating as an educator redirects to /dashboard/overview?denied=teach.
    - Test 3: navigating as an admin renders the cohorts stub page successfully.
    - Test 4 (build-level): the layout file MUST NOT contain `'use client'`. The cohorts page MUST be a Server Component.
  </behavior>
  <action>
Create `src/app/dashboard/teach/layout.tsx` with EXACTLY this content:

```typescript
import { requireAdmin } from '@/lib/auth/require-admin';

export default async function TeachLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // RBAC gate: redirects non-admins / unauthenticated users.
  // Throws NEXT_REDIRECT on failure paths — never returns null.
  await requireAdmin();

  return <>{children}</>;
}
```

Create `src/app/dashboard/teach/cohorts/page.tsx` with EXACTLY this content (a stub
that satisfies FND-01's link target so the gate has a real route to protect; the real
cohorts UI ships in Phase 2):

```typescript
import { requireAdmin } from '@/lib/auth/require-admin';

export const metadata = {
  title: 'Cohorts — Teach Admin'
};

export default async function CohortsPage() {
  // Defense-in-depth: layout already gates, but page-level guard prevents
  // accidental exposure if layout is ever removed or restructured.
  const { user } = await requireAdmin();

  return (
    <div className='p-6'>
      <h1 className='text-2xl font-bold text-brand-teal'>Cohorts</h1>
      <p className='mt-2 text-sm text-muted-foreground'>
        Cohorts list ships in Phase 2. Signed in as {user.email ?? user.id}.
      </p>
    </div>
  );
}
```

Constraints:
- Both files are Server Components — NO `'use client'` directive.
- Both files import `requireAdmin` from `@/lib/auth/require-admin` (the same helper).
- The page calls `requireAdmin()` independently from the layout (defense-in-depth).
- The layout returns a fragment — no extra wrapper div, no extra context provider. The
  parent dashboard layout already provides Sidebar/Header/Kbar/Infobar.
- Do NOT add any client-side role check. The whole point of FND-02 is that the gate is
  server-side and unbypassable.
- Do NOT add the cohorts page's actual content — that's Phase 2's work. Stub only.
- File names MUST be `layout.tsx` and `page.tsx` (Next.js App Router conventions).
  </action>
  <acceptance_criteria>
    - File `src/app/dashboard/teach/layout.tsx` exists, is async, has no `'use client'`.
    - File `src/app/dashboard/teach/cohorts/page.tsx` exists, is async, has no `'use client'`.
    - Both files import `requireAdmin` from `@/lib/auth/require-admin`.
    - Both files call `await requireAdmin()` before rendering anything.
    - The cohorts page renders a heading and a brand-teal styled subtitle (Tailwind `brand-teal` token).
    - `npx tsc --noEmit` reports zero errors for both files.
    - `next build` (or `next dev` boot) does not raise "use client" or "missing default export" errors.
    - Manual smoke (developer): navigating to /dashboard/teach/cohorts as unauthenticated user redirects to /auth/sign-in; as educator redirects to /dashboard/overview?denied=teach; as admin renders the stub.
  </acceptance_criteria>
  <verify>
    <automated>npx tsc --noEmit -p tsconfig.json 2>&amp;1 | grep -E 'app/dashboard/teach' || echo 'OK: no tsc errors in teach segment'</automated>
  </verify>
  <done>Teach segment layout enforces admin RBAC server-side; stub cohorts page renders for admins and redirects for everyone else.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser → Next.js Server Component | Untrusted session cookie crosses here; getUser() validates against Supabase |
| Server Component → Supabase REST | Anon-key + RLS enforces row-level access on profiles table |
| Server Component → next/navigation redirect | Trusted control flow; NEXT_REDIRECT sentinel must propagate, not be swallowed |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-04-01 | S (Spoofing) | requireAdmin() reads session | mitigate | Use `auth.getUser()` (server-validates JWT against Supabase) instead of `auth.getSession()` (cookie-only, forgeable). Documented in action spec. |
| T-01-04-02 | E (Elevation of Privilege) | profiles.role check | mitigate | Redirect to `/dashboard/overview?denied=teach` on any non-admin or missing-profile case. No "default allow" path; the function only returns AdminSession on the explicit `role === 'admin'` branch. |
| T-01-04-03 | E (Elevation of Privilege) | Client-side bypass | mitigate | `import 'server-only'` directive prevents the helper from being bundled into the browser. Layout and page are Server Components (no 'use client'). |
| T-01-04-04 | I (Information Disclosure) | profileError leak | mitigate | On profile lookup failure, redirect to deny path — never include the error message in the redirect or response. |
| T-01-04-05 | T (Tampering) | profiles.role tampering | accept | RLS on `profiles` table is upstream's responsibility; this plan trusts that admins cannot self-promote. Documented as out-of-scope dependency. |
| T-01-04-06 | D (Denial of Service) | Repeated DB lookups | accept | Each request triggers 1 getUser() + 1 profiles SELECT. Acceptable for an internal admin tool with low QPS. Caching deferred. |
| T-01-04-07 | R (Repudiation) | No audit log of access attempts | accept | Out of scope for v1. Logging admin access can be added in a future milestone if needed. |
</threat_model>

<verification>
- File presence: `src/lib/auth/require-admin.ts`, `src/app/dashboard/teach/layout.tsx`, `src/app/dashboard/teach/cohorts/page.tsx`.
- `import 'server-only';` is the FIRST non-comment line in `require-admin.ts`.
- Grep confirms `requireAdmin` is imported by both `layout.tsx` and `cohorts/page.tsx`.
- Grep confirms `getSession` is NOT used anywhere in this plan's files (only `getUser`).
- Grep confirms `'use client'` does NOT appear in any of the three new files.
- `npx tsc --noEmit` is clean for the new files.
- Manual smoke covers the 3 redirect paths (unauth → sign-in, educator → denied, admin → render).
</verification>

<success_criteria>
1. `requireAdmin()` exists, is server-only, and validates session via `getUser()` + `profiles.role`.
2. `/dashboard/teach/layout.tsx` calls `requireAdmin()` on every render.
3. `/dashboard/teach/cohorts/page.tsx` exists as a stub that the gate protects.
4. Non-admins cannot reach the stub page — verified by manual smoke or unit test mocks.
5. Service-role key is NOT used in this layer (only the SSR anon-key client).
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundations/01-04-SUMMARY.md` with:
- Tree of `src/app/dashboard/teach/` and `src/lib/auth/` after the changes
- Confirmation that `getSession` is absent and `getUser` is used
- Confirmation that `'use client'` is absent from all three new files
- Output of the require-admin test file (if vitest is wired) or a note that tests are scaffolded
- Note any deviation from the action spec (and why) — e.g., Next.js redirect API changes
</output>
