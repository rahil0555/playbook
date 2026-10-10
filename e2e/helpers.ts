import { expect, test as base, type Page } from '@playwright/test';
import { englishSentences } from '../src/playlab/data/en/sentences';
import { englishWords } from '../src/playlab/data/en/words';

/** Every test fails if the page logs a console error or throws. */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text()}`);
      });
      page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
      await use(errors);
      expect(errors, 'no console errors or uncaught exceptions').toEqual([]);
    },
    { auto: true },
  ],
});
export { expect };

/** Replace speech synthesis with a recorder so we can see what would be spoken. */
export async function installFakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      voice: unknown = null;
      onstart?: () => void;
      onend?: () => void;
      onerror?: () => void;
      constructor(text: string) {
        this.text = text;
      }
    }
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = FakeUtterance;
    const synth = {
      speaking: false,
      cancel() {},
      getVoices: () => [{ name: 'Fake Voice', lang: 'en-US', localService: true }],
      speak(u: FakeUtterance) {
        spoken.push(u.text);
        setTimeout(() => {
          u.onstart?.();
          setTimeout(() => u.onend?.(), 20);
        }, 5);
      },
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  });
}

export const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);

export async function nextOrFinish(page: Page) {
  await page.getByRole('button', { name: /^(Next word|Next sentence|Next|Finish)$/ }).click();
}

/** Solve the current word-builder question by tapping tiles. Returns the word. */
export async function solveWord(page: Page) {
  const clue = await page.getByRole('region', { name: 'Clue' }).locator('p').first().innerText();
  const word = englishWords.find((w) => w.clue === clue);
  if (!word) throw new Error(`Unknown clue: ${clue}`);
  for (const ch of word.text) await page.locator(`[data-tile][data-value="${ch}"][data-placed="false"]`).first().click();
  await page.getByRole('button', { name: 'Check my word' }).click();
  await expect(page.getByText(/You spelled/)).toBeVisible();
  return word;
}

/** Solve the current sentence question (arrange or fill). Returns the sentence id. */
export async function solveSentence(page: Page) {
  if (await page.getByText('Finish the sentence').isVisible()) {
    const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
    const s = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string) && (x.distractors ?? []).every((d) => options.includes(d)))!;
    await page.locator(`[data-option="${s.words[s.blankIndex!]}"]`).click();
    return s.id;
  }
  const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
  const key = [...tiles].sort().join('|');
  const s = englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === key)!;
  for (const w of s.words) await page.locator(`[data-tile][data-value="${w}"][data-placed="false"]`).first().click();
  await page.getByRole('button', { name: 'Check my sentence' }).click();
  return s.id;
}
