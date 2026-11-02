import { expect, test, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { AUDIT, type Finding } from './layoutAudit';

/**
 * Responsive gate: every screen and every game on the phone and tablet sizes the app has to work on, in
 * portrait AND landscape, plus desktop. Each one is measured (sideways scrolling, controls off the screen,
 * text cut off by its box, the character on top of a control, touch targets under 44 px) and photographed
 * into `screenshots/` so the whole matrix can be looked at at once.
 *
 * Landscape phones are the tight case: a 320 px-tall viewport has to hold the header, the character, the
 * game area and the buttons without any of them landing on top of each other.
 */

type Size = { name: string; width: number; height: number };

/** The sizes the app is required to work on, each one also turned on its side. */
const PORTRAIT: Size[] = [
  { name: 'phone-320', width: 320, height: 640 },
  { name: 'phone-360', width: 360, height: 740 },
  { name: 'phone-412', width: 412, height: 915 },
  { name: 'tablet-768', width: 768, height: 1024 },
];
const LANDSCAPE: Size[] = PORTRAIT.slice(0, 3).map((s) => ({ name: `${s.name}-landscape`, width: s.height, height: s.width }));
const WIDE: Size[] = [
  { name: 'tablet-1024-landscape', width: 1024, height: 768 },
  { name: 'desktop-1280', width: 1280, height: 800 },
];
const SIZES = [...PORTRAIT, ...LANDSCAPE, ...WIDE];

const SCREENS: { name: string; go: (p: Page) => Promise<void> }[] = [
  { name: 'home', go: async (p) => { await p.goto('/#/home'); await p.getByRole('heading').first().waitFor(); } },
  { name: 'alphabet', go: async (p) => { await p.goto('/#/alphabet'); await p.waitForTimeout(700); } },
  { name: 'phonics', go: async (p) => { await p.goto('/#/phonics'); await p.waitForTimeout(700); } },
  { name: 'magic-letters', go: async (p) => { await p.goto('/#/word-builder'); await p.locator('[data-magic-clue]').waitFor(); await p.waitForTimeout(800); } },
  { name: 'sentence-fun', go: async (p) => { await p.goto('/#/sentences'); await p.locator('[data-tile], [data-option]').first().waitFor(); await p.waitForTimeout(800); } },
  { name: 'matching', go: async (p) => { await p.goto('/#/matching'); await p.waitForTimeout(700); } },
  { name: 'story', go: async (p) => { await p.goto('/#/story'); await p.waitForTimeout(1500); } },
  { name: 'progress', go: async (p) => { await p.goto('/#/progress'); await p.waitForTimeout(700); } },
];

const DIR = 'screenshots';

function assertFits(name: string, size: Size, r: Finding) {
  const ctx = `${name} at ${size.width}x${size.height} (${size.name})`;
  expect(r.horizontalOverflow, `${ctx}: the page scrolls sideways (${r.horizontalOverflow}px wide)`).toBe(0);
  expect(r.offscreen, `${ctx}: controls off the screen`).toEqual([]);
  expect(r.clipped, `${ctx}: content cut off sideways by its box`).toEqual([]);
  expect(r.clippedV, `${ctx}: content cut off top/bottom by its box`).toEqual([]);
  expect(r.overlaps, `${ctx}: controls overlap`).toEqual([]);
  expect(r.mascotOverlaps, `${ctx}: the character sits on a control`).toEqual([]);
  expect(r.smallTargets, `${ctx}: touch targets under 44 px: ${r.smallSample.join(', ')}`).toBe(0);
}

test.describe('responsive gate', () => {
  test.beforeAll(async () => {
    await mkdir(DIR, { recursive: true });
  });

  for (const size of SIZES) {
    test(`every screen fits ${size.name} (${size.width}x${size.height})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.setViewportSize({ width: size.width, height: size.height });
      const broken: string[] = [];
      for (const s of SCREENS) {
        await s.go(page);
        await page.reload(); // a fresh load: nothing left open from the screen before
        await s.go(page);
        const r = await page.evaluate(AUDIT);
        await page.screenshot({ path: `${DIR}/${size.name}--${s.name}.png`, fullPage: false });
        try {
          assertFits(s.name, size, r);
        } catch (e) {
          broken.push((e as Error).message.split('\n')[0] ?? String(e));
        }
      }
      expect(broken, `${size.name}: screens that do not fit`).toEqual([]);
    });
  }
});
