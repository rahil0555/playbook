import type { IllustrationId, LetterEntry } from '../../types/learning';

/**
 * Letter NAME and letter SOUND are deliberately separate fields.
 * e.g. A is called "ay" but makes the short /ă/ sound in "apple".
 *
 * A letter's sound is never spoken on its own: browser speech cannot say an isolated sound, and a made-up spelling of it is not
 * the sound. Instead the sound is heard inside its example word ("Listen for the sound in ball"). `sound.speech` is
 * that example word. A recording can still replace it via `audio` (see docs/INTEGRATION.md -> "Audio").
 */
type Row = [
  id: string,
  nameSpeech: string,
  symbol: string,
  tip: string,
  word: string,
  illustration: IllustrationId,
];

const rows: Row[] = [
  ['a', 'ay', '/ă/', 'Short a, like the start of apple.', 'apple', 'apple'],
  ['b', 'bee', '/b/', 'Lips pop together: b-b-ball.', 'ball', 'ball'],
  ['c', 'see', '/k/', 'Hard c says k, like cat.', 'cat', 'cat'],
  ['d', 'dee', '/d/', 'Tongue taps up: d-d-dog.', 'dog', 'dog'],
  ['e', 'ee', '/ĕ/', 'Short e, like the start of egg.', 'egg', 'egg'],
  ['f', 'eff', '/f/', 'Top teeth on lip: fff-fish.', 'fish', 'fish'],
  ['g', 'jee', '/g/', 'Hard g, like goat.', 'goat', 'goat'],
  ['h', 'aitch', '/h/', 'A little puff of air: h-h-hat.', 'hat', 'hat'],
  ['i', 'eye', '/ĭ/', 'Short i, like the start of igloo.', 'igloo', 'igloo'],
  ['j', 'jay', '/j/', 'Like the start of jar.', 'jar', 'jar'],
  ['k', 'kay', '/k/', 'Same sound as hard c: k-k-kite.', 'kite', 'kite'],
  ['l', 'el', '/l/', 'Tongue behind top teeth: lll-lion.', 'lion', 'lion'],
  ['m', 'em', '/m/', 'Lips together and hum: mmm-moon.', 'moon', 'moon'],
  ['n', 'en', '/n/', 'Tongue behind top teeth: nnn-nest.', 'nest', 'nest'],
  ['o', 'oh', '/ŏ/', 'Short o, like the start of orange.', 'orange', 'orange'],
  ['p', 'pee', '/p/', 'Lips pop with a puff: p-p-pig.', 'pig', 'pig'],
  ['q', 'cue', '/kw/', 'q is always with u: kw-kw-quilt.', 'quilt', 'quilt'],
  ['r', 'ar', '/r/', 'Growl softly: rrr-rabbit.', 'rabbit', 'rabbit'],
  ['s', 'ess', '/s/', 'Hiss like a snake: sss-sun.', 'sun', 'sun'],
  ['t', 'tee', '/t/', 'Tongue taps up: t-t-tree.', 'tree', 'tree'],
  ['u', 'you', '/ŭ/', 'Short u, like the start of umbrella.', 'umbrella', 'umbrella'],
  ['v', 'vee', '/v/', 'Top teeth on lip and hum: vvv-van.', 'van', 'van'],
  ['w', 'double you', '/w/', 'Round lips: w-w-whale.', 'whale', 'whale'],
  ['x', 'ex', '/ks/', 'x says ks, at the end of fox.', 'fox', 'fox'],
  ['y', 'why', '/y/', 'Like the start of yo-yo.', 'yo-yo', 'yoyo'],
  ['z', 'zee', '/z/', 'A buzzing bee: zzz-zebra.', 'zebra', 'zebra'],
];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

export const englishLetters: LetterEntry[] = rows.map(
  ([id, nameSpeech, symbol, tip, word, illustration]) => ({
    id,
    upper: id.toUpperCase(),
    lower: id,
    name: nameSpeech,
    nameSpeech,
    sound: { symbol, speech: word, tip },
    word: { text: word, illustration },
    vowel: VOWELS.has(id),
  }),
);
