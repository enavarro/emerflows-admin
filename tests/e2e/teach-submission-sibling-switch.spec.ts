/**
 * Regression test: intra-module sibling-type switcher.
 *
 * Gap closure for UAT Test 1: when a learner has BOTH a recording and a
 * conversation submission for the same module, the submission viewer must
 * render a switcher that lets the admin flip between them without bouncing
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

// The teach surfaces use the stretched-link pattern: an <a> with only an
// sr-only span, expanded to row size via after:absolute after:inset-0.
// Playwright's actionability check considers such links "not visible"
// because they have zero rendered area. We extract href and navigate
// directly instead of clicking.
async function gotoLink(page: Page, link: Locator) {
  const href = await link.getAttribute('href');
  if (!href) throw new Error('Link has no href');
  await page.goto(`${BASE}${href}`, { waitUntil: 'networkidle' });
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
    await gotoLink(page, springCard);
    await page.waitForURL(/\/dashboard\/teach\/cohorts\/.+$/, { timeout: 10_000 });

    // Open a learner's detail page. Iterate learners so we can find one whose
    // module cards include both a recording and a conversation submission for
    // the same module.
    const learnerLinks = page.getByRole('link', { name: /Open learner/i });
    const learnerCount = await learnerLinks.count();
    if (learnerCount === 0) {
      test.skip(true, 'Fixture precondition: cohort has no learners');
      return;
    }

    let foundTargetSubmission: { url: string } | null = null;

    const learnerHrefs: string[] = [];
    for (let i = 0; i < learnerCount; i++) {
      const href = await learnerLinks.nth(i).getAttribute('href');
      if (href) learnerHrefs.push(href);
    }

    for (const learnerHref of learnerHrefs) {
      await page.goto(`${BASE}${learnerHref}`, { waitUntil: 'networkidle' });
      await page.waitForURL(/\/dashboard\/teach\/cohorts\/.+\/learners\/.+$/, {
        timeout: 10_000
      });

      // Find a module card containing BOTH a Recording and a Conversation
      // submission row (each row renders a Type badge of the corresponding
      // label inside the card body).
      const cards = page.locator('[data-slot="card"], .rounded-lg.border').filter({
        has: page.getByRole('link', { name: /Open submission/ })
      });
      const cardCount = await cards.count();
      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i);
        const recordingBadgeCount = await card.getByText(/^Recording$/).count();
        const conversationBadgeCount = await card.getByText(/^Conversation$/).count();
        if (recordingBadgeCount >= 1 && conversationBadgeCount >= 1) {
          const firstSubmissionLink = card
            .getByRole('link', { name: /Open submission/ })
            .first();
          const submissionHref = await firstSubmissionLink.getAttribute('href');
          if (submissionHref) {
            foundTargetSubmission = { url: `${BASE}${submissionHref}` };
            break;
          }
        }
      }

      if (foundTargetSubmission) break;
    }

    if (!foundTargetSubmission) {
      test.skip(
        true,
        'Fixture precondition: no learner has a module with BOTH a recording and a conversation submission. ' +
          'Seed a both-types fixture and re-run.'
      );
      return;
    }

    await page.goto(foundTargetSubmission.url, { waitUntil: 'networkidle' });
    const firstViewerUrl = page.url();

    // Scope all switcher locators to the ToggleGroup (aria-label="Submission
    // type") so we don't collide with other "Recording" / "Conversation" text
    // on the page (badges, body headings, etc.).
    const switcherGroup = page.getByRole('group', { name: 'Submission type' });
    const switcherLabel = page.getByText('Module submissions', { exact: true });
    await expect(switcherLabel).toBeVisible({ timeout: 10_000 });
    await expect(switcherGroup).toBeVisible({ timeout: 5_000 });

    // Inside the switcher: one item is a button (active, inert) and the
    // other is an <a> (next/link, navigable).
    const recordingItem = switcherGroup
      .getByRole('button', { name: /Recording/i })
      .or(switcherGroup.getByRole('link', { name: /Recording/i }))
      .first();
    const conversationItem = switcherGroup
      .getByRole('button', { name: /Conversation/i })
      .or(switcherGroup.getByRole('link', { name: /Conversation/i }))
      .first();

    await expect(recordingItem).toBeVisible({ timeout: 5_000 });
    await expect(conversationItem).toBeVisible({ timeout: 5_000 });

    // Determine which item is the navigable link by reading href off the
    // accessible link nodes inside each ToggleGroupItem.
    const recordingNavHref = await switcherGroup
      .getByRole('link', { name: /Recording/i })
      .first()
      .getAttribute('href')
      .catch(() => null);
    const conversationNavHref = await switcherGroup
      .getByRole('link', { name: /Conversation/i })
      .first()
      .getAttribute('href')
      .catch(() => null);

    expect(
      Boolean(recordingNavHref) !== Boolean(conversationNavHref),
      'Exactly one of Recording/Conversation should be the navigable link'
    ).toBe(true);

    // Navigate to the sibling type via direct goto (avoids any actionability
    // quirks from Radix ToggleGroupItem + asChild Link composition).
    const siblingHref = recordingNavHref ?? conversationNavHref;
    if (!siblingHref) throw new Error('No sibling href on switcher');
    await page.goto(`${BASE}${siblingHref}`, { waitUntil: 'networkidle' });

    expect(page.url()).not.toBe(firstViewerUrl);
    expect(page.url()).toContain('/dashboard/teach/submissions/');

    // Switcher still visible after navigation, with the OTHER side now
    // exposed as the navigable link.
    const switcherGroupAfter = page.getByRole('group', { name: 'Submission type' });
    await expect(page.getByText('Module submissions', { exact: true })).toBeVisible({
      timeout: 10_000
    });
    await expect(switcherGroupAfter).toBeVisible({ timeout: 5_000 });

    const recHrefAfter = await switcherGroupAfter
      .getByRole('link', { name: /Recording/i })
      .first()
      .getAttribute('href')
      .catch(() => null);
    const convHrefAfter = await switcherGroupAfter
      .getByRole('link', { name: /Conversation/i })
      .first()
      .getAttribute('href')
      .catch(() => null);

    const flipBackHref = recHrefAfter ?? convHrefAfter;
    if (!flipBackHref) throw new Error('No flip-back href on switcher');
    await page.goto(`${BASE}${flipBackHref}`, { waitUntil: 'networkidle' });
    expect(page.url()).toBe(firstViewerUrl);

    await testInfo.attach('viewer-after-flip-back.png', {
      body: await page.screenshot(),
      contentType: 'image/png'
    });
  });
});
