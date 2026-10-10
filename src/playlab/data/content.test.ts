import { describe, expect, it } from 'vitest';
import { ART } from '../illustrations/art';
import { ACTIVITIES, nextActivityId } from './activities';
import { englishLetters } from './en/alphabet';
import { englishSentences } from './en/sentences';
import { englishWords } from './en/words';
import { getContentPack, listLanguages, registerContentPack } from './registry';

describe('English content pack', () => {
  it('has all 26 letters with name and sound as separate fields', () => {
    expect(englishLetters.map((l) => l.id).join('')).toBe('abcdefghijklmnopqrstuvwxyz');
    for (const l of englishLetters) {
      expect(l.upper).toBe(l.id.toUpperCase());
      expect(l.sound.symbol).toMatch(/^\/.+\/$/);
      expect(l.sound.speech.length).toBeGreaterThan(0);
      expect(l.nameSpeech).not.toBe(l.sound.speech); // name !== sound
      expect(ART[l.word.illustration]).toBeTruthy();
    }
    // example words start with their letter, except x (fox: the sound is at the end)
    for (const l of englishLetters.filter((x) => x.id !== 'x' && x.id !== 'y')) expect(l.word.text.startsWith(l.id)).toBe(true);
    expect(englishLetters.filter((l) => l.vowel).map((l) => l.id)).toEqual(['a', 'e', 'i', 'o', 'u']);
  });

  it('A is called "ay" but makes the short /ă/ sound in apple', () => {
    const a = englishLetters[0]!;
    expect([a.name, a.sound.symbol, a.word.text]).toEqual(['ay', '/ă/', 'apple']);
  });

  it('has the ten required word-building words and valid illustrations', () => {
    const ids = englishWords.map((w) => w.id);
    for (const w of ['cat', 'sun', 'dog', 'bat', 'pen', 'cup', 'fish', 'book', 'apple', 'mango']) expect(ids).toContain(w);
    for (const w of englishWords) {
      expect(w.text).toMatch(/^[a-z]+$/);
      expect(ART[w.illustration]).toBeTruthy();
      expect(w.clue.length).toBeGreaterThan(5);
    }
  });

  it('has at least five valid sentences, including the required examples', () => {
    expect(englishSentences.length).toBeGreaterThanOrEqual(5);
    const texts = englishSentences.map((s) => `${s.words.join(' ')}${s.punctuation}`);
    for (const t of ['The cat is sleeping.', 'I like apples.', 'The sun is bright.', 'A dog can run.', 'The bird can fly.']) expect(texts).toContain(t);
    for (const s of englishSentences) {
      expect(ART[s.illustration]).toBeTruthy();
      if (s.mode === 'fill') {
        expect(s.blankIndex).toBeGreaterThanOrEqual(0);
        expect(s.blankIndex).toBeLessThan(s.words.length);
        expect(s.distractors!.length).toBeGreaterThanOrEqual(2);
        expect(s.distractors).not.toContain(s.words[s.blankIndex!]);
      }
    }
    expect(englishSentences.some((s) => s.mode === 'arrange')).toBe(true);
    expect(englishSentences.some((s) => s.mode === 'fill')).toBe(true);
  });
});

describe('registry and activities', () => {
  it('falls back to English for unknown languages and accepts new packs', () => {
    expect(getContentPack('xx').language).toBe('en');
    registerContentPack({ ...getContentPack('en'), language: 'hi', label: 'Hindi (test)' });
    expect(getContentPack('hi').label).toBe('Hindi (test)');
    expect(listLanguages().map((l) => l.language)).toContain('hi');
  });

  it('defines five activities and cycles through them', () => {
    expect(ACTIVITIES).toHaveLength(5);
    expect(nextActivityId('alphabet')).toBe('phonics');
    expect(nextActivityId('matching')).toBe('alphabet');
  });
});
