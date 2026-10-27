import type { Page } from '@playwright/test';
import { events, expect, installFakeSpeech, installScriptedSpeech, setHearing, test } from './helpers';

// A child's journey through Letter Playground. The speech and the microphone are mocks (see helpers.ts): these tests prove the
// app's handling of what the browser reports, not what a real microphone or a child's voice does.

const instruction = (page: Page) => page.getByTestId('lesson-instruction');
const status = (page: Page) => page.getByTestId('lesson-status');

async function openLetters(page: Page) {
  await installFakeSpeech(page);
  await installScriptedSpeech(page);
  await page.goto('/#/alphabet');
  await expect(instruction(page)).toHaveText('Say A for apple!');
}

test.describe('Letter Playground: the guided lesson', () => {
  test('A for apple: the right answer gets a success mark and praise, then the next letter comes by itself', async ({ page }) => {
    await openLetters(page);
    await setHearing(page, { transcript: 'A for apple' });
    await expect(page.getByTestId('lesson-success')).toBeVisible({ timeout: 10000 });
    await expect(status(page)).toHaveText(/Hooray|Amazing|Well done|Super/);
    // the next letter starts once the praise has been heard; the hearing is cleared so the old answer is not judged again
    await setHearing(page, { transcript: '' });
    await expect(instruction(page)).toHaveText('Say B for ball!', { timeout: 10000 });
  });

  test('the teacher is not heard: the microphone turns on only after the instruction has been spoken', async ({ page }) => {
    await openLetters(page);
    await expect.poll(() => events(page), { timeout: 10000 }).toContain('mic on');
    const log = await events(page);
    const said = log.indexOf('say:Say A for apple!');
    expect(said, 'the teacher said the instruction').toBeGreaterThanOrEqual(0);
    expect(said, 'and that came before the microphone opened').toBeLessThan(log.indexOf('mic on'));
  });

  test('a word for another letter is not accepted: the child is encouraged, and no reward is shown', async ({ page }) => {
    await openLetters(page);
    await setHearing(page, { transcript: 'banana' });
    // the encouraging line is spoken, then the microphone opens again: the spoken line is in the event log in order
    await expect.poll(async () => (await events(page)).some((e) => /^say:(Good try|Nearly)/.test(e)), { timeout: 10000 }).toBe(true);
    await expect(page.getByTestId('lesson-success')).toHaveCount(0);
  });

  test('nothing heard asks the child to try again, and the microphone opens again', async ({ page }) => {
    await openLetters(page);
    await setHearing(page, { error: 'no-speech' });
    // the hearing line is spoken (its apostrophe is typographic, so only its start is matched), then listening starts again
    await expect.poll(async () => (await events(page)).some((e) => e.startsWith('say:I couldn')), { timeout: 10000 }).toBe(true);
  });

  test('Stop ends listening at once, and Speak starts it again', async ({ page }) => {
    await openLetters(page);
    await setHearing(page, { hold: true });
    await page.getByRole('button', { name: 'Stop listening' }).click({ timeout: 10000 });
    await expect(status(page)).toHaveText(/Tap Speak when you/);
    await expect(page.getByRole('button', { name: 'Speak' })).toBeEnabled();
  });

  test('without speech recognition there is one way on, Next letter, and tapping a letter also works', async ({ page }) => {
    await installFakeSpeech(page);
    await installScriptedSpeech(page, { supported: false });
    await page.goto('/#/alphabet');
    await expect(page.getByRole('button', { name: 'Next letter' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Speak' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Next letter' }).click();
    await expect(instruction(page)).toHaveText('Say B for ball!');
    await page.getByRole('button', { name: /^Letter A,/ }).click();
    await expect(instruction(page)).toHaveText('Say A for apple!');
  });
});

test.describe('Letter Playground: a sticker is earned by a round, shown once, and kept after a refresh', () => {
  test('finding five letters earns the first sticker, which is shown then and not again after a refresh', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/alphabet');
    for (const letter of ['a', 'b', 'c', 'd', 'e']) {
      await page.getByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) }).click();
    }
    await expect(page.getByText('5 letters found! 3 stars!')).toBeVisible();
    await expect(page.getByTestId('sticker-reveal')).toContainText('New sticker: Apple!');

    await page.reload();
    await expect(instruction(page)).toBeVisible();
    await expect(page.getByTestId('sticker-reveal')).toHaveCount(0);

    await page.getByRole('button', { name: 'My Stars' }).click();
    await expect(page.getByTestId('sticker-count')).toHaveText(/^1 of 12 stickers/);
    await expect(page.locator('[data-sticker="earned"]')).toHaveCount(1);
    await expect(page.locator('[data-sticker="locked"]')).toHaveCount(11);
  });
});
