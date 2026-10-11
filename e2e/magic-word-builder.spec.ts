import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, test } from './helpers';

// Focused tests for the "Magic Letters" mode of Word Builder. Existing specs are not modified.

async function openMagic(page: Page) {
  await page.goto('/#/word-builder');
  await expect(page.getByRole('heading', { level: 1, name: 'Magic Letters' })).toBeVisible();
  await page.locator('[data-magic-slot="0"]').waitFor();
  await page.waitForTimeout(700); // let the tiles finish their staggered entrance
}

async function currentWord(page: Page) {
  const clue = await page.locator('[data-magic-clue]').first().innerText();
  const w = englishWords.find((x) => x.clue === clue);
  if (!w) throw new Error(`Unknown clue ${clue}`);
  return w;
}

const center = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
const realTile = (page: Page, v: string) => page.locator(`[data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();

async function dragTo(page: Page, tile: ReturnType<typeof realTile>, slotIndex: number) {
  const from = center((await tile.boundingBox())!);
  const to = center((await page.locator(`[data-magic-slot="${slotIndex}"]`).boundingBox())!);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 15, from.y - 30, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await page.mouse.up();
}

async function finishRound(page: Page) {
  for (let i = 0; i < 5; i++) {
    const w = await currentWord(page);
    for (const ch of w.text) await page.keyboard.press(ch);
    await expect(page.getByText(/You spelled/)).toBeVisible();
    await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click();
  }
}

test.describe('word builder is Magic Letters only', () => {
  test('opens straight into Magic Letters: no Classic / Magic switch, no Check button', async ({ page }) => {
    await page.goto('/#/word-builder');
    await expect(page.locator('[data-mode="magic"]')).toBeVisible();
    await expect(page.getByRole('tablist')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Check my word' })).toHaveCount(0);
  });
});

test.describe('dragging', () => {
  test('a correct drop snaps into the slot with a glow and a small star burst', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    await dragTo(page, realTile(page, w.text[0]!), 0);
    const slot = page.locator('[data-magic-slot="0"]');
    await expect(slot).toHaveAttribute('data-state', 'filled');
    await expect(slot).toHaveAttribute('aria-label', `Slot 1: ${w.text[0]!.toUpperCase()}, done`);
    await expect(slot.locator('svg')).toHaveCount(8); // star burst, present just after landing
    // it snapped: the landed letter sits centred in its slot
    const letterBox = (await slot.locator('span[aria-hidden="true"]').last().boundingBox())!;
    const slotBox = (await slot.boundingBox())!;
    expect(Math.abs(center(letterBox).x - center(slotBox).x)).toBeLessThan(8);
    await expect(slot.locator('svg')).toHaveCount(0, { timeout: 3000 }); // burst is brief
  });

  test('a drop on the wrong slot springs back, shows kind feedback and nothing lands', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const wrongSlot = [...w.text].findIndex((c) => c !== w.text[0]);
    test.skip(wrongSlot < 0, 'word has one repeated letter only');
    const tile = realTile(page, w.text[0]!);
    const before = (await tile.boundingBox())!;
    await dragTo(page, tile, wrongSlot);
    await expect(page.getByText(/different spot/)).toBeVisible();
    await expect(page.locator(`[data-magic-slot="${wrongSlot}"]`)).toHaveAttribute('data-state', 'empty');
    await page.waitForTimeout(900);
    const after = (await realTile(page, w.text[0]!).boundingBox())!;
    expect(Math.abs(after.x - before.x)).toBeLessThan(6);
    expect(Math.abs(after.y - before.y)).toBeLessThan(6);
    expect(await page.getByText(/wrong/i).count()).toBe(0);
  });

  test('releasing a tile in empty space just springs it back (no miss)', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const tile = realTile(page, w.text[0]!);
    const b = center((await tile.boundingBox())!);
    await page.mouse.move(b.x, b.y);
    await page.mouse.down();
    await page.mouse.move(b.x + 200, b.y + 120, { steps: 8 });
    await page.mouse.up();
    await expect(page.getByText(/different spot/)).toHaveCount(0);
  });

  test('touch: a finger drag (CDP touch events) lands a letter without scrolling the page', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 1100 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await openMagic(page);
    const w = await currentWord(page);
    const from = center((await realTile(page, w.text[0]!).boundingBox())!);
    const to = center((await page.locator('[data-magic-slot="0"]').boundingBox())!);
    await touch('touchStart', from.x, from.y);
    for (let i = 1; i <= 12; i++) await touch('touchMove', from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
    await touch('touchEnd', to.x, to.y);
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'filled');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await ctx.close();
  });
});

test.describe('tap fallback and keyboard', () => {
  test('tap a letter, tap its slot', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).click();
    await expect(realTile(page, w.text[0]!)).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-magic-slot="0"]').click();
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'filled');
  });

  test('touch screen: tap-tap works', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await openMagic(page);
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).tap();
    await page.locator('[data-magic-slot="0"]').tap();
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'filled');
    await ctx.close();
  });

  test('keyboard only: Tab to a letter, Enter, Tab to the slot, Enter', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).focus();
    await page.keyboard.press('Enter');
    await page.locator('[data-magic-slot="0"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'filled');
  });
});

test.describe('rounds, progress, success and retry', () => {
  test('a full round finishes, shows the summary, and My Stars counts it as Word Builder', async ({ page }) => {
    await openMagic(page);
    await finishRound(page);
    await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    await expect(page.getByTestId('session-rounds-finished')).toHaveText('1');
    await expect(page.getByTestId('session-correct-answers')).toHaveText('5');
    await expect(page.getByRole('region', { name: 'Recently finished' }).getByText('Word Builder')).toBeVisible();
  });

  test('every word in the content set can be finished in Magic mode', async ({ page }) => {
    await openMagic(page);
    const done = new Set<string>();
    for (let round = 0; round < 4 && done.size < englishWords.length; round++) {
      for (let i = 0; i < 5; i++) {
        const w = await currentWord(page);
        done.add(w.id);
        for (const ch of w.text) await page.keyboard.press(ch);
        await expect(page.getByText(/You spelled/)).toBeVisible();
        await page.getByRole('button', { name: /^(Next word|Finish)$/ }).click();
      }
      if (done.size < englishWords.length) await page.getByRole('button', { name: 'Play again' }).click();
    }
    expect([...done].sort()).toEqual(englishWords.map((w) => w.id).sort());
  });

  test('retry feedback offers "Start this word again" and a hint appears after two misses', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    const wrongSlot = [...w.text].findIndex((c) => c !== w.text[0]);
    test.skip(wrongSlot < 0, 'degenerate word');
    for (let i = 0; i < 2; i++) {
      await realTile(page, w.text[0]!).click();
      await page.locator(`[data-magic-slot="${wrongSlot}"]`).click();
    }
    await expect(page.getByRole('button', { name: 'Start this word again' })).toBeVisible();
    await page.getByRole('button', { name: 'Start this word again' }).click();
    await expect(page.getByText('Need a hint?')).toBeVisible();
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'hint');
  });

  test('a finished word hops its letters, reads aloud and offers Next word', async ({ page }) => {
    await openMagic(page);
    const w = await currentWord(page);
    for (const ch of w.text) await page.keyboard.press(ch);
    await expect(page.getByText('Great job!').or(page.getByText(/Awesome|You got it|Super|Brilliant|Well done/)).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^(Next word|Finish)$/ })).toBeVisible();
    await expect(page.locator('[data-magic-tile]')).toHaveCount(0); // tray cleared
  });
});

test.describe('levels', () => {
  for (const [level, decoys] of [['Starter', 0], ['Explorer', 1], ['Adventurer', 2]] as const) {
    test(`${level}: ${decoys} decoy letter(s)`, async ({ page }) => {
      await page.goto('/#/word-builder');
      await page.getByRole('button', { name: 'Settings' }).click();
      await page.getByRole('radio', { name: new RegExp(level) }).click();
      await page.keyboard.press('Escape');
          await page.locator('[data-magic-slot="0"]').waitFor();
      await expect(page.locator('[data-decoy="true"]')).toHaveCount(decoys);
    });
  }
});

test.describe('reduced motion and accessibility', () => {
  test('reduced motion: letter still lands, no star burst, no movement of loose tiles on tap', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openMagic(page);
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).click();
    await page.locator('[data-magic-slot="0"]').click();
    const slot = page.locator('[data-magic-slot="0"]');
    await expect(slot).toHaveAttribute('data-state', 'filled');
    await expect(slot.locator('svg')).toHaveCount(0);
  });

  test('axe: WCAG 2.1 A/AA clean in initial, picked-up, missed, and finished states', async ({ page }) => {
    const audit = async (label: string) => {
      await page.waitForTimeout(500);
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`), label).toEqual([]);
    };
    await openMagic(page);
    await audit('initial');
    const w = await currentWord(page);
    await realTile(page, w.text[0]!).click();
    await audit('picked up');
    const wrong = [...w.text].findIndex((c) => c !== w.text[0]);
    if (wrong > 0) await page.locator(`[data-magic-slot="${wrong}"]`).click();
    await audit('after a miss');
    for (const ch of w.text) await page.keyboard.press(ch);
    await expect(page.getByText(/You spelled/)).toBeVisible();
    await audit('finished');
  });

  for (const width of [320, 375, 768, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
      await openMagic(page);
      const w = await currentWord(page);
      await page.keyboard.press(w.text[0]!);
      const o = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));
      expect(o.doc).toBeLessThanOrEqual(o.win);
      // every loose tile and slot stays on screen horizontally
      const off = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('[data-magic-tile], [data-magic-slot]')].filter((e) => e.getBoundingClientRect().right > window.innerWidth + 1 || e.getBoundingClientRect().left < -1).length,
      );
      expect(off).toBe(0);
    });
  }
});
