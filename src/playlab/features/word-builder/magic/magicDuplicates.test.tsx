import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderPlayLab } from '../../../test/utils';

// BOOK first: the two O's are the repeated letter
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  const order = ['book', 'cat', 'sun', 'fish', 'apple'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;
const trayTile = (value: string) =>
  [...document.querySelectorAll<HTMLElement>('ul[aria-label="Loose letters"] [data-magic-tile]')].find((t) => t.dataset.value === value && t.dataset.decoy === 'false')!;
const onBoard = (i: number) => slot(i).querySelector<HTMLElement>('[data-magic-tile]')!;
/** every O the child can see: the ones in the tray or in a wrong spot, and the ones in their right spots */
const oLetters = () =>
  document.querySelectorAll('ul[aria-label="Loose letters"] [data-magic-tile][data-value="o"], [data-magic-slot][data-state="wrong"] [data-magic-tile][data-value="o"]').length +
  [...document.querySelectorAll('[data-magic-slot]')].filter((s) => s.getAttribute('aria-label')?.endsWith(': O, done')).length;

describe('Magic Letters: a repeated letter (BOOK) is two separate letters', () => {
  it('both O letters are placed, and one is moved on its own; no O is lost or duplicated, and the word is spelled', async () => {
    const { user } = renderPlayLab({ initialActivity: 'word-builder' });
    await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
    await screen.findAllByLabelText(/^Slot \d, empty/);
    expect(document.querySelectorAll('[data-magic-slot]')).toHaveLength(4); // BOOK
    expect(oLetters()).toBe(2);

    await user.click(trayTile('o'));
    await user.click(slot(0)); // B belongs first: an O here is wrong, and it stays
    expect(slot(0)).toHaveAttribute('data-state', 'wrong');

    await user.click(trayTile('o'));
    await user.click(slot(1)); // the first O is right here: the second O is the one still in the tray
    expect(slot(1)).toHaveAttribute('aria-label', 'Slot 2: O, done');

    // the wrong O is moved to the other O spot, on its own: the right O stays where it is
    await user.click(onBoard(0));
    await user.click(slot(2));
    expect(slot(0)).toHaveAttribute('data-state', 'empty');
    expect(slot(2)).toHaveAttribute('aria-label', 'Slot 3: O, done');
    expect(slot(1)).toHaveAttribute('aria-label', 'Slot 2: O, done');
    expect(oLetters()).toBe(2); // still two O letters: none lost, none duplicated

    await user.click(trayTile('b'));
    await user.click(slot(0));
    await user.click(trayTile('k'));
    await user.click(slot(3));
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
  }, 20000);
});
