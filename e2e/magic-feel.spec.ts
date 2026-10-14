import type { Page } from '@playwright/test';
import { getContentPack } from '../src/playlab/data/registry';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, spoken, test } from './helpers';

// The touch feel of Magic Letters: the response starts at the tap, the pop and the phonics sound never overlap,
// rapid taps do not stack, the picture wiggles without giving the word away, and every setting still applies.

/** Records (in browser time) every sound-effect oscillator start and every spoken request. */
async function recordFeel(page: Page) {
  await installFakeSpeech(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: { t: number; f: number }[]; __speech: { t: number; text: string }[]; __clickAt: number };
    w.__tones = [];
    w.__speech = [];
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
    document.addEventListener(
      'click',
      (e) => {
        if ((e.target as HTMLElement).closest?.('[data-magic-tile]')) w.__clickAt = performance.now();
      },
      true,
    );
  });
}

async function openMagic(page: Page) {
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-tile]').first().waitFor();
  await page.waitForTimeout(700); // tiles finish their staggered entrance
}

/** a real (not decoy) tile for the first letter of the current word, and that letter */
async function firstRealTile(page: Page) {
  const clue = await page.locator('[data-magic-clue]').innerText();
  const word = englishWords.find((w) => w.clue === clue)!;
  return {
    value: word.text[0]!,
    tile: page.locator(`[data-magic-tile][data-value="${word.text[0]}"][data-decoy="false"]`).first(),
  };
}

type Ev = { t: number; f?: number; text?: string };
const tones = (page: Page) => page.evaluate(() => (window as unknown as { __tones: Ev[] }).__tones);

test.describe('Magic Letters feel', () => {
  test('a tap responds at once: the tile jiggles from the tap, a sparkle appears, and the pop plays with it', async ({ page }) => {
    await recordFeel(page);
    await openMagic(page);
    const { value } = await firstRealTile(page);
    // Dispatch the tap and sample every frame in the same browser task, so the measurement is not at the mercy of
    // Playwright's scheduling (the page can be busy while other tests run in parallel).
    const measured = await page.evaluate(
      (v) =>
        new Promise<{ moves: number; firstMoveMs: number | null; sparkles: number; popAt: number | null; clickAt: number }>((resolve) => {
          const tileEl = document.querySelector<HTMLElement>(`[data-magic-tile][data-value="${v}"][data-decoy="false"]`)!;
          // the wiggle lives on the letter's own inner span (not the button, which carries the drag/hover transform)
          const el = [...tileEl.children].find((c) => c.classList.contains('block') && c.getAttribute('aria-hidden') === 'true') as HTMLElement;
          const clickAt = performance.now();
          tileEl.click();
          let sparkles = 0; // the sparkle is looked for on the frames after the tap (React renders it on the next frame)
          const w = window as unknown as { __tones: { t: number; f: number }[] };
          let last = getComputedStyle(el).transform;
          let moves = 0;
          let firstMoveMs: number | null = null;
          const tick = () => {
            sparkles = Math.max(sparkles, tileEl.querySelectorAll('svg').length);
            const now = getComputedStyle(el).transform;
            if (now !== last) {
              moves += 1;
              firstMoveMs ??= performance.now() - clickAt;
              last = now;
            }
            if (performance.now() - clickAt < 500) requestAnimationFrame(tick);
            else {
              const pop = w.__tones.find((t) => t.t >= clickAt - 5);
              resolve({ moves, firstMoveMs, sparkles, popAt: pop ? pop.t - clickAt : null, clickAt });
            }
          };
          requestAnimationFrame(tick);
        }),
      value,
    );
    expect(measured.moves, 'the tile moves on many frames after the tap').toBeGreaterThanOrEqual(4);
    expect(measured.firstMoveMs, 'the reaction starts right after the tap').not.toBeNull();
    // Idle browser: the first frame moves ~45 ms after the tap. With three browsers sharing this machine, frames stretch,
    // so the bound is looser here; the idle figure is recorded in docs/TESTING.md.
    expect(measured.firstMoveMs!, 'within a few frames, even under parallel load').toBeLessThan(400);
    expect(measured.sparkles, 'a tiny sparkle appears straight away').toBeGreaterThan(0);
    expect(measured.popAt, 'the pop sound starts with the tap').not.toBeNull();
    expect(measured.popAt!, 'and not after it').toBeLessThan(400);
  });

  test('picking a letter says nothing in its place: its name is never spoken, and no spelling stands in for its sound', async ({ page }) => {
    await recordFeel(page);
    await openMagic(page);
    const { value, tile } = await firstRealTile(page);
    await tile.click();
    await page.waitForTimeout(800); // the sound would follow the pop after ~170 ms
    expect(await spoken(page), 'no letter is spoken: the sounds are recordings, and none are in the build yet').toEqual([]);
    expect(await spoken(page)).not.toContain(nameOf(value));
    expect((await tones(page)).length, 'the pop still plays').toBeGreaterThan(0);
  });

  test('rapid taps on one letter make a short run of pops and speak nothing', async ({ page }) => {
    await recordFeel(page);
    await openMagic(page);
    const { value } = await firstRealTile(page);
    // six taps in one burst (dispatched back to back, far faster than the 1.4 s gap)
    await page.evaluate((v) => {
      const el = document.querySelector<HTMLElement>(`[data-magic-tile][data-value="${v}"][data-decoy="false"]`)!;
      for (let i = 0; i < 6; i++) el.click();
    }, value);
    await page.waitForTimeout(1500);
    expect(await spoken(page)).toEqual([]);
    expect((await tones(page)).length, 'a burst of taps makes a few pops, not dozens').toBeLessThan(12);
  });

  test('tapping the picture wiggles it with a pop and never speaks the word (no reveal)', async ({ page }) => {
    await recordFeel(page);
    await openMagic(page);
    const clue = await page.locator('[data-magic-clue]').innerText();
    const word = englishWords.find((w) => w.clue === clue)!;
    await page.getByRole('button', { name: /Picture clue/ }).click();
    await page.waitForTimeout(500);
    expect((await tones(page)).length).toBeGreaterThan(0);
    for (const said of await spoken(page)) expect(said.toLowerCase()).not.toContain(word.text);
  });

  test('reduced motion: no jiggle and no sparkle, but the pop still works', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordFeel(page);
    await openMagic(page);
    const { tile } = await firstRealTile(page);
    await tile.click();
    await page.waitForTimeout(400);
    await expect(tile.locator('svg')).toHaveCount(0);
    expect((await tones(page)).length).toBeGreaterThan(0);
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
  });

  test('sound off: no pops and nothing spoken, and the activity still works', async ({ page }) => {
    await recordFeel(page);
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null })));
    await openMagic(page);
    const { value, tile } = await firstRealTile(page);
    await tile.click();
    await page.waitForTimeout(400);
    expect(await tones(page)).toEqual([]);
    expect(await spoken(page)).toEqual([]);
    await expect(tile).toHaveAttribute('aria-pressed', 'true'); // still picked up, still playable
    expect(value).toMatch(/^[a-z]$/);
  });

  test('keyboard: Enter on a tile gives the same response', async ({ page }) => {
    await recordFeel(page);
    await openMagic(page);
    const { tile } = await firstRealTile(page);
    await tile.focus();
    await page.keyboard.press('Enter');
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
    await expect(tile.locator('svg')).not.toHaveCount(0);
    expect((await tones(page)).length).toBeGreaterThan(0);
  });
});

/** what the child hears for a letter's sound and its name, from the same content pack the app uses */
const nameOf = (v: string) => getContentPack('en').letters.find((l) => l.id === v)!.nameSpeech;
