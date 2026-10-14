import type { Phoneme, PhonemeId } from '../../types/learning';

/**
 * The sounds Magic Letters teaches: one entry per sound, shared by the words that use it. Each sound is recorded as a
 * short audio clip (see audio/phonics/); this file only names them. Browser speech cannot make isolated sounds, so no sound
 * is ever spoken in its place.
 */
export const PHONEMES: Record<PhonemeId, Phoneme> = {
  b: { id: 'b', symbol: '/b/', example: 'bat' },
  d: { id: 'd', symbol: '/d/', example: 'dog' },
  f: { id: 'f', symbol: '/f/', example: 'fish' },
  g: { id: 'g', symbol: '/g/', example: 'goat' },
  h: { id: 'h', symbol: '/h/', example: 'hat' },
  k: { id: 'k', symbol: '/k/', example: 'cat' },
  l: { id: 'l', symbol: '/l/', example: 'lion' },
  m: { id: 'm', symbol: '/m/', example: 'moon' },
  n: { id: 'n', symbol: '/n/', example: 'nest' },
  ng: { id: 'ng', symbol: '/ŋ/', example: 'mango' },
  p: { id: 'p', symbol: '/p/', example: 'pig' },
  r: { id: 'r', symbol: '/r/', example: 'zebra' },
  s: { id: 's', symbol: '/s/', example: 'sun' },
  sh: { id: 'sh', symbol: '/ʃ/', example: 'fish' },
  t: { id: 't', symbol: '/t/', example: 'tree' },
  w: { id: 'w', symbol: '/w/', example: 'whale' },
  z: { id: 'z', symbol: '/z/', example: 'zebra' },
  'a-short': { id: 'a-short', symbol: '/æ/', example: 'cat' },
  'e-short': { id: 'e-short', symbol: '/ɛ/', example: 'pen' },
  'i-short': { id: 'i-short', symbol: '/ɪ/', example: 'pig' },
  'o-short': { id: 'o-short', symbol: '/ɔ/', example: 'dog' },
  'u-short': { id: 'u-short', symbol: '/ʌ/', example: 'sun' },
  'oo-short': { id: 'oo-short', symbol: '/ʊ/', example: 'book' },
  'a-long': { id: 'a-long', symbol: '/eɪ/', example: 'whale' },
  'i-long': { id: 'i-long', symbol: '/aɪ/', example: 'kite' },
  'o-long': { id: 'o-long', symbol: '/oʊ/', example: 'mango' },
  'oo-long': { id: 'oo-long', symbol: '/uː/', example: 'moon' },
  schwa: { id: 'schwa', symbol: '/ə/', example: 'zebra' },
};
