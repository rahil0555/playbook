import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PhonicClip } from '../audio/phonics';

// The recordings manifest is replaced here, so the mapping from sound to file can be checked with and without a file.
const manifest = vi.hoisted(() => ({ PHONIC_CLIPS: {} as Record<string, PhonicClip> }));
vi.mock('../audio/phonics', () => manifest);

import { phonicLoopRequest, phonicRequest } from './phonics';

afterEach(() => {
  for (const key of Object.keys(manifest.PHONIC_CLIPS)) delete manifest.PHONIC_CLIPS[key];
});

describe('phonicRequest: a sound asks for its own recording', () => {
  it('a sound with a recording plays exactly that file, as a recording only', () => {
    manifest.PHONIC_CLIPS.t = { url: './assets/t.ogg', source: 'test', license: 'test' };
    expect(phonicRequest('t')).toEqual({ text: 't', clipOnly: true, src: './assets/t.ogg' });
  });

  it('each sound maps to its own file, not to another sound\'s', () => {
    manifest.PHONIC_CLIPS.k = { url: './assets/k.ogg', source: 'test', license: 'test' };
    manifest.PHONIC_CLIPS['a-short'] = { url: './assets/a-short.ogg', source: 'test', license: 'test' };
    expect(phonicRequest('k').src).toBe('./assets/k.ogg');
    expect(phonicRequest('a-short').src).toBe('./assets/a-short.ogg');
    expect(phonicRequest('i-short').src, 'no recording for i-short').toBeUndefined();
  });

  it('a sound with no recording gets no file, and is never spoken in its place', () => {
    const req = phonicRequest('t');
    expect(req.src).toBeUndefined();
    expect(req.clipOnly, 'so the audio service will not fall back to speech').toBe(true);
  });
});

describe('phonicLoopRequest: a held sound is the same recording, set to repeat', () => {
  it('asks for the sound\'s own file, looping, and never for speech', () => {
    manifest.PHONIC_CLIPS.p = { url: './assets/p.ogg', source: 'test', license: 'test' };
    expect(phonicLoopRequest('p')).toEqual({ text: 'p', clipOnly: true, src: './assets/p.ogg', loop: true });
  });

  it('a sound with no recording loops nothing, and is never spoken', () => {
    const req = phonicLoopRequest('t');
    expect(req.src).toBeUndefined();
    expect(req.clipOnly).toBe(true);
  });
});

