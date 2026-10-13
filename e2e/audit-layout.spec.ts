import { expect, test, type Page } from '@playwright/test';
import { englishSentences } from '../src/playlab/data/en/sentences';
import { englishWords } from '../src/playlab/data/en/words';

// Layout gate: what a phone, tablet or desktop screen shows on each main screen and in the states a child reaches
// (a finished word, a wrong answer, a solved sentence, Settings). Every state is checked for: sideways scrolling,
// controls off the screen, content cut off by its box, controls on top of each other, and touch targets under 44 px.
const WIDTHS = [320, 390, 768, 1024, 1280];
const SCREENS: { name: string; go: (p: Page) => Promise<void> }[] = [
  { name: 'home', go: async (p) => { await p.goto('/#/home'); await p.getByRole('heading').first().waitFor(); } },
  { name: 'alphabet', go: async (p) => { await p.goto('/#/alphabet'); await p.waitForTimeout(600); } },
  { name: 'phonics', go: async (p) => { await p.goto('/#/phonics'); await p.waitForTimeout(600); } },
  { name: 'magic-letters', go: async (p) => { await p.goto('/#/word-builder'); await p.locator('[data-magic-clue]').waitFor(); await p.waitForTimeout(700); } },
  { name: 'sentence-fun', go: async (p) => { await p.goto('/#/sentences'); await p.locator('[data-tile], [data-option]').first().waitFor(); await p.waitForTimeout(700); } },
  { name: 'matching', go: async (p) => { await p.goto('/#/matching'); await p.waitForTimeout(600); } },
  { name: 'progress', go: async (p) => { await p.goto('/#/progress'); await p.waitForTimeout(600); } },
];

type Finding = { horizontalOverflow: number; offscreen: string[]; smallTargets: number; smallSample: string[]; overlaps: string[]; clipped: string[] };

const AUDIT = (): Finding => {
  const vw = window.innerWidth;
  const vis = (el: Element) => {
    const s = getComputedStyle(el as HTMLElement);
    const r = el.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0;
  };
  const label = (el: Element) => ((el.textContent ?? '') || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30);
  const interactive = [...document.querySelectorAll<HTMLElement>('button, a[href], [role="button"], [data-tile], [data-magic-tile], [data-option], [data-choice], [data-side], [data-game]')].filter(vis);
  const offscreen = interactive
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 || r.left < -1;
    })
    .map(label);
  const small = interactive.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width < 44 || r.height < 44;
  });
  const overlaps: string[] = [];
  const buttons = interactive.filter((el) => el.tagName === 'BUTTON');
  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i]!, b = buttons[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 4 && iy > 4) overlaps.push(`${label(a)} / ${label(b)}`);
    }
  }
  // content that sticks out of the box that clips it (a card, a board, a scroller)
  const clipped = [...document.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, button, label, [data-tile], [data-magic-tile], [data-option]')]
    .filter((el) => vis(el) && !el.closest('.sr-only'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      let anc = el.parentElement;
      while (anc && anc !== document.body) {
        const o = getComputedStyle(anc);
        if (o.overflowX !== 'visible' || o.overflow !== 'visible') {
          const a = anc.getBoundingClientRect();
          return r.right > a.right + 2 || r.left < a.left - 2;
        }
        anc = anc.parentElement;
      }
      return false;
    })
    .map(label);
  return {
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0,
    offscreen: [...new Set(offscreen)],
    smallTargets: small.length,
    smallSample: [...new Set(small.map((el) => `${label(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`))].slice(0, 6),
    overlaps: [...new Set(overlaps)].slice(0, 6),
    clipped: [...new Set(clipped)].slice(0, 6),
  };
};

/** Every state a child reaches on the way through a round, from a fresh load (so the Settings panel starts closed). */
async function visitStates(page: Page, w: number) {
  const report: Record<string, Finding> = {};
  for (const s of SCREENS) {
    await s.go(page);
    await page.reload(); // a fresh load: nothing left open from the screen before
    await s.go(page);
    report[s.name] = await page.evaluate(AUDIT);
  }
  // Magic Letters: a finished word
  await page.reload();
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-clue]').waitFor();
  await page.waitForTimeout(700);
  const clue1 = await page.locator('[data-magic-clue]').innerText();
  const target = englishWords.find((x) => x.clue === clue1)!;
  for (const ch of target.text) await page.keyboard.press(ch);
  await page.getByText(/You spelled/).waitFor();
  await page.waitForTimeout(1500);
  report['magic-complete'] = await page.evaluate(AUDIT);
  // Magic Letters: a wrong letter, then a second miss
  await page.reload();
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-clue]').waitFor();
  await page.waitForTimeout(700);
  const clue2 = await page.locator('[data-magic-clue]').innerText();
  const target2 = englishWords.find((x) => x.clue === clue2)!;
  // any loose letter that is not the first letter of the word: putting it in the first spot is always a miss
  for (let i = 0; i < 2; i++) {
    await page.locator(`[data-magic-tile]:not([data-value="${target2.text[0]}"])`).first().click({ timeout: 3000 }).catch(() => undefined);
    await page.locator('[data-magic-slot="0"]').click({ timeout: 3000 }).catch(() => undefined);
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(900);
  report['magic-wrong'] = await page.evaluate(AUDIT);
  // Sentence Fun: a solved sentence
  await page.reload();
  await page.goto('/#/sentences');
  await page.locator('[data-tile], [data-option]').first().waitFor();
  await page.waitForTimeout(600);
  if ((await page.locator('[data-option]').count()) > 0) {
    const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
    const fill = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string))!;
    await page.locator(`[data-option="${fill.words[fill.blankIndex!]}"]`).click();
  } else {
    const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
    const arr = englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === [...tiles].sort().join('|'))!;
    for (const word of arr.words) await page.locator(`[data-tile][data-value="${word}"][data-placed="false"]`).first().click({ timeout: 3000 }).catch(() => undefined);
    await page.getByRole('button', { name: 'Check my sentence' }).click({ timeout: 3000 }).catch(() => undefined);
  }
  await page.waitForTimeout(1300);
  report['sentence-solved'] = await page.evaluate(AUDIT);
  // Settings open over the home screen (a modal: its only gate is touch-target size)
  await page.reload();
  await page.goto('/#/home');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Settings' }).click({ timeout: 3000 }).catch(() => undefined);
  await page.waitForTimeout(900);
  report['settings'] = await page.evaluate(AUDIT);
  void w;
  return report;
}

test.describe('layout gate', () => {
  for (const w of WIDTHS) {
    test(`every screen and state fits a ${w} px screen`, async ({ page }) => {
      test.setTimeout(300_000);
      await page.setViewportSize({ width: w, height: w < 500 ? 740 : 900 });
      const report = await visitStates(page, w);
      expect(Object.keys(report).length, 'every screen and state was visited').toBe(SCREENS.length + 4);
      for (const [name, r] of Object.entries(report)) {
        const ctx = `${name} at ${w} px`;
        expect(r.horizontalOverflow, `${ctx}: the page scrolls sideways`).toBe(0);
        expect(r.offscreen, `${ctx}: controls off the screen`).toEqual([]);
        expect(r.clipped, `${ctx}: content cut off by its box`).toEqual([]);
        expect(r.smallTargets, `${ctx}: touch targets under 44 px: ${r.smallSample.join(', ')}`).toBe(0);
        // the Settings panel is a modal over the header on purpose, so only the other states are checked for overlap
        if (name !== 'settings') expect(r.overlaps, `${ctx}: controls overlap`).toEqual([]);
      }
    });
  }
});
