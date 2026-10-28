import type { Locator, Page } from '@playwright/test';
import { expect, installFakeSpeech, solveSentence, test, waitForNextItem } from './helpers';

// Sentence Fun (Build the Sentence) on a phone and a desktop: the sentence slots and the word tray stay on screen, the words never
// overlap, nothing scrolls sideways, and each slot and word is large enough to tap. These checks are on the layout of the words
// only: they say nothing about what a real child's hand or a real screen does.

const SIZES = [
  { name: '320px', width: 320, height: 700 },
  { name: '390px', width: 390, height: 844 },
  { name: 'desktop 1280px', width: 1280, height: 800 },
] as const;

const box = async (locator: Locator) => {
  const b = await locator.boundingBox();
  if (!b) throw new Error('no box');
  return b;
};

/** true when two boxes share any area */
const overlaps = (a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function openArrange(page: Page) {
  await installFakeSpeech(page);
  await page.goto('/#/sentences');
  const arrange = page.getByRole('heading', { level: 2, name: 'Put the words in order', exact: true });
  // the first sentence is picked at random and can be a fill-in: solve it (the word that fits) until the arrange screen is shown
  for (let i = 0; i < 6; i++) {
    await arrange.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined);
    if (await arrange.isVisible()) break;
    await solveSentence(page);
    await waitForNextItem(page);
  }
  await expect(arrange).toBeVisible();
  await expect(page.locator('[data-slot]').first()).toBeVisible();
}

for (const size of SIZES) {
  test(`${size.name}: the word slots and the tray are on screen, nothing overlaps, and nothing scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await openArrange(page);

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);

    const slots = page.locator('[data-slot]');
    const slotCount = await slots.count();
    expect(slotCount, 'one slot per word').toBeGreaterThan(0);
    for (let i = 0; i < slotCount; i++) {
      const b = await box(slots.nth(i));
      expect(b.x, `slot ${i + 1} is not cut off on the left`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `slot ${i + 1} is not cut off on the right`).toBeLessThanOrEqual(size.width);
      expect(b.height, `slot ${i + 1} is large enough to drop a word on`).toBeGreaterThanOrEqual(44);
      expect(b.width, `slot ${i + 1} is wide enough for its word`).toBeGreaterThanOrEqual(44);
    }

    const tiles = page.locator('ul[aria-label="Available words"] > li');
    const tileCount = await tiles.count();
    expect(tileCount, 'every word is in the tray').toBe(slotCount);
    const boxes: { x: number; y: number; width: number; height: number }[] = [];
    for (let i = 0; i < tileCount; i++) {
      const b = await box(tiles.nth(i));
      expect(b.x, `tray word ${i + 1} is not cut off on the left`).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width, `tray word ${i + 1} is not cut off on the right`).toBeLessThanOrEqual(size.width);
      expect(b.height, `tray word ${i + 1} is large enough to tap`).toBeGreaterThanOrEqual(44);
      boxes.push(b);
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        expect(overlaps(boxes[i]!, boxes[j]!), `tray words ${i + 1} and ${j + 1} do not overlap`).toBe(false);
      }
    }
  });
}

test('a placed word is checked on the spot and stays in the tray, faded, so the tray keeps its shape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openArrange(page);
  const total = await page.locator('ul[aria-label="Available words"] > li').count();
  // the child taps one word: it lands in the first slot, and that slot shows a result (green when right, sun when wrong) at once
  await page.locator('ul[aria-label="Available words"] [data-tile]').first().click();
  const first = page.locator('[data-slot="0"]');
  await expect.poll(() => first.getAttribute('data-state'), { timeout: 3000 }).not.toBe('empty');
  expect(['correct', 'wrong']).toContain(await first.getAttribute('data-state'));
  // the placed word is still in the tray (faded), so every word keeps its place
  await expect(page.locator('ul[aria-label="Available words"] > li')).toHaveCount(total);
  await expect(page.locator('ul[aria-label="Available words"] [data-tile]')).toHaveCount(total - 1);
});
