import type { PhonemeId } from '../../types/learning';
import { PHONEMES } from '../../data/en/phonemes';

/** A recording of one sound, with where it came from and the terms it may be used under. */
export interface PhonicClip {
  /** the file's URL, from an import of the audio file (e.g. `import url from './t.ogg?url'`) */
  url: string;
  /** who recorded it, and where it was obtained */
  source: string;
  /** the licence it is used under, in full or by its standard name */
  license: string;
}

/**
 * The recording for each sound, keyed by sound id. A sound with no entry has NO recording yet. Magic Letters then plays
 * nothing for it: it never falls back to speech, because browser speech cannot say an isolated sound (it says a letter's
 * name, or a word with an extra vowel). See README.md in this folder for the inventory and how to add a recording.
 *
 * No recordings are present in this repository yet, and none have been made up. Adding one is a data change here only.
 */
export const PHONIC_CLIPS: Partial<Record<PhonemeId, PhonicClip>> = {};

/** The sounds that still need a recording: every sound in the catalogue without an entry above. */
export const PHONIC_SOUNDS_WITHOUT_RECORDING: PhonemeId[] = (Object.keys(PHONEMES) as PhonemeId[]).filter((id) => !PHONIC_CLIPS[id]);
