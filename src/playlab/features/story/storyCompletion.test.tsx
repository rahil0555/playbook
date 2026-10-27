import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderPlayLab } from '../../test/utils';

// two short sentences, so the whole story can be finished in a few taps
vi.mock('../../data/en/story', () => {
  const englishStories = [
    { id: 'we-are', sentence: 'We are here.', targets: ['are'], hint: 'Two friends.' },
    { id: 'one-sun', sentence: 'One sun is up.', targets: ['one'], hint: 'The first number.' },
  ];
  return { englishStories, englishStory: englishStories[0] };
});

const realTile = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)].find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;

async function spell(user: UserEvent, word: string) {
  await screen.findAllByLabelText(/^Slot \d, empty/);
  for (const [i, letter] of [...word].entries()) {
    await user.click(realTile(letter));
    await user.click(slot(i));
  }
}

describe('finishing the story', () => {
  it('moves from one sentence to the next, then says every sentence is done once the last word is spelled', async () => {
    const { user } = renderPlayLab({ initialActivity: 'story' });
    expect(await screen.findByText('Sentence 1 of 2, word 1 of 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear “are”' })).toHaveAttribute('data-state', 'target');

    await spell(user, 'are');
    await user.click(await screen.findByRole('button', { name: 'Next word' }));

    expect(await screen.findByRole('button', { name: 'Hear “One”' })).toHaveAttribute('data-state', 'target');
    expect(screen.getByText('Sentence 2 of 2, word 1 of 1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hear “are”' })).toBeNull();

    await spell(user, 'one');
    await user.click(await screen.findByRole('button', { name: 'Finish' }));

    expect(await screen.findByText('You spelled every word in all 2 sentences!')).toBeInTheDocument();
  });
});
