import type { Phoneme, PhonemeId } from '../../types/learning';

/**
 * The sounds Magic Letters teaches: one entry per sound, shared by the words that use it.
 *
 * `speech` is a respelling, not the sound itself, because browser speech reads plain text. These were chosen by testing
 * with espeak-ng (its IPA output, see docs/PHONICS-AUDIO.md): a bare consonant such as "f" or "m" is read as a letter name
 * ("ef", "em"), so each consonant gets a short "uh" to say it, and some short vowels need a trailing consonant to be heard
 * as a vowel at all. Every one of these still needs listening on a real browser and voice before it is trusted.
 *
 * To change how a sound is said later, change its `speech` here (or give it a `clip`); no word or screen needs editing.
 */
export const PHONEMES: Record<PhonemeId, Phoneme> = {
  // consonants: the "uh" after each one is the shortest vowel browser speech can produce
  b: { id: 'b', symbol: '/b/', speech: 'buh', quality: 'approximate', example: 'bat' },
  d: { id: 'd', symbol: '/d/', speech: 'duh', quality: 'approximate', example: 'dog' },
  f: { id: 'f', symbol: '/f/', speech: 'fuh', quality: 'approximate', example: 'fish' },
  g: { id: 'g', symbol: '/g/', speech: 'guh', quality: 'approximate', example: 'goat' },
  h: { id: 'h', symbol: '/h/', speech: 'huh', quality: 'approximate', example: 'hat' },
  k: { id: 'k', symbol: '/k/', speech: 'kuh', quality: 'approximate', example: 'cat' },
  l: { id: 'l', symbol: '/l/', speech: 'luh', quality: 'approximate', example: 'lion' },
  m: { id: 'm', symbol: '/m/', speech: 'muh', quality: 'approximate', example: 'moon' },
  n: { id: 'n', symbol: '/n/', speech: 'nuh', quality: 'approximate', example: 'nest' },
  ng: { id: 'ng', symbol: '/ŋ/', speech: 'ung', quality: 'unreliable', example: 'mango' },
  p: { id: 'p', symbol: '/p/', speech: 'puh', quality: 'approximate', example: 'pig' },
  r: { id: 'r', symbol: '/r/', speech: 'ruh', quality: 'approximate', example: 'zebra' },
  s: { id: 's', symbol: '/s/', speech: 'suh', quality: 'approximate', example: 'sun' },
  sh: { id: 'sh', symbol: '/ʃ/', speech: 'shuh', quality: 'approximate', example: 'fish' },
  t: { id: 't', symbol: '/t/', speech: 'tuh', quality: 'approximate', example: 'tree' },
  w: { id: 'w', symbol: '/w/', speech: 'wuh', quality: 'approximate', example: 'whale' },
  z: { id: 'z', symbol: '/z/', speech: 'zuh', quality: 'approximate', example: 'zebra' },

  // short vowels: browser speech has no clean isolated form, so each is said with a trailing consonant that keeps it a vowel
  'a-short': { id: 'a-short', symbol: '/æ/', speech: 'an', quality: 'approximate', example: 'cat' },
  'e-short': { id: 'e-short', symbol: '/ɛ/', speech: 'ell', quality: 'approximate', example: 'pen' },
  'i-short': { id: 'i-short', symbol: '/ɪ/', speech: 'in', quality: 'approximate', example: 'pig' },
  'o-short': { id: 'o-short', symbol: '/ɔ/', speech: 'on', quality: 'approximate', example: 'dog' },
  'u-short': { id: 'u-short', symbol: '/ʌ/', speech: 'uh', quality: 'clean', example: 'sun' },
  'oo-short': { id: 'oo-short', symbol: '/ʊ/', speech: 'put', quality: 'approximate', example: 'book' },

  // long vowels and the schwa: the letter's own name or a plain word says these cleanly
  'a-long': { id: 'a-long', symbol: '/eɪ/', speech: 'a', quality: 'clean', example: 'whale' },
  'i-long': { id: 'i-long', symbol: '/aɪ/', speech: 'eye', quality: 'clean', example: 'kite' },
  'o-long': { id: 'o-long', symbol: '/oʊ/', speech: 'oh', quality: 'clean', example: 'mango' },
  'oo-long': { id: 'oo-long', symbol: '/uː/', speech: 'oo', quality: 'clean', example: 'moon' },
  schwa: { id: 'schwa', symbol: '/ə/', speech: 'uh', quality: 'clean', example: 'zebra' },
};
