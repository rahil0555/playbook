import type { Page } from '@playwright/test';
import { expect, test } from './helpers';

// Stars, rounds and stickers follow the completion rule and are saved in the browser. The alphabet goal (find five letters) is
// the round here: finding them gives its stars and one round, a refresh keeps them, and finding the letters again after a refresh
// celebrates without giving them a second time.

const GOAL_LETTERS = ['a', 'b', 'c', 'd', 'e'];

async function findTheGoalLetters(page: Page) {
  for (const letter of GOAL_LETTERS) {
    await page.getByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) }).click();
  }
}

/** the number in one of Home's stat tiles, found by its label */
const statTile = (page: Page, label: string) => page.locator('div.pl-paper', { has: page.getByText(label, { exact: true }) }).locator('span.block').first();

async function refreshHome(page: Page) {
  await page.goto('/#/');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: /Let’s play with letters/ })).toBeVisible();
}

test.describe('rewards are given once and kept through a refresh', () => {
  test('the alphabet goal gives its stars and round, a refresh keeps them, and finding the letters again does not give them twice', async ({ page }) => {
    await page.goto('/#/alphabet');
    await findTheGoalLetters(page);
    await expect(page.getByText('5 letters found! 3 stars!')).toBeVisible();

    await refreshHome(page);
    await expect(statTile(page, 'stars collected')).toHaveText('3');
    await expect(statTile(page, 'rounds finished')).toHaveText('1');
    await expect(statTile(page, 'stickers')).toHaveText('1 / 12');

    await page.goto('/#/alphabet');
    await page.reload();
    await findTheGoalLetters(page);
    await expect(page.getByText('5 letters found again!')).toBeVisible();
    await expect(page.getByText('5 letters found! 3 stars!')).toHaveCount(0);

    await refreshHome(page);
    await expect(statTile(page, 'stars collected')).toHaveText('3');
    await expect(statTile(page, 'rounds finished')).toHaveText('1');
    await expect(statTile(page, 'stickers')).toHaveText('1 / 12');
  });

  test('before any round is finished, the stats say so and show no stickers', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter A,/ }).click();
    await refreshHome(page);
    await expect(statTile(page, 'stars collected')).toHaveText('0');
    await expect(statTile(page, 'rounds finished')).toHaveText('0');
    await expect(statTile(page, 'stickers')).toHaveText('0 / 12');
  });
});
