import { describe, expect, it } from 'vitest';
import { normalizeAnswer } from '../../services/speechInput/evaluate';
import { evaluateVoiceTask, phonicsSoundPrompt, phonicsSoundTask } from '../../services/speechInput/tasks';
import { englishLetters } from './alphabet';
import { SOUND_WORDS, soundWordsFor } from './soundWords';

// The accepted words for Sound Discovery. These checks keep the lists small, explicit and consistent with the letters; they cannot
// check that a word sounds right to a child. That needs a phonics review (docs/VOICE.md).

const letterNames = englishLetters.map((letter) => normalizeAnswer(letter.name));

describe('the words accepted for each sound', () => {
  it('every letter has its own list of at least three words', () => {
    for (const letter of englishLetters) {
      expect(soundWordsFor(letter.id).length, letter.id).toBeGreaterThanOrEqual(3);
    }
    expect(Object.keys(SOUND_WORDS).sort()).toEqual(englishLetters.map((letter) => letter.id).sort());
  });

  it('each list contains the example word the app teaches with, so the teaching word is always an accepted answer', () => {
    for (const letter of englishLetters) {
      expect(soundWordsFor(letter.id).map(normalizeAnswer), letter.id).toContain(normalizeAnswer(letter.sound.speech));
    }
  });

  it('every word contains its own letter, so no list is made of words for another sound', () => {
    for (const letter of englishLetters) {
      for (const word of soundWordsFor(letter.id)) {
        expect(normalizeAnswer(word).includes(letter.id), `${word} for ${letter.id}`).toBe(true);
      }
    }
  });

  it('no word is on two lists, and no word is a letter name', () => {
    const seen = new Map<string, string>();
    for (const letter of englishLetters) {
      for (const word of soundWordsFor(letter.id)) {
        const form = normalizeAnswer(word);
        expect(seen.has(form), `${word} is on the lists for ${seen.get(form)} and ${letter.id}`).toBe(false);
        expect(letterNames.includes(form), `${word} is a letter name`).toBe(false);
        seen.set(form, letter.id);
      }
    }
  });
});

describe('the question for each sound', () => {
  it('names none of the words that are accepted for it, so it does not give the answer away', () => {
    for (const letter of englishLetters) {
      // whole words only: "hat" is inside "that", which is not the word being named
      const prompt = ` ${normalizeAnswer(phonicsSoundPrompt(letter.upper))} `;
      for (const word of soundWordsFor(letter.id)) {
        expect(prompt.includes(` ${normalizeAnswer(word)} `), `${word} is named in the question for ${letter.upper}`).toBe(false);
      }
    }
  });

  it('asks for a word with the sound, and says the letter name is not the sound', () => {
    for (const letter of englishLetters) {
      expect(phonicsSoundPrompt(letter.upper)).toBe(`Say a word that has the sound of ${letter.upper}. Say the sound, not the letter's name.`);
    }
  });
});

describe('judging against each sound', () => {
  it('accepts each listed word for its own letter, and refuses the letter name for every letter', () => {
    for (const letter of englishLetters) {
      const task = phonicsSoundTask(letter, soundWordsFor(letter.id));
      for (const word of soundWordsFor(letter.id)) {
        expect(evaluateVoiceTask(task, word).outcome, `${word} for ${letter.id}`).toBe('correct');
      }
      expect(evaluateVoiceTask(task, letter.name).outcome, `letter name ${letter.name} for ${letter.id}`).toBe('incorrect');
    }
  });

  it("refuses another letter's listed word for each sound", () => {
    for (const letter of englishLetters) {
      const other = englishLetters.find((candidate) => candidate.id !== letter.id)!;
      const task = phonicsSoundTask(letter, soundWordsFor(letter.id));
      expect(evaluateVoiceTask(task, soundWordsFor(other.id)[0]!).outcome, `${other.id}'s word for ${letter.id}`).toBe('incorrect');
    }
  });
});
