import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderPlayLab } from '../../../test/utils';

// The round is fixed to PIG first, so each check is about concrete letters: P, I and G belong in slots 1, 2 and 3.
const PIG_ROUND = ['pig', 'cat', 'sun', 'fish', 'book'];
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
});

const realTile = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)].find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;

async function openRound() {
  const r = renderPlayLab({ initialActivity: 'word-builder' });
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
  await screen.findAllByLabelText(/^Slot \d, empty/);
  return r;
}

// These checks have no pause between a pick and the next tap: that is the timing that used to leave the picked-up message on
// screen and hide the message that should have followed it.
describe('Magic Letters feedback: a quick pick and drop', () => {
  it('a letter picked up and dropped on the wrong spot at once shows the retry message, and the picked-up message does not stay', async () => {
    const { user } = await openRound();
    await user.click(realTile('p'));
    await user.click(slot(1)); // the spot for I, so P is wrong here
    expect(await screen.findByText(/That letter goes in a different spot/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Nice pick!')).not.toBeInTheDocument());
  });

  it('the last letter placed at once completes the word: the success message and its Next button show, and the picked-up message is gone', async () => {
    const { user } = await openRound();
    for (const [i, letter] of ['p', 'i', 'g'].entries()) {
      await user.click(realTile(letter));
      await user.click(slot(i));
    }
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /^(Next word|Finish)$/ }, { timeout: 5000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Nice pick!')).not.toBeInTheDocument());
  });
});
