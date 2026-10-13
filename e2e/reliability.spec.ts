import type { Page } from '@playwright/test';
import { englishSentences } from '../src/playlab/data/en/sentences';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, test } from './helpers';

// Reliability on real devices: speech that must stop when the child leaves, the page is hidden or a round restarts;
// controls that must stay tappable under the sound message; layout at a 320 px phone; touch targets.

type Entry = { kind: 'speak' | 'cancel'; t: number; text?: string };

/** Logs every speak and cancel call (in page time), on top of the fake speech used by the other tests. */
async function instrumentSpeech(page: Page) {
  await installFakeSpeech(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __log: Entry[] };
    w.__log = [];
    const synth = window.speechSynthesis as unknown as { speak: (u: { text: string }) => void; cancel: () => void };
    const speak = synth.speak.bind(synth);
    const cancel = synth.cancel.bind(synth);
    synth.speak = (u) => {
      w.__log.push({ kind: 'speak', t: performance.now(), text: u.text });
      speak(u);
    };
    synth.cancel = () => {
      w.__log.push({ kind: 'cancel', t: performance.now() });
      cancel();
    };
  });
}

const log = (page: Page) => page.evaluate(() => (window as unknown as { __log: Entry[] }).__log);

/** True when the last speech was followed by a cancel: i.e. the speech in progress was stopped. */
async function speechWasStopped(page: Page) {
  const entries = await log(page);
  const lastSpeak = entries.map((e) => e.kind).lastIndexOf('speak');
  return lastSpeak >= 0 && entries.slice(lastSpeak + 1).some((e) => e.kind === 'cancel');
}

const mainNav = (page: Page) => page.getByRole('navigation', { name: 'Main' });

async function openMagic(page: Page) {
  await page.goto('/#/word-builder');
  await page.locator('[data-magic-clue]').waitFor();
  await page.waitForTimeout(700);
  const clue = await page.locator('[data-magic-clue]').innerText();
  return englishWords.find((w) => w.clue === clue)!;
}

test.describe('nothing is spoken on its own', () => {
  test('opening a screen speaks nothing until the child touches something', async ({ page }) => {
    await instrumentSpeech(page);
    await page.goto('/#/word-builder');
    await page.locator('[data-magic-clue]').waitFor();
    await page.goto('/#/home');
    await page.waitForTimeout(1500);
    expect((await log(page)).filter((e) => e.kind === 'speak'), 'no speech before the child acts').toEqual([]);
  });

  test('turning the sound off while praise is waiting to be read cancels it', async ({ page }) => {
    await instrumentSpeech(page);
    await page.goto('/#/sentences');
    await page.locator('[data-tile], [data-option]').first().waitFor();
    await page.waitForTimeout(500);
    let arranged: { words: string[]; punctuation: string } | undefined;
    if ((await page.locator('[data-option]').count()) > 0) {
      const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
      const fill = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string))!;
      await page.locator(`[data-option="${fill.words[fill.blankIndex!]}"]`).click();
      await page.getByRole('button', { name: /^(Next sentence|Finish)$/ }).click();
      await page.waitForTimeout(500);
    }
    await page.locator('[data-tile][data-placed="false"]').first().waitFor();
    const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
    arranged = englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === [...tiles].sort().join('|'));
    for (const w of arranged!.words) await page.locator(`[data-tile][data-value="${w}"][data-placed="false"]`).first().click();
    await page.getByRole('button', { name: 'Check my sentence' }).click();
    await page.getByTestId('key-word-reward').waitFor();
    // the praise is still waiting for its fanfare to finish: switch the sound off now
    await page.getByRole('button', { name: /Sound is on. Turn sound off/ }).click();
    await page.waitForTimeout(1500);
    const sentence = `${arranged!.words.join(' ')}${arranged!.punctuation}`;
    expect((await log(page)).filter((e) => e.kind === 'speak' && e.text === sentence), 'the waiting praise is dropped').toEqual([]);
  });
});

test.describe('repeated taps never stack speech', () => {
  test('every new line cancels the one before it, however fast the child taps Hear the clue', async ({ page }) => {
    await instrumentSpeech(page);
    await openMagic(page);
    const hear = page.getByRole('button', { name: 'Hear the clue' });
    for (let i = 0; i < 5; i++) await hear.click();
    await page.waitForTimeout(300);
    const entries = (await log(page)).filter((e) => e.kind === 'speak' || e.kind === 'cancel');
    const speaks = entries.map((e, i) => ({ e, i })).filter((x) => x.e.kind === 'speak');
    expect(speaks.length, 'every tap is heard').toBe(5);
    // before each speak after the first, a cancel comes in between: the previous line is stopped, never talked over
    for (let k = 1; k < speaks.length; k++) {
      const between = entries.slice(speaks[k - 1]!.i + 1, speaks[k]!.i).some((e) => e.kind === 'cancel');
      expect(between, `line ${k + 1} stops line ${k}`).toBe(true);
    }
  });
});

test.describe('speech stops when the child leaves', () => {
  test('going Home stops speech that is in progress', async ({ page }) => {
    await instrumentSpeech(page);
    await openMagic(page);
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await page.waitForTimeout(150);
    await mainNav(page).getByRole('button', { name: 'Home' }).click();
    await page.waitForTimeout(200);
    expect(await speechWasStopped(page), 'navigating away cancels the speech').toBe(true);
  });

  test('a hidden page (switching apps or tabs) stops speech that is in progress', async ({ page }) => {
    await instrumentSpeech(page);
    await openMagic(page);
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);
    expect(await speechWasStopped(page), 'hiding the page cancels the speech').toBe(true);
  });

  test('praise for a sentence is not read out after the child has gone Home', async ({ page }) => {
    await instrumentSpeech(page);
    await page.goto('/#/sentences');
    await page.locator('[data-tile], [data-option]').first().waitFor();
    for (let i = 0; i < 6 && (await page.locator('[data-tile][data-placed="false"]').count()) === 0; i++) {
      const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
      const fill = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string))!;
      await page.locator(`[data-option="${fill.words[fill.blankIndex!]}"]`).click();
      await page.getByRole('button', { name: /^(Next sentence|Finish)$/ }).click();
      await page.waitForTimeout(500);
    }
    await page.locator('[data-tile][data-placed="false"]').first().waitFor();
    const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
    const s = englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === [...tiles].sort().join('|'))!;
    for (const w of s.words) await page.locator(`[data-tile][data-value="${w}"][data-placed="false"]`).first().click();
    await page.getByRole('button', { name: 'Check my sentence' }).click();
    await page.getByTestId('key-word-reward').waitFor();
    await mainNav(page).getByRole('button', { name: 'Home' }).click();
    await page.waitForTimeout(1500);
    const sentence = `${s.words.join(' ')}${s.punctuation}`;
    const said = (await log(page)).filter((e) => e.kind === 'speak' && e.text === sentence);
    expect(said.length, 'the sentence is not spoken on the Home screen').toBe(0);
  });
});

test.describe('leaving a screen by any route', () => {
  test('the browser Back button stops speech that is in progress', async ({ page }) => {
    await instrumentSpeech(page);
    await page.goto('/#/home');
    await page.locator('[data-magic-clue]').count();
    await page.goto('/#/word-builder');
    await page.locator('[data-magic-clue]').waitFor();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await page.waitForTimeout(150);
    await page.goBack();
    await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
    await page.waitForTimeout(200);
    expect(await speechWasStopped(page), 'going Back cancels the speech').toBe(true);
  });

  test('quick, repeated switching between screens leaves the app working and silent', async ({ page }) => {
    await instrumentSpeech(page);
    await page.goto('/#/home');
    await page.locator('[data-magic-clue]').count();
    const views = ['Home', 'My Stars', 'Home', 'My Stars', 'Home'];
    for (let round = 0; round < 3; round++) {
      for (const v of views) await mainNav(page).getByRole('button', { name: v }).click({ timeout: 2000 });
    }
    await page.goto('/#/word-builder');
    await page.locator('[data-magic-clue]').waitFor();
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await page.getByRole('button', { name: 'Home' }).first().click();
    await expect(page.getByRole('heading', { name: /Hello/ })).toBeVisible();
    await page.waitForTimeout(300);
    expect(await speechWasStopped(page)).toBe(true);
  });
});

test.describe('the sound message never blocks the controls', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the Next button stays tappable while the sound message is showing', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    });
    const word = await openMagic(page);
    for (const ch of word.text) await page.keyboard.press(ch);
    await expect(page.getByText(/You spelled/)).toBeVisible();
    // no speech on this device: the message appears after the first attempt
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await expect(page.getByRole('status').filter({ hasText: /Spoken words|Sound isn/ })).toBeVisible();
    const next = page.getByRole('button', { name: /^(Next word|Finish)$/ });
    // on a short phone the button can be below the fold: scroll to it the way a child would, then compare the boxes
    await next.scrollIntoViewIfNeeded();
    const boxes = await page.evaluate(() => {
      const n = [...document.querySelectorAll('button')].find((b) => /^(Next word|Finish)$/.test(b.textContent?.trim() ?? ''))!;
      const s = [...document.querySelectorAll('[role="status"]')].find((el) => /Spoken words|Sound isn/.test(el.textContent ?? ''));
      const a = n.getBoundingClientRect();
      const b = s!.getBoundingClientRect();
      const overlap = Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
      const r = n.getBoundingClientRect();
      const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { overlap, hit: !!top && (top === n || n.contains(top)) };
    });
    expect(boxes.overlap, 'the sound message does not sit over the Next button').toBe(false);
    expect(boxes.hit, 'a tap on Next reaches Next').toBe(true);
  });

  test('the message says there is no spoken voice here (the sound effects still play)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    });
    await openMagic(page);
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    await expect(page.getByText(/no spoken voice for this browser/)).toBeVisible();
  });

  test('the dismiss button and the sound switch are at least 44 px high', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
    });
    await openMagic(page);
    await page.getByRole('button', { name: 'Hear the clue' }).click();
    const dismiss = page.getByRole('button', { name: 'Dismiss sound message' });
    await expect(dismiss).toBeVisible();
    expect((await dismiss.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.getByRole('button', { name: 'Settings' }).click();
    const sound = page.getByRole('switch');
    expect((await sound.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe('the next step is in reach on a short phone', () => {
  for (const [w, h] of [[390, 844], [320, 740]] as const) {
    test(`a finished word brings its Next button into view (${w} × ${h})`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      const word = await openMagic(page);
      for (const ch of word.text) await page.keyboard.press(ch);
      await expect(page.getByText(/You spelled/)).toBeVisible();
      await expect(page.getByRole('button', { name: /^(Next word|Finish)$/ })).toBeInViewport({ timeout: 3000 });
    });
  }

  test('a solved sentence brings its Next button into view (390 × 844)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/sentences');
    await page.locator('[data-tile], [data-option]').first().waitFor();
    await page.waitForTimeout(500);
    if ((await page.locator('[data-option]').count()) > 0) {
      const options = await page.locator('[data-option]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.option as string));
      const fill = englishSentences.find((x) => x.mode === 'fill' && options.includes(x.words[x.blankIndex ?? 0] as string))!;
      await page.locator(`[data-option="${fill.words[fill.blankIndex!]}"]`).click();
    } else {
      const tiles = await page.locator('[data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
      const s = englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === [...tiles].sort().join('|'))!;
      for (const w of s.words) await page.locator(`[data-tile][data-value="${w}"][data-placed="false"]`).first().click();
      await page.getByRole('button', { name: 'Check my sentence' }).click();
    }
    await expect(page.getByRole('button', { name: /^(Next sentence|Finish)$/ })).toBeInViewport({ timeout: 3000 });
  });
});

test.describe('the home screen fits a 320 px phone', () => {
  test.use({ viewport: { width: 320, height: 740 } });

  test('the letter row stays inside the welcome card and the screen', async ({ page }) => {
    await page.goto('/#/home');
    await page.locator('ul[aria-label="Tap a letter to hear it"]').waitFor();
    const box = await page.evaluate(() => {
      const row = document.querySelector('ul[aria-label="Tap a letter to hear it"]')!;
      const card = row.closest('section')!;
      const c = card.getBoundingClientRect();
      const letters = [...row.querySelectorAll('li')].map((li) => li.getBoundingClientRect());
      return {
        cardRight: c.right,
        lettersRight: Math.max(...letters.map((r) => r.right)),
        viewport: window.innerWidth,
        pageOverflow: document.documentElement.scrollWidth,
      };
    });
    expect(box.lettersRight, 'the last letter is inside the card').toBeLessThanOrEqual(box.cardRight);
    expect(box.pageOverflow, 'the page does not scroll sideways').toBeLessThanOrEqual(box.viewport);
  });
});
