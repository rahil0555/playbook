import AxeBuilder from '@axe-core/playwright';
import { expect, nextOrFinish, solveSentence, solveWord, test } from './helpers';

// The rewards and "likes" layer: stickers for finished rounds, hearts for things a child loves.

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

test.describe('hearts: things you love', () => {
  test('loving a letter saves it, Home shows it to hear again, and un-loving removes it', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="m"]').click();
    await page.getByRole('button', { name: 'Love this letter' }).click();
    await expect(page.getByRole('button', { name: /Loved: Mm/ })).toHaveAttribute('aria-pressed', 'true');

    await page.reload(); // the heart survives a refresh (saved on this device)
    await page.locator('[data-letter="m"]').click();
    await expect(page.getByRole('button', { name: /Loved: Mm/ })).toBeVisible();

    await page.getByRole('button', { name: 'Home', exact: true }).first().click();
    await expect(page.getByRole('list', { name: 'Things you love' }).getByRole('button', { name: 'Hear letter: Mm' })).toBeVisible();

    await page.goto('/#/alphabet');
    await page.locator('[data-letter="m"]').click();
    await page.getByRole('button', { name: /Loved: Mm/ }).click();
    await expect(page.getByRole('button', { name: 'Love this letter' })).toBeVisible();
  });

  test('a finished word can be loved, and My Stars can take it back out', async ({ page }) => {
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await expect(page.getByRole('button', { name: 'Love this word' })).toBeVisible();
    await page.getByRole('button', { name: 'Love this word' }).click();
    await expect(page.getByRole('button', { name: `Loved: ${word.text}. Tap to take it out of things you love` })).toBeVisible();

    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    const list = page.getByRole('list', { name: 'Things you love' });
    await expect(list).toContainText(word.text);
    await list.getByRole('button', { name: `Take ${word.text} out of things you love` }).click();
    await expect(page.getByText(/Nothing yet. Tap “Love it”/)).toBeVisible();
  });

  test('a finished sentence can be loved and shows in My Stars', async ({ page }) => {
    await page.goto('/#/sentences');
    await expect(page.getByRole('button', { name: 'Love this sentence' })).toHaveCount(0); // nothing to love before it is built
    await solveSentence(page);
    await page.getByRole('button', { name: 'Love this sentence' }).click();
    await expect(page.getByRole('button', { name: /^Loved: / })).toBeVisible();
    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Things you love' }).getByText('(sentence)')).toBeVisible();
  });
});

test.describe('accessibility of the new screens', () => {
  for (const [view, label] of [
    ['home', 'Home'],
    ['progress', 'My Stars'],
  ] as const) {
    test(`axe: WCAG 2.1 A/AA clean on ${label}`, async ({ page }) => {
      await page.goto(`/#/${view}`);
      await expect(page.getByRole('main')).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }

  test('the heart and the sticker book have accessible names, and the heart is a big touch target', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="m"]').click();
    const heart = page.getByRole('button', { name: 'Love this letter' });
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    const box = await heart.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await page.goto('/#/home');
    await expect(page.getByRole('list', { name: 'Sticker book' }).getByRole('img').first()).toHaveAttribute('aria-label', /not yet|sticker$/);
  });
});
