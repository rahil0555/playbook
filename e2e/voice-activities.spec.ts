import type { Page } from '@playwright/test';
import { events, expect, installFakeSpeech, installScriptedSpeech, setHearing, spoken, test } from './helpers';

// Letter Playground and Sound Discovery with speaking, as the guided lesson runs them: the teacher says the instruction, then the
// microphone listens by itself, and every judged answer is praised or encouraged. The teacher's voice and the browser's recogniser
// are scripted (see helpers.ts), so these tests prove the app's handling of each result in a real page. They do not prove that a
// real microphone hears a child (docs/VOICE.md).

const yourTurn = (page: Page) => page.getByRole('region', { name: 'Your turn' });
const instruction = (page: Page) => page.getByTestId('lesson-instruction');
const turnStatus = (page: Page) => page.getByTestId('lesson-status');
const tile = (page: Page, letter: string) => page.getByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) });
const PRAISE = /Hooray|Amazing|Well done|Super/;
const ENCOURAGE = /Good try/;

/**
 * The encouraging line is spoken and then the microphone opens again: the spoken line is kept in the event log in order, so it is
 * found there even though the line lasts only a moment on screen.
 */
async function waitForEncouragement(page: Page) {
  await expect.poll(async () => (await events(page)).some((e) => /^say:(Good try|Nearly)/.test(e)), { timeout: 10000 }).toBe(true);
}

/** the teacher's voice and the scripted microphone are ready before the page loads */
async function speakingPage(page: Page, options: { supported?: boolean } = {}) {
  await installFakeSpeech(page);
  await installScriptedSpeech(page, options);
}

test.describe('Letter Playground: say the letter name', () => {
  test('a spoken letter name is praised, and the letter count does not change', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await expect(instruction(page)).toHaveText('Say B for ball!');
    await expect(page.getByText(/1 of 26 letters found so far/)).toBeVisible();
    await setHearing(page, { transcript: 'bee' });
    await expect(turnStatus(page)).toHaveText(PRAISE, { timeout: 10000 });
    await expect(page.getByTestId('lesson-success')).toBeVisible();
    // the letter was already found by tapping it, so a right answer does not count it again
    await expect(page.getByText(/1 of 26 letters found so far/)).toBeVisible();
  });

  test('a wrong name is encouraged, and the same letter is asked again until the child says it', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await expect(instruction(page)).toHaveText('Say B for ball!');
    await setHearing(page, { transcript: 'dog' });
    await waitForEncouragement(page);
    await setHearing(page, { transcript: 'bee' });
    await expect(turnStatus(page)).toHaveText(PRAISE, { timeout: 10000 });
  });

  test('a browser with no speech recognition says so, and the letters still work', async ({ page }) => {
    await speakingPage(page, { supported: false });
    await page.goto('/#/alphabet');
    await tile(page, 'c').click();
    await expect(turnStatus(page)).toContainText("This browser can't listen for speech", { timeout: 10000 });
    await expect(yourTurn(page).getByRole('button', { name: 'Speak', exact: true })).toHaveCount(0);
    await expect(yourTurn(page).getByRole('button', { name: 'Next letter' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Selected letter' })).toContainText('C is for cat');
  });

  test('Hear it says the letter, then its sound and its example word', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await expect(instruction(page)).toHaveText('Say B for ball!');
    await yourTurn(page).getByRole('button', { name: 'Stop listening' }).click({ timeout: 10000 });
    await page.getByRole('button', { name: 'Hear it', exact: true }).click();
    await expect.poll(() => spoken(page)).toEqual(expect.arrayContaining(['ball']));
  });

  test('while listening, a tapped letter switches the microphone off before the next letter is taught', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await expect(instruction(page)).toHaveText('Say B for ball!');
    await setHearing(page, { hold: true });
    await expect(yourTurn(page).getByRole('button', { name: 'Stop listening' })).toBeVisible({ timeout: 10000 });
    const before = (await events(page)).length;
    await tile(page, 'c').click();
    await expect(instruction(page)).toHaveText('Say C for cat!');
    const after = (await events(page)).slice(before);
    expect(after, 'the microphone is switched off when the letter changes').toContain('mic off');
    expect(after.indexOf('mic off')).toBeLessThan(after.indexOf('say:Say C for cat!'));
  });

  test('Stop and Speak work from the keyboard', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await setHearing(page, { hold: true });
    const stop = yourTurn(page).getByRole('button', { name: 'Stop listening' });
    await expect(stop).toBeVisible({ timeout: 10000 });
    await stop.focus();
    await page.keyboard.press('Enter');
    await expect(turnStatus(page)).toHaveText(/Tap Speak when you/);
    const speak = yourTurn(page).getByRole('button', { name: 'Speak', exact: true });
    await speak.focus();
    await page.keyboard.press('Enter');
    await expect(yourTurn(page).getByRole('button', { name: 'Stop listening' })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Sound Discovery: say a word that has the sound', () => {
  test('the question asks for a word that has the sound (not one that starts with it)', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/phonics');
    await expect(instruction(page)).toContainText('Say a word that has the sound of A');
    await expect(instruction(page)).not.toContainText('starts with');
  });

  test('the sound alone is played, and the example word stays hidden until the child has answered', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/phonics');
    await expect(instruction(page)).toContainText('sound of A');
    await yourTurn(page).getByRole('button', { name: 'Stop listening' }).click({ timeout: 10000 });
    await page.getByRole('button', { name: 'Hear the sound' }).click();
    await expect(page.getByRole('heading', { name: 'Say a word for it' })).toBeVisible();
    await expect(page.getByText('apple', { exact: true })).toHaveCount(0);
    expect(await spoken(page), 'the example word is not said before the answer').not.toContain('apple');
  });

  test('a word with the sound is accepted, and the letter name is refused for the sound', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/phonics');
    await expect(instruction(page)).toContainText('sound of A');
    await setHearing(page, { transcript: 'ay' });
    await waitForEncouragement(page);
    await setHearing(page, { transcript: 'apple' });
    await expect(turnStatus(page)).toHaveText(PRAISE, { timeout: 10000 });
  });

  test('Stop ends a listening try without judging it, and Speak is offered again', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/phonics');
    await expect(instruction(page)).toBeVisible();
    await setHearing(page, { hold: true });
    await yourTurn(page).getByRole('button', { name: 'Stop listening' }).click({ timeout: 10000 });
    await expect(yourTurn(page).getByRole('button', { name: 'Speak', exact: true })).toBeVisible();
    await expect(turnStatus(page)).toHaveText(/Tap Speak when you/);
    await expect(turnStatus(page)).not.toHaveText(ENCOURAGE);
  });

  test('changing letter ends a listening try, so an old answer never carries over', async ({ page }) => {
    await speakingPage(page);
    await page.goto('/#/phonics');
    await setHearing(page, { hold: true });
    await expect(yourTurn(page).getByRole('button', { name: 'Stop listening' })).toBeVisible({ timeout: 10000 });
    const before = (await events(page)).length;
    await page.getByRole('button', { name: /^Letter D,/ }).click();
    await expect(instruction(page)).toContainText('sound of D');
    expect((await events(page)).slice(before), 'the microphone is switched off for the new letter').toContain('mic off');
  });
});
