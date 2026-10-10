import type { WordEntry } from '../../types/learning';

type Row = [text: string, level: 1 | 2 | 3, clue: string];

const rows: Row[] = [
  // level 1 - three letters
  ['cat', 1, 'It purrs and says meow.'],
  ['sun', 1, 'It shines in the sky and keeps us warm.'],
  ['dog', 1, 'A friendly pet that barks and wags its tail.'],
  ['bat', 1, 'A flying animal that sleeps upside down.'],
  ['pen', 1, 'You write and draw with it.'],
  ['cup', 1, 'You drink milk or water from it.'],
  ['hat', 1, 'You wear it on your head.'],
  ['pig', 1, 'A pink farm animal that says oink.'],
  // level 2 - four letters
  ['fish', 2, 'It lives in water and swims.'],
  ['book', 2, 'You open it and read the story inside.'],
  ['kite', 2, 'It flies high on a string in the wind.'],
  ['moon', 2, 'It glows in the night sky.'],
  ['nest', 2, 'A bird makes this home for its eggs.'],
  ['lion', 2, 'A big cat with a fluffy mane. Roar!'],
  // level 3 - five letters
  ['apple', 3, 'A crunchy red fruit that grows on trees.'],
  ['mango', 3, 'A sweet, juicy orange-yellow fruit.'],
  ['zebra', 3, 'A striped animal that looks like a horse.'],
  ['whale', 3, 'The biggest animal in the sea.'],
];

export const englishWords: WordEntry[] = rows.map(([text, level, clue]) => ({
  id: text,
  text,
  level,
  clue,
  illustration: text as WordEntry['illustration'],
}));
