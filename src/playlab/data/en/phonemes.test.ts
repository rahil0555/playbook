import { describe, expect, it } from 'vitest';
import type { PhonemeId } from '../../types/learning';
import { englishLetters } from './alphabet';
import { PHONEMES } from './phonemes';
import { englishWords } from './words';

const word = (text: string) => englishWords.find((w) => w.text === text)!;
/** the sound per letter, as the word data says it: null for a letter with no sound of its own */
const soundsOf = (text: string) => word(text).sounds;

describe('Magic Letters: the sound of each letter in each word', () => {
  it('every word has exactly one sound entry per letter', () => {
    for (const w of englishWords) expect(w.sounds, w.text).toHaveLength(w.text.length);
  });

  it('every sound used in a word is a sound the catalogue knows', () => {
    for (const w of englishWords) {
      for (const id of w.sounds) if (id !== null) expect(PHONEMES[id], `${w.text}: ${id}`).toBeDefined();
    }
  });

  it('CAT: c makes /k/, a makes the short vowel of cat, t makes /t/', () => {
    expect(soundsOf('cat')).toEqual(['k', 'a-short', 't']);
  });

  it('the same letter makes different sounds in different words', () => {
    expect(soundsOf('cat')[1]).toBe('a-short'); // a in cat
    expect(soundsOf('whale')[2]).toBe('a-long'); // a in whale says its name
    expect(soundsOf('dog')[1]).toBe('o-short'); // o in dog
    expect(soundsOf('moon')[1]).toBe('oo-long'); // oo in moon
    expect(soundsOf('lion')[2]).toBe('schwa'); // o in lion
    expect(soundsOf('pig')[1]).toBe('i-short'); // i in pig
    expect(soundsOf('kite')[1]).toBe('i-long'); // i in kite
  });

  it('two-letter sounds: the first letter carries the sound, the second has none of its own', () => {
    expect(soundsOf('fish')).toEqual(['f', 'i-short', 'sh', null]); // sh is said by s; h is silent
    expect(soundsOf('book')).toEqual(['b', 'oo-short', null, 'k']); // the first o says oo; the second is silent
    expect(soundsOf('moon')).toEqual(['m', 'oo-long', null, 'n']);
    expect(soundsOf('mango')[2]).toBe('ng'); // n says ng; g is silent
    expect(soundsOf('mango')[3]).toBeNull();
    expect(soundsOf('whale')).toEqual(['w', null, 'a-long', 'l', null]); // wh: the w says it, the h is silent
  });

  it('silent letters have no sound: the e in kite, the final e in apple and whale', () => {
    expect(soundsOf('kite')[3]).toBeNull();
    expect(soundsOf('apple')[4]).toBeNull();
    expect(soundsOf('whale')[4]).toBeNull();
  });

  it('a doubled consonant is said once: the second p in apple has no sound of its own', () => {
    expect(soundsOf('apple')).toEqual(['a-short', 'p', null, 'l', null]);
  });

  it('a few more words, to pin the mapping for each of them', () => {
    expect(soundsOf('sun')).toEqual(['s', 'u-short', 'n']);
    expect(soundsOf('pen')).toEqual(['p', 'e-short', 'n']);
    expect(soundsOf('zebra')).toEqual(['z', 'e-short', 'b', 'r', 'schwa']);
    expect(soundsOf('nest')).toEqual(['n', 'e-short', 's', 't']);
  });
});

describe('Magic Letters: the sounds themselves', () => {
  /** the consonant sounds, listed out so the check says exactly which sounds it covers */
  const CONSONANTS: PhonemeId[] = ['b', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'ng', 'p', 'r', 's', 'sh', 't', 'w', 'z'];

  it('every sound has a speech text, a quality and a teacher example', () => {
    for (const p of Object.values(PHONEMES)) {
      expect(p.speech.length, p.id).toBeGreaterThan(0);
      expect(['clean', 'approximate', 'unreliable'], p.id).toContain(p.quality);
      expect(p.example.length, p.id).toBeGreaterThan(0);
    }
  });

  it('no consonant sound is said as a letter name (browser speech would say "ef", "em", "tee"...)', () => {
    const names = new Set(englishLetters.map((l) => l.nameSpeech));
    for (const id of CONSONANTS) expect(names.has(PHONEMES[id].speech), `${id} is said as a letter name`).toBe(false);
  });

  it('no sound is said as a word that is one of the answers, so a sound can never give the word away', () => {
    const answers = new Set(englishWords.map((w) => w.text));
    for (const p of Object.values(PHONEMES)) expect(answers.has(p.speech), `${p.id} would say the answer`).toBe(false);
  });

  it('clean sounds are the ones the browser voice is expected to make without an extra sound', () => {
    expect(PHONEMES['u-short'].quality).toBe('clean');
    expect(PHONEMES['i-long'].speech).toBe('eye');
    expect(PHONEMES['oo-long'].speech).toBe('oo');
    expect(PHONEMES.t.quality, 'the /t/ is the sound most worth listening to on a real device').toBe('approximate');
  });
});
