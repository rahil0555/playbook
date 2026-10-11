import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderPlayLab } from '../../test/utils';
import { createEmptySnapshot, createMemoryAdapter } from '../../services/progressService';
import { likeKey, resetLikesCache } from '../../services/likesService';

afterEach(() => {
  window.localStorage.clear();
  resetLikesCache();
});

const withRounds = (n: number) => {
  const snap = createEmptySnapshot();
  snap.activitiesCompleted = n;
  return createMemoryAdapter(snap);
};

describe('sticker book', () => {
  it('My Stars shows one earned sticker per finished round, and locked slots for the rest', async () => {
    const { user } = renderPlayLab({ progressAdapter: withRounds(3) });
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    const book = await screen.findByRole('list', { name: 'Sticker book' });
    expect(within(book).getAllByRole('img', { name: /sticker$/ })).toHaveLength(3);
    expect(within(book).getAllByRole('img', { name: /not yet/ })).toHaveLength(9);
    expect(screen.getByTestId('sticker-count')).toHaveTextContent('3 of 12 stickers');
  });

  it('a new child has an empty book and is told how to earn one', async () => {
    const { user } = renderPlayLab();
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    expect(await screen.findByTestId('sticker-count')).toHaveTextContent('0 of 12 stickers');
  });

  it('Home shows the sticker count in the progress tiles and Pip talks about it', async () => {
    renderPlayLab({ progressAdapter: withRounds(2) });
    expect(await screen.findByText('stickers')).toBeInTheDocument();
    expect(screen.getByTestId('pip-says')).toHaveTextContent('2 stickers so far!');
  });

  it('Pip greets a brand-new child', async () => {
    renderPlayLab();
    expect(await screen.findByTestId('pip-says')).toHaveTextContent('Hi! I’m Pip');
  });
});

describe('things you love (hearts)', () => {
  it('Home says what to do while nothing is loved yet', async () => {
    renderPlayLab();
    expect(await screen.findByText(/Tap “Love it” on a letter, word or sentence/)).toBeInTheDocument();
  });

  it('shows what the child loved, with each item heard by tapping it', async () => {
    window.localStorage.setItem(likeKey(), JSON.stringify([{ kind: 'letter', id: 'm', label: 'Mm' }, { kind: 'word', id: 'apple', label: 'apple' }]));
    renderPlayLab();
    const shelf = await screen.findByRole('list', { name: 'Things you love' });
    expect(within(shelf).getByRole('button', { name: 'Hear letter: Mm' })).toBeInTheDocument();
    expect(within(shelf).getByRole('button', { name: 'Hear word: apple' })).toBeInTheDocument();
  });

  it('a letter can be loved and un-loved from Letter Playground, and the change is saved per learner', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet', learner: { id: 'maya', displayName: 'Maya' } });
    await user.click(await screen.findByRole('button', { name: /Letter M, m/ }));
    const love = await screen.findByRole('button', { name: 'Love this letter' });
    expect(love).toHaveAttribute('aria-pressed', 'false');
    await user.click(love);
    expect(await screen.findByRole('button', { name: /Loved: Mm/ })).toHaveAttribute('aria-pressed', 'true');
    expect(JSON.parse(window.localStorage.getItem(likeKey('maya'))!)).toEqual([{ kind: 'letter', id: 'm', label: 'Mm' }]);
    expect(window.localStorage.getItem(likeKey())).toBeNull(); // not saved for the un-named device

    await user.click(screen.getByRole('button', { name: /Loved: Mm/ }));
    expect(await screen.findByRole('button', { name: 'Love this letter' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('My Stars lists the loved things, and Remove takes one out', async () => {
    window.localStorage.setItem(likeKey(), JSON.stringify([{ kind: 'letter', id: 'b', label: 'Bb' }]));
    const { user } = renderPlayLab();
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    const list = await screen.findByRole('list', { name: 'Things you love' });
    expect(within(list).getByText('Bb')).toBeInTheDocument();
    await user.click(within(list).getByRole('button', { name: 'Take Bb out of things you love' }));
    expect(await screen.findByText(/Nothing yet. Tap “Love it”/)).toBeInTheDocument();
  });
});
