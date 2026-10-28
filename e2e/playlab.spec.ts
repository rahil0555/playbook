import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, installScriptedSpeech, waitForNextItem, solveSentence, solveWord, spoken, test } from './helpers';

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const VIEWS = ['home', 'progress', 'alphabet', 'phonics', 'word-builder', 'sentences', 'matching'];

test.describe('navigation and refresh', () => {
  test('every activity opens from home, has a way back, and the URL hash survives a refresh', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: /Hello, explorer/ })).toBeVisible();
    for (const [card, hash, title] of [['Letter Playground', 'alphabet', 'Letter Playground'], ['Sound Discovery', 'phonics', 'Sound Discovery'], ['Word Builder', 'word-builder', 'Magic Letters'], ['Sentence Fun', 'sentences', /Build the Sentence|Finish the Sentence/], ['Match & Play', 'matching', 'Match & Play']]) {
      await page.locator('button', { hasText: card }).first().click();
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
    // the teacher's line for the last letter was the last thing said: each tap starts that letter's lesson
    expect((await spoken(page)).at(-1)).toBe('Say Z for zebra!');
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
    // no speech recognition either, so the lesson is not listening and "Hear it" can be pressed
    await installScriptedSpeech(page, { supported: false });
    await page.goto('/#/alphabet');
    await page.locator('[data-letter="a"]').click();
    await expect(page.locator('[data-letter="a"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText(/no spoken voice for this browser/)).toBeVisible();
    await page.getByRole('button', { name: 'Hear it', exact: true }).click(); // does not throw
    await expect(page.getByText(/Sound can’t play on this device|no spoken voice for this browser/).first()).toBeVisible();
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
  test('the sound is asked for before its example word is shown, and the listen-and-choose game can be completed', async ({ page }) => {
    await installFakeSpeech(page);
    await installScriptedSpeech(page);
    await page.goto('/#/phonics');
    // Sound Discovery asks for a word with the sound; the example word stays hidden until the child has answered
    await expect(page.getByRole('heading', { name: 'Say a word for it' })).toBeVisible();
    await expect(page.getByText('apple', { exact: true })).toHaveCount(0);

    await page.getByRole('tab', { name: 'Listen & choose' }).click();
    const map: Record<string, string[]> = { aah: ['a'], eh: ['e'] }; // helper for readability only
    void map;
    for (let q = 0; q < 5; q++) {
      await expect(page.getByText('Which letter makes this sound?')).toBeVisible();
      // the sound is spoken as its example word, after the lead-in: wait for the word itself
      await expect.poll(async () => (await spoken(page)).at(-1)).not.toBe('Listen for the sound in');
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
      await waitForNextItem(page);
    }
    await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByText('Which letter makes this sound?')).toBeVisible();
  });
});

test.describe('word builder', () => {
  test('every word in the content set can be completed (4 rounds, "play again", and each next word comes by itself)', async ({ page }) => {
    test.setTimeout(150_000); // each word waits for its celebration before the next one comes
    await page.goto('/#/word-builder');
    const done = new Set<string>();
    for (let round = 0; round < 4 && done.size < englishWords.length; round++) {
      for (let q = 0; q < 5; q++) {
        const w = await solveWord(page);
        done.add(w.id);
        await waitForNextItem(page);
      }
      await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
      if (done.size < englishWords.length) await page.getByRole('button', { name: 'Play again' }).click();
    }
    expect([...done].sort()).toEqual(englishWords.map((w) => w.id).sort());
    for (const required of ['cat', 'sun', 'dog', 'bat', 'pen', 'cup', 'fish', 'book', 'apple', 'mango']) expect(done.has(required)).toBe(true);
  });
});

test.describe('sentences', () => {
  test('a full round (arrange and fill-in) can be completed, then replayed', async ({ page }) => {
    test.setTimeout(90_000); // every sentence waits for its celebration before the next one comes
    await installFakeSpeech(page);
    await page.goto('/#/sentences');
    for (let q = 0; q < 5; q++) {
      const id = await solveSentence(page);
      expect(id).toMatch(/^s\d+$/);
      await expect(page.getByText('You made a whole sentence!')).toBeVisible();
      await waitForNextItem(page);
    }
    await expect(page.getByRole('region', { name: /Amazing|Great work|You did it/ })).toBeVisible();
    // read aloud after each success, once its fanfare has finished (the last line follows the fanfare by ~0.7 s)
    await expect.poll(async () => (await spoken(page)).filter((t) => /\.$/.test(t)).length, { timeout: 3000 }).toBe(5);
    await page.getByRole('button', { name: 'Play again' }).click();
    await expect(page.getByRole('heading', { level: 2, name: /Put the words in order|Finish the sentence/ })).toBeVisible();
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
      const blank = tokens.indexOf('blank');
      const re = new RegExp(`^${tokens.map((t) => (t === 'blank' ? '.' : t)).join('')}$`);
      // several words can share this pattern (cat, bat and hat all look like "_at"), so try each possible letter
      // until the right one is accepted; a wrong pick is turned down and "Try again" reopens the choices
      const letters = [...new Set(englishWords.filter((w) => re.test(w.text)).map((w) => w.text[blank]!))];
      for (const letter of letters) {
        const choice = page.locator(`[data-choice="${letter}"]:not([disabled])`);
        if ((await choice.count()) === 0) continue;
        await choice.click();
        const accepted = await page.getByText(/On to the next one/).waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false);
        if (accepted) break;
        await page.getByRole('button', { name: 'Try again' }).click();
      }
      await waitForNextItem(page);
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
      await waitForNextItem(page);
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
    expect(seen.filter((t) => t !== 'none' && t !== 'matrix(1, 0, 0, 1, 0, 0)'), 'non-identity transforms seen').toEqual([]);
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
      await page.waitForTimeout(900); // let the letter tiles finish their staggered pop-in
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

  test('touch screen: a finger can DRAG a tile into a slot and a letter onto a picture (CDP touch events)', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 1250 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      await touch('touchStart', from.x, from.y);
      for (let i = 1; i <= 12; i++) await touch('touchMove', from.x + ((to.x - from.x) * i) / 12, from.y + ((to.y - from.y) * i) / 12);
      await touch('touchEnd', to.x, to.y);
    };
    const center = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

    await page.goto('/#/word-builder');
    const clue = await page.locator('[data-magic-clue]').innerText();
    const first = englishWords.find((w) => w.clue === clue)!.text[0]!;
    const tile = page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${first}"][data-decoy="false"]`).first();
    await drag(center((await tile.boundingBox())!), center((await page.locator('[data-magic-slot="0"]').boundingBox())!));
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'filled');
    expect(await page.evaluate(() => window.scrollY)).toBe(0); // dragging did not scroll the page

    await page.goto('/#/matching');
    await page.locator('[data-game="letter-picture"]').click();
    const left = page.locator('[data-side="left"]').first();
    const id = (await left.getAttribute('data-pair-id'))!;
    await drag(center((await left.boundingBox())!), center((await page.locator(`[data-side="right"][data-pair-id="${id}"]`).boundingBox())!));
    await expect(page.getByText('Pairs matched: 1 of 5')).toBeVisible();
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
    await expect(page.getByRole('heading', { level: 1, name: 'Magic Letters' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('pl-main');
  });
});

test.describe('host integration (example host app at /?host)', () => {
  test('embeds inside a host page, forwards callbacks, exits back to the host and uses host-provided config', async ({ page }) => {
    await page.goto('/?host');
    await page.getByTestId('open-playlab').click();
    await expect(page.getByRole('heading', { level: 1, name: 'Letter Playground' })).toBeVisible();
    for (const l of 'abcde') await page.locator(`[data-letter="${l}"]`).click();
    await page.getByRole('button', { name: 'Back to Edurance' }).click(); // onExit
    await expect(page.getByRole('heading', { name: 'Student dashboard' })).toBeVisible();
    const log = await page.getByTestId('host-log').innerText();
    expect(log).toMatch(/complete → alphabet 5\/5 ★3/);
    expect(log).toMatch(/track → letter_explored/);
    expect(log).toMatch(/save → /);
    // the namespaced storage key uses the opaque learner id, not a name
    const keys = await page.evaluate(() => Object.keys(localStorage));
    expect(keys.some((k) => k.endsWith(':host-demo-student'))).toBe(true);
    expect(keys.join()).not.toMatch(/Maya/);
  });

  test('host-controlled level hides the in-app level picker', async ({ page }) => {
    await page.goto('/?host');
    await page.getByTestId('host-level').selectOption('starter');
    await page.getByTestId('open-playlab').click();
    await page.getByRole('button', { name: 'Settings' }).click();
    await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('radio', { name: /Starter/ })).toHaveCount(0);
  });

  test('aggressive global host CSS does not change how PlayLab looks', async ({ page }) => {
    await page.goto('/?host');
    await page.getByTestId('open-playlab').click();
    await page.locator('[data-letter="a"]').waitFor();
    const probe = () =>
      page.evaluate(() => {
        const pick = (el: Element | null, props: string[]) => {
          const cs = getComputedStyle(el as Element);
          return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
        };
        const root = document.querySelector('[data-playlab]') as HTMLElement;
        return {
          h1: pick(root.querySelector('h1'), ['font-size', 'font-family', 'color']),
          primary: pick(root.querySelector('button.pl-chunk, button[aria-label="Play again"]') ?? root.querySelector('button'), ['background-color', 'border-top-width', 'padding-top', 'border-radius', 'font-family']),
          tile: pick(root.querySelector('[data-letter="a"]'), ['border-top-width', 'border-radius', 'font-family', 'box-sizing']),
          list: pick(root.querySelector('ul'), ['margin-top', 'padding-left']),
          gridTile: root.querySelector('[data-letter="a"]')!.getBoundingClientRect().width,
        };
      });
    const clean = await probe();
    await page.getByTestId('legacy-toggle').check();
    await page.waitForTimeout(200);
    const hostile = await probe();
    expect(hostile).toEqual(clean);
  });
});
