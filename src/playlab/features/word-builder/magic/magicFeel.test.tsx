import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { audioLog, sfxLog } from '../../../test/fakeAudio';
import { renderPlayLab } from '../../../test/utils';

// A fixed round that starts with PIG, so the sound checks are about concrete letters (P: name "pee", sound "puh").
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  const order = ['pig', 'cat', 'sun', 'fish', 'book'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

const tilesOf = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)];
const realTile = (value: string) => tilesOf(value).find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;
const spokenTexts = () => audioLog.map((r) => r.text);

async function openPig() {
  const r = renderPlayLab({ initialActivity: 'word-builder' });
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
  await screen.findAllByLabelText(/^Slot \d, empty/);
  return r;
}

describe('Magic Letters feel: tapping a tile', () => {
  it('pops at once and then speaks the letter SOUND ("puh"), never its name ("pee")', async () => {
    const { user } = await openPig();
    await user.click(realTile('p'));
    expect(sfxLog).toContain('boing'); // the pop is immediate
    await vi.waitFor(() => expect(spokenTexts()).toContain('puh'), { timeout: 1000 });
    expect(spokenTexts()).not.toContain('pee');
    const sound = audioLog.find((r) => r.text === 'puh');
    expect(sound?.rate).toBeLessThan(1); // isolated sounds are spoken a little slower
  });

  it('a rapid burst of taps on the same letter speaks its sound once and pops at most once in that moment', async () => {
    const { user } = await openPig();
    await user.click(realTile('p'));
    await user.click(realTile('p')); // put down
    await user.click(realTile('p')); // pick up again straight away
    await user.click(realTile('p'));
    await new Promise((r) => setTimeout(r, 600));
    expect(spokenTexts().filter((t) => t === 'puh')).toHaveLength(1);
    expect(sfxLog.filter((n) => n === 'boing').length).toBeLessThanOrEqual(2);
  });

  it('tapping the picture wiggles it with a pop and never speaks the word', async () => {
    const { user } = await openPig();
    const picture = screen.getByRole('button', { name: /Picture clue/ });
    await user.click(picture);
    expect(sfxLog).toContain('boing');
    await new Promise((r) => setTimeout(r, 400));
    expect(spokenTexts().some((t) => /\bpig\b/i.test(t))).toBe(false);
    expect(document.body.textContent?.toLowerCase()).not.toContain('pig.'); // the word is not written out either
  });

  it('a finished word plays the celebration and speaks "Hooray!" after it, not on top of it', async () => {
    const { user } = await openPig();
    await user.click(realTile('p'));
    await user.click(slot(0));
    await user.click(realTile('i'));
    await user.click(slot(1));
    await user.click(realTile('g'));
    await user.click(slot(2));
    // the last letter sparkles at the drop; the fanfare waits for Pip to land on the word
    expect(sfxLog).toContain('sparkle');
    expect(sfxLog).not.toContain('celebrate');
    await vi.waitFor(() => expect(sfxLog).toContain('celebrate'), { timeout: 2000 });
    await vi.waitFor(() => expect(spokenTexts().some((t) => t.startsWith('Hooray! You spelled pig'))).toBe(true), { timeout: 2000 });
  });
});
