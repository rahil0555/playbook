import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { englishStories } from '../../data/en/story';
import { renderPlayLab } from '../../test/utils';
import { sentenceGroups, sentenceParts } from './StorySentence';
import { LETTER_TILE_COLOR, STORY_WORD_COLORS, storyOf, storyRounds } from './storyRounds';
import { TennisScene } from './TennisScene';

const realTile = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)].find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;

/** The words of a sentence, lower-cased, in the order they are written. */
const wordsOf = (sentence: string) =>
  sentenceParts(sentence)
    .filter((p) => p.word)
    .map((p) => p.text.toLowerCase());

afterEach(() => {
  vi.useRealTimers();
});

describe('the story data', () => {
  it('has at least ten sentences, each with its own id and its own sentence', () => {
    expect(englishStories.length).toBeGreaterThanOrEqual(10);
    expect(new Set(englishStories.map((s) => s.id)).size).toBe(englishStories.length);
    expect(new Set(englishStories.map((s) => s.sentence)).size).toBe(englishStories.length);
  });

  it('gives every sentence at least one target, a hint, and targets made only of letters', () => {
    for (const story of englishStories) {
      expect(story.targets.length, story.id).toBeGreaterThan(0);
      expect(story.hint.trim().length, story.id).toBeGreaterThan(0);
      for (const target of story.targets) expect(target, `${story.id}: ${target}`).toMatch(/^[a-z]+$/);
    }
  });

  it('has every target appear once in its sentence, in the order listed', () => {
    for (const story of englishStories) {
      const words = wordsOf(story.sentence);
      const positions = story.targets.map((target) => {
        expect(words.filter((w) => w === target), `${story.id}: "${target}" once`).toHaveLength(1);
        return words.indexOf(target);
      });
      expect(positions, story.id).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it('makes one round per target word across every sentence, in play order, with each sentence as its clue', () => {
    const rounds = storyRounds(englishStories);
    expect(rounds.map((r) => r.text)).toEqual(englishStories.flatMap((s) => s.targets));
    expect(new Set(rounds.map((r) => r.id)).size).toBe(rounds.length);
    for (const round of rounds) expect(storyOf(englishStories, round)?.sentence).toBe(round.clue);
    expect(rounds.every((r) => r.sounds.every((s) => s === null))).toBe(true);
  });

  it('starts a different sentence at every sentence boundary, so the next round really loads new content', () => {
    const rounds = storyRounds(englishStories);
    const changes = rounds.slice(1).filter((round, i) => round.clue !== rounds[i]!.clue);
    expect(changes).toHaveLength(englishStories.length - 1);
  });

  it('keeps the sentence exactly as written, with the words and the punctuation apart', () => {
    const [first] = englishStories;
    const parts = sentenceParts(first!.sentence);
    expect(parts.map((p) => p.text).join('')).toBe('Rod and Cone are two monsters in one!');
    expect(parts.filter((p) => p.word).map((p) => p.text)).toEqual(['Rod', 'and', 'Cone', 'are', 'two', 'monsters', 'in', 'one']);
  });

  it('keeps each word with the punctuation after it, so a line never breaks between them', () => {
    const groups = sentenceGroups('Hurry, the big bus is here!');
    const text = groups.map((group) => group.map((p) => p.text).join(''));
    expect(text).toContain('here!');
    expect(text.join('')).toBe('Hurry, the big bus is here!');
    // only a word with its attached punctuation is kept on one line, so none of those groups holds a space
    for (const group of groups.filter((g) => g.length > 1)) expect(group.map((p) => p.text).join('')).toMatch(/^\S+$/);
  });

  it('uses one tile colour for every letter, and the reference palette for the sentence words', () => {
    expect(LETTER_TILE_COLOR).toMatch(/^#[0-9a-f]{6}$/i);
    expect(STORY_WORD_COLORS).toHaveLength(3);
    expect(STORY_WORD_COLORS[0]).toBe('#e8833a'); // "are" is orange, as in the reference
  });
});

describe('the story screen', () => {
  it('opens on the first sentence with "are" as the word to build, the other words still waiting, and the position shown', async () => {
    renderPlayLab({ initialActivity: 'story' });
    expect(await screen.findByRole('button', { name: 'Hear “are”' })).toHaveAttribute('data-state', 'target');
    expect(screen.getByRole('button', { name: 'Hear “two”' })).toHaveAttribute('data-state', 'waiting');
    expect(screen.getByRole('button', { name: 'Hear “one”' })).toHaveAttribute('data-state', 'waiting');
    expect(screen.getByText(`Sentence 1 of ${englishStories.length}, word 1 of 3`)).toBeInTheDocument();
  });

  it('keeps the hint back until the child asks for it, then shows it', async () => {
    const { user } = renderPlayLab({ initialActivity: 'story' });
    await screen.findByRole('button', { name: 'Hear “are”' });
    expect(screen.queryByText(/^Hint:/)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Show a hint' }));
    expect(screen.getByText('Hint: Count the monsters on your fingers.')).toBeInTheDocument();
  });

  it('spelling "are" completes it with the tennis reward, moves the target on to "two", and updates the position', async () => {
    const { user } = renderPlayLab({ initialActivity: 'story' });
    await screen.findByRole('button', { name: 'Hear “are”' });
    await screen.findAllByLabelText(/^Slot \d, empty/);
    for (const [i, letter] of ['a', 'r', 'e'].entries()) {
      await user.click(realTile(letter));
      await user.click(slot(i));
    }
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(document.querySelector('[data-story-tennis]')).not.toBeNull();
    // no Next button: the next word comes by itself once the celebration is over ("two" is waiting until then)
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Hear “two”' })).toHaveAttribute('data-state', 'target'), { timeout: 6000 });
    expect(screen.getByRole('button', { name: 'Hear “are”' })).toHaveAttribute('data-state', 'done');
    expect(screen.getByText(`Sentence 1 of ${englishStories.length}, word 2 of 3`)).toBeInTheDocument();
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
