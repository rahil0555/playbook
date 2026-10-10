import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, nextOrFinish, solveSentence, solveWord, spoken, test } from './helpers';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const VIEWS = ['home', 'progress', 'alphabet', 'phonics', 'word-builder', 'sentences', 'matching'];

test.describe('navigation and refresh', () => {
  test('every activity opens from home, has a way back, and the URL hash survives a refresh', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Hello, explorer/ })).toBeVisible();
    for (const [title, hash] of [['Letter Playground', 'alphabet'], ['Sound Discovery', 'phonics'], ['Word Builder', 'word-builder'], ['Sentence Fun', 'sentences'], ['Match & Play', 'matching']]) {
      await page.locator('button', { hasText: title }).first().click();
      await expect(page).toHaveURL(new RegExp(`#/${hash}$`));
      await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
      await page.reload(); // refresh keeps us on the same screen
      await expect(page.getByRole('heading', { level: 1 })).toContainText(title);
      await page.getByRole('button', { name: 'Back to home' }).click();
      await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
    }
    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'My Stars' })).toBeVisible();
    await page.goBack(); // browser back works
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  });

  test('unknown hashes fall back to home', async ({ page }) => {
    await page.goto('/#/does-not-exist');
    await expect(page.getByRole('heading', { level: 1, name: /Hello/ })).toBeVisible();
  });
});

test.describe('alphabet', () => {
  test('all 26 letters can be selected, animate on tap, and show uppercase, lowercase and an example word', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/alphabet');
    for (const l of LETTERS) {
      const tile = page.locator(`[data-letter="${l}"]`);
      await tile.click();
      await expect(tile).toHaveAttribute('aria-pressed', 'true');
      const stage = page.getByRole('region', { name: 'Selected letter' });
      await expect(stage.getByRole('button', { name: new RegExp(`Uppercase ${l.toUpperCase()}\\.`) })).toBeVisible();
      await expect(stage.getByText(new RegExp(`^${l.toUpperCase()} is for `))).toBeVisible();
    }
    // the letter name was spoken for the last letter
    expect((await spoken(page)).at(-1)).toBe('zee');
    await expect(page.getByText('26 of 26 letters found so far')).toBeVisible();
    await expect(page.getByText('Letter Explorer')).toBeVisible(); // badge toast
  });

  test('tapping really animates the tile and the stage letter (transform changes over time)', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="m"]').waitFor();
    const sample = (sel: string) =>
      page.evaluate(async (s) => {
        const el = document.querySelector(s) as HTMLElement;
        const seen = new Set<string>();
        for (let i = 0; i < 40; i++) {
          seen.add(getComputedStyle(el).transform);
          await new Promise((r) => requestAnimationFrame(() => r(null)));
        }
        return [...seen];
      }, sel);
    const tileFrames = sample('[data-letter="m"]');
    await page.locator('[data-letter="m"]').click();
    expect((await tileFrames).length).toBeGreaterThan(3);
    const stageFrames = sample('button[aria-label^="Uppercase M"]');
    await page.locator('button[aria-label^="Uppercase M"]').click(); // replays on the stage
    expect((await stageFrames).length).toBeGreaterThan(3);
  });

  test('works with keyboard only', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="c"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-letter="c"]')).toHaveAttribute('aria-pressed', 'true');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await expect(page.locator('[data-letter="d"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('dragging the big letter does not select anything and the letter springs back', async ({ page }) => {
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="q"]').click();
    await page.waitForTimeout(1300); // let the entrance animation finish so we measure the resting position
    const big = page.locator('button[aria-label^="Uppercase Q"]');
    const before = await big.boundingBox();
    await page.mouse.move(before!.x + 20, before!.y + 20);
    await page.mouse.down();
    await page.mouse.move(before!.x + 160, before!.y + 90, { steps: 8 });
    const during = await big.boundingBox();
    expect(Math.abs(during!.x - before!.x)).toBeGreaterThan(40);
    await page.mouse.up();
    await page.waitForTimeout(900);
    const after = await big.boundingBox();
    expect(Math.abs(after!.x - before!.x)).toBeLessThan(6);
    await expect(page.locator('[data-letter="q"]')).toHaveAttribute('aria-pressed', 'true');
  });

  test('keeps working when speech synthesis is missing, and says so kindly', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    });
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="a"]').click();
    await expect(page.locator('[data-letter="a"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/Sound isn’t available/)).toBeVisible();
    await page.getByRole('button', { name: 'Hear the word' }).click(); // does not throw
    await expect(page.getByText(/can’t speak out loud|Sound isn’t available/).first()).toBeVisible();
  });

  test('keeps working when speech synthesis throws', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', {
        value: { cancel() {}, getVoices: () => [], speak() { throw new Error('boom'); } },
        configurable: true,
      });
    });
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="b"]').click();
    await expect(page.getByRole('region', { name: 'Selected letter' }).getByText('B is for ball', { exact: true })).toBeVisible();
  });
});

test.describe('phonics', () => {
  test('shows name vs sound, and the listen-and-choose game can be completed', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/phonics');
    await expect(page.getByText('/ă/').first()).toBeVisible();
    await page.getByRole('button', { name: 'Say the name' }).click();
    await page.getByRole('button', { name: 'Play the sound' }).click();
    expect((await spoken(page)).slice(-2)).toEqual(['ay', 'aah']);

    await page.getByRole('tab', { name: 'Listen & choose' }).click();
    const map: Record<string, string[]> = { aah: ['a'], eh: ['e'] }; // helper for readability only
    void map;
    for (let q = 0; q < 5; q++) {
      await expect(page.getByText('Which letter makes this sound?')).toBeVisible();
      const heard = (await spoken(page)).at(-1)!;
      const choices = await page.locator('[data-choice]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.choice as string));
      const { englishLetters } = await import('../src/playlab/data/en/alphabet');
      const right = englishLetters.find((l) => l.sound.speech === heard && choices.includes(l.id))!;
      if (q === 1) {
        await page.locator(`[data-choice]:not([data-choice="${right.id}"])`).first().click(); // wrong first
        await expect(page.getByText(/Almost|Not quite|Good try|So close/)).toBeVisible();
        await page.getByRole('button', { name: 'Try again' }).click();
      }
      await page.locator(`[data-choice="${right.id}"]`).click();
      await expect(page.getByText(new RegExp(`${right.upper} says`))).toBeVisible();
      await nextOrFinish(page);
    }
    await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText('Which letter makes this sound?')).toBeVisible();
  });
});

test.describe('word builder', () => {
  test('every word in the content set can be completed (4 rounds, "play again" and "next")', async ({ page }) => {
    await page.goto('/#/word-builder');
    const done = new Set<string>();
    for (let round = 0; round < 4 && done.size < englishWords.length; round++) {
      for (let q = 0; q < 5; q++) {
        const w = await solveWord(page);
        done.add(w.id);
        await nextOrFinish(page);
      }
      await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
      if (done.size < englishWords.length) await page.getByRole('button', { name: 'Play again' }).click();
    }
    expect([...done].sort()).toEqual(englishWords.map((w) => w.id).sort());
    for (const required of ['cat', 'sun', 'dog', 'bat', 'pen', 'cup', 'fish', 'book', 'apple', 'mango']) expect(done.has(required)).toBe(true);
  });

  test('drag and drop places a tile into a chosen slot; tap deselects; check is disabled until complete', async ({ page }) => {
    await page.goto('/#/word-builder');
    const check = page.getByRole('button', { name: 'Check my word' });
    await expect(check).toBeDisabled();
    const tile = page.locator('[data-tile][data-placed="false"]').first();
    const value = await tile.getAttribute('data-value');
    const box = (await tile.boundingBox())!;
    const slot = (await page.locator('[data-slot="1"]').boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 30, box.y - 40, { steps: 4 });
    await page.mouse.move(slot.x + slot.width / 2, slot.y + slot.height / 2, { steps: 10 });
    await page.mouse.up();
    await expect(page.locator('[data-slot="1"]')).toHaveAttribute('aria-label', `Slot 2: ${value!.toUpperCase()}`);
    await page.locator('[data-slot="1"] [data-tile]').click(); // tap to take it back
    await expect(page.locator('[data-slot="1"]')).toHaveAttribute('aria-label', 'Slot 2: empty');
    await expect(check).toBeDisabled();
  });

  test('wrong answer: kind feedback, retry keeps the correct letters, hint appears after two misses', async ({ page }) => {
    await page.goto('/#/word-builder');
    const clue = await page.getByRole('region', { name: 'Clue' }).locator('p').first().innerText();
    const word = englishWords.find((w) => w.clue === clue)!;
    // a deliberately wrong arrangement: the word reversed (palindromes aside)
    const wrong = [...word.text].reverse();
    const alt = wrong.join('') === word.text ? [...word.text.slice(1), word.text[0]!] : wrong;
    for (let attempt = 0; attempt < 2; attempt++) {
      for (const ch of alt) await page.locator(`[data-tile][data-value="${ch}"][data-placed="false"]`).first().click();
      await page.getByRole('button', { name: 'Check my word' }).click();
      await expect(page.getByText(/Almost|Not quite|Good try|So close/)).toBeVisible();
      await page.getByRole('button', { name: 'Try again' }).click();
      await page.getByRole('button', { name: 'Clear' }).click().catch(() => undefined);
    }
    await expect(page.getByText('Need a hint?')).toBeVisible();
    await solveWord(page);
    await nextOrFinish(page);
    await expect(page.getByText(/Word 2 of 5/)).toBeVisible();
  });
});

test.describe('sentences', () => {
  test('a full round (arrange and fill-in) can be completed, then replayed', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/sentences');
    for (let q = 0; q < 5; q++) {
      const id = await solveSentence(page);
      expect(id).toMatch(/^s\d+$/);
      await expect(page.getByText('You made a whole sentence!')).toBeVisible();
      await nextOrFinish(page);
    }
    await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
    expect((await spoken(page)).filter((t) => /\.$/.test(t))).toHaveLength(5); // read aloud after each success
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText(/Make the sentence|Finish the sentence/)).toBeVisible();
  });
});

test.describe('matching', () => {
  const finishPairs = async (page: import('@playwright/test').Page) => {
    const lefts = page.locator('[data-side="left"]');
    const n = await lefts.count();
    for (let i = 0; i < n; i++) {
      const left = lefts.nth(i);
      const id = await left.getAttribute('data-pair-id');
      await left.click();
      await page.locator(`[data-side="right"][data-pair-id="${id}"]`).click();
    }
  };

  test('all three games can be completed from start to finish', async ({ page }) => {
    await page.goto('/#/matching');
    for (const game of ['letter-picture', 'sound-letter']) {
      await page.locator(`[data-game="${game}"]`).click();
      await expect(page.getByText('Pairs matched: 0 of 5')).toBeVisible();
      await finishPairs(page);
      await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible({ timeout: 5000 });
      await page.getByRole('button', { name: 'Pick another game' }).last().click();
    }
    await page.locator('[data-game="word-completion"]').click();
    for (let i = 0; i < 5; i++) {
      const label = (await page.getByLabel(/Word with a missing letter/).getAttribute('aria-label'))!;
      const tokens = label.split(': ')[1]!.split(' ');
      const re = new RegExp(`^${tokens.map((t) => (t === 'blank' ? '.' : t)).join('')}$`);
      const word = englishWords.find((w) => re.test(w.text))!;
      await page.locator(`[data-choice="${word.text[tokens.indexOf('blank')]}"]`).click();
      await nextOrFinish(page);
    }
    await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
  });

  test('drag a letter onto its picture to match', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 1400 }); // keep the drop target on screen
    await page.goto('/#/matching');
    await page.locator('[data-game="letter-picture"]').click();
    const left = page.locator('[data-side="left"]').first();
    const id = (await left.getAttribute('data-pair-id'))!;
    const from = (await left.boundingBox())!;
    const to = (await page.locator(`[data-side="right"][data-pair-id="${id}"]`).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 40, from.y + 10, { steps: 4 });
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect(page.getByText('Pairs matched: 1 of 5')).toBeVisible();
  });
});

test.describe('progress and persistence', () => {
  test('numbers update after a round, and saved demo progress survives a browser refresh', async ({ page }) => {
    await page.goto('/#/word-builder');
    for (let q = 0; q < 5; q++) {
      await solveWord(page);
      await nextOrFinish(page);
    }
    await page.getByRole('button', { name: 'My Stars', exact: true }).click();
    await expect(page.getByTestId('session-rounds-finished')).toHaveText('1');
    await expect(page.getByTestId('session-correct-answers')).toHaveText('5');
    await expect(page.getByRole('region', { name: 'Recently finished' }).getByText('Word Builder')).toBeVisible();
    await page.reload();
    // lifetime values persist (localStorage); this-visit values reset
    await expect(page.getByTestId('session-rounds-finished')).toHaveText('0');
    const allTime = page.getByRole('region', { name: 'All time' });
    await expect(allTime.getByText('Rounds finished').locator('xpath=preceding-sibling::p')).toHaveText('1');
    await expect(page.getByRole('region', { name: 'Recently finished' }).getByText('Word Builder')).toBeVisible();
    // storage holds no personal data
    const stored = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
    expect(Object.keys(stored).every((k) => k.startsWith('edurance.playlab.'))).toBe(true);
    expect(JSON.stringify(stored)).not.toMatch(/@|email|name/i);
  });

  test('corrupted saved data does not break the app', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.progress.v1', '{not json'));
    await page.goto('/#/progress');
    await expect(page.getByRole('heading', { level: 1, name: 'My Stars' })).toBeVisible();
  });
});

test.describe('reduced motion', () => {
  test('OS reduced-motion removes movement but keeps the selection feedback', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/#/alphabet');
    await expect(page.locator('[data-playlab]')).toHaveAttribute('data-motion', 'reduce');
    await page.locator('[data-letter="m"]').waitFor();
    const frames = page.evaluate(async () => {
      const el = document.querySelector('[data-letter="m"]') as HTMLElement;
      const seen = new Set<string>();
      for (let i = 0; i < 40; i++) {
        seen.add(getComputedStyle(el).transform);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return [...seen];
    });
    await page.locator('[data-letter="m"]').click();
    const seen = await frames;
    expect(seen.every((t) => t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true);
    await expect(page.locator('[data-letter="m"]')).toHaveAttribute('aria-pressed', 'true'); // still clearly selected
    await expect(page.getByRole('region', { name: 'Selected letter' }).getByText('M is for moon', { exact: true })).toBeVisible();
  });
});

test.describe('responsive layout', () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px on any screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: width < 700 ? 740 : 900 });
      for (const view of VIEWS) {
        await page.goto(`/#/${view}`);
        await page.waitForTimeout(250);
        if (view === 'alphabet') await page.locator('[data-letter="w"]').click();
        if (view === 'matching') await page.locator('[data-game="letter-picture"]').click();
        await page.waitForTimeout(250);
        const over = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth, body: document.body.scrollWidth }));
        expect(over.doc, `${view} @${width}`).toBeLessThanOrEqual(over.win);
        expect(over.body, `${view} body @${width}`).toBeLessThanOrEqual(over.win);
      }
    });
  }

  test('touch targets are at least 44px tall on a phone', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 740 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    for (const view of ['home', 'alphabet', 'word-builder', 'sentences']) {
      await page.goto(`/#/${view}`);
      await page.waitForTimeout(300);
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button')]
          .filter((b) => b.offsetParent !== null && !b.closest('[aria-hidden="true"]'))
          .map((b) => ({ label: b.getAttribute('aria-label') ?? b.textContent?.trim() ?? '', h: b.getBoundingClientRect().height, w: b.getBoundingClientRect().width }))
          .filter((b) => b.h < 44 || b.w < 44),
      );
      expect(small, `${view}: small touch targets`).toEqual([]);
    }
    await ctx.close();
  });

  test('touch screen: tap selects letters and builds words', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="g"]').tap();
    await expect(page.locator('[data-letter="g"]')).toHaveAttribute('aria-pressed', 'true');
    await page.goto('/#/word-builder');
    await solveWord(page);
    await ctx.close();
  });
});

test.describe('accessibility basics', () => {
  test('keyboard focus is visible, landmarks and labels exist', async ({ page }) => {
    await page.goto('/#/word-builder');
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeVisible();
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const cs = getComputedStyle(el);
      return { width: parseFloat(cs.outlineWidth), style: cs.outlineStyle };
    });
    expect(outline.style).not.toBe('none');
    expect(outline.width).toBeGreaterThanOrEqual(3);
    const unnamed = await page.evaluate(() =>
      [...document.querySelectorAll('button')].filter((b) => !(b.getAttribute('aria-label') || b.textContent?.trim())).length,
    );
    expect(unnamed).toBe(0);
  });

  test('moves focus to the new screen after navigating', async ({ page }) => {
    await page.goto('/#/home');
    await page.locator('button', { hasText: 'Word Builder' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'Word Builder' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('pl-main');
  });
});
