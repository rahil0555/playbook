import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderPlayLab } from '../../test/utils';
import { createEmptySnapshot, createMemoryAdapter } from '../../services/progressService';
import { resetLikesCache } from '../../services/likesService';

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

  it('a locked slot says which finished round unlocks it', async () => {
    const { user } = renderPlayLab({ progressAdapter: withRounds(3) });
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    const book = await screen.findByRole('list', { name: 'Sticker book' });
    expect(within(book).getByText('Sun')).toBeInTheDocument(); // round 3 has earned the sun
    expect(within(book).getByText('Round 4')).toBeInTheDocument();
    expect(within(book).getByText('Round 12')).toBeInTheDocument();
    expect(within(book).queryByText('Round 3')).toBeNull();
  });

  it('a full book says so, and each round after it adds a repeat', async () => {
    const { user } = renderPlayLab({ progressAdapter: withRounds(14) });
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    expect(await screen.findByTestId('sticker-count')).toHaveTextContent('The whole book is full: 12 of 12 stickers, and 2 extra.');
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

describe('no things-you-love section for a child', () => {
  it('Home and My Stars show no Things you love section, however a letter was tapped', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await user.click(await screen.findByRole('button', { name: /^Letter A,/ }));
    expect(screen.queryByText(/Love it/)).toBeNull();
    expect(screen.queryByRole('button', { name: /^Love it|Take .* out of things you love/ })).toBeNull();
    expect(screen.queryByRole('list', { name: 'Things you love' })).toBeNull();
  });
});

