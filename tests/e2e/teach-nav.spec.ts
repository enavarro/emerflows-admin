/**
 * Regression test: Teach sidebar nav visible to admin, /dashboard/teach/cohorts reachable.
 *
 * Regression: profiles RLS policy was causing infinite recursion on client-side
 * useAuth() calls, leaving profile=null and filtering out admin-gated nav items.
 * Fix: 00012_fix_profiles_rls_select_policy.sql adds non-recursive SELECT policy.
 *
 * Auth: set TEST_ADMIN_EMAIL + TEST_ADMIN_PASSWORD env vars for automated sign-in.
 * Without them the test pauses 120s in headed mode for manual sign-in.
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
    console.log(
      '\n[auth] No TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD set.\n' +
        '       Sign in manually in the browser window.\n' +
        `       You have ${MANUAL_AUTH_TIMEOUT_MS / 1000}s before the test continues.\n`
    );
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), {
      timeout: MANUAL_AUTH_TIMEOUT_MS
    });
  }
}

test.describe('Teach nav regression (profiles RLS fix)', () => {
  test('admin sees Teach group and Cohorts link in sidebar (with icon)', async ({
    page
  }, testInfo) => {
    await signInAsAdmin(page);

    await page.goto(`${BASE}/dashboard/overview`, { waitUntil: 'networkidle' });

    // useAuth() resolves profile asynchronously after mount; give it a beat
    await page.waitForTimeout(2000);

    const sidebar = page.locator('[data-slot="sidebar-container"], [data-sidebar="sidebar"]').first();
    await expect(sidebar).toBeVisible({ timeout: 10_000 });

    // Always capture sidebar so we can inspect rendering regardless of pass/fail.
    await testInfo.attach('sidebar.png', {
      body: await sidebar.screenshot(),
      contentType: 'image/png'
    });

    // Teach group label must be present
    const teachLabel = page.getByText('Teach', { exact: true });
    await expect(teachLabel).toBeVisible({ timeout: 10_000 });

    // Cohorts link must be present and point at /dashboard/teach/cohorts
    const cohortsLink = page.getByRole('link', { name: /Cohorts/ });
    await expect(cohortsLink).toBeVisible({ timeout: 5_000 });
    expect(await cohortsLink.getAttribute('href')).toBe('/dashboard/teach/cohorts');

    // Icon visibility check — the Cohorts link should contain an <svg> child
    // (tabler icons render as inline svg). Failing this means icons aren't
    // rendering, which is what the user reported.
    const cohortsIcon = cohortsLink.locator('svg').first();
    await expect(cohortsIcon, 'Cohorts link should contain an SVG icon').toBeVisible({
      timeout: 5_000
    });

    // Sanity: at least one Overview-group icon also visible (Dashboard link)
    const dashboardLink = page.getByRole('link', { name: /Dashboard/ }).first();
    const dashboardIcon = dashboardLink.locator('svg').first();
    await expect(dashboardIcon, 'Dashboard link should contain an SVG icon').toBeVisible({
      timeout: 5_000
    });
  });

  test('/dashboard/teach/cohorts renders without 404 for admin', async ({ page }) => {
    await signInAsAdmin(page);

    const response = await page.goto(`${BASE}/dashboard/teach/cohorts`, {
      waitUntil: 'networkidle'
    });

    expect(page.url()).toContain('/dashboard/teach/cohorts');
    expect(response?.status() ?? 0).toBeLessThan(400);

    const heading = page.getByRole('heading', { name: 'Cohorts' });
    await expect(heading).toBeVisible({ timeout: 8_000 });
  });

  test('/dashboard/teach/ resolves (redirects to cohorts, not 404)', async ({ page }) => {
    await signInAsAdmin(page);

    const response = await page.goto(`${BASE}/dashboard/teach/`, {
      waitUntil: 'networkidle'
    });

    // Should NOT be 404. Should land on /dashboard/teach/cohorts (redirect).
    expect(response?.status() ?? 0).toBeLessThan(400);
    expect(page.url()).toContain('/dashboard/teach/cohorts');
  });
});
