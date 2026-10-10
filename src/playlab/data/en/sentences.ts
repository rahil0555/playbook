import type { IllustrationId, SentenceEntry } from '../../types/learning';

type Row = {
  text: string;
  level: 1 | 2 | 3;
  illustration: IllustrationId;
  /** 'fill' sentences: index of the hidden word and wrong options */
  blank?: number;
  distractors?: string[];
};

const rows: Row[] = [
  { text: 'The cat is sleeping.', level: 1, illustration: 'cat' },
  { text: 'I like apples.', level: 1, illustration: 'apple', blank: 2, distractors: ['run', 'blue'] },
  { text: 'The sun is bright.', level: 1, illustration: 'sun' },
  { text: 'A dog can run.', level: 1, illustration: 'dog', blank: 3, distractors: ['red', 'cup'] },
  { text: 'The pig is big.', level: 1, illustration: 'pig' },
  { text: 'The bird can fly.', level: 2, illustration: 'bird' },
  { text: 'The fish can swim.', level: 2, illustration: 'fish', blank: 3, distractors: ['book', 'moon'] },
  { text: 'I read a book.', level: 2, illustration: 'book' },
  { text: 'I eat a mango.', level: 2, illustration: 'mango', blank: 3, distractors: ['sing', 'hat'] },
  { text: 'The moon is round.', level: 3, illustration: 'moon' },
  { text: 'The zebra has stripes.', level: 3, illustration: 'zebra', blank: 2, distractors: ['wheels', 'wings'] },
];

export const englishSentences: SentenceEntry[] = rows.map((row, i) => {
  const punctuation = row.text.slice(-1) as SentenceEntry['punctuation'];
  const words = row.text.slice(0, -1).split(' ');
  const base = {
    id: `s${i + 1}`,
    words,
    punctuation,
    level: row.level,
    illustration: row.illustration,
  };
  return row.blank === undefined
    ? { ...base, mode: 'arrange' as const }
    : { ...base, mode: 'fill' as const, blankIndex: row.blank, distractors: row.distractors ?? [] };
});
