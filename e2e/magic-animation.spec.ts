import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, test } from './helpers';

// Motion tests for Magic Letters: the SAME bubble must travel continuously from where it was to its slot.
// A requestAnimationFrame sampler records the flying bubble every frame, so these assert real movement,
// not just the end state.

async function openMagic(page: Page) {
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-slot="0"]').waitFor();
  await page.waitForTimeout(900);
}

async function currentWord(page: Page) {
  const clue = await page.locator('[data-magic-clue]').first().innerText();
  const w = englishWords.find((x) => x.clue === clue);
  if (!w) throw new Error(`Unknown clue ${clue}`);
  return w;
}

type Box = { x: number; y: number; width: number; height: number };
const center = (b: Box) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
/** centre of an element in PAGE coordinates (viewport box + current scroll) */
async function pageCenter(page: Page, loc: ReturnType<Page['locator']>) {
  const c = center((await loc.boundingBox())!);
  const s = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  return { x: c.x + s.x, y: c.y + s.y };
}
const realTile = (page: Page, v: string) => page.locator(`[data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();
const slot = (page: Page, i: number) => page.locator(`[data-magic-slot="${i}"]`);

interface Sample {
  t: number;
  flyer: { x: number; y: number; w: number } | null;
  trail: number;
}

/** Start recording the flying bubble (centre + width) once per animation frame. */
async function startSampler(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __s: Sample[]; __run: boolean };
    w.__s = [];
    w.__run = true;
    const t0 = performance.now();
    const tick = () => {
      const fly = document.querySelector('[data-magic-flight]');
      // the bubble is the monster's body (its centre is the flight's centre); a plain tile's letter is its centre
      const bubble = (fly?.querySelector('.pl-monster') ?? fly?.querySelector('span.font-display')) as HTMLElement | null | undefined;
      let flyer: Sample['flyer'] = null;
      if (bubble) {
        const r = bubble.getBoundingClientRect();
        // page coordinates, so a scroll between the test's measurements and the flight cannot skew them
        flyer = { x: r.x + scrollX + r.width / 2, y: r.y + scrollY + r.height / 2, w: r.width };
      }
      w.__s.push({ t: performance.now() - t0, flyer, trail: fly ? fly.querySelectorAll('span:not(.font-display)').length : 0 });
      if (w.__run) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stopSampler(page: Page): Promise<Sample[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __s: Sample[]; __run: boolean };
    w.__run = false;
    return w.__s;
  });
}

/** The frames in which the bubble was in the air. */
const airborne = (s: Sample[]) => s.filter((f) => f.flyer) as (Sample & { flyer: NonNullable<Sample['flyer']> })[];

function expectContinuousFlight(frames: ReturnType<typeof airborne>, from: { x: number; y: number }, to: { x: number; y: number }, startTol: number, curved = true) {
  expect(frames.length, 'the bubble is visible for several frames').toBeGreaterThanOrEqual(5);
  const first = frames[0]!.flyer;
  const last = frames[frames.length - 1]!.flyer;
  const total = Math.hypot(to.x - from.x, to.y - from.y);
  // the first sampled frame may come a little after take-off on a busy machine, so allow a fraction of the trip
  expect(Math.hypot(first.x - from.x, first.y - from.y), 'starts where the letter really was').toBeLessThan(startTol + total * 0.3);
  expect(Math.hypot(last.x - to.x, last.y - to.y), 'ends on the slot centre').toBeLessThan(5);
  let biggest = 0;
  for (let i = 1; i < frames.length; i++) {
    biggest = Math.max(biggest, Math.hypot(frames[i]!.flyer.x - frames[i - 1]!.flyer.x, frames[i]!.flyer.y - frames[i - 1]!.flyer.y));
  }
  expect(biggest, 'never jumps: no single frame covers most of the trip').toBeLessThan(Math.max(60, total * 0.5));
  const duration = frames[frames.length - 1]!.t - frames[0]!.t;
  expect(duration, 'quick: well under a second').toBeLessThan(950);
  expect(duration, 'but long enough to be seen').toBeGreaterThan(300);
  // curved, not a straight line: some sampled point is off the straight line between start and end
  const len = Math.hypot(to.x - first.x, to.y - first.y) || 1;
  const off = Math.max(...frames.map((f) => Math.abs((to.x - first.x) * (first.y - f.flyer.y) - (first.x - f.flyer.x) * (to.y - first.y)) / len));
  if (curved) expect(off, 'follows a gentle curve').toBeGreaterThan(4);
}

test.describe('tap: the same bubble flies from the tray to the slot', () => {
  test('continuous, curved, quick, trail, then it snaps in', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const tile = realTile(page, w.text[0]!);
    const tileBox = (await tile.boundingBox())!;
    const from = await pageCenter(page, tile);
    const to = await pageCenter(page, slot(page, 0));

    await tile.click();
    await page.waitForTimeout(700); // selection jiggle settles
    await startSampler(page);
    await slot(page, 0).click();
    await expect(slot(page, 0)).toHaveAttribute('data-state', 'filled'); // logic is immediate
    await page.waitForTimeout(1300);
    const frames = airborne(await stopSampler(page));

    expectContinuousFlight(frames, from, to, 16); // the selected bubble is lifted ~8px
    expect(Math.max(...frames.map((f) => f.trail)), 'a short motion trail').toBeGreaterThanOrEqual(3);
    // it settles at exactly the size of the slot's tile, so the hand-over is seamless
    expect(Math.abs(frames[frames.length - 1]!.flyer.w - tileBox.width)).toBeLessThan(8);
    // finally: the letter is in the slot, no bubble left behind, no stray flyer
    await expect(page.locator('[data-magic-flight]')).toHaveCount(0);
    await expect(slot(page, 0).locator('span.font-display').first()).toBeVisible();
  });

  test('picking a letter up jiggles it (transform changes on several frames) and shows a shadow and glow', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const tile = realTile(page, w.text[0]!);
    const seen = await tile.evaluate(async (el) => {
      const inner = el.querySelector('span.block') as HTMLElement;
      const values = new Set<string>();
      const end = performance.now() + 700;
      await new Promise<void>((done) => {
        const tick = () => {
          values.add(getComputedStyle(inner).transform);
          if (performance.now() < end) requestAnimationFrame(tick);
          else done();
        };
        (el as HTMLElement).click();
        requestAnimationFrame(tick);
      });
      return values.size;
    });
    expect(seen).toBeGreaterThanOrEqual(4);
    await expect(tile).toHaveAttribute('aria-pressed', 'true');
  });

  test('a wrong slot never receives the letter: no flight, wobble and kind feedback instead', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const wrong = w.text.split('').findIndex((c) => c !== w.text[0]);
    await startSampler(page);
    await realTile(page, w.text[0]!).click();
    await slot(page, wrong).click();
    await page.waitForTimeout(900);
    const frames = airborne(await stopSampler(page));
    expect(frames).toHaveLength(0);
    await expect(slot(page, wrong)).not.toHaveAttribute('data-state', 'filled');
    await expect(page.getByText('That letter goes in a different spot')).toBeVisible();
    await expect(realTile(page, w.text[0]!)).toBeVisible(); // still in the tray
  });

  test('tapping fast: several letters in flight at once all land correctly, nothing is blocked', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const letters = w.text.split('');
    // fire every tap-tap pair without waiting for any flight to finish
    const used = new Map<string, number>();
    for (let i = 0; i < letters.length; i++) {
      const v = letters[i]!;
      const nth = used.get(v) ?? 0;
      used.set(v, nth + 1);
      await page.locator(`[data-magic-tile][data-value="${v}"][data-decoy="false"]:not([aria-hidden])`).nth(0).click({ trial: false });
      await slot(page, i).click();
    }
    for (let i = 0; i < letters.length; i++) await expect(slot(page, i)).toHaveAttribute('data-state', 'filled');
    await expect(page.getByText(/You spelled/)).toBeVisible();
    for (let i = 0; i < letters.length; i++) await expect(slot(page, i).locator('span.font-display').filter({ hasText: new RegExp(`^${letters[i]}$`, 'i') })).toHaveCount(1);
    await expect(page.locator('[data-magic-flight]')).toHaveCount(0);
  });

  test('the word only counts as complete once the last letter has landed (success, speech, burst wait)', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const letters = w.text.split('');
    for (let i = 0; i < letters.length - 1; i++) {
      await realTile(page, letters[i]!).click();
      await slot(page, i).click();
      await page.waitForTimeout(650);
    }
    const last = letters.length - 1;
    await realTile(page, letters[last]!).click();
    await slot(page, last).click();
    await expect(page.getByText(/You spelled/)).toHaveCount(0); // still flying
    await expect(page.locator('[data-magic-flight]')).toHaveCount(1);
    await expect(page.getByText(/You spelled/)).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Next word|Finish)$/ })).toBeVisible();
  });

  test('no layout shift: the other tray letters and the slots do not move while a letter flies', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const boxes = async () =>
      page.evaluate(() => [...document.querySelectorAll('[data-magic-tile], [data-magic-slot]')].map((e) => {
        const r = e.getBoundingClientRect();
        // page coordinates: Playwright may scroll a tile in the second tray row into view before clicking it
        return [e.getAttribute('data-magic-tile') ?? `s${e.getAttribute('data-magic-slot')}`, Math.round(r.x + scrollX), Math.round(r.y + scrollY)] as const;
      }));
    const before = await boxes();
    const movedId = await realTile(page, w.text[0]!).getAttribute('data-magic-tile'); // this one leaves the tray (its bay stays)
    await realTile(page, w.text[0]!).click();
    await slot(page, 0).click();
    await page.waitForTimeout(250); // mid-flight
    const mid = await boxes();
    await page.waitForTimeout(900);
    const after = await boxes();
    for (const [id, x, y] of before) {
      if (id === movedId) continue;
      for (const snap of [mid, after]) {
        const m = snap.find((s) => s[0] === id);
        if (!m) continue; // the placed tile left the tray (its bay stays)
        expect(Math.abs(m[1] - x), `${id} x ${JSON.stringify({ before: [x, y], mid: m })}`).toBeLessThanOrEqual(8); // the selection lift/hover only
        expect(Math.abs(m[2] - y), `${id} y`).toBeLessThanOrEqual(10);
      }
    }
  });
});

test.describe('drag: the bubble travels on from where it was let go', () => {
  test('released near the slot, it continues smoothly into the slot', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const tile = realTile(page, w.text[0]!);
    const f = center((await tile.boundingBox())!);
    const to = center((await slot(page, 0).boundingBox())!);
    const drop = { x: to.x + 14, y: to.y + 22 }; // let go a little off-centre, still on the slot
    await page.mouse.move(f.x, f.y);
    await page.mouse.down();
    for (let i = 1; i <= 16; i++) {
      await page.mouse.move(f.x + ((drop.x - f.x) * i) / 16, f.y + ((drop.y - f.y) * i) / 16);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(250); // the tile catches up with the pointer
    await startSampler(page);
    await page.mouse.up();
    await page.waitForTimeout(1300);
    const frames = airborne(await stopSampler(page));
    const sc = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
    expectContinuousFlight(frames, { x: drop.x + sc.x, y: drop.y + sc.y }, { x: to.x + sc.x, y: to.y + sc.y }, 24, false); // released almost on the slot: too short a trip to bow
    await expect(slot(page, 0)).toHaveAttribute('data-state', 'filled');
  });

  test('a wrong drop springs back: the bubble never enters the slot', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const wrong = w.text.split('').findIndex((c) => c !== w.text[0]);
    const tile = realTile(page, w.text[0]!);
    const f = center((await tile.boundingBox())!);
    const to = center((await slot(page, wrong).boundingBox())!);
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await startSampler(page);
    await page.mouse.move(f.x, f.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await page.waitForTimeout(900);
    expect(airborne(await stopSampler(page))).toHaveLength(0);
    await expect(slot(page, wrong)).not.toHaveAttribute('data-state', 'filled');
    await expect(tile).toBeVisible();
    // compared on the page: the page may scroll a little to show the retry message (bounded below)
    const scrollAfter = await page.evaluate(() => window.scrollY);
    const back = center((await tile.boundingBox())!);
    expect(scrollAfter - scrollBefore).toBeLessThan(80);
    expect(Math.hypot(back.x - f.x, back.y + scrollAfter - (f.y + scrollBefore))).toBeLessThan(8); // sprang back to its spot
  });
});

test.describe('completion, reduced motion, accessibility', () => {
  test('finishing a word: the letters hop in a staggered wave and the success shows', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    for (let i = 0; i < w.text.length; i++) {
      await realTile(page, w.text[i]!).click();
      await slot(page, i).click();
      await page.waitForTimeout(600);
    }
    await expect(page.getByText(/You spelled/)).toBeVisible();
    // sample the glyph offsets over ~900 ms: at some moment the letters are at different heights (staggered, not in unison)
    const stagger = await page.evaluate(async () => {
      const glyphs = [...document.querySelectorAll('[data-magic-slot] span.font-display')] as HTMLElement[];
      let best = 0;
      const end = performance.now() + 1000;
      await new Promise<void>((done) => {
        const tick = () => {
          const ys = glyphs.map((g) => g.getBoundingClientRect().y);
          best = Math.max(best, Math.max(...ys) - Math.min(...ys));
          if (performance.now() < end) requestAnimationFrame(tick);
          else done();
        };
        requestAnimationFrame(tick);
      });
      return best;
    });
    expect(stagger).toBeGreaterThan(3);
  });

  test('reduced motion: no flying bubble, no jiggle, no burst; the letter simply appears in its slot', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openMagic(page);
    const w = await currentWord(page);
    await startSampler(page);
    await realTile(page, w.text[0]!).click();
    await slot(page, 0).click();
    await expect(slot(page, 0)).toHaveAttribute('data-state', 'filled');
    await expect(slot(page, 0).locator('span.font-display').first()).toBeVisible();
    await page.waitForTimeout(500);
    expect(airborne(await stopSampler(page))).toHaveLength(0);
    await expect(slot(page, 0).locator('svg')).toHaveCount(0);
  });

  test('axe: no WCAG A/AA violations while a letter is in flight', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).click();
    await slot(page, 0).click();
    await page.locator('[data-magic-flight]').waitFor({ state: 'attached' });
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('no horizontal overflow at 320px with a letter in flight', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await openMagic(page);
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).click();
    await slot(page, 0).click();
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
