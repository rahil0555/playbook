import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

/**
 * The usage paywall, driven the way a child and a parent actually hit it: a clean device, and the
 * free allowance spent with REAL taps. Nothing is seeded and nothing is stubbed, so these tests
 * prove the pause/resume behaviour end to end rather than a pre-set state.
 *
 * (e2e/paywall.spec.ts seeds the saved progress to stand for earlier play, which is faster but
 * assumes the record the app would have written. This file earns that record by playing.)
 *
 * The credit numbers under test are the product owner's: 12 letters, 12 sounds, 16 words
 * (four rounds of four), 4 sentences, 2 matching games (src/playlab/lib/credits.ts).
 */
const SETTLED = { timeout: 30_000 };
/** The 12 free letters of the Letter Playground - one tap each spends one. */
const FREE_LETTERS = 'ABCDEFGHIJKL';

async function cleanDevice(page: Page) {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.locator('[data-activity="phonics"]').waitFor(SETTLED);
}

/** Spend the Letter Playground allowance by tapping 12 different letters. */
async function spendTwelveLetters(page: Page) {
  await page.locator('[data-activity="alphabet"]').click(SETTLED);
  await page.locator('button[aria-label^="Letter A,"]').waitFor(SETTLED);
  for (const letter of FREE_LETTERS) {
    const tile = page.locator(`button[aria-label^="Letter ${letter},"]`);
    // Twelve taps in a row each start speech and a burst animation, so the tile is often still
    // moving when Playwright checks it: its "visible, enabled and stable" wait then loses the race
    // under load even though the tap itself is fine. `waitFor({ state: 'attached' })` plus a forced
    // click spends the letter deterministically; the wall assertions below stay strict.
    await tile.waitFor({ state: 'attached', timeout: SETTLED.timeout });
    await tile.click({ force: true, timeout: SETTLED.timeout });
  }
}

test('the real app renders its home screen and opens Sound Discovery', async ({ page }) => {
  await cleanDevice(page);

  await expect(page.getByRole('heading', { name: /Pick an activity/i })).toBeVisible(SETTLED);
  await expect(page.getByText(/Welcome to PlayLab/i)).toBeVisible();
  await expect(page.locator('[data-activity="alphabet"]')).toBeVisible();

  await page.locator('[data-activity="phonics"]').click(SETTLED);
  await expect(page.getByRole('heading', { name: /Sound Discovery/i, level: 1 })).toBeVisible(SETTLED);
  expect(page.url(), 'Sound Discovery really opened').toContain('phonics');
});

test('exhausted free-play usage displays the paywall and blocks activity access', async ({ page }) => {
  await cleanDevice(page);
  await spendTwelveLetters(page);

  // The wall appears in the middle of the activity, over what the child was doing.
  const wall = page.locator('[data-paywall]');
  await expect(wall).toBeVisible(SETTLED);
  await expect(page.getByText(/Free play pause/i)).toBeVisible();
  // It is modal: it holds focus, so the activity underneath cannot be used.
  await expect(wall).toBeFocused();

  // Leaving the wall returns Home, where the activity is now marked locked.
  await page.getByRole('button', { name: /Not now/i }).click();
  await expect(wall).toBeHidden(SETTLED);
  await expect(page.locator('[data-activity="alphabet"][data-locked="true"]')).toBeVisible(SETTLED);

  // And the locked card cannot be entered: tapping it shows the wall instead of the activity.
  await page.locator('[data-activity="alphabet"]').click(SETTLED);
  await expect(wall).toBeVisible(SETTLED);
  await expect(page.locator('button[aria-label^="Letter A,"]')).toHaveCount(0);
});

test('the local demo unlock closes the paywall and resumes the requested activity', async ({ page }) => {
  await cleanDevice(page);
  await spendTwelveLetters(page);

  const wall = page.locator('[data-paywall]');
  await expect(wall).toBeVisible(SETTLED);
  // The prices are labelled examples, and the wall states no payment is taken.
  await expect(page.getByText(/examples for planning only/i)).toBeVisible();
  await expect(page.getByText(/does not take payment/i)).toBeVisible();

  // The three demo tiers are on screen with their real prices: a middle-income entry point and a
  // premium family tier, so a parent actually reads the numbers rather than the module owning them.
  await expect(page.getByText('₹399')).toBeVisible();
  await expect(page.getByText('₹2,999')).toBeVisible();
  await expect(page.getByText('₹5,999')).toBeVisible();

  // A grown-up answers the sum the wall is actually showing. The sum is random, so it is read
  // from the page rather than assumed.
  const question = (await page.locator('label[for="pl-paywall-answer"]').textContent()) ?? '';
  const [a, b] = (question.match(/(\d+)\s*\+\s*(\d+)/) ?? []).slice(1).map(Number);
  expect(a, `the wall asks a real sum, saw: ${question}`).toBeGreaterThan(0);
  expect(b, `the wall asks a real sum, saw: ${question}`).toBeGreaterThan(0);

  await page.fill('#pl-paywall-answer', String(a + b));
  await page.getByRole('button', { name: /Unlock everything/i }).click();

  // The wall closes and the child is back INSIDE the activity they were stopped in.
  await expect(wall).toBeHidden(SETTLED);
  await expect(page.locator('button[aria-label^="Letter A,"]')).toBeVisible(SETTLED);
  expect(page.url(), 'back in the activity they were stopped in').toContain('alphabet');

  // The unlock is remembered: nothing else is gated any more.
  await page.locator('[aria-label="Back to home"]').click();
  await expect(page.locator('[data-activity="phonics"]')).toBeVisible(SETTLED);
  await expect(page.locator('[data-locked="true"]')).toHaveCount(0);
});

test('a wrong grown-up answer keeps the wall closed and never unlocks', async ({ page }) => {
  await cleanDevice(page);
  await spendTwelveLetters(page);

  const wall = page.locator('[data-paywall]');
  await expect(wall).toBeVisible(SETTLED);

  await page.fill('#pl-paywall-answer', '0');
  await page.getByRole('button', { name: /Unlock everything/i }).click();

  // It explains itself and stays open.
  await expect(page.getByRole('alert')).toContainText(/not quite right/i);
  await expect(wall).toBeVisible();

  // The activity behind is still mounted (the wall paused it in place), so the real question is
  // whether the child can touch it: the wall must sit over it and take the pointer.
  const covered = await page.evaluate(() => {
    const tile = document.querySelector('button[aria-label^="Letter A,"]');
    if (!tile) return 'the letter tile is gone';
    const box = tile.getBoundingClientRect();
    const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
    if (!hit) return 'nothing is at that point';
    return hit.closest('[data-paywall]') ? 'the wall covers it' : `something else got the tap: ${hit.tagName}`;
  });
  expect(covered, 'the child cannot reach the paused activity through the wall').toBe('the wall covers it');
});
