/**
 * Phase 2 cohorts hub happy-path e2e.
 *
 * Covers ROADMAP Phase 2 success criteria 1, 3, 4, 5:
 *   1. /dashboard/teach/cohorts shows the Spring 2026 card with real counts
 *   3. /dashboard/teach/cohorts/spring-2026 shows the learner table
 *   4. The cohort detail shows the learner × module progress matrix
 *   5. Cohort UI uses only shadcn/ui primitives + brand tokens (smoke-checked
 *      via the locked sage cell class)
 *
 * Criterion 2 (explicit zero-state) is verified manually by temporarily
 * mocking the service — too intrusive to seed live Supabase to zero.
 *
 * Auth: set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD env vars for automated
 * sign-in. Without them the test pauses 120s in headed mode for manual sign-in.
 */

import { test, expect, type Page } from '@playwright/test';

const BASE = 'http://localhost:3000';
const EMAIL = process.env['TEST_ADMIN_EMAIL'] ?? '';
const PASSWORD = process.env['TEST_ADMIN_PASSWORD'] ?? '';
const MANUAL_AUTH_TIMEOUT_MS = 120_000;
const COHORT_ID = 'spring-2026';
const COHORT_NAME = 'Spring 2026';

async function signInAsAdmin(page: Page) {
  await page.goto(`${BASE}/auth/sign-in`, { waitUntil: 'networkidle' });

  if (EMAIL && PASSWORD) {
    await page.locator('input[type="email"], input[name="email"]').first().fill(EMAIL);
    await page.locator('input[type="password"], input[name="password"]').first().fill(PASSWORD);
    await page.locator('button[type="submit"]').first().click();
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15_000 });
  } else {
    console.warn(
      '\n[auth] No TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD set.\n' +
        '       Sign in manually in the browser window.\n' +
        `       You have ${MANUAL_AUTH_TIMEOUT_MS / 1000}s before the test continues.\n`
    );
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
      timeout: MANUAL_AUTH_TIMEOUT_MS
    });
  }
}

test.describe('Phase 2 — Cohorts Hub happy path', () => {
  test('cohorts list renders the Cohorts heading and the Spring 2026 card', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts`, { waitUntil: 'networkidle' });

    // Page header
    const heading = page.getByRole('heading', { name: 'Cohorts' });
    await expect(heading).toBeVisible({ timeout: 8_000 });

    // Spring 2026 card present (cohort-card.tsx wraps Card in <Link aria-label='Open Spring 2026'>)
    const card = page.getByRole('link', { name: `Open ${COHORT_NAME}` });
    await expect(card).toBeVisible({ timeout: 8_000 });

    // Card has the locked stat labels (proves COH-03 prototype-faithful IA)
    await expect(card.getByText('Students', { exact: true })).toBeVisible();
    await expect(card.getByText('Needs review', { exact: true })).toBeVisible();
  });

  test('cohort card click navigates to cohort detail at /spring-2026', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts`, { waitUntil: 'networkidle' });

    const card = page.getByRole('link', { name: `Open ${COHORT_NAME}` });
    await expect(card).toBeVisible({ timeout: 8_000 });
    await card.click();
    await page.waitForURL((url) => url.pathname === `/dashboard/teach/cohorts/${COHORT_ID}`, {
      timeout: 8_000
    });

    // Cohort name as page title (rendered via humanizeSlug server-side)
    const cohortHeading = page.getByRole('heading', { name: COHORT_NAME });
    await expect(cohortHeading).toBeVisible({ timeout: 8_000 });
  });

  test('cohort detail shows Learners (default) and Progress matrix tabs', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts/${COHORT_ID}`, {
      waitUntil: 'networkidle'
    });

    // Both tab triggers present
    const learnersTab = page.getByRole('tab', { name: 'Learners' });
    const matrixTab = page.getByRole('tab', { name: 'Progress matrix' });
    await expect(learnersTab).toBeVisible({ timeout: 8_000 });
    await expect(matrixTab).toBeVisible({ timeout: 8_000 });

    // Learners tab is default-active (D-13)
    await expect(learnersTab).toHaveAttribute('data-state', 'active');

    // Learners tab table has the locked column headers
    await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Submissions' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Latest activity' })).toBeVisible();
  });

  test('learner row links to /learners/{learnerId} (Phase-3 URL only)', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts/${COHORT_ID}`, {
      waitUntil: 'networkidle'
    });

    // Wait for at least one learner row link with the Phase-3 URL pattern.
    const learnerLink = page
      .locator(`a[href^='/dashboard/teach/cohorts/${COHORT_ID}/learners/']`)
      .first();
    await expect(learnerLink).toBeVisible({ timeout: 8_000 });

    const href = await learnerLink.getAttribute('href');
    expect(href).toMatch(
      new RegExp(`^/dashboard/teach/cohorts/${COHORT_ID}/learners/[\\w-]+$`)
    );
  });

  test('Progress matrix tab renders M01..M12 columns and at least one cell', async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto(`${BASE}/dashboard/teach/cohorts/${COHORT_ID}`, {
      waitUntil: 'networkidle'
    });

    await page.getByRole('tab', { name: 'Progress matrix' }).click();

    // First and last module column headers present (COD-03 — uses MODULES catalog)
    await expect(page.getByText('M01', { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });
    await expect(page.getByText('M12', { exact: true }).first()).toBeVisible({
      timeout: 8_000
    });

    // Locked legend present (UI-SPEC §Copywriting Contract: Matrix legend)
    await expect(page.getByText('Not started').first()).toBeVisible();
    await expect(page.getByText('Submitted').first()).toBeVisible();
    await expect(page.getByText('Reviewed').first()).toBeVisible();

    // At least one matrix dot is rendered (any state). The locked Tailwind classes
    // `border-brand-cream` (not-started), `border-brand-sage` (submitted), and
    // `bg-brand-sage` (reviewed) are the three encodings — find any of them.
    const anyDot = page
      .locator('span.border-brand-cream, span.border-brand-sage, span.bg-brand-sage')
      .first();
    await expect(anyDot).toBeVisible({ timeout: 8_000 });
  });
});
