import { describe, expect, it } from 'vitest';
import { PHONEMES } from '../data/en/phonemes';
import { SPEECH_STYLE } from './audioService';
import { phonemeRequest } from './phonics';

describe('phonemeRequest: how a letter sound is asked of the browser', () => {
  it('says the phoneme\'s own speech, slowly, in the lesson language, with the shared rate', () => {
    expect(phonemeRequest(PHONEMES.t, 'en-US')).toEqual({ text: 'tuh', lang: 'en-US', rate: SPEECH_STYLE.soundRate, src: undefined });
    expect(SPEECH_STYLE.soundRate).toBe(0.8);
  });

  it('uses a recorded clip instead of speech when one is supplied (no clips ship today)', () => {
    expect(phonemeRequest({ ...PHONEMES.t, clip: '/clips/t.mp3' }, 'en-US').src).toBe('/clips/t.mp3');
  });
});
