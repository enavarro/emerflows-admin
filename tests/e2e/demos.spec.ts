/**
 * Smoke test: /dashboard/demos flow
 *
 * Verifies GET /api/demos, GET /api/demos/spend, and POST /api/demos
 * respond with expected status codes locally (catches the prod 503 regression).
 *
 * Auth strategy:
 *   - If TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD are set → fill login form automatically.
 *   - Otherwise → pause for 60s in headed mode so a human can sign in.
 */

import { test, expect, type Page, type Response } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = process.env['TEST_ADMIN_EMAIL'] ?? '';
const PASSWORD = process.env['TEST_ADMIN_PASSWORD'] ?? '';
const MANUAL_AUTH_TIMEOUT_MS = 120_000;

// Shared results collected during the run — printed in a final summary.
const results: {
  endpoint: string;
  status: number | 'pending' | 'error';
  body: string;
}[] = [];

function recordResponse(endpoint: string, res: Response) {
  res
    .text()
    .then((body) => {
      const truncated = body.length > 600 ? body.slice(0, 600) + '…' : body;
      results.push({ endpoint, status: res.status(), body: truncated });
    })
    .catch(() => {
      results.push({ endpoint, status: res.status(), body: '<could not read body>' });
    });
}

async function signIn(page: Page) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle' });

  if (EMAIL && PASSWORD) {
    console.log(`[auth] filling credentials from env (${EMAIL})`);
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    // Wait for redirect away from /auth
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
    console.log('[auth] signed in via env credentials');
  } else {
    console.log(
      `\n[auth] No TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD set.\n` +
        `       Please sign in manually in the browser window.\n` +
        `       You have ${MANUAL_AUTH_TIMEOUT_MS / 1000}s before the test continues.\n`
    );
    // Wait until the URL changes away from /auth (sign-in redirects to dashboard)
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
      timeout: MANUAL_AUTH_TIMEOUT_MS
    });
    console.log('[auth] manual sign-in detected — continuing');
  }
}

test.describe('demos flow smoke test', () => {
  test('GET /api/demos and GET /api/demos/spend return non-5xx, POST /api/demos mints a token', async ({
    page
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // --- 1. Auth ---
    await signIn(page);

    // --- 2. Intercept the two GET requests triggered by navigating to the page ---
    const getDemosPromise = page.waitForResponse(
      (res) =>
        res.url().includes('/api/demos') &&
        !res.url().includes('/spend') &&
        res.request().method() === 'GET',
      { timeout: 15_000 }
    );
    const getSpendPromise = page.waitForResponse(
      (res) => res.url().includes('/api/demos/spend') && res.request().method() === 'GET',
      { timeout: 15_000 }
    );

    await page.goto(`${BASE}/dashboard/demos`, { waitUntil: 'networkidle' });

    const [getDemosRes, getSpendRes] = await Promise.all([getDemosPromise, getSpendPromise]);

    recordResponse('GET /api/demos', getDemosRes);
    recordResponse('GET /api/demos/spend', getSpendRes);

    // --- 3. Open the mint sheet ---
    // Button text: "New demo link"
    const mintButton = page.getByRole('button', { name: /new demo link/i });
    await expect(mintButton).toBeVisible({ timeout: 8_000 });
    await mintButton.click();

    // Wait for the sheet to appear
    const sheetTitle = page.getByText(/mint a demo link/i);
    await expect(sheetTitle).toBeVisible({ timeout: 5_000 });

    // --- 4. Fill label and submit ---
    const labelInput = page
      .getByPlaceholder(/maria/i)
      .or(page.locator('input[name="label"]'))
      .first();
    await expect(labelInput).toBeVisible({ timeout: 5_000 });
    await labelInput.fill('e2e-test');

    const postDemosPromise = page.waitForResponse(
      (res) => res.url().includes('/api/demos') && res.request().method() === 'POST',
      { timeout: 15_000 }
    );

    const submitButton = page.getByRole('button', { name: /mint link/i });
    await expect(submitButton).toBeVisible({ timeout: 5_000 });
    await submitButton.click();

    const postDemosRes = await postDemosPromise;
    const postBody = await postDemosRes.text();
    const truncatedPost = postBody.length > 600 ? postBody.slice(0, 600) + '…' : postBody;
    results.push({
      endpoint: 'POST /api/demos',
      status: postDemosRes.status(),
      body: truncatedPost
    });

    // --- 5. Print summary ---
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  DEMOS SMOKE TEST — ENDPOINT SUMMARY');
    console.log('═══════════════════════════════════════════════════');
    for (const r of results) {
      const ok = typeof r.status === 'number' && r.status < 400;
      console.log(`\n  ${ok ? '✓' : '✗'} ${r.endpoint} → HTTP ${r.status}`);
      console.log(`     ${r.body}`);
    }
    if (consoleErrors.length > 0) {
      console.log('\n  BROWSER CONSOLE ERRORS:');
      for (const err of consoleErrors) {
        console.log(`     [error] ${err}`);
      }
    } else {
      console.log('\n  No browser console errors detected.');
    }
    console.log('═══════════════════════════════════════════════════\n');

    // --- 6. Assertions (fail the test if any endpoint is 5xx) ---
    expect(
      getDemosRes.status(),
      `GET /api/demos returned ${getDemosRes.status()} — expected < 500`
    ).toBeLessThan(500);

    expect(
      getSpendRes.status(),
      `GET /api/demos/spend returned ${getSpendRes.status()} — expected < 500`
    ).toBeLessThan(500);

    expect(
      postDemosRes.status(),
      `POST /api/demos returned ${postDemosRes.status()} — expected < 400`
    ).toBeLessThan(400);
  });
});
