import { act, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProgressAdapter, ProgressSnapshot } from '../../types/learning';
import { createEmptySnapshot, createMemoryAdapter } from '../../services/progressService';
import { renderPlayLab } from '../../test/utils';

/** the number shown in one of Home's stat tiles, found by its label */
const statValue = (label: string) => screen.getByText(label).parentElement!.firstElementChild!.textContent;

/** an adapter whose saved progress only arrives when the test says so, as it would for a host app that loads it over the network */
function laterAdapter(saved: ProgressSnapshot) {
  let finishLoad: () => void = () => undefined;
  const adapter: ProgressAdapter = {
    load: () =>
      new Promise<ProgressSnapshot>((resolve) => {
        finishLoad = () => resolve(saved);
      }),
    save: vi.fn(),
    clear: vi.fn(),
  };
  return { adapter, finishLoad: () => finishLoad() };
}

describe('Home while the saved progress loads', () => {
  it('shows placeholders, not zeros, until the saved numbers arrive, then shows them', async () => {
    const saved = { ...createEmptySnapshot(), stars: 4, activitiesCompleted: 2 };
    const { adapter, finishLoad } = laterAdapter(saved);
    renderPlayLab({ progressAdapter: adapter });

    // Home is a lazily loaded screen, so wait for it to appear (still without the saved numbers)
    expect(await screen.findByText('Loading your progress…')).toBeInTheDocument();
    expect(statValue('stars collected')).toBe('…');
    expect(statValue('rounds finished')).toBe('…');

    await act(async () => finishLoad());
    await waitFor(() => expect(statValue('stars collected')).toBe('4'));
    expect(statValue('rounds finished')).toBe('2');
    expect(screen.getByText(/Nothing played yet this visit/)).toBeInTheDocument();
  });
});

describe('the alphabet goal is rewarded once per learner', () => {
  const GOAL_LETTERS = ['a', 'b', 'c', 'd', 'e'];

  async function tapLetters(user: ReturnType<typeof renderPlayLab>['user'], letters: string[]) {
    for (const letter of letters) {
      await user.click(await screen.findByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) }));
    }
  }

  it('the first time every letter is found, it gives the stars and the round', async () => {
    const { user, adapter } = renderPlayLab({ initialActivity: 'alphabet', progressAdapter: createMemoryAdapter() });
    await tapLetters(user, GOAL_LETTERS);
    expect(await screen.findByText('5 letters found! 3 stars!')).toBeInTheDocument();
    // the goal is a finished round, so its sticker is revealed the first time it is earned
    expect(screen.getByTestId('sticker-reveal')).toHaveTextContent('New sticker: Apple!');
    expect(adapter.load()).toMatchObject({ stars: 3, activitiesCompleted: 1 });
  });

  it('finding every letter again on a later visit celebrates it, but adds no stars or round', async () => {
    const earlier = createEmptySnapshot();
    earlier.stars = 3;
    earlier.activitiesCompleted = 1;
    earlier.perActivity.alphabet.completed = 1;
    const { user, adapter } = renderPlayLab({ initialActivity: 'alphabet', progressAdapter: createMemoryAdapter(earlier) });
    await tapLetters(user, GOAL_LETTERS);
    expect(await screen.findByText('5 letters found again!')).toBeInTheDocument();
    expect(screen.queryByText(/3 stars!/)).toBeNull();
    expect(screen.queryByTestId('sticker-reveal')).toBeNull(); // no new sticker was earned, so none is shown
    expect(adapter.load()).toMatchObject({ stars: 3, activitiesCompleted: 1 });
  });
});
