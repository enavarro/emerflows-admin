# Testing Patterns

**Analysis Date:** 2026-04-24

## Test Framework

**Runner:**
- `@playwright/test` `^1.59.1` — E2E browser automation
- Config: No `playwright.config.ts` present — uses Playwright defaults
- No unit-test runner configured (no `vitest.config.*` / `jest.config.*` present)

**Assertion Library:**
- `expect` from `@playwright/test`

**Run Commands:**
```bash
# No npm scripts wired for tests (package.json has no test/test:e2e entries)
# Invoke Playwright directly:
npx playwright test                          # Run all e2e tests headless
npx playwright test --headed                 # Run in headed mode (see browser)
npx playwright test --ui                     # Playwright UI runner

# Direct API smoke (Node, no browser):
TEST_ADMIN_EMAIL=you@example.com TEST_ADMIN_PASSWORD=secret \
  node tests/e2e/demos-api-check.mjs

# View HTML report after a run:
npx playwright show-report
```

## Test File Organization

**Location:**
- All tests live under `tests/e2e/` — separate from `src/` (not co-located)

**Naming:**
- Browser tests: `*.spec.ts` (Playwright runs `*.spec.*` by default)
- Direct-fetch smoke scripts: `*-api-check.mjs` (plain node, run manually)

**Structure:**
```
tests/
└── e2e/
    ├── demos.spec.ts          # Browser flow: sign-in → mint demo token via UI
    └── demos-api-check.mjs    # Node fetch: hit /api/demos endpoints with cookie
```

## Test Structure

**Suite Organization:**
```typescript
// tests/e2e/demos.spec.ts
import { test, expect, type Page, type Response } from '@playwright/test';

test.describe('demos flow smoke test', () => {
  test('GET /api/demos and GET /api/demos/spend return non-5xx, POST /api/demos mints a token', async ({
    page
  }) => {
    // 1. Auth (env-credential or manual fallback)
    await signIn(page);

    // 2. Intercept GETs triggered by navigation
    const getDemosPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/demos') &&
        !res.url().includes('/spend') &&
        res.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.goto(`${BASE}/dashboard/demos`, { waitUntil: 'networkidle' });
    const [getDemosRes] = await Promise.all([getDemosPromise]);

    // 3. Drive UI to trigger POST
    await page.getByRole('button', { name: /new demo link/i }).click();
    await page.locator('input[name="label"]').fill('e2e-test');
    await page.getByRole('button', { name: /mint link/i }).click();

    // 4. Assert non-5xx (smoke: bug is on the server, not the UI)
    expect(getDemosRes.status()).toBeLessThan(500);
  });
});
```

**Patterns:**
- **Setup**: Sign-in helper (`signIn(page)`) handles env-credential or manual auth fallback
- **Response interception**: `page.waitForResponse(predicate, { timeout })` — set up BEFORE the action that triggers it
- **Locators**: Prefer semantic — `page.getByRole('button', { name: /…/i })`, `page.getByText(/…/i)`, `getByPlaceholder(/…/i)`
- **Console capture**: `page.on('console', msg => ...)` — collect browser errors, surface in summary
- **Teardown**: None required — Playwright resets browser context per test

## Mocking

**Framework:** None — tests hit real backends (local Next.js dev server + real Supabase project)

**Patterns:**
```typescript
// No mocking. Tests authenticate against the real Supabase auth endpoint
// and the local Next.js dev server proxies real Supabase + Redis calls.

// Auth strategy in tests/e2e/demos-api-check.mjs:
const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
});

// Build the cookie format @supabase/ssr 0.10.x writes:
// "base64-" + base64url(JSON.stringify(session))
const cookieValue = 'base64-' + stringToBase64URL(JSON.stringify(session));
```

**What to Mock:**
- Nothing currently — full integration against live services

**What NOT to Mock:**
- Supabase auth (real token roundtrip catches cookie/session issues)
- `/api/demos` endpoints (smoke is the whole point)
- Redis (real Upstash counters used in dev)

## Fixtures and Factories

**Test Data:**
```typescript
// Inline literals — no factories
await labelInput.fill('e2e-test');
await callApi('POST', '/api/demos', { label: 'e2e-api-test' });
```

**Location:**
- No fixtures directory. Test inputs are inlined in spec/script files.
- `@faker-js/faker` is in `devDependencies` (^9.9.0) but not currently used in tests.

## Coverage

**Requirements:** None enforced — no coverage tool configured

**View Coverage:**
```bash
# Not configured — no c8 / istanbul / vitest --coverage in this repo
```

## Test Types

**Unit Tests:**
- **None present.** No `*.test.ts` / `*.test.tsx` files in `src/`.
- Common-rules baseline (80% coverage) is NOT met — this is a known gap.

**Integration Tests:**
- **None present** in the conventional sense.
- `tests/e2e/demos-api-check.mjs` is the closest analog: signs in via Supabase REST,
  builds the SSR cookie, hits each Next.js API route, prints status + body.
- Treats the whole stack (Next handler → Supabase → Redis → JWT signing) as a unit.

**E2E Tests:**
- `tests/e2e/demos.spec.ts` — single Playwright spec covering:
  - Sign-in flow (env or manual)
  - GET `/api/demos` (list)
  - GET `/api/demos/spend` (budget gauge)
  - POST `/api/demos` (mint via UI)
  - Browser console error capture
- Asserts only that responses are < 500 (smoke), not full payload shapes.

## Common Patterns

**Async Testing:**
```typescript
// Set up the response promise BEFORE the action that triggers it.
const postDemosPromise = page.waitForResponse(
  (res) => res.url().includes('/api/demos') && res.request().method() === 'POST',
  { timeout: 15_000 }
);
await submitButton.click();
const postDemosRes = await postDemosPromise;
```

**Error Testing:**
```typescript
// Currently no negative-path tests. Console errors are captured but not asserted on:
const consoleErrors: string[] = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
// ... summary printed at end, but test does not fail on console errors.
```

**Auth Helper Pattern:**
```typescript
// tests/e2e/demos.spec.ts
async function signIn(page: Page) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle' });
  if (EMAIL && PASSWORD) {
    await page.locator('input[type="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  } else {
    // Headed mode fallback: 120s for human to sign in manually
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 120_000 });
  }
}
```

## Coverage Gaps (high priority)

- **No unit tests** — `src/lib/demo-jwt.ts` (JWT sign/verify), `src/lib/redis.ts` (rate limit + spend counter), `src/lib/api-client.ts`, `src/lib/format.ts` are all uncovered
- **No component tests** — TanStack Form fields, RBAC nav filtering, data-table state — all untested in isolation
- **No RLS / security regression tests** — RLS policies, RPC EXECUTE permissions, demo-token-bound RPC access are not exercised by any test
- **No revoke-flow test** — `DELETE /api/demos/[jti]` not covered
- **No negative cases** — invalid input, expired token, revoked token, rate-limit trip, budget cap — none asserted
- **No CI integration** — no GitHub Actions workflow runs Playwright on PRs (verify in `.github/workflows/`)

## Troubleshooting

**Playwright can't sign in:**
- Confirm `TEST_ADMIN_EMAIL` / `TEST_ADMIN_PASSWORD` env vars are set
- Confirm the email matches a real Supabase user with admin role
- Check Supabase redirect URLs include `http://localhost:3000` (already in DEPLOYMENT_PLAN)

**API smoke 401 / 403:**
- The cookie format must be exactly `sb-<PROJECT_REF>-auth-token` with value `base64-<base64url(JSON)>`
- See `tests/e2e/demos-api-check.mjs:79-81` — keep `PROJECT_REF` and cookie format in sync with `@supabase/ssr` version

**Local server not responding:**
- Tests assume `http://localhost:3000` — start dev server first with `npm run dev`
- POST mint requires Upstash Redis env vars set; otherwise endpoint returns 503

**Headed run for debugging:**
- `npx playwright test --headed --project=chromium tests/e2e/demos.spec.ts`
- Use `--ui` for interactive runner with time-travel debugging

---

*Testing analysis: 2026-04-24*
