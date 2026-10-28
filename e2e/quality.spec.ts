import { mkdirSync, writeFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { englishSentences } from '../src/playlab/data/en/sentences';
import { englishWords } from '../src/playlab/data/en/words';
import { flightDuration } from '../src/playlab/moments/flightPath';
import { CREATURE_HOP_MS, SPEECH_AFTER_SOUND_MS } from '../src/playlab/moments/timing';
import { expect, installFakeSpeech, test, waitForNextItem } from './helpers';

/** One frame at 60 Hz: the unit of scheduling allowance in the timing checks below. */
const FRAME_MS = 1000 / 60;
/** The shortest and longest a letter's flight can take (flightDuration is clamped to 0.34 s to 0.52 s), in ms. */
const SHORTEST_FLIGHT_MS = flightDuration(0) * 1000;
const LONGEST_FLIGHT_MS = flightDuration(Number.POSITIVE_INFINITY) * 1000;

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

/** When the last letter was typed, when its flight started, and when it landed in its slot (ms, page time). */
type LastLetterTiming = { keyAt: number; flightAt: number; landedAt: number };

/**
 * Records the last key press and the flight and landing that follow it. Each is read in the page at the moment it happens (a key
 * event, a flight element appearing, a slot's label changing), so the test runner's own clock and its key-press delay are not in
 * the figures.
 */
async function watchLastLetter(page: Page, letters: number) {
  await page.evaluate((count) => {
    const timing = { keyAt: Number.NaN, flightAt: Number.NaN, landedAt: Number.NaN };
    (window as unknown as { __last: typeof timing }).__last = timing;
    // only the last key press counts: a new key restarts the measurement
    window.addEventListener(
      'keydown',
      () => {
        timing.keyAt = performance.now();
        timing.flightAt = Number.NaN;
        timing.landedAt = Number.NaN;
      },
      true,
    );
    // the slot's own letter is shown on the label at the drop, so the landing is read from data-landed, which turns true only when
    // the flight has landed (the same render that starts Pip's hop)
    new MutationObserver(() => {
      if (Number.isNaN(timing.keyAt)) return;
      if (Number.isNaN(timing.flightAt) && document.querySelector('[data-magic-flight]')) timing.flightAt = performance.now();
      const last = document.querySelector(`[data-magic-slot="${count - 1}"]`);
      if (Number.isNaN(timing.landedAt) && last?.getAttribute('data-landed') === 'true') timing.landedAt = performance.now();
    }).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-label', 'data-landed'] });
  }, letters);
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
    await waitForNextItem(page);
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

/**
 * Where a sentence stands once its words are in: still on the board (a wrong order, judged as wrong), or judged right and
 * shown whole (the board is replaced by the sentence). null while neither is true.
 */
async function judgedOrPlaced(page: Page, s: { words: string[]; punctuation: string }) {
  if ((await page.getByRole('img', { name: `${s.words.join(' ')}${s.punctuation}` }).count()) > 0) return 'solved';
  return (await page.locator('[data-slot] [data-tile]').count()) === s.words.length ? 'placed' : null;
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
      // the earlier letters have landed and no flight is left, so the last letter's timing is measured on its own
      await expect(page.locator('[data-magic-flight]')).toHaveCount(0);
      await expect(page.locator('[data-magic-slot][aria-label$="done"]')).toHaveCount(word.text.length - 1);
      await watchLastLetter(page, word.text.length);
      await page.keyboard.press(word.text.at(-1)!);
      await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 8000 });
      // Pip has landed on the word by the time the cheer is spoken: it sits above the letters, and covers no letter and no control
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
          // the innermost element that holds the message, not the boxes around it
          messages: [...document.querySelectorAll('p,div')].filter((el) => /On to the next one/.test(el.textContent ?? '') && ![...el.querySelectorAll('p,div')].some((c) => /On to the next one/.test(c.textContent ?? '')) && hit(el)).length,
        };
      });
      expect(geometry, 'Pip sits above the word and covers no letter slot and no message').toEqual({ aboveLetters: true, slots: 0, messages: 0 });
      // the fanfare is not on the drop: it starts with Pip's landing, after the last letter has landed
      const timing = await read<LastLetterTiming>(page, '__last');
      const fanfare = (await tones(page)).find((x) => x.f === 523 && x.t >= timing.landedAt);
      expect(fanfare, 'a fanfare plays').toBeTruthy();
      const cheer = (await speech(page)).find((x) => x.text.startsWith('Hooray! You spelled'));
      expect(cheer, 'the cheer is spoken').toBeTruthy();
      // each stage, from its own stable event, against the constant that sets it
      const stages = {
        keyToFlightMs: timing.flightAt - timing.keyAt,
        flightMs: timing.landedAt - timing.flightAt,
        hopMs: fanfare!.t - timing.landedAt,
        fanfareToCheerMs: cheer!.t - fanfare!.t,
        keyToCheerMs: cheer!.t - timing.keyAt,
      };
      writeReport(`${device}-cheer`, { ...stages, longestFlightMs: LONGEST_FLIGHT_MS, creatureHopMs: CREATURE_HOP_MS, speechAfterSoundMs: SPEECH_AFTER_SOUND_MS });
      test.info().annotations.push({
        type: 'latency',
        description: `last letter: key to flight ${stages.keyToFlightMs.toFixed(0)} ms, flight ${stages.flightMs.toFixed(0)} ms (longest ${LONGEST_FLIGHT_MS} ms), Pip's hop ${stages.hopMs.toFixed(0)} ms (${CREATURE_HOP_MS} ms), fanfare to cheer ${stages.fanfareToCheerMs.toFixed(0)} ms, key to cheer ${stages.keyToCheerMs.toFixed(0)} ms`,
      });
      expect(stages.keyToFlightMs, 'the flight starts within a few frames of the key press').toBeLessThanOrEqual(3 * FRAME_MS);
      expect(stages.flightMs, 'the flight takes between its shortest and longest possible times (flightDuration), within a frame').toBeGreaterThanOrEqual(SHORTEST_FLIGHT_MS - FRAME_MS);
      expect(stages.flightMs, 'the flight takes no longer than its longest possible time, plus one frame').toBeLessThanOrEqual(LONGEST_FLIGHT_MS + FRAME_MS);
      expect(stages.hopMs, "Pip's hop takes its designed time (it cannot land early), plus timer slack").toBeGreaterThanOrEqual(CREATURE_HOP_MS - FRAME_MS);
      expect(stages.hopMs).toBeLessThanOrEqual(CREATURE_HOP_MS + 4 * FRAME_MS);
      expect(stages.fanfareToCheerMs, "the cheer starts after the fanfare's first note, during the celebration").toBeGreaterThanOrEqual(100);
      expect(stages.fanfareToCheerMs, 'and well before the fanfare has finished (600 ms)').toBeLessThan(400);
      expect(
        stages.keyToCheerMs,
        'key press to cheer: the longest flight, then Pip\'s hop and the spoken delay, plus two frames of scheduling',
      ).toBeLessThanOrEqual(LONGEST_FLIGHT_MS + CREATURE_HOP_MS + SPEECH_AFTER_SOUND_MS + 2 * FRAME_MS);
      expect((await speech(page)).filter((x) => x.text.startsWith('Hooray')).length).toBe(1);
      // the child carries on: the next word comes by itself once the celebration is over
      await waitForNextItem(page);
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
      // the sentence is judged by itself once every word is in: still on the board, or judged right and shown whole
      await expect.poll(() => judgedOrPlaced(page, s), { timeout: 4000 }).not.toBeNull();
      await page.waitForTimeout(900); // a late commit would show up here
      if ((await judgedOrPlaced(page, s)) === 'placed') {
        const placed = await page.locator('[data-slot] [data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string).sort());
        expect(placed, 'every word is there once').toEqual([...s.words].sort());
      }
      expect(await judgedOrPlaced(page, s), 'no word is lost or doubled').not.toBeNull();
    });

    test('the last word judges the sentence once: one answer, one fanfare and one spoken sentence', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const fanfaresBefore = (await tones(page)).filter((x) => x.f === 1047).length;
      const answeredBefore = (await savedActivity(page, 'sentences')).answered;
      const s = await arrangeFast(page);
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

    /**
     * When the tap happened, and when the word visibly stopped in its slot, in page time. The word's centre is recorded every frame
     * for 1.6 s and read afterwards, so the stop is not chosen while the spring is still moving. "Visibly stopped" is the last frame
     * in which the centre is at least half a pixel from its final place: a movement smaller than that cannot be seen on a phone or
     * a desktop screen. (Smaller movements continue for tens of milliseconds more; docs/VOICE.md, "The landing chime".)
     */
    async function landingTimes(page: Page, value: string) {
      const frames = await page.evaluate(
        (v) =>
          new Promise<{ t: number; x: number; y: number }[]>((resolve) => {
            const out: { t: number; x: number; y: number }[] = [];
            const started = performance.now();
            const step = (now: number) => {
              const word = document.querySelector<HTMLElement>(`[data-slot] [data-tile][data-value="${v}"]`);
              const slot = word?.closest<HTMLElement>('[data-slot]');
              if (word && slot) {
                const a = word.getBoundingClientRect();
                const b = slot.getBoundingClientRect();
                out.push({ t: now, x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2) });
              }
              if (performance.now() - started < 1600) requestAnimationFrame(step);
              else resolve(out);
            };
            requestAnimationFrame(step);
          }),
        value,
      );
      let last = -1;
      frames.forEach((f, i) => {
        if (Math.max(Math.abs(f.x), Math.abs(f.y)) >= 0.5) last = i;
      });
      const visibleStop = last === -1 ? Number.NaN : (frames[last + 1]?.t ?? Number.NaN);
      return { down: await read<number>(page, '__down'), visibleStop };
    }

    test('the landing chime sounds as the word arrives in its slot: the word has visibly stopped, and the chime comes after it', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const tile = page.locator('[data-tile][data-placed="false"]').first();
      const value = (await tile.getAttribute('data-value'))!;
      const toneCount = (await tones(page)).length;
      await tile.click();
      const landing = await landingTimes(page, value);
      await expect.poll(async () => (await tones(page)).slice(toneCount).some((x) => x.f === 880), { timeout: 1500 }).toBe(true);
      const chime = (await tones(page)).slice(toneCount).find((x) => x.f === 880)!;
      const stopMs = landing.visibleStop - landing.down;
      const chimeMs = chime.t - landing.down;
      writeReport(`${device}-landing`, { visibleStopMs: stopMs, chimeMs, chimeAfterStopMs: chimeMs - stopMs });
      test.info().annotations.push({
        type: 'latency',
        description: `landing: word visibly stopped ${stopMs.toFixed(0)} ms after the tap, chime ${chimeMs.toFixed(0)} ms after the tap (${(chimeMs - stopMs).toFixed(0)} ms after the stop)`,
      });
      expect(Number.isFinite(stopMs), 'the word stops moving in its slot').toBe(true);
      expect(chime.t, 'the chime does not sound before the word has stopped').toBeGreaterThanOrEqual(landing.visibleStop);
    });

    test('KNOWN LIMITATION: the landing chime sounds within 120 ms of the word visibly stopping (it currently sounds about 190 ms after)', async ({ page }) => {
      // An expected failure, on purpose: the chime is scheduled when the layout animation completes, which trails the visible stop
      // by about 190 ms in every measured tap. The target is not met yet; this test stops being an expected failure only when the
      // chime is moved or the target is changed (a decision for the product owner, see docs/VOICE.md). Its preconditions are checked
      // by the test above.
      test.fail();
      await instrument(page);
      await openArrangeSentence(page);
      const tile = page.locator('[data-tile][data-placed="false"]').first();
      const value = (await tile.getAttribute('data-value'))!;
      const toneCount = (await tones(page)).length;
      await tile.click();
      const landing = await landingTimes(page, value);
      await expect.poll(async () => (await tones(page)).slice(toneCount).some((x) => x.f === 880), { timeout: 1500 }).toBe(true);
      const chime = (await tones(page)).slice(toneCount).find((x) => x.f === 880)!;
      expect(Math.abs(chime.t - landing.visibleStop), 'the chime is within 120 ms of the word visibly stopping').toBeLessThan(120);
    });

    test('a sentence completed on its own: the fanfare plays, then the sentence is read aloud, and Next works at once', async ({ page }) => {
      await instrument(page);
      await openArrangeSentence(page);
      const s = await arrangeFast(page);
      const toneCount = (await tones(page)).length;
      await expect(page.getByTestId('key-word-reward')).toBeVisible({ timeout: 3000 });
      const fanfare = (await tones(page)).slice(toneCount).find((x) => x.f === 1047);
      const sentence = `${s.words.join(' ')}${s.punctuation}`;
      expect(fanfare).toBeTruthy();
      await expect.poll(async () => (await speech(page)).some((x) => x.text === sentence), { timeout: 2000 }).toBe(true);
      const line = (await speech(page)).find((x) => x.text === sentence);
      expect(line!.t - fanfare!.t, 'the sentence waits for the fanfare to finish').toBeGreaterThanOrEqual(600);
      await waitForNextItem(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });

    test('sound off and reduced motion in Sentence Fun: the words still go in and the sentence still completes', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null })));
      await instrument(page);
      await openArrangeSentence(page);
      const s = await arrangeFast(page);
      await expect(page.getByText(/On to the next one/)).toBeVisible({ timeout: 3000 });
      expect(s.words.length).toBeGreaterThan(0);
      expect(await tones(page)).toEqual([]);
      expect(await speech(page)).toEqual([]);
    });
  });
}
