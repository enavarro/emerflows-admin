/**
 * Regression test: intra-module submission switcher.
 *
 * Gap closure for UAT Test 1: when a learner has multiple submissions for
 * the same module (any combination of types and attempts, max 4 per module:
 * 2 recordings + 2 conversations), the submission viewer must render a
 * switcher that lets the admin flip between any sibling without bouncing
 * back to the learner page.
 */

import { test, expect, type Locator, type Page } from '@playwright/test';

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

// The teach surfaces use the stretched-link pattern (an <a> with only an
// sr-only span, expanded to row size via after:absolute after:inset-0).
// Playwright's actionability check considers such links not visible because
// they have zero rendered area, even though they navigate correctly. We
// extract href and navigate directly instead of clicking.
async function gotoLink(page: Page, link: Locator) {
  const href = await link.getAttribute('href');
  if (!href) throw new Error('Link has no href');
  await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
}

test.describe('Submission viewer sibling switcher (gap closure)', () => {
  test('switcher shows one button per sibling submission and navigates correctly', async ({
    page
  }, testInfo) => {
    await signInAsAdmin(page);

    // Land on the cohorts list; pick the spring-2026 cohort (only seeded cohort).
    await page.goto(`${BASE}/dashboard/teach/cohorts`, { waitUntil: 'networkidle' });
    const springCard = page.getByRole('link', { name: /Spring/i }).first();
    await expect(springCard).toBeVisible({ timeout: 10_000 });
    await gotoLink(page, springCard);
    await page.waitForURL(/\/dashboard\/teach\/cohorts\/.+$/, { timeout: 10_000 });

    // Iterate learners to find one whose module cards include a card with
    // >= 2 submission rows (any combination of types and attempts).
    const learnerLinks = page.getByRole('link', { name: /Open learner/i });
    const learnerCount = await learnerLinks.count();
    if (learnerCount === 0) {
      test.skip(true, 'Fixture precondition: cohort has no learners');
      return;
    }

    const learnerHrefs: string[] = [];
    for (let i = 0; i < learnerCount; i++) {
      const href = await learnerLinks.nth(i).getAttribute('href');
      if (href) learnerHrefs.push(href);
    }

    let foundTargetSubmission: { url: string; siblingCount: number } | null = null;

    for (const learnerHref of learnerHrefs) {
      await page.goto(`${BASE}${learnerHref}`, { waitUntil: 'networkidle' });
      await page.waitForURL(/\/dashboard\/teach\/cohorts\/.+\/learners\/.+$/, {
        timeout: 10_000
      });

      const cards = page.locator('[data-slot="card"], .rounded-lg.border').filter({
        has: page.getByRole('link', { name: /Open submission/ })
      });
      const cardCount = await cards.count();
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        const rowLinks = card.getByRole('link', { name: /Open submission/ });
        const rowCount = await rowLinks.count();
        if (rowCount >= 2) {
          const submissionHref = await rowLinks.first().getAttribute('href');
          if (submissionHref) {
            foundTargetSubmission = {
              url: `${BASE}${submissionHref}`,
              siblingCount: rowCount
            };
            break;
          }
        }
      }

      if (foundTargetSubmission) break;
    }

    if (!foundTargetSubmission) {
      test.skip(
        true,
        'Fixture precondition: no learner has a module with 2 or more submissions. ' +
          'Seed at least one module with multiple attempts/types and re-run.'
      );
      return;
    }

    await page.goto(foundTargetSubmission.url, { waitUntil: 'networkidle' });
    const firstViewerUrl = page.url();

    // Scope all switcher locators to the ToggleGroup (aria-label="Submission
    // type") so we don't collide with other text on the page.
    const switcherGroup = page.getByRole('group', { name: 'Submission type' });
    const switcherLabel = page.getByText('Module submissions', { exact: true });
    await expect(switcherLabel).toBeVisible({ timeout: 10_000 });
    await expect(switcherGroup).toBeVisible({ timeout: 5_000 });

    // The switcher renders one item per sibling. Active item is a button (inert);
    // inactive items are next/link <a> elements with an href to the sibling.
    const navigableLinks = switcherGroup.getByRole('link');
    const navigableCount = await navigableLinks.count();
    expect(
      navigableCount,
      'Switcher should expose (siblingCount - 1) navigable items (the active one is inert)'
    ).toBe(foundTargetSubmission.siblingCount - 1);

    // Pick the first navigable sibling and follow it.
    const siblingHref = await navigableLinks.first().getAttribute('href');
    if (!siblingHref) throw new Error('Switcher link missing href');
    await page.goto(`${BASE}${siblingHref}`, { waitUntil: 'networkidle' });

    expect(page.url()).not.toBe(firstViewerUrl);
    expect(page.url()).toContain('/dashboard/teach/submissions/');

    // Switcher still visible after navigation, and now the previously-active
    // submission is one of the navigable links.
    const switcherGroupAfter = page.getByRole('group', { name: 'Submission type' });
    await expect(page.getByText('Module submissions', { exact: true })).toBeVisible({
      timeout: 10_000
    });
    await expect(switcherGroupAfter).toBeVisible({ timeout: 5_000 });

    // The switcher should now expose a link back to the original submission
    // (its href matches firstViewerUrl's path) — flip back via that link.
    const navigableLinksAfter = switcherGroupAfter.getByRole('link');
    const firstViewerPath = new URL(firstViewerUrl).pathname;
    let foundFlipBack = false;
    const afterCount = await navigableLinksAfter.count();
    for (let i = 0; i < afterCount; i++) {
      const href = await navigableLinksAfter.nth(i).getAttribute('href');
      if (href === firstViewerPath) {
        await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
        foundFlipBack = true;
        break;
      }
    }
    expect(foundFlipBack, 'Could not find a link back to the original submission').toBe(true);
    expect(page.url()).toBe(firstViewerUrl);

    await testInfo.attach('viewer-after-flip-back.png', {
      body: await page.screenshot(),
      contentType: 'image/png'
    });
  });
});
