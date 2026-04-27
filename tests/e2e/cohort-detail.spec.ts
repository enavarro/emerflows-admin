/**
 * Regression test: /dashboard/teach/cohorts/:cohort renders without throwing
 * the 'missingPrefetch' placeholder error.
 *
 * Regression: getCohort() in src/features/teach/api/service.ts SELECTed two
 * non-existent columns ('learners.level' and 'submissions.submitted_at'), so
 * server-side prefetchQuery threw inside its queryFn. prefetchQuery silently
 * swallows queryFn errors; dehydrate() then drops the failed query state, so
 * the client cache had no entry for teachKeys.cohort(cohortId). The client's
 * useSuspenseQuery fell through to the placeholder queryFn from CR-01 and
 * threw the cryptic 'teach: cohort(...) queryFn was invoked, but data should
 * have been hydrated' to the route's error boundary.
 *
 * Fix:
 *   1. service.ts: drop 'level' from learners select (no such column);
 *      replace 'submitted_at' with 'created_at' (real column) and alias
 *      back to wire-format submitted_at on the JS side.
 *   2. routes (cohorts list + cohort detail): use queryClient.fetchQuery()
 *      instead of prefetchQuery() so the original server-side error
 *      propagates to Next's error boundary instead of being swallowed.
 *
 * Auth: TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD env vars (loaded via
 * playwright.config.ts dotenv).
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = process.env['TEST_ADMIN_EMAIL'] ?? '';
const PASSWORD = process.env['TEST_ADMIN_PASSWORD'] ?? '';
const MANUAL_AUTH_TIMEOUT_MS = 120_000;

async function signInAsAdmin(page: Page) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle' });

  if (EMAIL && PASSWORD) {
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  } else {
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
      timeout: MANUAL_AUTH_TIMEOUT_MS
    });
  }
}

test.describe('Cohort detail page (schema-drift regression)', () => {
  test('cohorts list page renders cards without error', async ({ page }) => {
    await signInAsAdmin(page);

    const response = await page.goto(`${BASE}/dashboard/teach/cohorts`, {
      waitUntil: 'networkidle'
    });

    expect(response?.status() ?? 0).toBeLessThan(400);

    // PageContainer header
    await expect(page.getByRole('heading', { name: 'Cohorts' })).toBeVisible({
      timeout: 8_000
    });

    // The placeholder queryFn error must NEVER appear on screen.
    const errorText = page.getByText(/queryFn was invoked, but data should have been hydrated/);
    await expect(errorText).toHaveCount(0);
  });

  test('cohort detail page renders header + tabs (no missingPrefetch error)', async ({
    page
  }, testInfo) => {
    await signInAsAdmin(page);

    const response = await page.goto(`${BASE}/dashboard/teach/cohorts/spring-2026`, {
      waitUntil: 'networkidle'
    });

    expect(response?.status() ?? 0).toBeLessThan(400);

    // Capture screenshot for evidence regardless of pass/fail.
    await testInfo.attach('cohort-detail.png', {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png'
    });

    // The placeholder queryFn error must NEVER appear.
    const placeholderError = page.getByText(
      /queryFn was invoked, but data should have been hydrated/
    );
    await expect(placeholderError).toHaveCount(0);

    // PageContainer header — humanizeCohortId('spring-2026') -> 'Spring 2026'.
    await expect(page.getByRole('heading', { name: 'Spring 2026' })).toBeVisible({
      timeout: 8_000
    });

    // Description line: "Spring 2026 · N learners".
    const description = page.getByText(/Spring 2026 · \d+ learners?/);
    await expect(description).toBeVisible({ timeout: 5_000 });

    // Tabs present (Learners is the default).
    const learnersTab = page.getByRole('tab', { name: /^Learners$/ });
    const matrixTab = page.getByRole('tab', { name: /Progress matrix/ });
    await expect(learnersTab).toBeVisible();
    await expect(matrixTab).toBeVisible();

    // Default tab content: learners table headers.
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Level' })).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /Submissions/ })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Latest activity' })
    ).toBeVisible();
  });
});
