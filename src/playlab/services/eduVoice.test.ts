import { describe, expect, it, vi } from 'vitest';
import { createEduVoice, dynamicUrl, joinBase, MAX_DYNAMIC_LENGTH, type VoiceManifest } from './eduVoice';
import { allVoiceLines, voiceKey } from '../audio/voiceLines';

const manifest = (clips: Record<string, string>, dynamic = true): VoiceManifest => ({ voiceId: 'v1', dynamic, clips });

/** A fetch that answers the manifest request with `body`, or fails when `body` is null. */
const fakeFetch = (body: VoiceManifest | null) =>
  vi.fn(async () => (body ? ({ ok: true, json: async () => body } as Response) : Promise.reject(new Error('offline'))));

describe('voiceKey: one clip per line, however the copy is punctuated', () => {
  it('ignores case, surrounding space and the curly quotes the copy uses', () => {
    expect(voiceKey('Well done!')).toBe(voiceKey('  well done!  '));
    expect(voiceKey('Let’s go')).toBe(voiceKey("let's go"));
    expect(voiceKey('“Hi”')).toBe(voiceKey('"hi"'));
  });

  it('keeps punctuation that changes how a line is read', () => {
    expect(voiceKey('Really?')).not.toBe(voiceKey('Really!'));
  });
});

describe('the fixed lines', () => {
  it('are listed once each, and none is too long for the server function', () => {
    const lines = allVoiceLines();
    expect(lines.length).toBeGreaterThan(100);
    expect(new Set(lines.map((l) => voiceKey(l.text))).size).toBe(lines.length);
    expect(lines.filter((l) => l.text.length > MAX_DYNAMIC_LENGTH)).toEqual([]);
  });

  it('include the lines a child hears most', () => {
    const keys = new Set(allVoiceLines().map((l) => voiceKey(l.text)));
    expect(keys.has(voiceKey('Hooray! You got it!'))).toBe(true);
    expect(keys.has(voiceKey('Hooray! You spelled cat!'))).toBe(true);
    expect(keys.has(voiceKey('The cat is sleeping.'))).toBe(true);
  });
});

describe('joinBase: the app may be hosted anywhere', () => {
  it.each([
    ['/', 'audio/edu/a.mp3', '/audio/edu/a.mp3'],
    ['./', 'audio/edu/a.mp3', './audio/edu/a.mp3'],
    ['/playlab/', 'audio/edu/a.mp3', '/playlab/audio/edu/a.mp3'],
    ['/playlab', 'audio/edu/a.mp3', '/playlab/audio/edu/a.mp3'],
  ])('%s + %s -> %s', (base, path, expected) => {
    expect(joinBase(base, path)).toBe(expected);
  });
});

describe('dynamicUrl: the server function', () => {
  it('encodes the line into the query, so the clip can be played straight from an audio element', () => {
    expect(dynamicUrl('Hi there!')).toBe('/api/voice?t=Hi%20there!');
  });

  it('refuses an empty line and one longer than the endpoint accepts', () => {
    expect(dynamicUrl('   ')).toBeUndefined();
    expect(dynamicUrl('a'.repeat(MAX_DYNAMIC_LENGTH + 1))).toBeUndefined();
  });
});

describe('choosing the clip for a line', () => {
  it('prefers the pre-generated clip over the server function', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(manifest({ [voiceKey('Well done!')]: 'abc.mp3' })) });
    await voice.load();
    expect(voice.clipFor('Well done!')).toBe('/audio/edu/abc.mp3');
    expect(voice.size()).toBe(1);
  });

  it('falls back to the server function for a line that was not pre-generated', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(manifest({})) });
    await voice.load();
    expect(voice.clipFor('Something new')).toBe('/api/voice?t=Something%20new');
  });

  it('leaves every line to the browser voice when there is no manifest at all, and never throws', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(null) });
    await voice.load();
    expect(voice.ready()).toBe(true);
    expect(voice.size()).toBe(0);
    // no clips means no keys on the server either: asking /api/voice would only fail once per line
    expect(voice.clipFor('Well done!')).toBeUndefined();
  });

  it('leaves the server function alone while the manifest keeps it off', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(manifest({}, false)) });
    await voice.load();
    expect(voice.clipFor('Well done!')).toBeUndefined();
  });

  it('stops asking the server function once it has answered with something that will not play', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(manifest({})) });
    await voice.load();
    const first = voice.clipFor('One line') as string;
    expect(first).toBe('/api/voice?t=One%20line');
    voice.markBroken(first);
    expect(voice.clipFor('A different line')).toBeUndefined();
  });

  it('leaves the browser voice to say it when the server function is turned off and there is no clip', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(manifest({}, true)), dynamic: false });
    await voice.load();
    expect(voice.clipFor('Well done!')).toBeUndefined();
  });

  it('tries the server function once a pre-generated clip has failed to play, then gives up for the session', async () => {
    const voice = createEduVoice({ base: '/', fetchImpl: fakeFetch(manifest({ [voiceKey('Well done!')]: 'abc.mp3' })) });
    await voice.load();
    const clip = voice.clipFor('Well done!') as string;
    voice.markBroken(clip);
    const fallback = voice.clipFor('Well done!') as string;
    expect(fallback).toBe('/api/voice?t=Well%20done!');
    voice.markBroken(fallback);
    expect(voice.clipFor('Well done!')).toBeUndefined();
  });

  it('loads the manifest once, however many lines are said', async () => {
    const fetchImpl = fakeFetch(manifest({}));
    const voice = createEduVoice({ base: '/', fetchImpl });
    await Promise.all([voice.load(), voice.load(), voice.load()]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
