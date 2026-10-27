import AxeBuilder from '@axe-core/playwright';
import { expect, nextOrFinish, solveSentence, solveWord, test } from './helpers';

// Rewards: stickers for finished rounds. (The "Things you love" feature was removed for children.)

test.describe('stickers', () => {
  test('a new child sees an empty sticker book on Home and in My Stars', async ({ page }) => {
    await page.goto('/#/home');
    const book = page.getByRole('list', { name: 'Sticker book' });
    await expect(book.getByRole('img', { name: /not yet/ })).toHaveCount(12);
    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    await expect(page.getByTestId('sticker-count')).toHaveText(/^0 of 12 stickers/);
  });

  test('finishing a round earns the first sticker, shown on the summary and counted in My Stars', async ({ page }) => {
    await page.goto('/#/word-builder');
    for (let q = 0; q < 5; q++) {
      await solveWord(page);
      await nextOrFinish(page);
    }
    const reveal = page.getByTestId('sticker-reveal');
    await expect(reveal).toBeVisible();
    await expect(reveal).toContainText('New sticker: Apple!');
    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    await expect(page.getByTestId('sticker-count')).toHaveText(/^1 of 12 stickers/);
    await expect(page.locator('[data-sticker="earned"]')).toHaveCount(1);
  });
});

test.describe('no things-you-love section', () => {
  test('Letter Playground has no Love it control, Home has no Things you love section, and the sticker book still has accessible names', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="m"]').click();
    await expect(page.getByRole('button', { name: /Love/ })).toHaveCount(0);
    await page.goto('/#/home');
    await expect(page.getByRole('heading', { name: 'Things you love' })).toHaveCount(0);
    await expect(page.getByRole('list', { name: 'Sticker book' }).getByRole('img').first()).toHaveAttribute('aria-label', /not yet|sticker$/);
  });
});
