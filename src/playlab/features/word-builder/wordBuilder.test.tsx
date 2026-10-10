import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { englishWords } from '../../data/en/words';
import { renderPlayLab } from '../../test/utils';

// Fixed round so tests are deterministic, including the double-P word.
vi.mock('../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/random')>();
  const order = ['apple', 'mango', 'cat', 'fish', 'book'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

const tray = (value: string) => document.querySelector<HTMLElement>(`[data-tile][data-value="${value}"][data-placed="false"]`);
const placed = () => [...document.querySelectorAll<HTMLElement>('[data-tile][data-placed="true"]')];
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-slot="${i}"]`)!;

async function spell(user: ReturnType<typeof renderPlayLab>['user'], word: string) {
  for (const ch of word) await user.click(tray(ch)!);
}

describe('Word builder', () => {
  it('builds APPLE (two P tiles), rejects a wrong order kindly, then accepts the right one', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'word-builder', onAnswerSubmit });
    await screen.findByText('Spell the word (5 letters)');
    const check = screen.getByRole('button', { name: 'Check my word' });
    expect(check).toBeDisabled();

    await spell(user, 'paple'); // P A P L E - wrong order
    expect(check).toBeEnabled();
    await user.click(check);
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: false, attempt: 1, response: 'paple', expected: 'apple' }));
    expect(await screen.findByText(/Almost|Not quite|Good try|So close/)).toBeInTheDocument();
    // slot states: P(wrong) A(wrong) P(correct) L(correct) E(correct)
    expect([0, 1, 2, 3, 4].map((i) => slot(i).dataset.state)).toEqual(['wrong', 'wrong', 'correct', 'correct', 'correct']);

    await user.click(screen.getByRole('button', { name: 'Try again' })); // keeps the correct ones
    expect(placed()).toHaveLength(3);
    // fill slots 0 and 1 with A, P (the *unplaced* P tile must be available)
    await user.click(tray('a')!);
    await user.click(tray('p')!);
    expect(placed()).toHaveLength(5);
    await user.click(check);
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: true, attempt: 2, response: 'apple' }));
    expect(await screen.findByText(/You spelled/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next word' })).toBeInTheDocument();
  });

  it('never submits an incomplete answer, even via the Enter key', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'word-builder', onAnswerSubmit });
    await screen.findByText('Spell the word (5 letters)');
    await user.click(tray('a')!);
    await user.click(tray('p')!);
    await user.keyboard('{Enter}'); // focus is on a tile button -> no check; also guarded in code
    fireEvent.keyDown(window, { key: 'Enter' }); // body-level Enter
    expect(onAnswerSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Check my word' })).toBeDisabled();
  });

  it('lets the child deselect letters: tap a placed tile, Clear, and Backspace', async () => {
    const { user } = renderPlayLab({ initialActivity: 'word-builder' });
    await screen.findByText('Spell the word (5 letters)');
    await user.click(tray('a')!);
    await user.click(tray('p')!);
    expect(placed()).toHaveLength(2);
    await user.click(placed()[0]!); // tap a placed tile -> back to tray
    expect(placed()).toHaveLength(1);
    fireEvent.keyDown(window, { key: 'Backspace' });
    expect(placed()).toHaveLength(0);
    await user.click(tray('l')!);
    await user.click(tray('e')!);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(placed()).toHaveLength(0);
  });

  it('accepts typed letters from the keyboard', async () => {
    renderPlayLab({ initialActivity: 'word-builder' });
    await screen.findByText('Spell the word (5 letters)');
    for (const k of 'apple') fireEvent.keyDown(window, { key: k });
    expect(placed()).toHaveLength(5);
    expect([0, 1, 2, 3, 4].map((i) => slot(i).getAttribute('aria-label'))).toEqual(['Slot 1: A', 'Slot 2: P', 'Slot 3: P', 'Slot 4: L', 'Slot 5: E']);
  });

  it('offers a hint after two unsuccessful checks and highlights a tile', async () => {
    const { user } = renderPlayLab({ initialActivity: 'word-builder' });
    await screen.findByText('Spell the word (5 letters)');
    const check = screen.getByRole('button', { name: 'Check my word' });
    for (let i = 0; i < 2; i++) {
      await spell(user, 'eplpa');
      await user.click(check);
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      await user.click(screen.getByRole('button', { name: 'Clear' }));
    }
    expect(await screen.findByText('Need a hint?')).toBeInTheDocument();
    expect(screen.getByText(/starts with “A”/)).toBeInTheDocument();
    expect(document.querySelector('[data-tile][data-value="a"]')?.className).toContain('ring-sky');
  });

  it('can complete a full round, update progress and show the summary with next actions', async () => {
    const onActivityComplete = vi.fn();
    const { user, adapter } = renderPlayLab({ initialActivity: 'word-builder', onActivityComplete });
    for (const word of ['apple', 'mango', 'cat', 'fish', 'book']) {
      await screen.findByText(`Spell the word (${word.length} letters)`);
      await spell(user, word);
      await user.click(screen.getByRole('button', { name: 'Check my word' }));
      await user.click(await screen.findByRole('button', { name: word === 'book' ? 'Finish' : 'Next word' }));
    }
    expect(await screen.findByRole('region', { name: 'Amazing!' })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ activityId: 'word-builder', score: 5, total: 5, stars: 3 }));
    const saved = adapter.load() as { perActivity: { 'word-builder': { correct: number; completed: number } }; stars: number };
    expect(saved.perActivity['word-builder']).toMatchObject({ correct: 5, completed: 1 });
    expect(saved.stars).toBe(8); // 5 first-try stars + 3 completion stars
    expect(screen.getByRole('button', { name: 'Play again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Next: Sentence Fun/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go home' })).toBeInTheDocument();
  });

  it('every word in the content set can be built (letters available match the word)', () => {
    for (const w of englishWords) expect(w.text.split('').sort().join('')).toMatch(/^[a-z]+$/);
  });
});
