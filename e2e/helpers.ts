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

/**
 * Replace the browser's speech recogniser with a scripted one. The test decides what the browser "hears" (`transcript`), how it
 * fails (`error`), and whether it is there at all (`supported`); `hold` keeps a session listening until the child stops it.
 * `starts` counts the sessions the app opened. This is a mock: it proves the app's handling, not the microphone.
 */
export async function installScriptedSpeech(page: Page, options: { supported?: boolean } = {}) {
  await page.addInitScript((supported: boolean) => {
    const script = { transcript: '', error: null as string | null, hold: false, noStart: false, starts: 0 };
    (window as unknown as { __speech: typeof script }).__speech = script;
    class ScriptedRecognizer {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onstart: (() => void) | null = null;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;
      aborted = false;
      start() {
        script.starts += 1;
        // a browser that never starts: no start event, no error, no end
        if (script.noStart) return;
        setTimeout(() => {
          if (this.aborted) return;
          this.onstart?.();
          if (!script.hold) setTimeout(() => this.finish(), 300);
        }, 30);
      }
      finish() {
        if (this.aborted) return;
        if (script.error) this.onerror?.({ error: script.error });
        else if (script.transcript) this.onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript: script.transcript, confidence: 0.9 } }] });
        this.onend?.();
      }
      stop() {
        this.finish();
      }
      abort() {
        this.aborted = true;
      }
    }
    const w = window as unknown as { SpeechRecognition: unknown; webkitSpeechRecognition: unknown };
    // Chromium has its own webkit-prefixed recogniser: "no speech recognition" has to clear both names
    if (supported) w.SpeechRecognition = ScriptedRecognizer;
    else {
      w.SpeechRecognition = undefined;
      w.webkitSpeechRecognition = undefined;
    }
  }, options.supported ?? true);
}

/** Sets what the scripted recogniser hears next, and how it behaves. */
export const setHearing = (page: Page, script: { transcript?: string; error?: string | null; hold?: boolean; noStart?: boolean }) =>
  page.evaluate((s) => Object.assign((window as unknown as { __speech: object }).__speech, s), script);

export const speechStarts = (page: Page) => page.evaluate(() => (window as unknown as { __speech: { starts: number } }).__speech.starts);

export async function nextOrFinish(page: Page) {
  await page.getByRole('button', { name: /^(Next word|Next sentence|Next|Finish)$/ }).click();
}

/** Solve the current word-builder (Magic Letters) question by typing its letters. Returns the word. */
export async function solveWord(page: Page) {
  const clue = await page.locator('[data-magic-clue]').innerText();
  const word = englishWords.find((w) => w.clue === clue);
  if (!word) throw new Error(`Unknown clue: ${clue}`);
  // let React attach the keyboard listener for the new question before the first key (two frames + a tick)
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 0)))));
  for (const ch of word.text) await page.keyboard.press(ch);
  await expect(page.getByText(/You spelled/)).toBeVisible();
  return word;
}

/** Solve the current sentence question (arrange or fill). Returns the sentence id. */
export async function solveSentence(page: Page) {
  // wait for the question to render (tiles for "arrange", options for "fill") before deciding which kind it is
  await page.locator('[data-tile], [data-option]').first().waitFor();
  if (await page.getByText('Finish the sentence').isVisible()) {
    const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
    const s = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string) && (x.distractors ?? []).every((d) => options.includes(d)))!;
    await page.locator(`[data-option="${s.words[s.blankIndex!]}"]`).click();
    return s.id;
  }
  const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
  const key = [...tiles].sort().join('|');
  const s = englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === key)!;
  // the last word judges the sentence by itself: there is no check button
  for (const w of s.words) await page.locator(`[data-tile][data-value="${w}"][data-placed="false"]`).first().click();
  return s.id;
}
