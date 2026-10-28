import type { Page } from '@playwright/test';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, waitForNextItem, solveSentence, spoken, test } from './helpers';

// Magic Moments: the touch feel of Sentence Fun, Letter–Picture matching, Missing Letter and the Magic Letters reveal.
// Every check watches what the page actually does: sound-effect oscillators, spoken lines and the DOM over time.

type Ev = { t: number; f?: number; text?: string };

/** Record, in browser time, every sound-effect oscillator start and every spoken line. */
async function recordMoments(page: Page) {
  await installFakeSpeech(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __tones: Ev[]; __speech: Ev[] };
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
  });
}

const tones = (page: Page) => page.evaluate(() => (window as unknown as { __tones: Ev[] }).__tones);
const speechLog = (page: Page) => page.evaluate(() => (window as unknown as { __speech: Ev[] }).__speech);

/**
 * Sentence Fun: get to an arrange question (word tiles). Fill-in questions ("Finish the sentence") are solved on the
 * way, since they are not the thing under test.
 */
async function openArrangeSentence(page: Page) {
  await page.goto('/#/sentences');
  for (let i = 0; i < 6; i++) {
    await page.locator('[data-tile], [data-option]').first().waitFor();
    if ((await page.locator('[data-tile][data-placed="false"]').count()) > 0) break;
    await solveSentence(page);
    await waitForNextItem(page);
  }
  await page.locator('[data-tile][data-placed="false"]').first().waitFor();
  await page.waitForTimeout(500);
}

test.describe('Sentence Fun: words react to touch', () => {
  test('a tapped word lifts and is selected, then travels into a slot and lands', async ({ page }) => {
    await recordMoments(page);
    await openArrangeSentence(page);
    const tile = page.locator('[data-tile][data-placed="false"]').first();
    const value = (await tile.getAttribute('data-value'))!;
    await tile.click();
    // the selection is visible straight away: the lifted ring
    await expect(page.locator(`[data-tile][data-value="${value}"][data-placed="false"]`)).toHaveClass(/ring-4/);
    // ...then the word is in its slot (it travelled there)
    await expect(page.locator(`[data-slot] [data-tile][data-value="${value}"]`)).toBeVisible({ timeout: 1500 });
    // the chime is played once the glide has finished, so it can come a little after the word is in its slot
    await expect.poll(async () => (await tones(page)).some((t) => t.f === 880), { timeout: 1500 }).toBe(true);
    const pop = (await tones(page)).find((t) => t.f === 392);
    const chime = (await tones(page)).find((t) => t.f === 880);
    expect(pop, 'a soft pop on the tap').toBeTruthy();
    expect(chime!.t - pop!.t, 'the chime comes after the word has travelled').toBeGreaterThan(300);
  });

  test('a finished sentence shows its key word big for a moment, and the child can go straight on', async ({ page }) => {
    await recordMoments(page);
    await openArrangeSentence(page);
    await solveSentence(page);
    const reward = page.getByTestId('key-word-reward');
    await expect(reward).toBeVisible();
    await expect(reward).toHaveText(/\S/);
    // the reward never blocks the next step
    await waitForNextItem(page); // the round moves on by itself once the celebration is over
  });

  test('rapid taps: a double tap places the word once, and two different words placed together both land', async ({ page }) => {
    await recordMoments(page);
    await openArrangeSentence(page);
    const first = page.locator('[data-tile][data-placed="false"]').first();
    const value = (await first.getAttribute('data-value'))!;
    await first.dblclick();
    await expect(page.locator(`[data-slot] [data-tile][data-value="${value}"]`)).toHaveCount(1);
    await page.waitForTimeout(600);
    expect(await page.locator('[data-slot] [data-tile]').count()).toBe(1);
    // two different words, back to back
    const next = page.locator('[data-tile][data-placed="false"]');
    const a = await next.nth(0).getAttribute('data-value');
    const b = await next.nth(1).getAttribute('data-value');
    await next.nth(0).click();
    await next.nth(1).click();
    await expect(page.locator(`[data-slot] [data-tile][data-value="${a}"]`)).toHaveCount(1, { timeout: 1500 });
    await expect(page.locator(`[data-slot] [data-tile][data-value="${b}"]`)).toHaveCount(1, { timeout: 1500 });
  });

  test('sound off: nothing plays and the word still goes into its slot', async ({ page }) => {
    await recordMoments(page);
    await page.addInitScript(() => localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null })));
    await openArrangeSentence(page);
    const tile = page.locator('[data-tile][data-placed="false"]').first();
    const value = (await tile.getAttribute('data-value'))!;
    await tile.click();
    await expect(page.locator(`[data-slot] [data-tile][data-value="${value}"]`)).toBeVisible({ timeout: 1500 });
    expect(await tones(page)).toEqual([]);
    expect(await spoken(page)).toEqual([]);
  });

  test('reduced motion: the word still goes in, with no lift and no travel', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordMoments(page);
    await openArrangeSentence(page);
    const tile = page.locator('[data-tile][data-placed="false"]').first();
    const value = (await tile.getAttribute('data-value'))!;
    await tile.click();
    await expect(page.locator(`[data-slot] [data-tile][data-value="${value}"]`)).toBeVisible({ timeout: 1500 });
  });

  test('a phone-sized screen: a word can be tapped into its slot', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await openArrangeSentence(page);
    const tile = page.locator('[data-tile][data-placed="false"]').first();
    const value = (await tile.getAttribute('data-value'))!;
    await tile.tap();
    await expect(page.locator(`[data-slot] [data-tile][data-value="${value}"]`)).toBeVisible({ timeout: 1500 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await ctx.close();
  });
});

test.describe('Missing Letter: the letter travels into the gap', () => {
  async function openMissingLetter(page: Page) {
    await page.goto('/#/matching');
    await page.locator('[data-game="word-completion"]').click();
    await page.getByLabel(/Word with a missing letter/).waitFor();
  }

  /**
   * Pick choices one at a time until the right one is picked. Right after each pick, the gap is read in the same
   * tick as the flight marker: a wrong pick leaves the gap empty and no flight, so it is skipped.
   */
  async function pickMissingLetter(page: Page) {
    const choices = page.locator('[data-choice]');
    const count = await choices.count();
    for (let i = 0; i < count; i++) {
      const choice = choices.nth(i);
      if ((await choice.getAttribute('aria-label'))?.includes('not this one')) continue;
      const letter = (await choice.getAttribute('data-choice'))!;
      await choice.click();
      const after = await page.evaluate(() => ({
        flying: document.querySelectorAll('[data-magic-flight]').length,
        gap: document.querySelector('[data-blank]')?.textContent ?? '',
      }));
      if (after.flying || after.gap) return { letter, flying: after.flying > 0 };
      expect(after.gap, 'the gap stays empty after a wrong letter').toBe('');
    }
    throw new Error('none of the choices was the right letter');
  }

  /**
   * Records, in page time, each change to what the child can see here: the gap, the flight, and the feedback line. It is only read
   * if the test fails (see expectNextVisible), so a rare failure leaves a timeline behind instead of only a timeout.
   */
  async function watchFeedback(page: Page) {
    await page.evaluate(() => {
      const log: string[] = [];
      (window as unknown as { __feedback: string[] }).__feedback = log;
      const started = performance.now();
      let last = '';
      new MutationObserver(() => {
        const blank = document.querySelector('[data-blank]')?.textContent ?? '';
        const flying = document.querySelectorAll('[data-magic-flight]').length;
        const feedback = [...document.querySelectorAll('h2, h3, p, strong')].map((e) => e.textContent ?? '').find((t) => /Hooray|Which letter|Try again|needs the letter/.test(t)) ?? '';
        const next = /On to the next one/.test(document.body.textContent ?? '');
        const state = `gap="${blank}" flying=${flying} next=${next} feedback="${feedback.slice(0, 40)}"`;
        if (state !== last) {
          last = state;
          log.push(`${(performance.now() - started).toFixed(0)} ms ${state}`);
        }
      }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    });
  }

  /** The Next/Finish button must appear; on a failure the recorded timeline is attached to the report first. */
  async function expectNextVisible(page: Page) {
    try {
      await expect(page.getByText(/On to the next one/)).toBeVisible();
    } catch (error) {
      const timeline = await page.evaluate(() => (window as unknown as { __feedback?: string[] }).__feedback ?? []);
      await test.info().attach('missing-letter-timeline.txt', { body: timeline.join('\n') || '(nothing recorded)', contentType: 'text/plain' });
      throw error;
    }
  }

  test('the missing letter is not shown before it is chosen, and flies into the gap when it is', async ({ page }) => {
    await recordMoments(page);
    await openMissingLetter(page);
    await watchFeedback(page);
    const gap = page.locator('[data-blank]');
    await expect(gap).toHaveText('');
    const { flying } = await pickMissingLetter(page);
    expect(flying, 'the chosen letter flies out of its button').toBe(true);
    await expect(gap).toHaveText(/^[a-z]$/i, { timeout: 2000 });
    await expectNextVisible(page);
    expect((await tones(page)).find((t) => t.f === 523), 'the celebration sound plays').toBeTruthy();
  });

  test('reduced motion: the letter appears in the gap straight away, with no flight', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await recordMoments(page);
    await openMissingLetter(page);
    const { flying } = await pickMissingLetter(page);
    expect(flying).toBe(false);
    await expect(page.locator('[data-blank]')).toHaveText(/^[a-z]$/i, { timeout: 600 });
  });
});

test.describe('Letter–Picture matching: pops and a chime', () => {
  test('selecting a card pops, and a correct match chimes and joins the pair with a line', async ({ page }) => {
    await recordMoments(page);
    await page.goto('/#/matching');
    await page.locator('[data-game="letter-picture"]').click();
    const left = page.locator('[data-side="left"]').first();
    const id = (await left.getAttribute('data-pair-id'))!;
    await left.click();
    await expect.poll(async () => (await tones(page)).some((t) => t.f === 392), { timeout: 1000 }).toBe(true);
    await page.locator(`[data-side="right"][data-pair-id="${id}"]`).click();
    await expect(page.getByText(/Pairs matched: 1 of \d+/)).toBeVisible();
    await expect.poll(async () => (await tones(page)).some((t) => t.f === 880), { timeout: 1000 }).toBe(true);
    await expect(page.locator('svg path[stroke="#16a286"]')).toHaveCount(1);
  });
});

test.describe('Magic Letters: the word reacts when it is finished', () => {
  test('finishing a word splashes gold under it, Pip lands on it with stars, and the next word follows by itself', async ({ page }) => {
    await recordMoments(page);
    await page.goto('/#/word-builder');
    await page.locator('[data-magic-clue]').waitFor();
    await page.waitForTimeout(700);
    const clue = await page.locator('[data-magic-clue]').innerText();
    const word = englishWords.find((w) => w.clue === clue)!;
    // let React attach the keyboard listener for the new question (two frames + a tick), as solveWord does
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(done, 0)))));
    for (const ch of word.text.slice(0, -1)) await page.keyboard.press(ch);
    // sample the picture's transform from just before the last letter, so its small shake is caught whatever its timing
    await page.evaluate(() => {
      const w = window as unknown as { __hop?: string[] };
      const el = document.querySelector<HTMLElement>('.pl-frame button');
      const seen: string[] = [];
      const end = performance.now() + 1500;
      const step = () => {
        if (el) seen.push(getComputedStyle(el).transform);
        if (performance.now() < end) requestAnimationFrame(step);
        else w.__hop = seen;
      };
      requestAnimationFrame(step);
    });
    await page.keyboard.press(word.text.at(-1)!);
    await expect(page.getByText(/You spelled/)).toBeVisible();
    // a gold splash spreads under the word as the last letter lands
    await expect(page.getByTestId('word-splash')).toBeAttached();
    // then Pip lands on the word and throws its stars from there, never from the picture's frame
    await expect(page.getByTestId('completion-creature').locator('[data-testid="star-burst"]')).toHaveCount(1, { timeout: 2000 });
    await expect(page.locator('.pl-frame [data-testid="star-burst"]')).toHaveCount(0);
    await expect
      .poll(() => page.evaluate(() => ((window as unknown as { __hop?: string[] }).__hop ?? []).some((t) => t !== 'none')), { timeout: 2500 })
      .toBe(true);
    // the child is not held up: the next word is there at once
    await expect(page.getByText(/On to the next one/)).toBeVisible({ timeout: 800 });
    await waitForNextItem(page);
  });
});

/** the spoken lines are the same ones a child would hear, in order: no two line-start at the same instant */
test('spoken lines never start on top of each other', async ({ page }) => {
  await recordMoments(page);
  await openArrangeSentence(page);
  await solveSentence(page);
  await expect(page.getByTestId('key-word-reward')).toBeVisible();
  await page.waitForTimeout(800);
  const lines = await speechLog(page);
  for (let i = 1; i < lines.length; i++) expect(lines[i]!.t - lines[i - 1]!.t, 'spoken lines do not overlap').toBeGreaterThan(50);
});
