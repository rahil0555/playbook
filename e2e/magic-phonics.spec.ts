import { expect, test, type Page } from '@playwright/test';
import { englishLetters } from '../src/playlab/data/en/alphabet';
import { PHONEMES } from '../src/playlab/data/en/phonemes';
import { englishWords } from '../src/playlab/data/en/words';

// Magic Letters: the sound each letter makes in the word on screen. Each test reads what the page actually asked the
// browser's speech engine to say (speechSynthesis.speak), so it checks the request, not only a mocked service.

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

/** the word on screen, found from its clue, so its sounds can be looked up */
async function openWord(page: Page) {
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-clue]').waitFor();
  await page.waitForTimeout(700);
  const clue = await page.locator('[data-magic-clue]').innerText();
  return englishWords.find((w) => w.clue === clue)!;
}

/** what each letter of this word should say, in order: a silent letter says nothing */
const expectedSounds = (sounds: readonly (string | null)[]) =>
  sounds.flatMap((id) => (id === null ? [] : [PHONEMES[id as keyof typeof PHONEMES].speech]));

test.describe('Magic Letters: letter sounds for the word on screen', () => {
  test('picking the first letter says its sound for this word, not its name', async ({ page }) => {
    await recordSpeech(page);
    const word = await openWord(page);
    const first = word.text[0]!;
    const expected = PHONEMES[word.sounds[0] as keyof typeof PHONEMES].speech;
    await page.locator(`[data-magic-tile][data-value="${first}"][data-decoy="false"]`).click();
    await expect.poll(async () => (await spoken(page)).includes(expected), { timeout: 1500 }).toBe(true);
    const alphabetName = englishLetters.find((l) => l.id === first)!.nameSpeech;
    expect(await spoken(page), 'the letter name is never said').not.toContain(alphabetName);
  });

  test('placing each letter says its sound for this word, in order, then the cheer', async ({ page }) => {
    await recordSpeech(page);
    const word = await openWord(page);
    for (const ch of word.text) {
      await page.keyboard.press(ch);
      await page.waitForTimeout(800); // the letter flies in, lands, and its sound follows
    }
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
    await expect.poll(async () => (await spoken(page)).some((t) => t.startsWith('Hooray')), { timeout: 3000 }).toBe(true);
    const texts = await spoken(page);
    expect(texts, 'the sounds, in the order of the word, then the cheer').toEqual([
      ...expectedSounds(word.sounds),
      `Hooray! You spelled ${word.text}!`,
    ]);
  });

  test('sound off: no letter sounds are spoken while the word is built', async ({ page }) => {
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
