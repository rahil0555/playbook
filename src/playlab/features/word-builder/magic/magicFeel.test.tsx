import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PhonicClip } from '../../../audio/phonics';
import { PHONEMES } from '../../../data/en/phonemes';
import { audioLog, sfxLog, timeline } from '../../../test/fakeAudio';
import { renderPlayLab } from '../../../test/utils';

// Every sound has a stand-in recording, so each one takes FAKE_CLIP_MS to play and its timing can be checked. A test that
// needs a sound WITHOUT a recording deletes its entry. (No real recordings are in the repository yet: see audio/phonics/README.md.)
const phonics = vi.hoisted(() => ({ PHONIC_CLIPS: {} as Record<string, PhonicClip> }));
vi.mock('../../../audio/phonics', () => phonics);

// The round is fixed, so the checks are about concrete letters: PIG first, or FISH for the silent-letter checks.
const PIG_ROUND = ['pig', 'cat', 'sun', 'fish', 'book'];
const FISH_ROUND = ['fish', 'pig', 'cat', 'sun', 'book'];
const round = vi.hoisted(() => ({ order: [] as string[] }));
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => round.order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

beforeEach(() => {
  round.order = PIG_ROUND;
  for (const id of Object.keys(PHONEMES)) phonics.PHONIC_CLIPS[id] = { url: `./assets/${id}.ogg`, source: 'test stand-in', license: 'test only' };
});

type User = ReturnType<typeof renderPlayLab>['user'];

const tilesOf = (value: string) => [...document.querySelectorAll<HTMLElement>(`ul[aria-label="Loose letters"] [data-magic-tile][data-value="${value}"]`)];
const realTile = (value: string) => tilesOf(value).find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** the lines the child hears (the cheer, the retry messages); a letter sound is never spoken as a line */
const spoken = () => audioLog.filter((r) => !r.clipOnly).map((r) => r.text);
/** the sounds asked for, by sound id, in order */
const sounds = () => audioLog.filter((r) => r.clipOnly).map((r) => r.text);
const soundEnd = (id: string) => timeline.find((e) => e.kind === 'clipEnd' && e.what === id);
const cheerAt = () => timeline.find((e) => e.kind === 'say' && e.what.startsWith('Hooray'));

async function openRound() {
  const r = renderPlayLab({ initialActivity: 'word-builder' });
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
  await screen.findAllByLabelText(/^Slot \d, empty/);
  return r;
}

/** a child's pace: pick the letter, put it in its spot, then wait so the sound before it can finish */
async function letter(user: User, value: string, i: number) {
  await user.click(realTile(value));
  await user.click(slot(i));
  await pause(700);
}

describe('Magic Letters feel: tapping a tile', () => {
  it('pops at once, then asks for the sound this letter makes in PIG, after the pop; its name is never spoken', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    expect(sfxLog).toContain('boing'); // the pop is immediate
    await vi.waitFor(() => expect(sounds()).toContain('p'), { timeout: 1000 });
    const pop = timeline.find((e) => e.kind === 'sfx' && e.what === 'boing')!;
    const sound = timeline.find((e) => e.kind === 'clip' && e.what === 'p')!;
    expect(sound.t - pop.t, 'the sound waits a moment after the pop').toBeGreaterThanOrEqual(100);
    expect(spoken(), 'no letter is spoken, neither its name nor a stand-in').toEqual([]);
  });

  it('a rapid burst of taps on the same letter asks for its sound once and pops at most twice', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    await user.click(realTile('p')); // put down
    await user.click(realTile('p')); // pick up again straight away
    await user.click(realTile('p'));
    await pause(600);
    expect(sounds().filter((s) => s === 'p')).toHaveLength(1);
    expect(sfxLog.filter((n) => n === 'boing').length).toBeLessThanOrEqual(2);
  });

  it('tapping the picture wiggles it with a pop, never speaks the word, and asks for no letter sound', async () => {
    const { user } = await openRound();
    await user.click(screen.getByRole('button', { name: /Picture clue/ }));
    expect(sfxLog).toContain('boing');
    await pause(400);
    expect(spoken().some((t) => /\bpig\b/i.test(t))).toBe(false);
    expect(sounds()).toEqual([]);
    expect(document.body.textContent?.toLowerCase()).not.toContain('pig.'); // the word is not written out either
  });

  it('picking the i of PIG asks for the short i it makes here ("in"), not the long i of "eye"', async () => {
    const { user } = await openRound();
    await user.click(realTile('i'));
    await vi.waitFor(() => expect(sounds()).toContain('i-short'), { timeout: 1000 });
    expect(sounds()).not.toContain('i-long');
  });

  it('picking a letter and then placing it asks for its sound once, not twice', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    await user.click(slot(0));
    await pause(900);
    expect(sounds().filter((s) => s === 'p')).toHaveLength(1);
  });

  it('picking another letter cancels the sound of the letter before it, before that sound has started', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    await user.click(realTile('i'));
    await pause(500);
    expect(sounds()).toContain('i-short');
    expect(sounds(), 'the p sound was cancelled before it was asked for').not.toContain('p');
  });

  it('picking another letter while a sound is playing cuts that sound short', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    await pause(350); // p starts 170 ms after the pick and lasts 400 ms, so it is playing now
    await user.click(realTile('i'));
    await pause(500);
    expect(timeline.some((e) => e.kind === 'clip' && e.what === 'p'), 'p did start').toBe(true);
    expect(soundEnd('p'), 'p was stopped, not finished').toBeUndefined();
    expect(sounds()).toContain('i-short');
  });

  it('a rapid burst of letters never has two sounds playing at once', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    await user.click(slot(0));
    await user.click(realTile('i'));
    await user.click(slot(1));
    await pause(800);
    const starts = timeline.filter((e) => e.kind === 'clip');
    for (const start of starts) {
      const ended = timeline.find((e) => e.kind === 'clipEnd' && e.what === start.what && e.t > start.t);
      const overlapping = starts.filter((s) => s !== start && s.t > start.t && s.t < (ended?.t ?? Infinity));
      expect(overlapping, `while ${start.what} plays, no other sound starts`).toHaveLength(0);
    }
  });
});

describe('Magic Letters feel: typing and finishing the word', () => {
  it('a letter placed by typing asks for its sound after its landing chime, and only once', async () => {
    const { user } = await openRound();
    await user.keyboard('p');
    await vi.waitFor(() => expect(sounds()).toContain('p'), { timeout: 1500 });
    const chime = timeline.findIndex((e) => e.kind === 'sfx' && e.what === 'chime');
    const said = timeline.findIndex((e) => e.kind === 'clip' && e.what === 'p');
    expect(chime, 'the chime comes first, on the landing').toBeGreaterThanOrEqual(0);
    expect(said, 'the sound follows the chime').toBeGreaterThan(chime);
    expect(sounds().filter((s) => s === 'p')).toHaveLength(1);
  });

  it('a finished word plays the fanfare on the landing, and the cheer follows the fanfare\'s first note', async () => {
    const { user } = await openRound();
    await letter(user, 'p', 0);
    await letter(user, 'i', 1);
    await user.click(realTile('g'));
    const drop = performance.now();
    await user.click(slot(2));
    // the last letter sparkles at the drop; the fanfare waits for Pip to land on the word (after its ~480 ms hop)
    expect(sfxLog).toContain('sparkle');
    expect(sfxLog).not.toContain('celebrate');
    await vi.waitFor(() => expect(cheerAt()).toBeDefined(), { timeout: 3000 });
    const fanfare = timeline.find((e) => e.kind === 'sfx' && e.what === 'celebrate')!;
    expect(cheerAt()!.what).toBe('Hooray! You spelled pig!');
    expect(fanfare.t - drop, 'the fanfare waits for the landing').toBeGreaterThanOrEqual(400);
    expect(cheerAt()!.t - fanfare.t, 'the cheer starts after the first note of the fanfare').toBeGreaterThanOrEqual(100);
  }, 10_000);

  it('the last letter\'s sound finishes before the cheer starts, and the cheer does not start on top of it', async () => {
    const { user } = await openRound();
    await letter(user, 'p', 0);
    await letter(user, 'i', 1);
    await user.click(realTile('g'));
    await user.click(slot(2)); // placed straight away: the g sound is still on its way
    await vi.waitFor(() => expect(cheerAt()).toBeDefined(), { timeout: 3000 });
    const last = soundEnd('g');
    expect(last, 'the g of PIG is said, and finishes').toBeDefined();
    expect(cheerAt()!.t, 'the cheer comes after the last sound has finished').toBeGreaterThanOrEqual(last!.t);
  }, 10_000);

  it('restarting a word starts no sound or line from the first attempt, and finishing it gives exactly one cheer', async () => {
    const { user } = await openRound();
    await user.click(realTile('g'));
    await user.click(slot(0)); // G does not go on the empty P spot: the retry message appears
    await user.click(await screen.findByRole('button', { name: 'Shuffle letters' }));
    const stops = timeline.filter((e) => e.kind === 'stop');
    const restart = stops[stops.length - 1]!; // the restart stops whatever the first attempt still had going
    await pause(400);
    expect(timeline.filter((e) => e.t > restart.t && (e.kind === 'clip' || e.kind === 'say')), 'nothing from the first attempt starts after the restart').toEqual([]);
    expect(cheerAt(), 'no cheer from the first attempt').toBeUndefined();
    // now finish the word from the beginning
    await letter(user, 'p', 0);
    await letter(user, 'i', 1);
    await user.click(realTile('g'));
    await user.click(slot(2));
    await vi.waitFor(() => expect(cheerAt()).toBeDefined(), { timeout: 3000 });
    await pause(400); // long enough for any duplicate cheer to be queued and said
    expect(timeline.filter((e) => e.kind === 'say' && e.what.startsWith('Hooray')), 'one cheer for the one completion').toHaveLength(1);
  }, 10_000);
});

describe('Magic Letters feel: a silent letter', () => {
  beforeEach(() => {
    round.order = FISH_ROUND; // FISH: f, i (short), s (sh), h (silent)
  });

  it('picking the silent h of FISH asks for no sound, and cancels the sh still on its way', async () => {
    const { user } = await openRound();
    await user.click(realTile('s'));
    await user.click(realTile('h'));
    await pause(500);
    expect(sounds(), 'sh was cancelled, and nothing is asked for the h').toEqual([]);
  });

  it('typing all of FISH: the s says "sh", the silent h says nothing, and the cheer still comes after the sh', async () => {
    const { user } = await openRound();
    for (const ch of 'fish') {
      await user.keyboard(ch);
      await pause(700);
    }
    await vi.waitFor(() => expect(cheerAt()).toBeDefined(), { timeout: 3000 });
    expect(sounds()).toEqual(['f', 'i-short', 'sh']);
    expect(spoken()).toEqual(['Hooray! You spelled fish!']);
    expect(cheerAt()!.t, 'the cheer comes after the sh has finished').toBeGreaterThanOrEqual(soundEnd('sh')!.t);
  }, 10_000);
});

describe('Magic Letters feel: a sound with no recording yet', () => {
  it('its sound is asked for, but nothing is played or said in its place, and the word still gets its cheer', async () => {
    delete phonics.PHONIC_CLIPS.g;
    const { user } = await openRound();
    await letter(user, 'p', 0);
    await letter(user, 'i', 1);
    await user.click(realTile('g'));
    await user.click(slot(2));
    await vi.waitFor(() => expect(cheerAt()).toBeDefined(), { timeout: 3000 });
    expect(sounds()).toContain('g');
    expect(soundEnd('g'), 'no recording was played for g').toBeUndefined();
    expect(spoken(), 'the only line is the cheer').toEqual(['Hooray! You spelled pig!']);
  }, 10_000);
});

describe('Magic Letters feel: sound off', () => {
  it('no pops, letter sounds or cheer are heard, and the word can still be finished', async () => {
    window.localStorage.setItem('edurance.playlab.settings.v1', JSON.stringify({ sound: false, level: 'adventurer', voice: null }));
    const { user } = await openRound();
    await letter(user, 'p', 0);
    await letter(user, 'i', 1);
    await user.click(realTile('g'));
    await user.click(slot(2));
    expect(await screen.findByText(/You spelled/, {}, { timeout: 3000 })).toBeTruthy();
    expect(timeline.filter((e) => e.kind === 'clipEnd' || e.kind === 'say'), 'nothing audible').toEqual([]);
  }, 10_000);
});

describe('Magic Letters feel: the storybook reward', () => {
  it('a finished word turns over its storybook page after Pip lands, with the sentence, and the page clears itself', async () => {
    const { user } = await openRound();
    await letter(user, 'p', 0);
    await letter(user, 'i', 1);
    await user.click(realTile('g'));
    await user.click(slot(2));
    await vi.waitFor(() => expect(screen.getByTestId('storybook')).toBeTruthy(), { timeout: 4000 });
    expect(screen.getByTestId('storybook').textContent).toContain('A pink farm animal that says oink.');
    await vi.waitFor(() => expect(screen.queryByTestId('storybook')).toBeNull(), { timeout: 8000 });
  }, 20_000);
});

