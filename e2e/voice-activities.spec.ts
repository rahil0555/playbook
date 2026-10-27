import type { Page } from '@playwright/test';
import { events, installFakeSpeech, installScriptedSpeech, setHearing, spoken, expect, test } from './helpers';

// Letter Playground and Sound Discovery with speaking. The browser's recogniser is scripted (see helpers.ts), so these tests
// prove the app's handling of each result in a real page. They do not prove that a real microphone hears a child (docs/VOICE.md).

const yourTurn = (page: Page) => page.getByRole('region', { name: 'Your turn' });
const turnStatus = (page: Page) => yourTurn(page).getByRole('status');
const tile = (page: Page, letter: string) => page.getByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) });

test.describe('Letter Playground: say the letter name', () => {
  test('a spoken letter name is praised, and the letter count does not change', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await expect(page.getByText(/1 of 26 letters found so far/)).toBeVisible();
    await setHearing(page, { transcript: 'bee' });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await expect(turnStatus(page)).toHaveText("Yes! That's “bee”.", { timeout: 10000 });
    await expect(page.getByText(/1 of 26 letters found so far/)).toBeVisible();
  });

  test('a wrong name says the right name, and Try again hears the child again', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await setHearing(page, { transcript: 'dog' });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await expect(turnStatus(page)).toContainText('This letter is called “bee”', { timeout: 10000 });
    await setHearing(page, { transcript: 'bee' });
    await yourTurn(page).getByRole('button', { name: 'Try again' }).click();
    await expect(turnStatus(page)).toHaveText("Yes! That's “bee”.", { timeout: 10000 });
  });

  test('a browser with no speech recognition says so, and the letters still work', async ({ page }) => {
    await installScriptedSpeech(page, { supported: false });
    await page.goto('/#/alphabet');
    await tile(page, 'c').click();
    await expect(turnStatus(page)).toContainText("Speaking isn't available in this browser");
    await expect(yourTurn(page).getByRole('button', { name: 'Speak now' })).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Selected letter' })).toContainText('C is for cat');
  });

  test('the sound is heard inside its example word', async ({ page }) => {
    await installFakeSpeech(page);
    await installScriptedSpeech(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await page.getByRole('button', { name: 'Hear the sound' }).click();
    await expect.poll(() => spoken(page)).toEqual(expect.arrayContaining(['Listen for the sound in', 'ball']));
  });

  test('while listening, a tapped letter switches the microphone off before its name is said, and a late result is not judged', async ({ page }) => {
    await installFakeSpeech(page);
    await installScriptedSpeech(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await setHearing(page, { hold: true });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await expect(yourTurn(page).getByRole('button', { name: 'Stop' })).toBeVisible();
    await expect(yourTurn(page).getByRole('button', { name: 'Listen again' })).toBeDisabled();
    const before = (await events(page)).length;
    await tile(page, 'c').click();
    await expect.poll(() => spoken(page)).toContain('see');
    const after = (await events(page)).slice(before);
    expect(after, 'the microphone is switched off, and the letter is then spoken').toContain('mic off');
    expect(after.indexOf('mic off')).toBeLessThan(after.indexOf('say:see'));
    await expect(turnStatus(page)).toContainText('Tap Speak now when you are ready.');
    await expect(turnStatus(page)).not.toContainText('Yes!');
  });

  test('keyboard focus stays on the voice button: Stop while listening, the words after a correct answer, Try again after a wrong one', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/alphabet');
    await tile(page, 'b').click();
    await setHearing(page, { transcript: 'dog' });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await expect(turnStatus(page)).toContainText('This letter is called “bee”', { timeout: 10000 });
    await expect(yourTurn(page).getByRole('button', { name: 'Try again' })).toBeFocused();
    await setHearing(page, { transcript: 'bee' });
    await yourTurn(page).getByRole('button', { name: 'Try again' }).click();
    await expect(turnStatus(page)).toHaveText("Yes! That's “bee”.", { timeout: 10000 });
    await expect(turnStatus(page)).toBeFocused();
  });
});

test.describe('Sound Discovery: say a word that has the sound', () => {
  test('the question asks for a word that has the sound (not one that starts with it)', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/phonics');
    await expect(yourTurn(page)).toContainText('Say a word that has the sound of A');
    await expect(yourTurn(page)).not.toContainText('starts with');
  });

  test('the example word is accepted, and the letter name is refused for the sound', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/phonics');
    await expect(yourTurn(page)).toBeVisible();
    await setHearing(page, { transcript: 'ay' });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await expect(turnStatus(page)).toContainText("That's the letter's name", { timeout: 10000 });
    await setHearing(page, { transcript: 'apple' });
    await yourTurn(page).getByRole('button', { name: 'Try again' }).click();
    await expect(turnStatus(page)).toHaveText('Yes! That sound is in “apple”.', { timeout: 10000 });
  });

  test('Stop ends a listening try without judging it, and Speak now is offered again', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/phonics');
    await expect(yourTurn(page)).toBeVisible();
    await setHearing(page, { hold: true });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await yourTurn(page).getByRole('button', { name: 'Stop' }).click();
    await expect(yourTurn(page).getByRole('button', { name: 'Speak now' })).toBeVisible();
    await expect(turnStatus(page)).toContainText('Tap Speak now when you are ready.');
  });

  test('changing letter ends a listening try, so an old answer never carries over', async ({ page }) => {
    await installScriptedSpeech(page);
    await page.goto('/#/phonics');
    await expect(yourTurn(page)).toBeVisible();
    await setHearing(page, { hold: true });
    await yourTurn(page).getByRole('button', { name: 'Speak now' }).click();
    await expect(yourTurn(page).getByRole('button', { name: 'Stop' })).toBeVisible();
    await page.getByRole('button', { name: /^Letter D,/ }).click();
    await expect(yourTurn(page)).toContainText('sound of D');
    await expect(yourTurn(page).getByRole('button', { name: 'Speak now' })).toBeVisible();
  });
});
