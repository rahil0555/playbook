import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderPlayLab } from '../../../test/utils';

// APPLE first (a, p, p, l, e): the spots and the letters are fixed, so each move below is exact
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  const order = ['apple', 'cat', 'sun', 'fish', 'book'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

type User = ReturnType<typeof renderPlayLab>['user'];
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;
/** a letter still in the tray (a letter on the board is not in the tray) */
const trayTile = (value: string) =>
  [...document.querySelectorAll<HTMLElement>('ul[aria-label="Loose letters"] [data-magic-tile]')].find((t) => t.dataset.value === value && t.dataset.decoy === 'false')!;
/** the letter that sits on the board in a spot (wrong ones are draggable tiles inside the spot) */
const onBoard = (i: number) => slot(i).querySelector<HTMLElement>('[data-magic-tile]')!;

async function openApple() {
  const r = renderPlayLab({ initialActivity: 'word-builder' });
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
  await screen.findAllByLabelText(/^Slot \d, empty/);
  return r;
}
/** tap a tray letter, then tap a spot: the same as a child who cannot drag */
async function place(user: User, value: string, slotIndex: number) {
  await user.click(trayTile(value));
  await user.click(slot(slotIndex));
}

describe('Magic Letters: a wrong letter stays where it was put, and can be moved', () => {
  it('a wrong letter is placed and stays in its spot (it is not sent back to the tray), and the child is told gently', async () => {
    const { user } = await openApple();
    await place(user, 'p', 0); // A belongs first
    expect(slot(0)).toHaveAttribute('data-state', 'wrong');
    expect(onBoard(0).dataset.value).toBe('p');
    expect(await screen.findByText(/isn’t in the right spot yet/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start this word again' })).toBeNull();
  });

  it('tap a wrong letter, then tap an empty spot: it moves, and the spot it left is empty again', async () => {
    const { user } = await openApple();
    await place(user, 'p', 0);
    await user.click(onBoard(0)); // picked up from its wrong spot
    expect(onBoard(0)).toHaveAttribute('aria-pressed', 'true');
    await user.click(slot(4)); // the empty spot for E (the move is a second wrong try, so the empty spot now glows as a hint)
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1, empty');
    expect(onBoard(4).dataset.value).toBe('p');
    expect(slot(4)).toHaveAttribute('data-state', 'wrong');
  });

  it('tap a wrong letter, then tap the wrong letter in another spot: they swap, and the one that fits there is right at once', async () => {
    const { user } = await openApple();
    await place(user, 'p', 0); // wrong: A belongs here
    await place(user, 'l', 1); // wrong: P belongs here
    await user.click(onBoard(0)); // the P is picked up...
    await user.click(onBoard(1)); // ...and tapping the L's spot is tapping that spot: they swap
    expect(slot(1)).toHaveAttribute('aria-label', 'Slot 2: P, done');
    expect(slot(0)).toHaveAttribute('data-state', 'wrong');
    expect(onBoard(0).dataset.value).toBe('l');
  });

  it('a letter from the tray dropped on a wrong letter replaces it, and the wrong one goes back to the tray', async () => {
    const { user } = await openApple();
    await place(user, 'l', 0); // wrong
    await place(user, 'a', 0); // A replaces it
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1: A, done');
    expect(trayTile('l')).toBeDefined(); // the L is back in the tray, not lost
  });

  it('a right letter can be picked up and moved, and a tray letter dropped on it replaces it: correctness is feedback, not a restriction', async () => {
    const { user } = await openApple();
    await place(user, 'a', 0); // right
    await user.click(onBoard(0)); // the right A is picked up like any other letter
    expect(onBoard(0)).toHaveAttribute('aria-pressed', 'true');
    await user.click(slot(4)); // and moved to the empty spot
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1, empty');
    expect(onBoard(4).dataset.value).toBe('a');
    expect(slot(4)).toHaveAttribute('data-state', 'wrong');
    await user.click(onBoard(4)); // back onto its own spot: right again
    await user.click(slot(0));
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1: A, done');
    await place(user, 'l', 0); // a tray L dropped on the right A replaces it, and the A goes back to the tray
    expect(slot(0)).toHaveAttribute('data-state', 'wrong');
    expect(trayTile('a')).toBeDefined(); // nothing lost
  });
  it('a full wrong word is fixed by moves alone, and each move is judged: the word is then spelled and celebrated', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'word-builder', onAnswerSubmit });
    await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
    await screen.findAllByLabelText(/^Slot \d, empty/);
    // p a p e l: every spot is filled, and only the second P (spot 3) is right
    await place(user, 'p', 0);
    await place(user, 'a', 1);
    await place(user, 'p', 2);
    await place(user, 'e', 3);
    await place(user, 'l', 4);
    expect(await screen.findByText(/isn’t in the right spot yet/)).toBeInTheDocument();
    expect(screen.queryByText(/You spelled/)).toBeNull();
    // swap the E and the L: both spots are now right
    await user.click(onBoard(3));
    await user.click(onBoard(4));
    expect(slot(3)).toHaveAttribute('aria-label', 'Slot 4: L, done');
    expect(slot(4)).toHaveAttribute('aria-label', 'Slot 5: E, done');
    // swap the P and the A: the word is spelled, and the success message shows at once
    await user.click(onBoard(0));
    await user.click(onBoard(1));
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: true, response: 'apple' }));
  }, 20000);
});

describe('Magic Letters: the keyboard puts a letter in the spot that needs it, as a drop would', () => {
  it('a typed letter moves a copy of it from a wrong spot into the spot that needs it', async () => {
    const { user } = await openApple();
    // (the copy on the board is the only A: typing it moves it)
    await place(user, 'a', 3); // wrong: it stays there
    fireEvent.keyDown(window, { key: 'a' }); // the A belongs first, and there is no A in the tray: the one on the board moves
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1: A, done');
    expect(slot(3)).toHaveAttribute('data-state', 'empty');
  });

  it('a typed letter replaces a wrong letter in the spot that needs it, and that letter goes back to the tray', async () => {
    const { user } = await openApple();
    await place(user, 'l', 0); // wrong
    fireEvent.keyDown(window, { key: 'a' });
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1: A, done');
    expect(trayTile('l')).toBeDefined();
  });
});
