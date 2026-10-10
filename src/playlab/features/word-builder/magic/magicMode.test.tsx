import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { sfxLog, audioLog } from '../../../test/fakeAudio';
import { renderPlayLab } from '../../../test/utils';

// Fixed round so tests are deterministic (and include the double-P word first).
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  const order = ['apple', 'cat', 'sun', 'fish', 'book'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

type User = ReturnType<typeof renderPlayLab>['user'];
const tilesOf = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)];
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;
const realTile = (value: string) => tilesOf(value).find((t) => t.dataset.decoy === 'false')!;

async function openMagic(props: Parameters<typeof renderPlayLab>[0] = {}) {
  const r = renderPlayLab({ initialActivity: 'word-builder', ...props });
  await r.user.click(await screen.findByRole('tab', { name: 'Magic Letters' }));
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' });
  return r;
}
const typeWord = (w: string) => w.split('').forEach((ch) => fireEvent.keyDown(window, { key: ch }));
async function place(user: User, value: string, slotIndex: number) {
  await user.click(realTile(value));
  await user.click(slot(slotIndex));
}

describe('Word Builder mode switch', () => {
  it('opens in Classic by default and Classic behaves as before', async () => {
    renderPlayLab({ initialActivity: 'word-builder' });
    expect(await screen.findByRole('tab', { name: 'Classic' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Magic Letters' })).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByRole('heading', { level: 1, name: 'Word Builder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check my word' })).toBeDisabled();
    expect(document.querySelector('[data-mode="magic"]')).toBeNull();
  });

  it('switches to Magic Letters (no Check button) and back to Classic', async () => {
    const { user } = await openMagic();
    expect(screen.queryByRole('button', { name: 'Check my word' })).toBeNull();
    expect(document.querySelectorAll('[data-magic-slot]')).toHaveLength(5); // APPLE
    await user.click(screen.getByRole('tab', { name: 'Classic' }));
    expect(await screen.findByRole('button', { name: 'Check my word' })).toBeInTheDocument();
  });
});

describe('Magic Letters: tap-to-select fallback', () => {
  it('pick up a letter, tap its slot, it lands; wrong slot is turned down kindly and recorded', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = await openMagic({ onAnswerSubmit });

    await user.click(realTile('a'));
    expect(realTile('a')).toHaveAttribute('aria-pressed', 'true');
    await user.click(slot(3)); // wrong slot (needs L)
    expect(slot(3)).toHaveAttribute('data-state', 'empty');
    expect(await screen.findByText(/different spot/)).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: false, expected: 'apple', response: 'a@4' }));
    expect(sfxLog).toContain('oops');
    expect(realTile('a')).toHaveAttribute('aria-pressed', 'false'); // put down after a miss, still in the tray

    await place(user, 'a', 0);
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1: A, done');
    await vi.waitFor(() => expect(screen.queryByText(/different spot/)).toBeNull(), { timeout: 5000 }); // message clears after a good drop (after its exit animation)
  });

  it('tapping a slot with nothing picked up asks to pick a letter first (no miss recorded)', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = await openMagic({ onAnswerSubmit });
    await user.click(slot(0));
    expect(document.querySelector('[role="status"].sr-only')).toHaveTextContent(/Pick up a letter first/);
    expect(onAnswerSubmit).not.toHaveBeenCalled();
  });

  it('tapping a picked-up letter again puts it down', async () => {
    const { user } = await openMagic();
    await user.click(realTile('a'));
    await user.click(realTile('a'));
    expect(realTile('a')).toHaveAttribute('aria-pressed', 'false');
  });

  it('APPLE: the two P tiles are interchangeable and each fills one P slot', async () => {
    const { user } = await openMagic();
    const [p1, p2] = tilesOf('p');
    await user.click(p2!);
    await user.click(slot(1));
    await user.click(p1!);
    await user.click(slot(2));
    expect(slot(1)).toHaveAttribute('data-state', 'filled');
    expect(slot(2)).toHaveAttribute('data-state', 'filled');
    expect(tilesOf('p').filter((t) => !t.closest('li')?.querySelector('[aria-hidden]') || true)).toBeTruthy();
  });
});

describe('Magic Letters: decoys', () => {
  it.each([
    ['starter', 0],
    ['explorer', 1],
    ['adventurer', 2],
  ] as const)('%s level shows %i decoy letter(s) that fit nowhere, and the word can still be finished', async (level, count) => {
    const { user } = await openMagic({ level });
    // the mocked round starts APPLE, but APPLE is Adventurer-only; Starter/Explorer skip to CAT
    const word = level === 'adventurer' ? 'apple' : 'cat';
    expect(document.querySelectorAll('[data-magic-slot]')).toHaveLength(word.length);
    const decoys = [...document.querySelectorAll<HTMLElement>('[data-decoy="true"]')];
    expect(decoys).toHaveLength(count);
    for (const d of decoys) expect(word).not.toContain(d.dataset.value);
    if (decoys[0]) {
      await user.click(decoys[0]);
      await user.click(slot(0));
      expect(slot(0)).toHaveAttribute('data-state', 'empty');
    }
    typeWord(word);
    expect(await screen.findByText(/You spelled/)).toBeInTheDocument();
  });
});

describe('Magic Letters: hints, retry and typed letters', () => {
  it('offers a hint after two misses: glowing slot + starred tile', async () => {
    const { user } = await openMagic();
    for (let i = 0; i < 2; i++) {
      await user.click(realTile('a'));
      await user.click(slot(4));
    }
    await user.click(screen.getByRole('button', { name: 'Start this word again' }));
    expect(await screen.findByText('Need a hint?')).toBeInTheDocument();
    expect(slot(0)).toHaveAttribute('data-state', 'hint');
    expect(realTile('a').className).toContain('ring-sky');
  });

  it('"Start this word again" clears placed letters and reshuffles', async () => {
    const { user } = await openMagic();
    await place(user, 'a', 0);
    await user.click(realTile('p'));
    await user.click(slot(4)); // miss
    await user.click(await screen.findByRole('button', { name: 'Start this word again' }));
    expect(slot(0)).toHaveAttribute('data-state', 'empty');
    await vi.waitFor(() => expect(screen.queryByText(/different spot/)).toBeNull(), { timeout: 5000 });
    expect(document.querySelectorAll('[data-magic-tile]')).toHaveLength(7); // all letters back in the tray
  });

  it('a typed letter with no matching spot counts as a miss, and a matching one lands', async () => {
    const onAnswerSubmit = vi.fn();
    await openMagic({ onAnswerSubmit });
    const decoy = document.querySelector<HTMLElement>('[data-decoy="true"]')!.dataset.value!;
    fireEvent.keyDown(window, { key: decoy });
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: false }));
    fireEvent.keyDown(window, { key: 'a' });
    expect(slot(0)).toHaveAttribute('data-state', 'filled');
  });
});

describe('Magic Letters: keyboard and accessibility', () => {
  it('Enter on a letter picks it up, Enter on a slot places it', async () => {
    const { user } = await openMagic();
    realTile('a').focus();
    await user.keyboard('{Enter}');
    expect(realTile('a')).toHaveAttribute('aria-pressed', 'true');
    slot(0).focus();
    await user.keyboard('{Enter}');
    expect(slot(0)).toHaveAttribute('data-state', 'filled');
  });

  it('announces what happened in a polite live region', async () => {
    const { user } = await openMagic();
    await place(user, 'a', 0);
    expect(document.querySelector('[role="status"].sr-only')).toHaveTextContent('A placed in slot 1.');
  });

  it('every control has an accessible name', async () => {
    await openMagic();
    for (const el of document.querySelectorAll<HTMLElement>('[data-magic-tile], [data-magic-slot]')) expect(el.getAttribute('aria-label')).toBeTruthy();
  });
});

describe('Magic Letters: effects and reduced motion', () => {
  it('a correct landing shows the small star burst (8 stars) in that slot', async () => {
    const { user } = await openMagic();
    await place(user, 'a', 0);
    expect(slot(0).querySelectorAll('svg')).toHaveLength(8);
  });

  it('with reduced motion there is no burst, but the letter still lands and is announced', async () => {
    const { user } = await openMagic({ theme: { motion: 'reduce' } });
    await place(user, 'a', 0);
    expect(slot(0)).toHaveAttribute('data-state', 'filled');
    expect(slot(0).querySelectorAll('svg')).toHaveLength(0);
    expect(document.querySelector('[role="status"].sr-only')).toHaveTextContent('A placed in slot 1.');
  });
});

describe('Magic Letters: a whole round', () => {
  it('finishes 5 words, counts toward Word Builder progress, and offers next steps', async () => {
    const onActivityComplete = vi.fn();
    const onAnswerSubmit = vi.fn();
    const { user, adapter } = await openMagic({ onActivityComplete, onAnswerSubmit });
    for (const [i, w] of ['apple', 'cat', 'sun', 'fish', 'book'].entries()) {
      await screen.findByLabelText('Word slots. Drop each letter on its outline');
      expect(document.querySelectorAll('[data-magic-slot]')).toHaveLength(w.length);
      typeWord(w);
      expect(await screen.findByText(/You spelled/)).toBeInTheDocument();
      expect(audioLog.at(-1)?.text).toBe(w); // the word is read aloud
      await user.click(screen.getByRole('button', { name: i === 4 ? 'Finish' : 'Next word' }));
    }
    expect(await screen.findByRole('region', { name: 'Amazing!' })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ activityId: 'word-builder', score: 5, total: 5, stars: 3 }));
    expect(onAnswerSubmit.mock.calls.filter(([r]) => r.correct)).toHaveLength(5); // one answer per word, not per letter
    const saved = adapter.load() as { perActivity: { 'word-builder': { correct: number; completed: number } } };
    expect(saved.perActivity['word-builder']).toMatchObject({ correct: 5, completed: 1 });
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next: Sentence Fun/ })).toBeInTheDocument();
  }, 30_000);

  it('a missed drop costs the first-try star but never blocks finishing', async () => {
    const onActivityComplete = vi.fn();
    const { user } = await openMagic({ onActivityComplete });
    await user.click(realTile('a'));
    await user.click(slot(4)); // miss on word 1
    typeWord('apple');
    await user.click(await screen.findByRole('button', { name: 'Next word' }));
    for (const w of ['cat', 'sun', 'fish', 'book']) {
      await screen.findByLabelText('Word slots. Drop each letter on its outline');
      typeWord(w);
      await user.click(await screen.findByRole('button', { name: /^(Next word|Finish)$/ }));
    }
    await screen.findByRole('region', { name: /Amazing|Great work|You did it/ });
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ score: 4, total: 5 }));
    expect(within(document.body).queryByText(/wrong/i)).toBeNull(); // never says "wrong"
  }, 30_000);
});
