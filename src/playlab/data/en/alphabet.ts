import type { IllustrationId, LetterEntry } from '../../types/learning';

/**
 * Letter NAME and letter SOUND are deliberately separate fields.
 * e.g. A is called "ay" but makes the short /ă/ sound in "apple".
 *
 * `sound.speech` is what the browser voice is asked to say. Browser speech
 * synthesis is not designed for isolated phonemes, so these respellings are
 * approximations; they should be replaced by recorded clips via `audio`
 * (see docs/INTEGRATION.md -> "Audio").
 */
type Row = [
  id: string,
  nameSpeech: string,
  symbol: string,
  soundSpeech: string,
  tip: string,
  word: string,
  illustration: IllustrationId,
];

const rows: Row[] = [
  ['a', 'ay', '/ă/', 'aah', 'Short a, like the start of apple.', 'apple', 'apple'],
  ['b', 'bee', '/b/', 'buh', 'Lips pop together: b-b-ball.', 'ball', 'ball'],
  ['c', 'see', '/k/', 'kuh', 'Hard c says k, like cat.', 'cat', 'cat'],
  ['d', 'dee', '/d/', 'duh', 'Tongue taps up: d-d-dog.', 'dog', 'dog'],
  ['e', 'ee', '/ĕ/', 'eh', 'Short e, like the start of egg.', 'egg', 'egg'],
  ['f', 'eff', '/f/', 'fff', 'Top teeth on lip: fff-fish.', 'fish', 'fish'],
  ['g', 'jee', '/g/', 'guh', 'Hard g, like goat.', 'goat', 'goat'],
  ['h', 'aitch', '/h/', 'huh', 'A little puff of air: h-h-hat.', 'hat', 'hat'],
  ['i', 'eye', '/ĭ/', 'ih', 'Short i, like the start of igloo.', 'igloo', 'igloo'],
  ['j', 'jay', '/j/', 'juh', 'Like the start of jar.', 'jar', 'jar'],
  ['k', 'kay', '/k/', 'kuh', 'Same sound as hard c: k-k-kite.', 'kite', 'kite'],
  ['l', 'el', '/l/', 'lll', 'Tongue behind top teeth: lll-lion.', 'lion', 'lion'],
  ['m', 'em', '/m/', 'mmm', 'Lips together and hum: mmm-moon.', 'moon', 'moon'],
  ['n', 'en', '/n/', 'nnn', 'Tongue behind top teeth: nnn-nest.', 'nest', 'nest'],
  ['o', 'oh', '/ŏ/', 'ah', 'Short o, like the start of orange.', 'orange', 'orange'],
  ['p', 'pee', '/p/', 'puh', 'Lips pop with a puff: p-p-pig.', 'pig', 'pig'],
  ['q', 'cue', '/kw/', 'kwuh', 'q is always with u: kw-kw-quilt.', 'quilt', 'quilt'],
  ['r', 'ar', '/r/', 'rrr', 'Growl softly: rrr-rabbit.', 'rabbit', 'rabbit'],
  ['s', 'ess', '/s/', 'sss', 'Hiss like a snake: sss-sun.', 'sun', 'sun'],
  ['t', 'tee', '/t/', 'tuh', 'Tongue taps up: t-t-tree.', 'tree', 'tree'],
  ['u', 'you', '/ŭ/', 'uh', 'Short u, like the start of umbrella.', 'umbrella', 'umbrella'],
  ['v', 'vee', '/v/', 'vvv', 'Top teeth on lip and hum: vvv-van.', 'van', 'van'],
  ['w', 'double you', '/w/', 'wuh', 'Round lips: w-w-whale.', 'whale', 'whale'],
  ['x', 'ex', '/ks/', 'ks', 'x says ks, at the end of fox.', 'fox', 'fox'],
  ['y', 'why', '/y/', 'yuh', 'Like the start of yo-yo.', 'yo-yo', 'yoyo'],
  ['z', 'zee', '/z/', 'zzz', 'A buzzing bee: zzz-zebra.', 'zebra', 'zebra'],
];

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

export const englishLetters: LetterEntry[] = rows.map(
  ([id, nameSpeech, symbol, soundSpeech, tip, word, illustration]) => ({
    id,
    upper: id.toUpperCase(),
    lower: id,
    name: nameSpeech,
    nameSpeech,
    sound: { symbol, speech: soundSpeech, tip },
    word: { text: word, illustration },
    vowel: VOWELS.has(id),
  }),
);
