import type { Page } from '@playwright/test';
import { englishStories } from '../src/playlab/data/en/story';
import { expect, installFakeSpeech, installScriptedSpeech, setHearing, spoken, test } from './helpers';

// The read-along stories: the child spells each sentence's words in order, each with the tennis reward, and the next sentence loads
// once the last word of the one before is spelled. Speech is a mock, so these tests show how the app behaves, not what a real
// microphone or voice does. The whole story (every sentence) is covered by the unit tests, not here, to keep this suite quick.
const first = englishStories[0]!;
const second = englishStories[1]!;

/** the letters of the target word on screen, in tray order (decoys excluded) */
const trayLetters = (page: Page) => page.locator('[data-magic-tile][data-decoy="false"]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value ?? ''));

async function openStory(page: Page) {
  await page.goto('/#/story');
  await page.locator('[data-magic-slot="0"]').waitFor();
}

/** spells the current target by typing its letters; the keyboard places each one in the first empty matching slot */
async function spellCurrent(page: Page) {
  for (const letter of await trayLetters(page)) {
    await page.keyboard.press(letter);
    await page.waitForTimeout(120);
  }
  await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 10000 });
}

test.describe('the story: the reference sentence, built word by word', () => {
  test('Home offers the story, and opening it reads the sentence aloud', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Spell the story' }).click();
    await expect(page.getByRole('button', { name: `Hear “${first.targets[0]}”` })).toHaveAttribute('data-state', 'target');
    await expect.poll(() => spoken(page)).toContain(first.sentence);
  });

  test("the child spells the first sentence's words in order, each finish plays the tennis reward, and the next sentence loads", async ({ page }) => {
    await openStory(page);
    await expect(page.getByText(`Sentence 1 of ${englishStories.length}, word 1 of ${first.targets.length}`)).toBeVisible();
    for (const [i, target] of first.targets.entries()) {
      await expect(page.getByRole('button', { name: `Hear “${target}”` })).toHaveAttribute('data-state', 'target');
      await expect(page.getByText(`Sentence 1 of ${englishStories.length}, word ${i + 1} of ${first.targets.length}`)).toBeVisible();
      await spellCurrent(page);
      await expect(page.locator('[data-story-tennis]')).toBeVisible();
      await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click();
    }
    await expect(page.locator('[data-story-sentence] p')).toHaveText(second.sentence);
    await expect(page.getByText(`Sentence 2 of ${englishStories.length}, word 1 of ${second.targets.length}`)).toBeVisible();
    await expect(page.getByRole('button', { name: `Hear “${second.targets[0]}”` })).toHaveAttribute('data-state', 'target');
  });

  test('the hint stays hidden until the child asks for it', async ({ page }) => {
    await installFakeSpeech(page);
    await openStory(page);
    await expect(page.getByText(/^Hint:/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Show a hint' }).click();
    await expect(page.getByText(`Hint: ${first.hint}`)).toBeVisible();
    await expect.poll(() => spoken(page)).toContain(first.hint);
  });

  test('tapping a word in the sentence speaks that word', async ({ page }) => {
    await installFakeSpeech(page);
    await openStory(page);
    await page.getByRole('button', { name: 'Hear “two”' }).click();
    await expect.poll(() => spoken(page)).toContain('two');
  });

  test('a silent try asks the child to say it again, and the next try can spell the word', async ({ page }) => {
    await installScriptedSpeech(page);
    await openStory(page);
    await setHearing(page, { error: 'no-speech' });
    await page.getByRole('button', { name: 'Speak answer' }).click();
    await expect(page.getByText("I couldn't hear you. Please try again.")).toBeVisible();
    await expect(page.getByText(/That is not the word for this picture/)).toHaveCount(0);
    await setHearing(page, { error: null, transcript: 'are' });
    await page.getByRole('button', { name: 'Speak answer' }).click();
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-story-tennis]')).toBeVisible();
  });

  test('without speech recognition the word is still built by typing the letters', async ({ page }) => {
    await installScriptedSpeech(page, { supported: false });
    await openStory(page);
    await expect(page.getByText("This browser can't listen for speech.")).toBeVisible();
    await expect(page.getByRole('button', { name: 'Speak answer' })).toHaveCount(0);
    await spellCurrent(page);
  });
});

test.describe('the story: reduced motion and no spoken voice', () => {
  test('reduced motion keeps the tennis reward but the letters do not drift', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openStory(page);
    await expect(page.locator('[data-playlab]')).toHaveAttribute('data-motion', 'reduce');
    await expect(page.locator('[data-letter-glyph]').first()).not.toHaveClass(/pl-float/);
    await spellCurrent(page);
    await expect(page.locator('[data-story-tennis]')).toBeVisible();
  });

  test('without a spoken voice the story says so, and the letters still build the word', async ({ page }) => {
    await openStory(page);
    await expect(page.getByText(/This device has no spoken voice/)).toBeVisible({ timeout: 5000 });
    await spellCurrent(page);
    await expect(page.getByRole('button', { name: 'Next word' })).toBeVisible();
  });
});

test.describe('the story at phone widths', () => {
  for (const [width, height] of [
    [320, 700],
    [360, 800],
    [390, 844],
  ] as const) {
    test(`at ${width}×${height} the sentence, the progress and the letters are on screen, the tiles match, and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openStory(page);
      await expect(page.locator('[data-story-sentence]')).toBeVisible();
      const sentence = await page.locator('[data-story-sentence]').boundingBox();
      expect(sentence!.x).toBeGreaterThanOrEqual(0);
      expect(sentence!.x + sentence!.width).toBeLessThanOrEqual(width);
      const progress = await page.getByRole('progressbar', { name: 'Sentence progress' }).boundingBox();
      expect(progress!.x).toBeGreaterThanOrEqual(0);
      expect(progress!.x + progress!.width).toBeLessThanOrEqual(width);
      const tile = await page.locator('[data-magic-tile][data-decoy="false"]').first().boundingBox();
      expect(tile!.x + tile!.width).toBeLessThanOrEqual(width);

      // every letter tile is the same size, no letter is taller than its tile, and the tiles fill as few rows as possible, at most
      // four to a row, as evenly as they can (five tiles are three and two)
      const tiles = await page.locator('ul[aria-label="Loose letters"] > li').evaluateAll((els) =>
        els.map((e) => ({ top: (e as HTMLElement).offsetTop, w: (e as HTMLElement).offsetWidth, h: (e as HTMLElement).offsetHeight })),
      );
      expect(new Set(tiles.map((t) => t.w)).size, 'one tile width').toBe(1);
      expect(new Set(tiles.map((t) => t.h)).size, 'one tile height').toBe(1);
      const rowCounts = new Map<number, number>();
      for (const t of tiles) rowCounts.set(t.top, (rowCounts.get(t.top) ?? 0) + 1);
      const counts = [...rowCounts.values()];
      expect(counts.length, 'rows').toBe(Math.ceil(tiles.length / 4));
      expect(Math.max(...counts) - Math.min(...counts), 'rows are even').toBeLessThanOrEqual(1);
      // layout heights, not bounding boxes: the tiles spring in, and a spring overshoots the box while it moves
      const taller = await page.locator('[data-letter-glyph]').evaluateAll((els) => els.filter((e) => (e as HTMLElement).offsetHeight > (e.closest('li') as HTMLElement).offsetHeight + 1).length);
      expect(taller, 'letters inside their tiles').toBe(0);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);
    });
  }
});
