import type { PhonemeId, WordEntry } from '../../types/learning';

/** A word and, for each of its letters in order, the sound that letter makes in THIS word (null = no sound of its own). */
type Row = [text: string, level: 1 | 2 | 3, clue: string, sounds: (PhonemeId | null)[]];

const rows: Row[] = [
  // level 1 - three letters
  ['cat', 1, 'It purrs and says meow.', ['k', 'a-short', 't']],
  ['sun', 1, 'It shines in the sky and keeps us warm.', ['s', 'u-short', 'n']],
  ['dog', 1, 'A friendly pet that barks and wags its tail.', ['d', 'o-short', 'g']],
  ['bat', 1, 'A flying animal that sleeps upside down.', ['b', 'a-short', 't']],
  ['pen', 1, 'You write and draw with it.', ['p', 'e-short', 'n']],
  ['cup', 1, 'You drink milk or water from it.', ['k', 'u-short', 'p']],
  ['hat', 1, 'You wear it on your head.', ['h', 'a-short', 't']],
  ['pig', 1, 'A pink farm animal that says oink.', ['p', 'i-short', 'g']],
  // level 2 - four letters
  ['fish', 2, 'It lives in water and swims.', ['f', 'i-short', 'sh', null]],
  ['book', 2, 'You open it and read the story inside.', ['b', 'oo-short', null, 'k']],
  ['kite', 2, 'It flies high on a string in the wind.', ['k', 'i-long', 't', null]],
  ['moon', 2, 'It glows in the night sky.', ['m', 'oo-long', null, 'n']],
  ['nest', 2, 'A bird makes this home for its eggs.', ['n', 'e-short', 's', 't']],
  ['lion', 2, 'A big cat with a fluffy mane. Roar!', ['l', 'i-long', 'schwa', 'n']],
  // level 3 - five letters
  ['apple', 3, 'A crunchy red fruit that grows on trees.', ['a-short', 'p', null, 'l', null]],
  ['mango', 3, 'A sweet, juicy orange-yellow fruit.', ['m', 'a-short', 'ng', null, 'o-long']],
  ['zebra', 3, 'A striped animal that looks like a horse.', ['z', 'e-short', 'b', 'r', 'schwa']],
  ['whale', 3, 'The biggest animal in the sea.', ['w', null, 'a-long', 'l', null]],
];

export const englishWords: WordEntry[] = rows.map(([text, level, clue, sounds]) => ({
  id: text,
  text,
  level,
  clue,
  illustration: text as WordEntry['illustration'],
  sounds,
}));
