import { expect, test } from './helpers';

/**
 * The usage paywall, driven in a real browser against the built app.
 *
 * Usage comes from the EXISTING progress snapshot, so a test seeds the same localStorage key the
 * app writes (edurance.playlab.progress.v1) to stand for "the child has already played". No product
 * DOM is instrumented: the assertions read the real rendered page.
 */
const PROGRESS_KEY = 'edurance.playlab.progress.v1';

/** A snapshot the app's own store can read, with all five demo allowances spent. */
function snapshot(perActivity: Record<string, number>, rounds: number) {
  const used = Object.fromEntries(
    Object.entries(perActivity).filter(([id]) => id !== 'alphabet').map(([id, n]) => [id, {
      started: n, answered: n, correct: n, firstTryCorrect: n, completed: n, bestStars: 0,
    }]),
  );
  return {
    version: 1,
    stars: 0,
    activitiesStarted: rounds,
    questionsAnswered: 0,
    correctAnswers: 0,
    firstTryCorrect: 0,
    activitiesCompleted: rounds,
    perActivity: used,
    exploredLetters: Array.from({ length: perActivity.alphabet ?? 0 }, (_, index) => String.fromCharCode(97 + index)),
    matchingVariantsDone: [],
    badges: [],
    recent: [],
  };
}

/** Put usage on the device before the app starts. */
async function seedUsage(page: import('@playwright/test').Page, perActivity: Record<string, number>, rounds: number) {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [PROGRESS_KEY, JSON.stringify(snapshot(perActivity, rounds))] as const,
  );
}

/** The wall itself. */
const wall = (page: import('@playwright/test').Page) => page.getByRole('dialog');
const WALL_NAME = /free play pause/i;

/**
 * Each activity screen is its own lazy-loaded chunk (app/routes.tsx), so the FIRST test to open a
 * given route pays the import cost - longer still when the suite runs in parallel. Waits for it.
 */
const SETTLED = { timeout: 30_000 } as const;
const openScreen = (page: import('@playwright/test').Page, name: RegExp) =>
  expect(page.getByRole('heading', { level: 1, name })).toBeVisible(SETTLED);

test.describe('usage paywall', () => {
  test('a fresh child plays a premium activity with no wall', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
    await page.getByRole('button', { name: /Sound Discovery/ }).click();
    await openScreen(page, /Sound Discovery/);
    await expect(wall(page)).toHaveCount(0);
  });

  test('after the free sound allowance, the wall appears instead of the activity', async ({ page }) => {
    await seedUsage(page, { phonics: 12 }, 12);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();

    await page.getByRole('button', { name: /Sound Discovery/ }).click();

    // the wall is a real labelled modal dialog, and the child was NOT taken into the paid screen
    await expect(wall(page)).toBeVisible();
    await expect(wall(page)).toHaveAccessibleName(WALL_NAME);
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  });

  test('all five activity cards say they are locked after every free allowance is spent', async ({ page }) => {
    await seedUsage(page, { alphabet: 12, phonics: 12, 'word-builder': 16, sentences: 4, matching: 2 }, 46);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();

    for (const id of ['alphabet', 'phonics', 'word-builder', 'sentences', 'matching']) {
      await expect(page.locator(`[data-activity="${id}"][data-locked="true"]`)).toBeVisible();
    }
  });

  test('Letter Playground is gated once its 12-letter allowance is spent', async ({ page }) => {
    await seedUsage(page, { alphabet: 12 }, 12);
    await page.goto('/');
    await page.getByRole('button', { name: /Letter Playground/ }).click();
    await expect(wall(page)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  });

  test('the parent answer unlocks, the wall closes and the child lands in the activity', async ({ page }) => {
    await seedUsage(page, { phonics: 12 }, 12);
    await page.goto('/');
    await page.getByRole('button', { name: /Sound Discovery/ }).click();

    const dialog = wall(page);
    await expect(dialog).toBeVisible();
    // read the sum out of the wall rather than guessing it
    const label = await dialog.getByText(/What is \d+ \+ \d+\?/).innerText();
    const [, a, b] = label.match(/(\d+) \+ (\d+)/)!;

    await dialog.getByLabel(/What is \d+ \+ \d+\?/).fill(String(Number(a) + Number(b)));
    await dialog.getByRole('button', { name: 'Unlock everything' }).click();

    await expect(wall(page)).toHaveCount(0);
    await openScreen(page, /Sound Discovery/);
  });

  test('a wrong parent answer keeps the wall open and explains itself', async ({ page }) => {
    await seedUsage(page, { phonics: 12 }, 12);
    await page.goto('/');
    await page.getByRole('button', { name: /Sound Discovery/ }).click();

    const dialog = wall(page);
    await dialog.getByLabel(/What is \d+ \+ \d+\?/).fill('0');
    await dialog.getByRole('button', { name: 'Unlock everything' }).click();

    await expect(dialog.getByRole('alert')).toHaveText(/not quite right/i);
    await expect(dialog).toBeVisible();
  });

  test('the unlock survives a reload', async ({ page }) => {
    await seedUsage(page, { phonics: 12 }, 12);
    await page.goto('/');
    await page.getByRole('button', { name: /Sound Discovery/ }).click();

    const dialog = wall(page);
    const label = await dialog.getByText(/What is \d+ \+ \d+\?/).innerText();
    const [, a, b] = label.match(/(\d+) \+ (\d+)/)!;
    await dialog.getByLabel(/What is \d+ \+ \d+\?/).fill(String(Number(a) + Number(b)));
    await dialog.getByRole('button', { name: 'Unlock everything' }).click();
    await openScreen(page, /Sound Discovery/);

    // a real refresh: the demo unlock is on the device, so the wall must not come back
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
    await expect(page.locator('[data-locked="true"]')).toHaveCount(0);
    await page.getByRole('button', { name: /Sound Discovery/ }).click();
    await openScreen(page, /Sound Discovery/);
    await expect(wall(page)).toHaveCount(0);
  });

  test('Escape and "Not now" return the child to Home', async ({ page }) => {
    await seedUsage(page, { phonics: 12 }, 12);
    await page.goto('/');
    await page.getByRole('button', { name: /Sound Discovery/ }).click();
    await expect(wall(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(wall(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();

    await page.getByRole('button', { name: /Sound Discovery/ }).click();
    const dialog = wall(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: /Not now/ }).click();
    await expect(wall(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  });

  test('the wall moves focus into itself and never blocks the home screens', async ({ page }) => {
    await seedUsage(page, { phonics: 12 }, 12);
    await page.goto('/');
    await page.getByRole('button', { name: /Sound Discovery/ }).click();
    const dialog = wall(page);
    await expect(dialog).toBeFocused();

    // My Stars must stay reachable behind the wall: the child always has somewhere to go
    await page.keyboard.press('Escape');
    await expect(wall(page)).toHaveCount(0);
    await page.getByRole('button', { name: /My Stars/ }).first().click();
    await openScreen(page, /My Stars/);
    await expect(wall(page)).toHaveCount(0);
  });
});
