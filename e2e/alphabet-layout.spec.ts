import type { Locator, Page } from '@playwright/test';
import { expect, installFakeSpeech, installScriptedSpeech, setHearing, test } from './helpers';

// Letter Playground on phones, tablets and desktop. Below the desktop breakpoint (1024 px) the letter stage (with its voice panel)
// scrolls away with the page, so it can never sit on top of the letter grid. Every letter and every voice control must be
// reachable, with no sideways scrolling and nothing covering a control: each control's centre must be that control when the
// browser looks at it.

const SIZES = [
  { name: '320px', width: 320, height: 700 },
  { name: '375px', width: 375, height: 812 },
  { name: '390px', width: 390, height: 844 },
  { name: '768px (tablet)', width: 768, height: 1024 },
  { name: '1023px (tablet)', width: 1023, height: 768 },
  { name: 'desktop 1280px', width: 1280, height: 800 },
] as const;

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
/** the one main voice button of the lesson: Speak, or Stop while listening, or Next letter when the browser cannot listen */
const MAIN_VOICE_BUTTON = /^(Speak|Stop listening|Next letter)$/;

/**
 * Checks that nothing covers `target` at three scroll positions (the element at the top, the middle and the bottom of the
 * screen). A sticky stage that sits over the grid covers some letters at one of those positions, and this finds it.
 * Returns 'ok', or what covers the element at the first position where it is covered.
 */
async function coveredBy(target: Locator) {
  return target.first().evaluate((el) => {
    const element = el as HTMLElement;
    for (const block of ['start', 'center', 'end'] as const) {
      element.scrollIntoView({ block, inline: 'nearest' });
      const r = element.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!top) return `offscreen when scrolled to ${block}`;
      if (element.contains(top) || top.contains(element)) continue;
      const label = top.getAttribute('aria-label') ?? top.textContent?.trim().slice(0, 30) ?? '';
      return `covered by ${top.tagName.toLowerCase()}${label ? ` "${label}"` : ''} when scrolled to ${block}`;
    }
    return 'ok';
  });
}

/** the teacher's voice and the scripted microphone, so the lesson's lines finish and the layout is checked in the same state each run */
async function speakingPage(page: Page) {
  await installFakeSpeech(page);
  await installScriptedSpeech(page);
}

for (const size of SIZES) {
  test(`${size.name}: every letter and voice control is reachable, nothing covers them, and nothing scrolls sideways`, async ({ page }) => {
    await speakingPage(page);
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter B,/ }).click();
    const turn = page.getByRole('region', { name: 'Your turn' });
    await expect(turn).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);

    for (const letter of LETTERS) {
      const tile = page.locator(`button[aria-label^="Letter ${letter.toUpperCase()},"]`);
      expect(await coveredBy(tile), `letter ${letter.toUpperCase()} is reachable`).toBe('ok');
      const box = await tile.first().boundingBox();
      expect(box!.width, `letter ${letter.toUpperCase()} is large enough to tap`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `letter ${letter.toUpperCase()} is large enough to tap`).toBeGreaterThanOrEqual(44);
    }

    const controls: [string, Locator][] = [
      ['Speak, Stop or Next letter', turn.getByRole('button', { name: MAIN_VOICE_BUTTON })],
      ['Hear it', page.getByRole('button', { name: 'Hear it', exact: true })],
    ];
    for (const [name, control] of controls) {
      expect(await coveredBy(control), `${name} is reachable and not covered`).toBe('ok');
    }

    // every voice control is on screen sideways, large enough to tap, and not overlapping another control
    const boxes: { name: string; box: { x: number; y: number; width: number; height: number } }[] = [];
    for (const [name, control] of controls) {
      const box = await control.first().boundingBox();
      expect(box, `${name} has a size`).not.toBeNull();
      expect(box!.x, `${name} is not cut off on the left`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${name} is not cut off on the right`).toBeLessThanOrEqual(size.width);
      expect(box!.height, `${name} is large enough to tap`).toBeGreaterThanOrEqual(44);
      boxes.push({ name, box: box! });
    }
    for (let i = 0; i < boxes.length; i++) {
      for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!.box;
        const b = boxes[j]!.box;
        const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlap, `${boxes[i]!.name} does not overlap ${boxes[j]!.name}`).toBe(false);
      }
    }
  });
}

for (const width of [390, 768, 1023]) {
  test(`at ${width}px the letter stage scrolls away with the page, so it does not sit on top of the grid while the child scrolls`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/#/alphabet');
    await page.getByRole('button', { name: /^Letter B,/ }).click();
    await page.evaluate(() => window.scrollTo(0, 900));
    const stage = await page.getByRole('region', { name: 'Selected letter' }).boundingBox();
    const grid = await page.locator('button[aria-label^="Letter M,"]').boundingBox();
    expect(stage!.y + stage!.height, 'the stage is above the letters it sits next to, not over them').toBeLessThanOrEqual(grid!.y + 1);
  });
}

test('on desktop the letter stage sits beside the grid: the two do not overlap, and the stage is on the left', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/#/alphabet');
  await page.getByRole('button', { name: /^Letter B,/ }).click();
  const stage = await page.getByRole('region', { name: 'Selected letter' }).boundingBox();
  const grid = await page.locator('button[aria-label^="Letter M,"]').boundingBox();
  expect(stage!.x + stage!.width, 'the stage ends before the grid starts, side by side').toBeLessThanOrEqual(grid!.x + 1);
  expect(stage!.x, 'the stage is on the left').toBeLessThan(grid!.x);
});

test('at 320px the longest message (a refused microphone) fits on screen and covers nothing', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await speakingPage(page);
  await page.goto('/#/alphabet');
  await page.getByRole('button', { name: /^Letter B,/ }).click();
  await setHearing(page, { error: 'not-allowed' });
  const turn = page.getByRole('region', { name: 'Your turn' });
  await expect(turn.getByTestId('lesson-status')).toContainText('did not get to use the microphone', { timeout: 10000 });
  // a refused microphone leaves the tap fallback: Next letter is the one way on, and it must be reachable under the longest message
  const next = turn.getByRole('button', { name: 'Next letter' });
  expect(await coveredBy(next), 'Next letter is not covered after the longest message').toBe('ok');
  const box = await next.boundingBox();
  expect(box!.x + box!.width, 'Next letter is on screen sideways').toBeLessThanOrEqual(320);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, 'no sideways scrolling with the longest message').toBeLessThanOrEqual(0);
});

for (const size of SIZES) {
  test(`Sound Discovery at ${size.name}: the letters and the "Your turn" controls are reachable and uncovered`, async ({ page }) => {
    await speakingPage(page);
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/#/phonics');
    const turn = page.getByRole('region', { name: 'Your turn' });
    await expect(turn).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'no sideways scrolling').toBeLessThanOrEqual(0);
    expect(await coveredBy(turn.getByRole('button', { name: MAIN_VOICE_BUTTON })), 'the main voice button is reachable and not covered').toBe('ok');
    // the sound's teaching button sits beside the letter card: it is checked here, as the answer is not given away by any other control
    expect(await coveredBy(page.getByRole('button', { name: 'Hear the sound' })), 'Hear the sound is reachable and not covered').toBe('ok');
    for (const letter of ['a', 'm', 'z']) {
      expect(await coveredBy(page.locator(`button[aria-label^="Letter ${letter.toUpperCase()},"]`)), `letter ${letter.toUpperCase()} is reachable`).toBe('ok');
    }
  });
}
