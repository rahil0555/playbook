/**
 * The words Sound Discovery accepts as carrying each letter's sound. Each list is short and explicit: a child's answer is accepted
 * only if it is one of these words (after the usual tidying of capitals, punctuation and spacing). Nothing is accepted just
 * because it sounds similar, and no list is open-ended.
 *
 * Every word contains its letter, and starts with the letter's sound (for x, the sound is at the end: fox). The first word is the
 * example the app may say when it teaches a sound. These lists were written for PlayLab and have not been reviewed by a
 * phonics specialist; that review is still needed before release (see docs/VOICE.md).
 */
export const SOUND_WORDS: Readonly<Record<string, readonly string[]>> = {
  a: ['apple', 'ant', 'alligator'],
  b: ['ball', 'bat', 'bus'],
  c: ['cat', 'cup', 'car'],
  d: ['dog', 'duck', 'doll'],
  e: ['egg', 'elephant', 'elf'],
  f: ['fish', 'fan', 'frog'],
  g: ['goat', 'gum', 'gift'],
  h: ['hat', 'hen', 'hop'],
  i: ['igloo', 'insect', 'itch'],
  j: ['jar', 'jam', 'jet'],
  k: ['kite', 'kid', 'kangaroo'],
  l: ['lion', 'leg', 'lamp'],
  m: ['moon', 'mug', 'map'],
  n: ['nest', 'net', 'nut'],
  o: ['orange', 'octopus', 'ox'],
  p: ['pig', 'pen', 'pot'],
  q: ['quilt', 'queen', 'quack'],
  r: ['rabbit', 'red', 'rain'],
  s: ['sun', 'sock', 'snake'],
  t: ['tree', 'top', 'tent'],
  u: ['umbrella', 'up', 'under'],
  v: ['van', 'vet', 'vase'],
  w: ['whale', 'web', 'wig'],
  x: ['fox', 'box', 'six'],
  y: ['yo-yo', 'yak', 'yes'],
  z: ['zebra', 'zip', 'zoo'],
};

/** The accepted words for a letter (by its lowercase id). Every letter has a list. */
export function soundWordsFor(letterId: string): readonly string[] {
  return SOUND_WORDS[letterId] ?? [];
}
