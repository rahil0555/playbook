import type { LetterEntry, WordEntry } from '../types/learning';
import { shuffle, type Rng } from './random';

/** A listen-and-choose question: hear a letter's sound, pick the letter. */
export interface SoundQuestion {
  id: string;
  answer: LetterEntry;
  /** includes the answer, shuffled */
  choices: LetterEntry[];
}

/**
 * Wrong choices avoid letters that make the same sound as the answer
 * (c and k are both /k/), so a correct answer is never marked wrong.
 */
export function buildSoundQuestion(answer: LetterEntry, all: readonly LetterEntry[], count: number, rng: Rng): SoundQuestion {
  const others = all.filter((l) => l.id !== answer.id && l.sound.symbol !== answer.sound.symbol);
  const wrong = shuffle(others, rng).slice(0, Math.max(1, count - 1));
  return { id: `snd-${answer.id}`, answer, choices: shuffle([answer, ...wrong], rng) };
}

/** Word-completion question: a word with one missing letter. */
export interface BlankQuestion {
  id: string;
  word: WordEntry;
  blankIndex: number;
  answer: string;
  choices: string[];
}

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz'.split('');

export function buildBlankQuestion(word: WordEntry, rng: Rng, choiceTotal = 3): BlankQuestion {
  const blankIndex = Math.floor(rng() * word.text.length);
  const answer = word.text[blankIndex] as string;
  const wrong = shuffle(ALPHABET.filter((l) => l !== answer), rng).slice(0, choiceTotal - 1);
  return { id: `blank-${word.id}`, word, blankIndex, answer, choices: shuffle([answer, ...wrong], rng) };
}
