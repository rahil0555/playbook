import type { Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';
import { VOICE_MESSAGES } from '../src/playlab/services/speechInput/evaluate';
import { expect, installFakeSpeech, installScriptedSpeech, setHearing, solveWord, speechStarts, spoken, test } from './helpers';

// Speaking the answer to a Magic Letters picture. The browser's recogniser is scripted, so these tests show how the app
// handles what the browser hears and how it fails. They do not prove that a real microphone works (see docs/VOICE.md).

const speakButton = (page: Page) => page.getByRole('button', { name: 'Speak answer' });

/** the word for the picture on screen, read from its clue */
async function currentWord(page: Page) {
  const clue = await page.locator('[data-magic-clue]').innerText();
  const word = englishWords.find((w) => w.clue === clue);
  if (!word) throw new Error(`Unknown clue: ${clue}`);
  return word;
}

async function openWordBuilder(page: Page, options: { supported?: boolean } = {}) {
  await installScriptedSpeech(page, options);
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-slot="0"]').waitFor();
}

test.describe('Magic Letters: speaking the answer', () => {
  test('Speak answer shows that the browser is listening, with a Stop control that ends it', async ({ page }) => {
    await openWordBuilder(page);
    await setHearing(page, { hold: true });
    await speakButton(page).click();
    await expect(page.getByRole('status').filter({ hasText: 'Listening' })).toBeVisible();
    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(speakButton(page)).toBeVisible();
    await expect(page.getByText('That is not the word for this picture')).toHaveCount(0);
    expect(await speechStarts(page)).toBe(1);
  });

  test('a spoken correct word is spelled out and completes the word', async ({ page }) => {
    await openWordBuilder(page);
    const word = await currentWord(page);
    await setHearing(page, { transcript: `${word.text}.` });
    await speakButton(page).click();
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/On to the next one/)).toBeVisible();
    // the word is finished: the microphone is not offered again
    await expect(speakButton(page)).toHaveCount(0);
  });

  test('a spoken wrong word is an attempt with the retry feedback, and the letters still finish the word', async ({ page }) => {
    await openWordBuilder(page);
    const word = await currentWord(page);
    await setHearing(page, { transcript: word.text === 'elephant' ? 'zebra' : 'elephant' });
    await speakButton(page).click();
    await expect(page.getByText(VOICE_MESSAGES.wrong)).toBeVisible();
    await solveWord(page); // typed letters still work after a miss by voice
  });

  test('a browser with no speech recognition says so, and the letters still work', async ({ page }) => {
    await openWordBuilder(page, { supported: false });
    await expect(page.getByText("This browser can't listen for speech.")).toBeVisible();
    await expect(speakButton(page)).toHaveCount(0);
    await solveWord(page);
  });

  test('a refused microphone is explained, is not an attempt, and the letters still work', async ({ page }) => {
    await openWordBuilder(page);
    await setHearing(page, { error: 'not-allowed' });
    await speakButton(page).click();
    await expect(page.getByText(/The browser did not get to use the microphone/)).toBeVisible();
    await expect(page.getByText(/blocked/)).toHaveCount(0);
    await expect(page.getByText('That is not the word for this picture')).toHaveCount(0);
    await solveWord(page);
  });

  test('a microphone the browser cannot open is named as that, not as a blocked microphone, and the letters still work', async ({ page }) => {
    // the diagnostic line is a warning: it holds the browser's error name, and never what the child said
    const logs: unknown[][] = [];
    page.on('console', async (message) => {
      if (message.type() === 'warning' && message.text().includes('[PlayLab voice]')) logs.push(await Promise.all(message.args().map((arg) => arg.jsonValue())));
    });
    await openWordBuilder(page);
    await setHearing(page, { error: 'audio-capture' });
    await speakButton(page).click();
    await expect(page.getByText(/could not open a microphone/)).toBeVisible();
    await expect(page.getByText(/blocked/)).toHaveCount(0);
    await expect.poll(() => logs.length).toBe(1);
    expect(JSON.stringify(logs)).toContain('audio-capture');
    await solveWord(page);
  });

  test('a browser whose speech service is switched off says so, not that the microphone is blocked', async ({ page }) => {
    await openWordBuilder(page);
    await setHearing(page, { error: 'service-not-allowed' });
    await speakButton(page).click();
    await expect(page.getByText(/speech service is switched off/)).toBeVisible();
    await expect(page.getByText(/blocked/)).toHaveCount(0);
    await solveWord(page);
  });

  test('a browser that never starts listening is told so, and the child can try again', async ({ page }) => {
    await openWordBuilder(page);
    await setHearing(page, { noStart: true });
    await speakButton(page).click();
    await expect(page.getByText(/did not start listening/)).toBeVisible({ timeout: 20000 });
    await expect(speakButton(page)).toBeVisible();
  });

  test('no speech is not an attempt: the child is asked to try again, and the next try can still be correct', async ({ page }) => {
    await openWordBuilder(page);
    const word = await currentWord(page);
    await setHearing(page, { error: 'no-speech' });
    await speakButton(page).click();
    await expect(page.getByText(VOICE_MESSAGES.noSpeech)).toBeVisible();
    await expect(page.getByText('That is not the word for this picture')).toHaveCount(0);
    await setHearing(page, { error: null, transcript: word.text });
    await speakButton(page).click();
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 10000 });
  });

  test('a network error is explained, and the microphone is offered again', async ({ page }) => {
    await openWordBuilder(page);
    await setHearing(page, { error: 'network' });
    await speakButton(page).click();
    await expect(page.getByText(VOICE_MESSAGES.network)).toBeVisible();
    await expect(speakButton(page)).toBeVisible();
  });

  test('a repeated tap on Speak answer opens one listening session only', async ({ page }) => {
    await openWordBuilder(page);
    await setHearing(page, { hold: true });
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Speak answer')!;
      button.click();
      button.click();
    });
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();
    expect(await speechStarts(page)).toBe(1);
  });

  test('the teacher voice still reads the clue aloud while the microphone is offered', async ({ page }) => {
    await installFakeSpeech(page);
    await installScriptedSpeech(page);
    await page.goto('/#/word-builder');
    await page.locator('[data-magic-clue]').waitFor();
    const clue = await page.locator('[data-magic-clue]').innerText();
    await page.getByRole('button', { name: /Hear the clue/ }).first().click();
    await expect.poll(() => spoken(page)).toContain(clue);
    expect(await speechStarts(page)).toBe(0);
  });
});

test.describe('Magic Letters: the voice answer at phone widths', () => {
  for (const [width, height] of [
    [320, 700],
    [360, 800],
    [390, 844],
  ] as const) {
    test(`at ${width}×${height} the microphone is reachable, large enough to tap, and nothing scrolls sideways`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await openWordBuilder(page);
      const button = speakButton(page);
      await expect(button).toBeVisible();
      const box = await button.boundingBox();
      expect(box, 'the microphone has a size').not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);
    });
  }
});
