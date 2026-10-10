import { describe, expect, it } from 'vitest';
import { englishLetters } from '../data/en/alphabet';
import { englishWords } from '../data/en/words';
import { choiceCount, filterByLevel, levelNumber, pairCount, showGuideLetters } from './level';
import { buildBlankQuestion, buildSoundQuestion } from './questions';
import { mulberry32, pickFresh, shuffle } from './random';

describe('sound questions', () => {
  it('always include the answer once, with no other letter that makes the same sound', () => {
    for (let seed = 1; seed <= 50; seed++) {
      for (const letter of englishLetters) {
        const q = buildSoundQuestion(letter, englishLetters, 4, mulberry32(seed));
        expect(q.choices).toHaveLength(4);
        expect(q.choices.filter((c) => c.id === letter.id)).toHaveLength(1);
        expect(q.choices.filter((c) => c.sound.symbol === letter.sound.symbol)).toHaveLength(1);
      }
    }
  });
});

describe('word completion questions', () => {
  it('hide exactly one letter and offer the right answer among distinct choices', () => {
    for (const word of englishWords) {
      for (let seed = 1; seed <= 10; seed++) {
        const q = buildBlankQuestion(word, mulberry32(seed), 4);
        expect(q.answer).toBe(word.text[q.blankIndex]);
        expect(q.choices).toContain(q.answer);
        expect(new Set(q.choices).size).toBe(q.choices.length);
      }
    }
  });
});

describe('levels', () => {
  it('filters content by level', () => {
    expect(filterByLevel(englishWords, 'starter').every((w) => w.text.length === 3)).toBe(true);
    expect(filterByLevel(englishWords, 'explorer').every((w) => w.text.length <= 4)).toBe(true);
    expect(filterByLevel(englishWords, 'adventurer')).toHaveLength(englishWords.length);
    expect([levelNumber('starter'), levelNumber('explorer'), levelNumber('adventurer')]).toEqual([1, 2, 3]);
    expect(showGuideLetters('starter')).toBe(true);
    expect(showGuideLetters('adventurer')).toBe(false);
    expect(choiceCount('starter')).toBe(3);
    expect(pairCount('starter')).toBe(3);
    expect(pairCount('adventurer')).toBe(5);
  });
});

describe('random helpers', () => {
  it('shuffle keeps all items; pickFresh prefers unseen ids and falls back to seen ones', () => {
    const items = [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n) }));
    expect(shuffle(items, mulberry32(3)).map((i) => i.id).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
    const fresh = pickFresh(items, 3, new Set(['1', '2', '3']), mulberry32(1));
    expect(fresh.map((i) => i.id).sort()).toEqual(['4', '5', '6']);
    const mixed = pickFresh(items, 5, new Set(['1', '2', '3']), mulberry32(1));
    expect(mixed).toHaveLength(5);
    expect(new Set(mixed.map((i) => i.id)).size).toBe(5);
  });
});
