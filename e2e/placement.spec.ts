import type { Locator, Page } from '@playwright/test';
import { englishSentences } from '../src/playlab/data/en/sentences';
import { englishWords } from '../src/playlab/data/en/words';
import { expect, installFakeSpeech, solveSentence, test, waitForNextItem } from './helpers';

// Correcting a placed item in the three activities that arrange items: Word Builder (letters), Sentence Fun (words) and Reading a
// Story (the letters of the story's words). Real mouse drags and real taps in Chromium. These are automated checks of the interaction
// only: they say nothing about a child's hand, a touch screen or a real microphone.

const center = (b: { x: number; y: number; width: number; height: number }) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/** a word that has just been placed glides into its spot: wait until its box stops moving, so a drag starts where it rests */
async function settle(loc: Locator) {
  let last = '';
  for (let i = 0; i < 25; i++) {
    const now = JSON.stringify(await loc.boundingBox());
    if (now === last) return;
    last = now;
    await new Promise((done) => setTimeout(done, 120));
  }
}

/** a real drag: press on `from`, move in steps, let go on `to` (an element, or a point on the page) */
async function drag(page: Page, from: Locator, to: Locator | { x: number; y: number }) {
  await settle(from);
  const a = center((await from.boundingBox())!);
  const b = 'x' in to ? to : center((await to.boundingBox())!);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(a.x + 12, a.y - 24, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 12 });
  await page.mouse.up();
}

/** Sentence Fun on an arrange question (solving any fill-in question on the way). Returns the arrange sentence. */
async function openArrangeSentence(page: Page) {
  // a viewport tall enough for the tray and the spots together: no scroll happens while a child (or this test) drags
  await page.setViewportSize({ width: 1280, height: 1100 });
  await installFakeSpeech(page);
  await page.goto('/#/sentences');
  const arrange = page.getByRole('heading', { level: 2, name: 'Put the words in order', exact: true });
  for (let i = 0; i < 6; i++) {
    await arrange.waitFor({ state: 'visible', timeout: 1500 }).catch(() => undefined);
    if (await arrange.isVisible()) break;
    await solveSentence(page);
    await waitForNextItem(page);
  }
  await expect(arrange).toBeVisible();
  const tiles = await page.locator('ul[aria-label="Available words"] [data-tile]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.value as string));
  const key = [...tiles].sort().join('|');
  return englishSentences.find((x) => x.mode === 'arrange' && [...x.words].sort().join('|') === key)!;
}

/** tap a tray word: it goes to the next free spot */
async function tapWord(page: Page, value: string) {
  await page.locator(`ul[aria-label="Available words"] [data-tile][data-value="${value}"][data-placed="false"]`).first().click();
}

test.describe('Sentence Fun: a placed word is moved or swapped by dragging it', () => {
  test('two words in the wrong order: dragging one onto the other swaps them, and the sentence is then celebrated', async ({ page }) => {
    const sentence = await openArrangeSentence(page);
    const words = sentence.words;
    // the first pair of different neighbouring words is put the wrong way round; the words before it are placed right, the rest follow
    const i = words.findIndex((w, k) => k < words.length - 1 && w !== words[k + 1]);
    test.skip(i < 0, 'no two different neighbouring words in this sentence');
    const order = [...words.slice(0, i), words[i + 1]!, words[i]!, ...words.slice(i + 2)];
    let placed = 0;
    for (const w of order) {
      await tapWord(page, w);
      placed += 1;
      await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(placed);
    }
    await page.waitForTimeout(700); // the last word glides into its spot (its layout animation), so the drag starts from where it rests
    await drag(page, page.locator(`[data-slot="${i}"] [data-tile]`), page.locator(`[data-slot="${i + 1}"]`));
    // the swap makes the order right: the sentence is judged at once, celebrated, and read as a whole (the board gives way to it)
    await expect(page.getByRole('img', { name: `${words.join(' ')}${sentence.punctuation}` })).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/You made a whole sentence/)).toBeVisible();
    await waitForNextItem(page);
  });

  test('dragging a wrong word out of the row sends it back to the tray, and its spot is empty again', async ({ page }) => {
    const words = (await openArrangeSentence(page)).words;
    test.skip(words[0] === words[1], 'the first two words are the same');
    // the second word in the first spot is wrong there, so it can be picked up
    await tapWord(page, words[1]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(1);
    await drag(page, page.locator('[data-slot="0"] [data-tile]'), { x: 8, y: 8 }); // out of the row, onto the top of the page
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(0);
    await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-state', 'empty');
    await expect(page.locator('ul[aria-label="Available words"] [data-tile]')).toHaveCount(words.length);
  });
});

test.describe('Word Builder: a placed letter is corrected by taps, without a restart', () => {
  test('two wrong letters are swapped by tapping one and then the other, and the spots that fit them are done at once', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/word-builder');
    await expect(page.getByRole('heading', { level: 1, name: 'Magic Letters' })).toBeVisible();
    await page.locator('[data-magic-slot="0"]').waitFor();
    await page.waitForTimeout(700);
    const clue = await page.locator('[data-magic-clue]').first().innerText();
    const word = englishWords.find((w) => w.clue === clue)!;
    const [a, b] = [word.text[0]!, word.text[1]!];
    test.skip(a === b, 'the first two letters are the same');
    const tray = (v: string) => page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();
    // the second letter goes to the first spot and the first letter to the second spot: both are wrong there
    await tray(b).click();
    await page.locator('[data-magic-slot="0"]').click();
    await tray(a).click();
    await page.locator('[data-magic-slot="1"]').click();
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'wrong');
    await expect(page.locator('[data-magic-slot="1"]')).toHaveAttribute('data-state', 'wrong');
    // tap the letter in the first spot, then tap the one in the second: they swap
    await page.locator('[data-magic-slot="0"] [data-magic-tile]').click();
    await page.locator('[data-magic-slot="1"] [data-magic-tile]').click();
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', `Slot 1: ${a.toUpperCase()}, done`, { timeout: 3000 });
    await expect(page.locator('[data-magic-slot="1"]')).toHaveAttribute('aria-label', `Slot 2: ${b.toUpperCase()}, done`, { timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Start this word again' })).toHaveCount(0); // never a forced restart
  });
});

test.describe('Word Builder: a placed letter is moved or swapped by a real drag', () => {
  test('two wrong letters: dragging one onto the other swaps them, and each spot that fits its letter is done', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/word-builder');
    await expect(page.getByRole('heading', { level: 1, name: 'Magic Letters' })).toBeVisible();
    await page.locator('[data-magic-slot="0"]').waitFor();
    await page.waitForTimeout(700);
    const clue = await page.locator('[data-magic-clue]').first().innerText();
    const word = englishWords.find((w) => w.clue === clue)!;
    const [a, b] = [word.text[0]!, word.text[1]!];
    test.skip(a === b, 'the first two letters are the same');
    const tray = (v: string) => page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();
    await tray(b).click();
    await page.locator('[data-magic-slot="0"]').click(); // the second letter in the first spot: wrong
    await tray(a).click();
    await page.locator('[data-magic-slot="1"]').click(); // the first letter in the second spot: wrong
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'wrong');
    await expect(page.locator('[data-magic-slot="1"]')).toHaveAttribute('data-state', 'wrong');
    await drag(page, page.locator('[data-magic-slot="0"] [data-magic-tile]'), page.locator('[data-magic-slot="1"]'));
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', `Slot 1: ${a.toUpperCase()}, done`, { timeout: 3000 });
    await expect(page.locator('[data-magic-slot="1"]')).toHaveAttribute('aria-label', `Slot 2: ${b.toUpperCase()}, done`, { timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Start this word again' })).toHaveCount(0);
  });
});

test.describe('Reading a Story: a wrong letter stays in its spot and can be moved by a tap', () => {
  test('the letter that does not fit stays put; a tap moves it to a spot that needs another letter', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/story');
    await expect(page.locator('[data-magic-slot="0"]')).toBeVisible();
    const target = (await page.locator('[data-story-word][data-state="target"]').first().getAttribute('data-story-word'))!;
    // a spot for the second letter that is not already right for it: a spot that needs a different letter
    const dest = [...target].findIndex((c, k) => k >= 2 && c !== target[1]);
    test.skip(target.length < 3 || target[0] === target[1] || dest < 0, 'no two different letters to try in this word');
    const tray = (v: string) => page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();
    await tray(target[1]!).click();
    await page.locator('[data-magic-slot="0"]').click(); // the second letter does not belong first: it stays here
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'wrong');
    await page.locator('[data-magic-slot="0"] [data-magic-tile]').click(); // picked up from its wrong spot...
    await page.locator(`[data-magic-slot="${dest}"]`).click(); // ...and put down on the empty spot that needs another letter
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', 'Slot 1, empty', { timeout: 3000 });
    await expect(page.locator(`[data-magic-slot="${dest}"]`)).toHaveAttribute('data-state', 'wrong', { timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Start this word again' })).toHaveCount(0);
  });
});

test.describe('Reading a Story: a wrong letter is moved by a real drag', () => {
  test('a wrong letter is dragged from its spot onto the empty spot that needs another letter', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/story');
    await expect(page.locator('[data-magic-slot="0"]')).toBeVisible();
    const target = (await page.locator('[data-story-word][data-state="target"]').first().getAttribute('data-story-word'))!;
    const dest = [...target].findIndex((c, k) => k >= 2 && c !== target[1]);
    test.skip(target.length < 3 || target[0] === target[1] || dest < 0, 'no two different letters to try in this word');
    const tray = (v: string) => page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();
    await tray(target[1]!).click();
    await page.locator('[data-magic-slot="0"]').click(); // wrong: it stays here
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'wrong');
    await drag(page, page.locator('[data-magic-slot="0"] [data-magic-tile]'), page.locator(`[data-magic-slot="${dest}"]`));
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', 'Slot 1, empty', { timeout: 3000 });
    await expect(page.locator(`[data-magic-slot="${dest}"]`)).toHaveAttribute('data-state', 'wrong', { timeout: 3000 });
  });
});

// ---- correct items move too: correctness is feedback, not a restriction ----

test.describe('Sentence Fun: a right word is moved, swapped and replaced by dragging it', () => {
  test('a right word dropped on another right word swaps with it, and no word is lost', async ({ page }) => {
    const words = (await openArrangeSentence(page)).words;
    test.skip(words[0] === words[1], 'the first two words are the same');
    await tapWord(page, words[0]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(1);
    await tapWord(page, words[1]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(2);
    await page.waitForTimeout(700); // both words glide into their spots first
    await drag(page, page.locator('[data-slot="0"] [data-tile]'), page.locator('[data-slot="1"]'));
    await expect(page.locator('[data-slot="0"] [data-tile]')).toHaveAttribute('data-value', words[1]!, { timeout: 3000 });
    await expect(page.locator('[data-slot="1"] [data-tile]')).toHaveAttribute('data-value', words[0]!, { timeout: 3000 });
    await expect(page.locator('[data-slot] [data-tile]')).toHaveCount(2); // both still on the board
    await expect(page.locator('ul[aria-label="Available words"] [data-tile]')).toHaveCount(words.length - 2);
  });

  test('a tray word dropped on a right word replaces it, and the right word goes back to the tray', async ({ page }) => {
    const words = (await openArrangeSentence(page)).words;
    test.skip(words[0] === words[1], 'the first two words are the same');
    await tapWord(page, words[0]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(1);
    await page.waitForTimeout(700);
    await drag(page, page.locator(`ul[aria-label="Available words"] [data-tile][data-value="${words[1]}"][data-placed="false"]`).first(), page.locator('[data-slot="0"]'));
    await expect(page.locator('[data-slot="0"] [data-tile]')).toHaveAttribute('data-value', words[1]!, { timeout: 3000 });
    await expect(page.locator('[data-slot] [data-tile]')).toHaveCount(1);
    await expect(page.locator(`ul[aria-label="Available words"] [data-tile][data-value="${words[0]}"][data-placed="false"]`)).toHaveCount(1); // back in the tray
    await expect(page.locator('ul[aria-label="Available words"] [data-tile]')).toHaveCount(words.length - 1);
  });

  test('a right word dragged into an empty spot moves there, and its old spot is empty again', async ({ page }) => {
    const words = (await openArrangeSentence(page)).words;
    test.skip(words.length < 3, 'the sentence is too short');
    await tapWord(page, words[0]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(1);
    await page.waitForTimeout(700);
    await drag(page, page.locator('[data-slot="0"] [data-tile]'), page.locator('[data-slot="2"]'));
    await expect(page.locator('[data-slot="0"]')).toHaveAttribute('data-state', 'empty', { timeout: 3000 });
    await expect(page.locator('[data-slot="2"] [data-tile]')).toHaveAttribute('data-value', words[0]!, { timeout: 3000 });
    await expect(page.locator('[data-slot] [data-tile]')).toHaveCount(1);
  });

  test('by taps: a right word is picked up and swapped with another right word', async ({ page }) => {
    const words = (await openArrangeSentence(page)).words;
    test.skip(words[0] === words[1], 'the first two words are the same');
    await tapWord(page, words[0]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(1);
    await tapWord(page, words[1]!);
    await expect.poll(() => page.locator('[data-slot] [data-tile]').count(), { timeout: 3000 }).toBe(2);
    await page.waitForTimeout(700);
    await page.locator('[data-slot="0"] [data-tile]').click(); // the right word in spot 1 is picked up...
    await page.locator('[data-slot="1"] [data-tile]').click(); // ...and tapping the other word swaps them
    await expect(page.locator('[data-slot="0"] [data-tile]')).toHaveAttribute('data-value', words[1]!, { timeout: 3000 });
    await expect(page.locator('[data-slot="1"] [data-tile]')).toHaveAttribute('data-value', words[0]!, { timeout: 3000 });
    await expect(page.locator('[data-slot] [data-tile]')).toHaveCount(2);
  });
});

/** Word Builder on the round's first word: returns the word (its letters are read from the clue) */
async function openWordBuilder(page: Page) {
  await installFakeSpeech(page);
  await page.goto('/#/word-builder');
  await expect(page.getByRole('heading', { level: 1, name: 'Magic Letters' })).toBeVisible();
  await page.locator('[data-magic-slot="0"]').waitFor();
  await page.waitForTimeout(700);
  const clue = await page.locator('[data-magic-clue]').first().innerText();
  return englishWords.find((w) => w.clue === clue)!.text;
}
const letterInTray = (page: Page, v: string) => page.locator(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${v}"][data-decoy="false"]`).first();
const letterInSpot = (page: Page, i: number) => page.locator(`[data-magic-slot="${i}"] [data-magic-tile]`);

test.describe('Word Builder: a correct letter moves and swaps like any other letter', () => {
  test('a correct letter is dragged onto an empty spot: it moves there, and its spot is empty again', async ({ page }) => {
    const word = await openWordBuilder(page);
    const last = word.length - 1;
    test.skip(last < 2, 'the word is too short');
    await letterInTray(page, word[0]!).click();
    await page.locator('[data-magic-slot="0"]').click(); // right: spot 1 is done
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', `Slot 1: ${word[0]!.toUpperCase()}, done`, { timeout: 3000 });
    await drag(page, letterInSpot(page, 0), page.locator(`[data-magic-slot="${last}"]`));
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', 'Slot 1, empty', { timeout: 3000 });
    await expect(letterInSpot(page, last)).toHaveAttribute('data-value', word[0]!, { timeout: 3000 });
  });

  test('two correct letters are swapped by dragging one onto the other, and no letter is lost', async ({ page }) => {
    const word = await openWordBuilder(page);
    const [a, b] = [word[0]!, word[1]!];
    test.skip(a === b, 'the first two letters are the same');
    await letterInTray(page, a).click();
    await page.locator('[data-magic-slot="0"]').click();
    await letterInTray(page, b).click();
    await page.locator('[data-magic-slot="1"]').click();
    await expect(page.locator('[data-magic-slot="1"]')).toHaveAttribute('aria-label', `Slot 2: ${b.toUpperCase()}, done`, { timeout: 3000 });
    await drag(page, letterInSpot(page, 0), page.locator('[data-magic-slot="1"]'));
    await expect(letterInSpot(page, 0)).toHaveAttribute('data-value', b, { timeout: 3000 });
    await expect(letterInSpot(page, 1)).toHaveAttribute('data-value', a, { timeout: 3000 });
    // each letter now sits in the other's spot: both are wrong there, and both are still on the board
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('data-state', 'wrong');
    await expect(page.locator('[data-magic-slot="1"]')).toHaveAttribute('data-state', 'wrong');
  });

  test('a correct letter is swapped with an incorrect letter in another spot', async ({ page }) => {
    const word = await openWordBuilder(page);
    test.skip(word.length < 3, 'the word is too short');
    const a = word[0]!;
    // a tray letter that does not belong in the third spot
    const wrongForThird = await page.locator('ul[aria-label="Loose letters"] [data-magic-tile][data-decoy="false"]').evaluateAll(
      (els, third) => (els as HTMLElement[]).map((e) => e.dataset.value as string).find((v) => v !== third),
      word[2]!,
    );
    test.skip(!wrongForThird || wrongForThird === a, 'no other letter to try');
    await letterInTray(page, a).click();
    await page.locator('[data-magic-slot="0"]').click(); // right
    await letterInTray(page, wrongForThird!).click();
    await page.locator('[data-magic-slot="2"]').click(); // wrong: it stays in the third spot
    await expect(page.locator('[data-magic-slot="2"]')).toHaveAttribute('data-state', 'wrong');
    await drag(page, letterInSpot(page, 0), page.locator('[data-magic-slot="2"]'));
    await expect(letterInSpot(page, 2)).toHaveAttribute('data-value', a, { timeout: 3000 });
    await expect(letterInSpot(page, 0)).toHaveAttribute('data-value', wrongForThird!, { timeout: 3000 });
  });

  test('a tray letter dropped on a correct letter replaces it, and the correct letter goes back to the tray', async ({ page }) => {
    const word = await openWordBuilder(page);
    const a = word[0]!;
    await letterInTray(page, a).click();
    await page.locator('[data-magic-slot="0"]').click(); // right
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', `Slot 1: ${a.toUpperCase()}, done`, { timeout: 3000 });
    const other = await page.locator('ul[aria-label="Loose letters"] [data-magic-tile][data-decoy="false"]').evaluateAll(
      (els, first) => (els as HTMLElement[]).map((e) => e.dataset.value as string).find((v) => v !== first),
      a,
    );
    test.skip(!other, 'no other letter in the tray');
    await page.waitForTimeout(700);
    await drag(page, letterInTray(page, other!), page.locator('[data-magic-slot="0"]'));
    await expect(letterInSpot(page, 0)).toHaveAttribute('data-value', other!, { timeout: 3000 });
    await expect(letterInTray(page, a)).toHaveCount(1, { timeout: 3000 }); // the correct letter is back in the tray, not lost
  });

  test('a correct letter picked up by a tap and moved to an empty spot by a tap', async ({ page }) => {
    const word = await openWordBuilder(page);
    const last = word.length - 1;
    test.skip(last < 2, 'the word is too short');
    await letterInTray(page, word[0]!).click();
    await page.locator('[data-magic-slot="0"]').click();
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', `Slot 1: ${word[0]!.toUpperCase()}, done`, { timeout: 3000 });
    await letterInSpot(page, 0).click(); // picked up, though it is right
    await page.locator(`[data-magic-slot="${last}"]`).click();
    await expect(letterInSpot(page, last)).toHaveAttribute('data-value', word[0]!, { timeout: 3000 });
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', 'Slot 1, empty', { timeout: 3000 });
  });

  test('once the word is spelled it is accepted: its letters can no longer be moved', async ({ page }) => {
    const word = await openWordBuilder(page);
    for (const ch of word) await page.keyboard.press(ch);
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 5000 });
    await expect(letterInSpot(page, 0)).toBeDisabled({ timeout: 1000 });
  });
});

test.describe('Reading a Story: a correct letter moves, and the word is still completed', () => {
  test('a correct letter is dragged to another spot, the sentence stays, and the word is still spelled by typing', async ({ page }) => {
    await installFakeSpeech(page);
    await page.goto('/#/story');
    await expect(page.locator('[data-magic-slot="0"]')).toBeVisible();
    const target = (await page.locator('[data-story-word][data-state="target"]').first().getAttribute('data-story-word'))!;
    test.skip(target.length < 3 || new Set(target).size < 2, 'the word has no two different letters to move between');
    const first = target[0]!;
    const dest = target.length - 1;
    await letterInTray(page, first).click();
    await page.locator('[data-magic-slot="0"]').click(); // right
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', `Slot 1: ${first.toUpperCase()}, done`, { timeout: 3000 });
    await drag(page, letterInSpot(page, 0), page.locator(`[data-magic-slot="${dest}"]`));
    await expect(page.locator('[data-magic-slot="0"]')).toHaveAttribute('aria-label', 'Slot 1, empty', { timeout: 3000 });
    await expect(letterInSpot(page, dest)).toHaveAttribute('data-value', first, { timeout: 3000 });
    await expect(page.locator('[data-story-sentence]')).toBeVisible(); // the sentence (the narration's text) is still there
    for (const ch of target) await page.keyboard.press(ch); // typing still puts each letter in the spot that needs it
    await expect(page.getByText(/You spelled/)).toBeVisible({ timeout: 6000 });
  });
});
