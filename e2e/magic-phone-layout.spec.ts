import type { Browser, BrowserContext, Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, test } from './helpers';

// Phone layout of Magic Letters: what a child can see and use on a 320 × 700, 360 × 800 or 390 × 844 screen.
// Word loads are repeatable: each session gets a seeded random source, so a seed always gives the same word and tile order.
// Drags, taps and the speaker's error note are real page interactions; measurements come from the rendered page.
//
// What is required (and checked):
//   - no sideways scrolling at any of the three sizes; letters and outlines at least 44 px;
//   - at 360 × 800 and 390 × 844, the whole tray and every outline are on screen without scrolling, for several words;
//   - at 320 × 700 the tray cannot be on screen without scrolling (see the note on that test); every letter and outline can be
//     reached by scrolling, and a letter can be dragged onto its outline with both on screen together;
//   - the speaker's error note ("The sound didn’t play") does not squeeze the instruction, push the tray off the screen, cover a
//     letter, or hide the speaker.

type Size = { width: number; height: number };
const S320: Size = { width: 320, height: 700 };
const S360: Size = { width: 360, height: 800 };
const S390: Size = { width: 390, height: 844 };

/**
 * Seeds for word loads (see seedRandom), found by reading the word and tile count of loads at 360 × 800:
 * seed 1 is "cat" (3 letters, 5 tiles: three outlines and two decoys; this is the load that used to end at 801.7 px),
 * seed 2 is "lion" (4 letters, 6 tiles), seed 5 is "apple" (5 letters, the longest word, 7 tiles).
 */
const SEED_THREE_LETTERS = 1;
const SEED_FOUR_LETTERS = 2;
const SEED_FIVE_LETTERS = 5;

type Box = { top: number; bottom: number; left: number; right: number; width: number; height: number };
type Piece = { id: string; value: string; box: Box; hit: boolean };
type Measure = {
  vw: number;
  vh: number;
  scrollW: number;
  scrollH: number;
  tiles: Piece[];
  slots: { index: string; state: string; box: Box; hit: boolean }[];
  instruction: { width: number; lines: number; overflowPx: number } | null;
  pill: Box | null;
  speaker: { label: string | null; box: Box; iconWidth: number; hit: boolean } | null;
  note: { text: string; box: Box } | null;
};

type Session = { page: Page; context: BrowserContext; errors: string[] };
const sessions: Session[] = [];

/** Replaces Math.random (mulberry32) so one seed always gives the same word, tile count and tile order. */
function seedRandom(seed: number) {
  let a = seed >>> 0;
  Math.random = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Speech "cannot play": speak() throws, so the speaker control shows its error note ("The sound didn’t play. Please try again."). */
function failingSpeech() {
  class SilentUtterance {
    text: string;
    lang = '';
    rate = 1;
    pitch = 1;
    voice = null;
    onstart = null;
    onend = null;
    onerror = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: SilentUtterance });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      speaking: false,
      paused: false,
      cancel() {},
      resume() {},
      pause() {},
      getVoices: () => [],
      speak() {
        throw new Error('speech is not available in this test');
      },
      addEventListener() {},
      removeEventListener() {},
    },
  });
}

/** A fresh browser session at one size. Sessions share nothing (own storage, own random seed), and their console errors are checked after each test. */
async function open(browser: Browser, baseURL: string, size: Size, opts: { seed?: number; speechFails?: boolean } = {}): Promise<Page> {
  const context = await browser.newContext({ baseURL, viewport: size, deviceScaleFactor: 1 });
  if (opts.seed !== undefined) await context.addInitScript(seedRandom, opts.seed);
  if (opts.speechFails) await context.addInitScript(failingSpeech);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  sessions.push({ page, context, errors });
  return page;
}

test.afterEach(async () => {
  for (const s of sessions.splice(0)) {
    const errors = s.errors.slice();
    await s.context.close();
    expect(errors, 'no console errors or uncaught exceptions').toEqual([]);
  }
});

/**
 * Waits until every letter tile has its resting size: no transform left from its entrance spring, and the rendered box equals
 * the layout box. This is a state check, not a comparison of two readings, so a browser that draws frames slowly only delays
 * it. A tile that is still growing (a transform) keeps the wait going.
 */
async function settle(page: Page) {
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const tiles = [...document.querySelectorAll<HTMLElement>('[data-magic-tile]')];
          return (
            tiles.length > 0 &&
            tiles.every((el) => {
              const b = el.getBoundingClientRect();
              return getComputedStyle(el).transform === 'none' && Math.abs(b.width - el.offsetWidth) < 1 && Math.abs(b.height - el.offsetHeight) < 1;
            })
          );
        }),
      { timeout: 8000, intervals: [100, 200] },
    )
    .toBe(true);
}

async function openMagic(page: Page) {
  await page.goto('/#/word-builder');
  await expect(page.getByRole('heading', { level: 1, name: 'Magic Letters' })).toBeVisible();
  await page.locator('[data-magic-slot="0"]').waitFor();
  await settle(page);
}

/** the word on screen, read from its picture clue */
async function currentWord(page: Page) {
  const clue = await page.locator('[data-magic-clue]').first().innerText();
  const w = englishWords.find((x) => x.clue === clue);
  if (!w) throw new Error(`Unknown clue ${clue}`);
  return w;
}

/** every letter, outline and text box on the screen, measured in the page; `hit` is true when the piece is the topmost thing at its centre */
const measure = (page: Page) =>
  page.evaluate<Measure>(() => {
    const box = (el: Element): Box => {
      const b = el.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height };
    };
    const hitsItself = (el: Element) => {
      const b = el.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return !!hit && (hit === el || el.contains(hit));
    };
    const tiles = [...document.querySelectorAll<HTMLElement>('[data-magic-tile]')].map((el) => ({
      id: el.dataset.magicTile ?? '',
      value: el.dataset.value ?? '',
      box: box(el),
      hit: hitsItself(el),
    }));
    const slots = [...document.querySelectorAll<HTMLElement>('[data-magic-slot]')].map((el) => ({
      index: el.dataset.magicSlot ?? '',
      state: el.dataset.state ?? '',
      box: box(el),
      hit: hitsItself(el),
    }));
    const p = document.querySelector<HTMLElement>('[data-mode="magic"] > header p');
    const pill = p?.parentElement ?? null;
    const speakerEl = pill?.querySelector<HTMLElement>('button') ?? null;
    const noteEl = pill?.querySelector<HTMLElement>('[role="status"]') ?? null;
    return {
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      tiles,
      slots,
      instruction: p
        ? {
            width: p.getBoundingClientRect().width,
            lines: Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)),
            overflowPx: p.scrollHeight - p.clientHeight,
          }
        : null,
      pill: pill ? box(pill) : null,
      speaker: speakerEl
        ? {
            label: speakerEl.getAttribute('aria-label'),
            box: box(speakerEl),
            iconWidth: speakerEl.querySelector('svg')?.getBoundingClientRect().width ?? 0,
            hit: hitsItself(speakerEl),
          }
        : null,
      note: noteEl ? { text: noteEl.textContent ?? '', box: box(noteEl) } : null,
    };
  });

const lowestBottom = (m: Measure) => Math.max(...m.tiles.map((t) => t.box.bottom), ...m.slots.map((s) => s.box.bottom));

/** every letter and outline is on screen at the same time, without scrolling, and nothing covers it */
function expectAllOnScreen(m: Measure, label: string) {
  expect(m.tiles.length, `${label}: letters on the tray`).toBeGreaterThan(0);
  expect(m.slots.length, `${label}: outlines`).toBeGreaterThan(0);
  expect(lowestBottom(m), `${label}: lowest letter or outline ends at ${Math.round(lowestBottom(m))} px on a ${m.vh} px screen (${m.tiles.length} letters)`).toBeLessThanOrEqual(m.vh);
  for (const t of m.tiles) {
    expect(t.box.top, `${label}: letter ${t.value} starts above the screen`).toBeGreaterThanOrEqual(0);
    expect(t.hit, `${label}: letter ${t.value} is covered by something else`).toBe(true);
  }
  for (const s of m.slots) expect(s.hit, `${label}: outline ${s.index} is covered by something else`).toBe(true);
}

/** no sideways scrolling, and letters and outlines are at least 44 px */
function expectPhoneTargets(m: Measure, label: string) {
  expect(m.scrollW, `${label}: page is ${m.scrollW} px wide`).toBeLessThanOrEqual(m.vw);
  for (const t of m.tiles) {
    expect(Math.min(t.box.width, t.box.height), `${label}: letter ${t.value} is ${Math.round(t.box.width)} × ${Math.round(t.box.height)} px`).toBeGreaterThanOrEqual(44);
    expect(t.box.right, `${label}: letter ${t.value} runs off the right edge`).toBeLessThanOrEqual(m.vw);
  }
  for (const s of m.slots) {
    expect(Math.min(s.box.width, s.box.height), `${label}: outline ${s.index} is ${Math.round(s.box.width)} × ${Math.round(s.box.height)} px`).toBeGreaterThanOrEqual(44);
  }
}

test.describe('Magic Letters on a phone', () => {
  test('390 × 844: on three different word loads (3, 4 and 5 letters) the whole tray and every outline are on screen together', async ({ browser, baseURL }) => {
    for (const seed of [SEED_THREE_LETTERS, SEED_FOUR_LETTERS, SEED_FIVE_LETTERS]) {
      const page = await open(browser, baseURL!, S390, { seed });
      await openMagic(page);
      expectAllOnScreen(await measure(page), `390 × 844, seed ${seed}`);
    }
  });

  test('360 × 800: the word that used to end at 801.7 px, and two other word loads, have the whole tray and every outline on screen', async ({ browser, baseURL }) => {
    for (const seed of [SEED_THREE_LETTERS, SEED_FOUR_LETTERS, SEED_FIVE_LETTERS]) {
      const page = await open(browser, baseURL!, S360, { seed });
      await openMagic(page);
      expectAllOnScreen(await measure(page), `360 × 800, seed ${seed}`);
    }
  });

  test('320 × 700, 360 × 800 and 390 × 844: no sideways scrolling, and letters and outlines stay at least 44 px', async ({ browser, baseURL }) => {
    for (const size of [S320, S360, S390]) {
      for (const seed of [SEED_THREE_LETTERS, SEED_FIVE_LETTERS]) {
        const page = await open(browser, baseURL!, size, { seed });
        await openMagic(page);
        expectPhoneTargets(await measure(page), `${size.width} × ${size.height}, seed ${seed}`);
      }
    }
  });

  /**
   * 320 × 700 is not a no-scroll layout: a five-letter word needs the page to scroll to show the bottom of the tray. This test
   * checks the usable alternative: every letter and outline can be scrolled to, and a letter can be dragged onto its outline
   * with both on screen at the same time. It does not claim that the whole tray is visible without scrolling.
   */
  test('320 × 700: with scrolling, every letter and outline can be reached, and a letter can be dragged onto its outline with both on screen', async ({ browser, baseURL }) => {
    const page = await open(browser, baseURL!, S320, { seed: SEED_FIVE_LETTERS });
    await openMagic(page);
    const word = await currentWord(page);
    const letters = page.locator('[data-magic-tile]');
    const outlines = page.locator('[data-magic-slot]');
    for (let i = 0; i < (await letters.count()); i++) {
      await letters.nth(i).scrollIntoViewIfNeeded();
      const id = await letters.nth(i).getAttribute('data-magic-tile');
      const m = await measure(page);
      const t = m.tiles.find((x) => x.id === id);
      expect(t?.hit, `letter ${i + 1} can be reached and is not covered after scrolling to it`).toBe(true);
    }
    for (let i = 0; i < (await outlines.count()); i++) {
      await outlines.nth(i).scrollIntoViewIfNeeded();
      const m = await measure(page);
      expect(m.slots[i]?.hit, `outline ${i + 1} can be reached and is not covered after scrolling to it`).toBe(true);
    }

    // one drag: the first letter of the word, from the tray to its outline, with both on screen together
    const first = page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${word.text[0]}"][data-decoy="false"]`).first();
    const outline = outlines.nth(0);
    await first.scrollIntoViewIfNeeded();
    const firstId = await first.getAttribute('data-magic-tile');
    const before = await measure(page);
    const tileBox = before.tiles.find((x) => x.id === firstId)?.box;
    const slotBox = before.slots[0]?.box;
    expect(tileBox && slotBox, 'the letter and the first outline are both on the page').toBeTruthy();
    const span = tileBox!.bottom - slotBox!.top;
    expect(span, `the first outline and the letter ${word.text[0]} are ${Math.round(span)} px apart, which does not fit a ${before.vh} px screen`).toBeLessThanOrEqual(before.vh - 40);
    // bring the outline near the top of the screen; the letter (below it) must then still be on screen
    await page.evaluate((delta) => window.scrollBy(0, delta), slotBox!.top - 20);
    const after = await measure(page);
    const aTile = after.tiles.find((x) => x.id === firstId);
    const aSlot = after.slots[0];
    expect(aTile && aTile.box.bottom <= after.vh, `letter ${word.text[0]} is on screen with the first outline`).toBe(true);
    const from = { x: aTile!.box.left + aTile!.box.width / 2, y: aTile!.box.top + aTile!.box.height / 2 };
    const to = { x: aSlot!.box.left + aSlot!.box.width / 2, y: aSlot!.box.top + aSlot!.box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 12, from.y - 24, { steps: 4 });
    await page.mouse.move(to.x, to.y, { steps: 12 });
    await page.mouse.up();
    await expect(outline, 'the dragged letter lands on its outline').toHaveAttribute('data-state', 'filled', { timeout: 4000 });
  });

  test('390 × 844: a letter dragged onto its outline, and a letter tapped and then tapped onto its outline, both land', async ({ browser, baseURL }) => {
    const page = await open(browser, baseURL!, S390, { seed: SEED_FIVE_LETTERS });
    await openMagic(page);
    const w = await currentWord(page);
    for (let i = 0; i < w.text.length; i++) {
      const ch = w.text[i]!;
      const tile = page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${ch}"][data-decoy="false"]`).first();
      const slot = page.locator(`[data-magic-slot="${i}"]`);
      if (i % 2 === 0) {
        // drag: press on the letter, move onto the outline, let go
        const from = await tile.boundingBox();
        const to = await slot.boundingBox();
        await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
        await page.mouse.down();
        await page.mouse.move(from!.x + from!.width / 2 + 12, from!.y + from!.height / 2 - 24, { steps: 4 });
        await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, { steps: 12 });
        await page.mouse.up();
      } else {
        // tap: pick the letter up, then tap the outline
        await tile.click();
        await slot.click();
      }
      await expect(slot, `outline ${i + 1} (${ch}) did not fill`).toHaveAttribute('data-state', 'filled', { timeout: 4000 });
    }
    await expect(page.getByText(/You spelled/)).toBeVisible();
  });

  test('360 × 800: a letter tapped and then tapped onto its outline lands on the word that used to end at 801.7 px', async ({ browser, baseURL }) => {
    const page = await open(browser, baseURL!, S360, { seed: SEED_THREE_LETTERS });
    await openMagic(page);
    const w = await currentWord(page);
    for (let i = 0; i < w.text.length; i++) {
      const ch = w.text[i]!;
      await page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${ch}"][data-decoy="false"]`).first().click();
      await page.locator(`[data-magic-slot="${i}"]`).click();
      await expect(page.locator(`[data-magic-slot="${i}"]`), `outline ${i + 1} (${ch}) did not fill`).toHaveAttribute('data-state', 'filled', { timeout: 4000 });
    }
    await expect(page.getByText(/You spelled/)).toBeVisible();
  });

  /**
   * The speaker's error note ("The sound didn’t play. Please try again.") appears under the instruction when speech cannot play.
   * It must sit in its own full-width row: the instruction keeps its width, the speaker stays usable and focusable, and the
   * tray and every outline stay on screen.
   */
  for (const [size, seed, name] of [
    [S390, SEED_FIVE_LETTERS, '390 × 844'],
    [S360, SEED_THREE_LETTERS, '360 × 800'],
  ] as const) {
    test(`${name}: with the speaker's error note showing, the instruction keeps its width, the speaker stays usable, and the tray and every outline stay on screen`, async ({ browser, baseURL }) => {
      const page = await open(browser, baseURL!, size, { seed, speechFails: true });
      await openMagic(page);
      const normal = await measure(page);
      expectAllOnScreen(normal, `${name} before the error`);

      await page.getByRole('button', { name: 'Hear instructions' }).click();
      await expect(page.getByRole('status').filter({ hasText: /sound didn.t play/ })).toBeVisible();
      await settle(page);
      const err = await measure(page);

      expect(err.instruction!.width, `the instruction is ${Math.round(err.instruction!.width)} px wide with the note (normally ${Math.round(normal.instruction!.width)} px)`).toBeGreaterThanOrEqual(normal.instruction!.width - 1);
      expect(err.instruction!.lines, 'the instruction takes the same number of lines with the note').toBe(normal.instruction!.lines);
      expect(err.instruction!.overflowPx, 'the instruction text is not cut off').toBeLessThanOrEqual(2);
      expect(err.note!.box.width, `the note is ${Math.round(err.note!.box.width)} px wide: a full line, not a narrow column`).toBeGreaterThanOrEqual(200);
      expect(err.note!.box.left, 'the note starts inside the instruction panel').toBeGreaterThanOrEqual(err.pill!.left);
      expect(err.note!.box.right, 'the note ends inside the instruction panel').toBeLessThanOrEqual(err.pill!.right);

      expectAllOnScreen(err, `${name} with the error note`);
      expect(err.speaker!.label).toBe('Hear instructions');
      expect(err.speaker!.hit, 'the speaker is on screen and not covered').toBe(true);
      expect(err.speaker!.iconWidth, 'the speaker icon is not squeezed').toBeGreaterThanOrEqual(20);
      expect(Math.min(err.speaker!.box.width, err.speaker!.box.height), 'the speaker is at least 44 px').toBeGreaterThanOrEqual(44);
      expect(err.scrollW, 'no sideways scrolling with the note').toBeLessThanOrEqual(err.vw);
    });
  }

  /**
   * Sound off (the top bar) makes "Hear instructions" say why nothing plays. That note is "Sound is off. Turn it on at the top.",
   * one line, announced in the status region. Nothing is spoken in this state, so no speech is stubbed, and the tray and every
   * outline must still be on screen. 360 × 800 uses the 3-letter word with five tiles, the tallest of these loads.
   */
  for (const [size, seed, name] of [
    [S390, SEED_FIVE_LETTERS, '390 × 844'],
    [S360, SEED_THREE_LETTERS, '360 × 800'],
  ] as const) {
    test(`${name}: with Sound off, the note is one line and is announced, the instruction keeps its width, and the tray and every outline stay on screen`, async ({ browser, baseURL }) => {
      const page = await open(browser, baseURL!, size, { seed });
      await openMagic(page);
      const normal = await measure(page);
      expectAllOnScreen(normal, `${name} before Sound is turned off`);

      await page.getByRole('button', { name: 'Sound is on. Turn sound off' }).click();
      await expect(page.getByRole('button', { name: 'Sound is off. Turn sound on' })).toBeVisible();
      await page.getByRole('button', { name: 'Hear instructions' }).click();
      const note = page.getByRole('status').filter({ hasText: 'Sound is off. Turn it on at the top.' });
      await expect(note, 'the muted note is visible and in the status region').toBeVisible();
      await settle(page);
      const muted = await measure(page);

      expect(muted.note!.text).toBe('Sound is off. Turn it on at the top.');
      expect(muted.note!.box.height, `the note is ${Math.round(muted.note!.box.height)} px tall: one line`).toBeLessThanOrEqual(24);
      expect(muted.note!.box.width, 'the note is a full line, not a narrow column').toBeGreaterThanOrEqual(200);
      expect(muted.instruction!.width, `the instruction is ${Math.round(muted.instruction!.width)} px wide with the note (normally ${Math.round(normal.instruction!.width)} px)`).toBeGreaterThanOrEqual(normal.instruction!.width - 1);
      expect(muted.instruction!.lines, 'the instruction takes the same number of lines with the note').toBe(normal.instruction!.lines);
      expect(muted.instruction!.overflowPx, 'the instruction text is not cut off').toBeLessThanOrEqual(2);
      expect(muted.speaker!.label).toBe('Hear instructions');
      expect(muted.speaker!.hit, 'the speaker is on screen and not covered').toBe(true);
      expect(muted.scrollW, 'no sideways scrolling with the muted note').toBeLessThanOrEqual(muted.vw);
      expectAllOnScreen(muted, `${name} with Sound off`);
    });
  }

  test('390 × 844: with the error note showing, the speaker keeps its keyboard focus ring', async ({ browser, baseURL }) => {
    const page = await open(browser, baseURL!, S390, { seed: SEED_FIVE_LETTERS, speechFails: true });
    await openMagic(page);
    const speaker = page.getByRole('button', { name: 'Hear instructions' });
    await speaker.click();
    await expect(page.getByRole('status').filter({ hasText: /sound didn.t play/ })).toBeVisible();
    // keyboard focus: step away and back with Tab, so the browser shows the focus ring for keyboard focus
    await speaker.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(speaker).toBeFocused();
    const outline = await speaker.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline, 'the speaker shows a focus outline when focused from the keyboard').not.toBe('none');
  });
});
