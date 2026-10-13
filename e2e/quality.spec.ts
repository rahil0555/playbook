import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { englishSentences } from '../src/playlab/data/en/sentences';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, test } from './helpers';

// Quality pass: tap-to-frame latency, rapid input that must not overwrite or double count, and the timing of
// sound, speech and the character reveal. Each check reads what the page actually did: sound-effect oscillator starts,
// spoken lines, the progress saved to localStorage and the DOM after the next frame.

type Tone = { t: number; f: number };
type Line = { t: number; text: string };

/** Logs every sound-effect oscillator start, every spoken line and every tap's time to the next frame (in browser time). */
async function instrument(page: Page) {
  await installFakeSpeech(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: Tone[]; __speech: Line[]; __taps: { value: string; ms: number }[]; __down: number };
    w.__tones = [];
    w.__speech = [];
    w.__taps = [];
    w.__down = 0;
    const origStart = OscillatorNode.prototype.start;
    OscillatorNode.prototype.start = function (this: OscillatorNode, ...args: [when?: number]) {
      w.__tones.push({ t: performance.now(), f: this.frequency.value });
      return origStart.apply(this, args);
    };
    const synth = window.speechSynthesis as unknown as { speak: (u: { text: string }) => void };
    const origSpeak = synth.speak.bind(synth);
    synth.speak = (u) => {
      w.__speech.push({ t: performance.now(), text: u.text });
      origSpeak(u);
    };
    // a tap: from the pointer going down, to the first frame after the click has been handled
    let value = '';
    document.addEventListener(
      'pointerdown',
      (e) => {
        w.__down = performance.now();
        value = (e.target as Element | null)?.closest('[data-tile],[data-magic-tile]')?.getAttribute('data-value') ?? '';
      },
      true,
    );
    document.addEventListener(
      'click',
      () => {
        const start = w.__down;
        const v = value;
        requestAnimationFrame(() => w.__taps.push({ value: v, ms: performance.now() - start }));
      },
      true,
    );
  });
}

const read = <T,>(page: Page, key: string) => page.evaluate((k) => (window as unknown as Record<string, unknown>)[k], key) as Promise<T>;
const tones = (page: Page) => read<Tone[]>(page, '__tones');
const speech = (page: Page) => read<Line[]>(page, '__speech');
const taps = (page: Page) => read<{ value: string; ms: number }[]>(page, '__taps');

/** Progress as saved by the app (the same storage a child's device keeps). */
async function savedActivity(page: Page, id: string) {
  return page.evaluate((activity) => {
    const raw = window.localStorage.getItem('edurance.playlab.progress.v1');
    const snap = raw ? (JSON.parse(raw) as { perActivity: Record<string, { answered: number; completed: number }> }) : null;
    return snap?.perActivity[activity] ?? { answered: 0, completed: 0 };
  }, id);
}

/** Tap, then report how long the first sound for that tap took to be scheduled (ms after the pointer went down). */
async function soundAfterTap(page: Page, click: () => Promise<void>) {
  const before = (await tones(page)).length;
  await click();
  await page.waitForTimeout(120);
  const down = await read<number>(page, '__down');
  const first = (await tones(page)).slice(before).find((x) => x.t >= down);
  return first ? first.t - down : Number.NaN;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? Number.NaN;
};

function writeReport(name: string, data: unknown) {
  const dir = process.env.QUALITY_OUT ?? 'test-results/quality';
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2));
}

async function openMagic(page: Page) {
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-clue]').waitFor();
  await page.waitForTimeout(700);
  const clue = await page.locator('[data-magic-clue]').innerText();
  return englishWords.find((w) => w.clue === clue)!;
}

/** Sentence Fun on an arrange question (word tiles); fill-in questions are solved on the way. */
async function openArrangeSentence(page: Page) {
  await page.goto('/#/sentences');
  for (let i = 0; i < 6; i++) {
    await page.locator('[data-tile], [data-option]').first().waitFor();
    if ((await page.locator('[data-tile][data-placed="false"]').count()) > 0) break;
    const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
    const fill = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string))!;
    await page.locator(`[data-option="${fill.words[fill.blankIndex!]}"]`).click();
    await page.getByRole('button', { name: /^(Next sentence|Finish)$/ }).click();
  }
  await page.locator('[data-tile][data-placed="false"]').first().waitFor();
  await page.waitForTimeout(400);
}

/** The arrange sentence on screen, found by its tiles (the same lookup the other e2e helpers use). */
async function sentenceOnScreen(page: Page) {
  const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
  const key = [...tiles].sort().join('|');
  return englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === key)!;
}

/** Place every word in the right order, with no pause between taps (the fastest a child could go). */
async function arrangeFast(page: Page) {
  const s = await sentenceOnScreen(page);
  for (const w of s.words) await page.locator(`[data-tile][data-value="${w}"][data-placed="false"]:not(.ring-4)`).first().click();
  return s;
}


for (const [device, viewport] of [
  ['phone', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 800 }],
] as const) {
  test.describe(`${device} (${viewport.width}×${viewport.height})`, () => {
    test.use({ viewport });

    test('a tapped letter answers on the next frame', async ({ page }) => {
      await instrument(page);
      await openMagic(page);
      const letters = page.locator('[data-magic-tile]:not([disabled])');
      const n = Math.min(5, await letters.count());
      const sounds: number[] = [];
      for (let i = 0; i < n; i++) {
        sounds.push(await soundAfterTap(page, () => letters.nth(i).click()));
        await page.waitForTimeout(250);
      }
      const ms = (await taps(page)).filter((t) => t.value !== '').map((t) => t.ms);
      writeReport(`${device}-letter-tap`, { frameMs: ms, soundMs: sounds, medianFrame: median(ms), medianSound: median(sounds) });
      test.info().annotations.push({ type: 'latency', description: `letter taps: to next frame ${ms.map((m) => m.toFixed(1)).join(', ')} ms; first sound ${sounds.map((m) => m.toFixed(1)).join(', ')} ms` });
      expect(ms.length).toBe(n);
      expect(median(ms)).toBeLessThan(100);
      expect(median(sounds)).toBeLessThan(100);
    });

    test('a tapped word answers on the next frame', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const tiles = page.locator('[data-tile][data-placed="false"]');
      const sounds: number[] = [];
      for (let i = 0; i < 3; i++) {
        sounds.push(await soundAfterTap(page, () => tiles.first().click()));
        await page.waitForTimeout(700);
      }
      const ms = (await taps(page)).filter((t) => t.value !== '').map((t) => t.ms);
      writeReport(`${device}-word-tap`, { frameMs: ms, soundMs: sounds, medianFrame: median(ms), medianSound: median(sounds) });
      test.info().annotations.push({ type: 'latency', description: `word taps: to next frame ${ms.map((m) => m.toFixed(1)).join(', ')} ms; first sound ${sounds.map((m) => m.toFixed(1)).join(', ')} ms` });
      expect(ms.length).toBe(3);
      expect(median(ms)).toBeLessThan(100);
      expect(median(sounds)).toBeLessThan(100);
    });

    test('a word typed at full speed: every letter lands once and the word completes', async ({ page }) => {
      await instrument(page);
      const word = await openMagic(page);
      await page.keyboard.type(word.text, { delay: 0 });
      await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
      const slots = page.locator('[data-magic-slot]');
      await expect(slots).toHaveCount(word.text.length);
      for (let i = 0; i < word.text.length; i++) {
        await expect(slots.nth(i)).toHaveAttribute('aria-label', new RegExp(`Slot ${i + 1}: ${word.text[i]!.toUpperCase()}, done`));
      }
      const saved = await savedActivity(page, 'word-builder');
      expect(saved.answered, 'one answer for the word, however fast it was typed').toBe(1);
    });

    test('finishing a word: Pip lands on the completed word, the fanfare starts with the landing, and nothing covers the letters', async ({ page }) => {
      await instrument(page);
      const word = await openMagic(page);
      await page.keyboard.type(word.text.slice(0, -1), { delay: 0 });
      const lastLetterAt = await page.evaluate(() => performance.now());
      await page.keyboard.press(word.text.at(-1)!);
      await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
      // Pip has landed on the word once the cheer is spoken: it sits above the letters, and covers no letter and no control
      await expect.poll(async () => (await speech(page)).some((x) => x.text.startsWith('Hooray! You spelled')), { timeout: 3000 }).toBe(true);
      const geometry = await page.evaluate(() => {
        const creature = document.querySelector('[data-testid="completion-creature"]')!.getBoundingClientRect();
        const hit = (el: Element) => {
          const b = el.getBoundingClientRect();
          return b.width > 0 && !(b.right <= creature.left || b.left >= creature.right || b.bottom <= creature.top || b.top >= creature.bottom);
        };
        const firstSlot = document.querySelector('[data-magic-slot]')!.getBoundingClientRect();
        return {
          aboveLetters: creature.bottom <= firstSlot.top + 1,
          slots: [...document.querySelectorAll('[data-magic-slot]')].filter(hit).length,
          buttons: [...document.querySelectorAll('button')].filter((b) => /Next word|Finish/.test(b.textContent ?? '') && hit(b)).length,
        };
      });
      expect(geometry, 'Pip sits above the word and covers no letter slot and no control').toEqual({ aboveLetters: true, slots: 0, buttons: 0 });
      // the fanfare is not on the drop: it starts with Pip's landing, well after the last letter
      const fanfare = (await tones(page)).find((x) => x.f === 523 && x.t >= lastLetterAt);
      expect(fanfare, 'a fanfare plays').toBeTruthy();
      expect(fanfare!.t - lastLetterAt, 'the fanfare waits for Pip to land on the word').toBeGreaterThanOrEqual(400);
      const cheer = (await speech(page)).find((x) => x.text.startsWith('Hooray! You spelled'));
      expect(cheer!.t - fanfare!.t, 'the cheer waits for the whole fanfare').toBeGreaterThanOrEqual(600);
      expect((await speech(page)).filter((x) => x.text.startsWith('Hooray')).length).toBe(1);
      // the child can carry on at once
      await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click({ timeout: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test('sound off and reduced motion: the word still completes, Pip still shows, and nothing plays', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null })));
      await instrument(page);
      const word = await openMagic(page);
      await page.keyboard.type(word.text, { delay: 0 });
      await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
      await expect(page.getByTestId('completion-creature')).toBeAttached();
      // reduced motion: Pip simply fades in on the word, with no burst and no gold splash
      await expect(page.getByTestId('completion-creature').locator('[data-testid="star-burst"]')).toHaveCount(0);
      await expect(page.getByTestId('word-splash')).toHaveCount(0);
      expect(await tones(page)).toEqual([]);
      expect(await speech(page)).toEqual([]);
    });

    test('a fast run of word taps places every word once: none is overwritten or lost', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const s = await sentenceOnScreen(page);
      // every tap fires with no pause, faster than the pick-up and glide take
      for (let i = 0; i < s.words.length; i++) await page.locator('[data-tile][data-placed="false"]:not(.ring-4)').first().click();
      await expect(page.locator('[data-slot] [data-tile]')).toHaveCount(s.words.length, { timeout: 4000 });
      await page.waitForTimeout(900); // a late commit would show up here
      await expect(page.locator('[data-slot] [data-tile]')).toHaveCount(s.words.length);
      const placed = await page.locator('[data-slot] [data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string).sort());
      expect(placed).toEqual([...s.words].sort());
      await expect(page.getByRole('button', { name: 'Check my sentence' })).toBeEnabled();
    });

    test('a double tap on Check is one answer, one fanfare and one spoken sentence', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const s = await arrangeFast(page);
      await expect(page.getByRole('button', { name: 'Check my sentence' })).toBeEnabled({ timeout: 3000 });
      const fanfaresBefore = (await tones(page)).filter((x) => x.f === 1047).length;
      const answeredBefore = (await savedActivity(page, 'sentences')).answered;
      await page.getByRole('button', { name: 'Check my sentence' }).dblclick();
      await expect(page.getByTestId('key-word-reward')).toBeVisible({ timeout: 3000 });
      await page.waitForTimeout(1200);
      const fanfares = (await tones(page)).filter((x) => x.f === 1047).length - fanfaresBefore;
      expect(fanfares, 'one fanfare for the double tap').toBe(1);
      const sentence = `${s.words.join(' ')}${s.punctuation}`;
      expect((await speech(page)).filter((x) => x.text === sentence).length, 'the sentence is read aloud once').toBe(1);
      expect((await savedActivity(page, 'sentences')).answered - answeredBefore, 'one answer recorded for the sentence').toBe(1);
    });

    test('a lifted word shows the spot it is flying to, and the word lands there', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const tile = page.locator('[data-tile][data-placed="false"]').first();
      const value = (await tile.getAttribute('data-value'))!;
      await tile.click();
      // read straight after the tap: the first free spot is already glowing
      const aimed = await page.evaluate(() => [...document.querySelectorAll('[data-slot]')].filter((el) => el.className.includes('border-sky-500')).map((el) => (el as HTMLElement).dataset.slot));
      expect(aimed.length).toBe(1);
      await expect(page.locator(`[data-slot="${aimed[0]}"] [data-tile][data-value="${value}"]`)).toBeVisible({ timeout: 1500 });
    });

    test('the landing chime sounds as the word arrives in its slot', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const tile = page.locator('[data-tile][data-placed="false"]').first();
      const value = (await tile.getAttribute('data-value'))!;
      const toneCount = (await tones(page)).length;
      await tile.click();
      // sample the word's own box every frame until it stops moving inside its slot (the glide has finished)
      const arrival = await page.evaluate(
        (v) =>
          new Promise<{ at: number; down: number }>((resolve) => {
            const w = window as unknown as { __down: number };
            const started = performance.now();
            let stillFrames = 0;
            let prev = '';
            const step = () => {
              const word = document.querySelector<HTMLElement>(`[data-slot] [data-tile][data-value="${v}"]`);
              const slot = word?.closest<HTMLElement>('[data-slot]');
              if (word && slot) {
                const a = word.getBoundingClientRect();
                const b = slot.getBoundingClientRect();
                // the centre: where the word is. Scale wobble after the landing does not move the centre.
                const here = `${(a.left + a.width / 2).toFixed(1)},${(a.top + a.height / 2).toFixed(1)}`;
                const inSlot = Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)) < 3 && Math.abs(a.top + a.height / 2 - (b.top + b.height / 2)) < 3;
                stillFrames = here === prev && inSlot ? stillFrames + 1 : 0;
                prev = here;
                if (stillFrames >= 3) return resolve({ at: performance.now(), down: w.__down });
              }
              if (performance.now() - started > 2500) return resolve({ at: Number.NaN, down: w.__down });
              requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }),
        value,
      );
      await expect.poll(async () => (await tones(page)).slice(toneCount).some((x) => x.f === 880), { timeout: 1500 }).toBe(true);
      const chime = (await tones(page)).slice(toneCount).find((x) => x.f === 880);
      const tapToArrival = arrival.at - arrival.down;
      const tapToChime = chime ? chime.t - arrival.down : Number.NaN;
      writeReport(`${device}-landing`, { tapToArrivalMs: tapToArrival, tapToChimeMs: tapToChime, chimeMinusArrivalMs: tapToChime - tapToArrival });
      test.info().annotations.push({ type: 'latency', description: `landing: arrived ${tapToArrival.toFixed(0)} ms after the tap, chime ${tapToChime.toFixed(0)} ms after the tap` });
      expect(Number.isFinite(tapToArrival), 'the word arrives in its slot').toBe(true);
      expect(Math.abs(tapToChime - tapToArrival), 'the chime is within 120 ms of the landing').toBeLessThan(120);
    });

    test('a sentence completed on its own: the fanfare plays, then the sentence is read aloud, and Next works at once', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const s = await arrangeFast(page);
      const toneCount = (await tones(page)).length;
      await page.getByRole('button', { name: 'Check my sentence' }).click();
      await expect(page.getByTestId('key-word-reward')).toBeVisible({ timeout: 3000 });
      const fanfare = (await tones(page)).slice(toneCount).find((x) => x.f === 1047);
      const sentence = `${s.words.join(' ')}${s.punctuation}`;
      expect(fanfare).toBeTruthy();
      await expect.poll(async () => (await speech(page)).some((x) => x.text === sentence), { timeout: 2000 }).toBe(true);
      const line = (await speech(page)).find((x) => x.text === sentence);
      expect(line!.t - fanfare!.t, 'the sentence waits for the fanfare to finish').toBeGreaterThanOrEqual(600);
      await page.getByRole('button', { name: /^(Next sentence|Finish)$/ }).click({ timeout: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test('sound off and reduced motion in Sentence Fun: the words still go in and the sentence still completes', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null })));
      await instrument(page);
      await openArrangeSentence(page);
      const s = await arrangeFast(page);
      await expect(page.getByRole('button', { name: 'Check my sentence' })).toBeEnabled({ timeout: 3000 });
      await page.getByRole('button', { name: 'Check my sentence' }).click();
      await expect(page.getByRole('button', { name: /^(Next sentence|Finish)$/ })).toBeVisible({ timeout: 3000 });
      expect(s.words.length).toBeGreaterThan(0);
      expect(await tones(page)).toEqual([]);
      expect(await speech(page)).toEqual([]);
    });
  });
}
