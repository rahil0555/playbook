import { expect, test, type Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';

// Magic Letters: the sounds of the word on screen. No recordings are in the build yet (see src/playlab/audio/phonics/README.md),
// so no letter sound may be spoken in its place: browser speech cannot make an isolated sound, and a spelling such as "tuh"
// is not the sound. Each test reads what the page actually asked the browser's speech engine to say (speechSynthesis.speak).

async function recordSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __speech: { t: number; text: string }[] };
    w.__speech = [];
    const synth = window.speechSynthesis;
    if (!synth) return;
    const real = synth.speak.bind(synth);
    synth.speak = (u: SpeechSynthesisUtterance) => {
      w.__speech.push({ t: performance.now(), text: u.text });
      real(u);
    };
  });
}

const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __speech: { t: number; text: string }[] }).__speech.map((x) => x.text));

/** the word on screen, found from its clue */
async function openWord(page: Page) {
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-clue]').waitFor();
  await page.waitForTimeout(700);
  const clue = await page.locator('[data-magic-clue]').innerText();
  return englishWords.find((w) => w.clue === clue)!;
}

test.describe('Magic Letters: letter sounds for the word on screen', () => {
  test('picking the first letter speaks no letter name and no spelling stand-in for its sound', async ({ page }) => {
    await recordSpeech(page);
    const word = await openWord(page);
    const first = word.text[0]!;
    await page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${first}"][data-decoy="false"]`).click();
    await page.waitForTimeout(800); // the sound would follow the pop after ~170 ms
    expect(await spoken(page), 'nothing is spoken for the letter while no recording exists').toEqual([]);
  });

  test('placing every letter speaks no letter sounds, and the word still gets its cheer after the last letter', async ({ page }) => {
    await recordSpeech(page);
    const word = await openWord(page);
    for (const ch of word.text) {
      await page.keyboard.press(ch);
      await page.waitForTimeout(800); // the letter flies in and lands
    }
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
    await expect.poll(async () => (await spoken(page)).some((t) => t.startsWith('Hooray')), { timeout: 3000 }).toBe(true);
    expect(await spoken(page), 'the only thing said is the cheer').toEqual([`Hooray! You spelled ${word.text}!`]);
  });

  test('sound off: nothing is spoken while the word is built, and the word still completes', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null })));
    await recordSpeech(page);
    const word = await openWord(page);
    for (const ch of word.text) {
      await page.keyboard.press(ch);
      await page.waitForTimeout(500);
    }
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
    await page.waitForTimeout(800);
    expect(await spoken(page)).toEqual([]);
  });
});
