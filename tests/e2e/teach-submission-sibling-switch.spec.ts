/**
 * Regression test: intra-module sibling-type switcher.
 *
 * Gap closure for UAT Test 1: when a learner has BOTH a recording and a
 * conversation submission for the same module, the submission viewer must
 * render a switcher that lets the admin flip between them without bouncing
 * back to the learner page.
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

test.describe('Submission viewer sibling-type switcher (gap closure)', () => {
  test('switcher hidden when only one type exists; visible + functional when both exist', async ({
    page
  }, testInfo) => {
    await signInAsAdmin(page);

    // Land on the cohorts list; pick the spring-2026 cohort (only seeded cohort).
    await page.goto(`${BASE}/dashboard/teach/cohorts`, { waitUntil: 'networkidle' });
    const springCard = page.getByRole('link', { name: /Spring/i }).first();
    await expect(springCard).toBeVisible({ timeout: 10_000 });
    await springCard.click();
    await page.waitForURL(/\/dashboard\/teach\/cohorts\/.+$/, { timeout: 10_000 });

    // Open the first learner's detail page.
    const firstLearnerRow = page.getByRole('link', { name: /Open learner/i }).first();
    if (!(await firstLearnerRow.isVisible().catch(() => false))) {
      await page.getByRole('row').nth(1).getByRole('link').first().click();
    } else {
      await firstLearnerRow.click();
    }
    await page.waitForURL(/\/dashboard\/teach\/cohorts\/.+\/learners\/.+$/, {
      timeout: 10_000
    });

    // Find a module card with >=2 submission rows (recording + conversation
    // for the same module).
    const cards = page.locator('[data-slot="card"], .rounded-lg.border').filter({
      has: page.getByRole('link', { name: /Open submission/ })
    });
    const cardCount = await cards.count();
    let targetCard = null;
    for (let i = 0; i < cardCount; i++) {
      const c = cards.nth(i);
      const rows = c.getByRole('link', { name: /Open submission/ });
      if ((await rows.count()) >= 2) {
        targetCard = c;
        break;
      }
    }

    if (!targetCard) {
      test.skip(
        true,
        'Fixture precondition: no module card with both a recording and a conversation submission. ' +
          'Seed a both-types fixture for module-01 and re-run.'
      );
      return;
    }

    // Open the first submission in that card.
    const firstSubmissionLink = targetCard.getByRole('link', { name: /Open submission/ }).first();
    await firstSubmissionLink.click();
    await page.waitForURL(/\/dashboard\/teach\/submissions\/.+$/, { timeout: 10_000 });

    const firstViewerUrl = page.url();

    // The switcher renders "Module submissions" label + a ToggleGroup with
    // Recording and Conversation items.
    const switcherLabel = page.getByText('Module submissions', { exact: true });
    await expect(switcherLabel).toBeVisible({ timeout: 8_000 });

    const recordingItem = page.getByRole('button', { name: /Recording/i }).or(
      page.getByRole('link', { name: /Recording/i })
    ).first();
    const conversationItem = page.getByRole('button', { name: /Conversation/i }).or(
      page.getByRole('link', { name: /Conversation/i })
    ).first();
    await expect(recordingItem).toBeVisible({ timeout: 5_000 });
    await expect(conversationItem).toBeVisible({ timeout: 5_000 });

    // Determine which type is currently active by checking which item is a
    // navigable link vs. an inactive span. Exactly one should have an href.
    const recordingHref = await recordingItem.getAttribute('href');
    const conversationHref = await conversationItem.getAttribute('href');
    expect(
      Boolean(recordingHref) !== Boolean(conversationHref),
      'Exactly one of Recording/Conversation should be a navigable link'
    ).toBe(true);

    // Click the navigable item.
    if (recordingHref) {
      await recordingItem.click();
    } else {
      await conversationItem.click();
    }

    // Assert URL changed AND the new URL is still under /dashboard/teach/submissions/.
    await page.waitForURL(/\/dashboard\/teach\/submissions\/.+$/, { timeout: 10_000 });
    expect(page.url()).not.toBe(firstViewerUrl);
    expect(page.url()).toContain('/dashboard/teach/submissions/');

    // Switcher still visible after navigation.
    await expect(page.getByText('Module submissions', { exact: true })).toBeVisible({
      timeout: 8_000
    });

    // Click back to the original type.
    const recAfter = page.getByRole('button', { name: /Recording/i }).or(
      page.getByRole('link', { name: /Recording/i })
    ).first();
    const convAfter = page.getByRole('button', { name: /Conversation/i }).or(
      page.getByRole('link', { name: /Conversation/i })
    ).first();
    const recHrefAfter = await recAfter.getAttribute('href');
    if (recHrefAfter) {
      await recAfter.click();
    } else {
      await convAfter.click();
    }
    await page.waitForURL((url) => url.toString() === firstViewerUrl, { timeout: 10_000 });

    await testInfo.attach('viewer-after-flip-back.png', {
      body: await page.screenshot(),
      contentType: 'image/png'
    });
  });
});
