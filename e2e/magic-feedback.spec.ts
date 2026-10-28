import type { Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, test } from './helpers';

// The feedback under the word: a new message must never wait for the message before it to finish leaving. Playwright's clock
// is paused after the page has loaded, so an exit animation stays where it started until the test moves the clock on (runFor).
// Taps are made with element clicks, not pointer actions, because those wait on frames that the paused clock does not draw.

/** opens a round and returns its word, read from the picture clue (the round is random) */
async function openRound(page: Page) {
  await page.clock.install();
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-slot="0"]').waitFor();
  await page.clock.runFor(2000); // the entrance animations finish while the clock runs
  // from here the clock stands still until the test moves it: a message's exit animation cannot finish on its own
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + 1000);
  const clue = await page.locator('[data-magic-clue]').first().innerText();
  return englishWords.find((w) => w.clue === clue)!.text;
}

const tap = (page: Page, value: string) =>
  page.evaluate((v) => (document.querySelector(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${v}"][data-decoy="false"]`) as HTMLElement).click(), value);
const drop = (page: Page, slot: number) => page.evaluate((i) => (document.querySelector(`[data-magic-slot="${i}"]`) as HTMLElement).click(), slot);

test.describe('Magic Letters feedback', () => {
  test('a letter picked up and dropped on the wrong spot at once shows the retry message, and the picked-up message does not stay', async ({ page }) => {
    const word = await openRound(page);
    const wrong = [...word].findIndex((c) => c !== word[0]);
    await tap(page, word[0]!);
    // "Spell the word!" is leaving now, and the clock is paused, so its exit has not finished
    await drop(page, wrong); // the first letter is wrong in this spot
    await expect(page.getByText(/isn’t in the right spot yet/)).toBeVisible();
    await expect(page.getByText('Nice pick!')).toHaveCount(0);
  });

  test('the last letter placed at once completes the word: the success message shows, the picked-up message is gone, and the next word comes by itself', async ({ page }) => {
    const word = await openRound(page);
    for (const [i, letter] of [...word].entries()) {
      await tap(page, letter);
      await drop(page, i);
    }
    await page.clock.runFor(2000); // the last letter flies in and the word is finished: its card shows
    await expect(page.getByText(/You spelled/)).toBeVisible();
    await expect(page.getByText(/On to the next one/)).toBeVisible();
    await expect(page.getByText('Nice pick!')).toHaveCount(0);
    await page.clock.runFor(4000); // then the celebration is over and the next word comes by itself
    await expect(page.getByText(/You spelled/)).toHaveCount(0);
  });
});
