import type { Page } from '@playwright/test';
import { expect, solveWord, test } from './helpers';

// Speaking an answer in Magic Letters. The browser's speech recogniser is replaced by a scripted one, so the test decides
// what the browser "hears" and how it fails; everything else (the states, the transcript, the feedback) is the real app.

async function scriptSpeech(page: Page) {
  await page.addInitScript(() => {
    const script: { transcript: string; error: string | null } = { transcript: '', error: null };
    (window as unknown as { __speechScript: typeof script }).__speechScript = script;
    class ScriptedRecognizer {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => this.onstart?.(), 30);
        setTimeout(() => {
          if (script.error) {
            this.onerror?.({ error: script.error });
          } else {
            this.onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: script.transcript, confidence: 0.9 } }] });
          }
          this.onend?.();
        }, 350);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = ScriptedRecognizer;
  });
}

async function withoutSpeech(page: Page) {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).SpeechRecognition = undefined;
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition = undefined;
  });
}

test.describe('Magic Letters: say the word after spelling it', () => {
  test('the child says the word, sees what they said, and is told Correct', async ({ page }) => {
    await scriptSpeech(page);
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await page.evaluate((text) => ((window as unknown as { __speechScript: { transcript: string } }).__speechScript.transcript = text), word.text);
    await page.getByRole('button', { name: 'Speak your answer' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Listening/ })).toBeVisible();
    await expect(page.getByText('Correct!')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/^You said:/)).toContainText(word.text);
    await expect(page.getByRole('button', { name: /^(Next word|Finish)$/ })).toBeVisible();
  });

  test('a refused microphone says why, and the typed answer is still judged', async ({ page }) => {
    await scriptSpeech(page);
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await page.evaluate(() => ((window as unknown as { __speechScript: { error: string | null } }).__speechScript.error = 'not-allowed'));
    await page.getByRole('button', { name: 'Speak your answer' }).click();
    await expect(page.getByText(/did not get to use the microphone/)).toBeVisible({ timeout: 5000 });
    await page.getByLabel('Type your answer').fill(word.text);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();
    await expect(page.getByText(/^You typed:/)).toContainText(word.text);
  });

  test('a browser without speech recognition offers typing only, with no broken microphone', async ({ page }) => {
    await withoutSpeech(page);
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await expect(page.getByRole('button', { name: 'Speak your answer' })).toHaveCount(0);
    await expect(page.getByText(/Voice answers aren.t available/)).toBeVisible();
    await page.getByLabel('Type your answer').fill(word.text);
    await page.getByRole('button', { name: 'Check' }).click();
    await expect(page.getByText('Correct!')).toBeVisible();
  });

  test('skipping the speaking step does not block the next word', async ({ page }) => {
    await scriptSpeech(page);
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click();
    const next = await solveWord(page);
    expect(next.id).not.toBe(word.id);
    await expect(page.getByText('Correct!')).toHaveCount(0);
  });

  test('after speaking, Next word starts the next word with a clean speaking area', async ({ page }) => {
    await scriptSpeech(page);
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await page.evaluate((text) => ((window as unknown as { __speechScript: { transcript: string } }).__speechScript.transcript = text), word.text);
    await page.getByRole('button', { name: 'Speak your answer' }).click();
    await expect(page.getByText('Correct!')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click();
    const next = await solveWord(page);
    expect(next.id).not.toBe(word.id);
    await expect(page.getByText(/^You said:/)).toHaveCount(0);
    await expect(page.getByText('Correct!')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Tap the microphone and say the answer.' })).toBeVisible();
  });

  test('nothing heard asks to try again, and trying again works without a page refresh', async ({ page }) => {
    await scriptSpeech(page);
    await page.goto('/#/word-builder');
    const word = await solveWord(page);
    await page.evaluate(() => ((window as unknown as { __speechScript: { error: string | null } }).__speechScript.error = 'no-speech'));
    await page.getByRole('button', { name: 'Speak your answer' }).click();
    await expect(page.getByText("I couldn't hear you. Please try again.")).toBeVisible({ timeout: 5000 });
    await page.evaluate((text) => {
      const script = (window as unknown as { __speechScript: { error: string | null; transcript: string } }).__speechScript;
      script.error = null;
      script.transcript = text;
    }, word.text);
    await page.getByRole('button', { name: 'Speak your answer' }).click();
    await expect(page.getByText('Correct!')).toBeVisible({ timeout: 5000 });
  });
});

