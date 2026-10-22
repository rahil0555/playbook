import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { englishStory } from '../../data/en/story';
import { renderPlayLab } from '../../test/utils';
import { sentenceParts } from './StorySentence';
import { storyLetterColor, storyRounds, STORY_WORD_COLORS } from './storyRounds';
import { TennisScene } from './TennisScene';

const realTile = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)].find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;

afterEach(() => {
  vi.useRealTimers();
});

describe('the story data', () => {
  it('makes one round per target word, in sentence order, with the sentence as the clue and no letter sounds of its own', () => {
    const rounds = storyRounds(englishStory);
    expect(rounds.map((r) => r.text)).toEqual(['are', 'two', 'one']);
    expect(rounds.every((r) => r.clue === englishStory.sentence)).toBe(true);
    expect(rounds.every((r) => r.sounds.every((s) => s === null))).toBe(true);
  });

  it('keeps the sentence exactly as written, with the words and the punctuation apart', () => {
    const parts = sentenceParts(englishStory.sentence);
    expect(parts.map((p) => p.text).join('')).toBe('Rod and Cone are two monsters in one!');
    expect(parts.filter((p) => p.word).map((p) => p.text)).toEqual(['Rod', 'and', 'Cone', 'are', 'two', 'monsters', 'in', 'one']);
  });

  it('colours each letter from the reference palette, the same way every time', () => {
    expect(storyLetterColor('a')).toBe(storyLetterColor('a'));
    expect(STORY_WORD_COLORS).toHaveLength(3);
    expect(STORY_WORD_COLORS[0]).toBe('#e8833a'); // "are" is orange, as in the reference
  });
});

describe('the story screen', () => {
  it('shows the sentence with "are" as the word to build, and the other target words still waiting', async () => {
    renderPlayLab({ initialActivity: 'story' });
    expect(await screen.findByRole('button', { name: 'Hear “are”' })).toHaveAttribute('data-state', 'target');
    expect(screen.getByRole('button', { name: 'Hear “two”' })).toHaveAttribute('data-state', 'waiting');
    expect(screen.getByRole('button', { name: 'Hear “one”' })).toHaveAttribute('data-state', 'waiting');
  });

  it('spelling "are" completes it with the tennis reward, and moves the target on to "two"', async () => {
    const { user } = renderPlayLab({ initialActivity: 'story' });
    await screen.findByRole('button', { name: 'Hear “are”' });
    await screen.findAllByLabelText(/^Slot \d, empty/);
    for (const [i, letter] of ['a', 'r', 'e'].entries()) {
      await user.click(realTile(letter));
      await user.click(slot(i));
    }
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(document.querySelector('[data-story-tennis]')).not.toBeNull();
    await user.click(await screen.findByRole('button', { name: 'Next word' }));
    expect(await screen.findByRole('button', { name: 'Hear “two”' })).toHaveAttribute('data-state', 'target');
    expect(screen.getByRole('button', { name: 'Hear “are”' })).toHaveAttribute('data-state', 'done');
  });
});

describe('the tennis reward', () => {
  it('plays once and clears itself', () => {
    vi.useFakeTimers();
    const { container } = render(<TennisScene reducedMotion={false} />);
    expect(container.querySelector('[data-story-tennis]')).not.toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(container.querySelector('[data-story-tennis]')).toBeNull();
  });
});
