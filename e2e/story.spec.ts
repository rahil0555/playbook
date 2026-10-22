import type { Page } from '@playwright/test';
import { englishStory } from '../src/playlab/data/en/story';
import { expect, installFakeSpeech, installScriptedSpeech, setHearing, spoken, test } from './helpers';

// The read-along story (the reference reel's sentence): the child spells "are", "two" and "one" in sentence order, each with the
// tennis reward. Speech is a mock, so these tests show how the app behaves, not what a real microphone or voice does.

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
    await expect(page.getByRole('button', { name: 'Hear “are”' })).toHaveAttribute('data-state', 'target');
    await expect.poll(() => spoken(page)).toContain(englishStory.sentence);
  });

  test('the child spells "are", "two" and "one" in order, each finish plays the tennis reward, and the story ends', async ({ page }) => {
    await openStory(page);
    for (const target of englishStory.targets) {
      await expect(page.getByRole('button', { name: `Hear “${target}”` })).toHaveAttribute('data-state', 'target');
      await spellCurrent(page);
      await expect(page.locator('[data-story-tennis]')).toBeVisible();
      await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click();
    }
    await expect(page.locator('[data-magic-slot="0"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Story words' })).toBeVisible();
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
    await expect(page.getByText('Speaking answers is not available in this browser.')).toBeVisible();
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
    [360, 800],
    [390, 844],
  ] as const) {
    test(`at ${width}×${height} the sentence and the letters are on screen, and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openStory(page);
      await expect(page.locator('[data-story-sentence]')).toBeVisible();
      const sentence = await page.locator('[data-story-sentence]').boundingBox();
      expect(sentence!.x).toBeGreaterThanOrEqual(0);
      expect(sentence!.x + sentence!.width).toBeLessThanOrEqual(width);
      const tile = await page.locator('[data-magic-tile][data-decoy="false"]').first().boundingBox();
      expect(tile!.x + tile!.width).toBeLessThanOrEqual(width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);
    });
  }
});
