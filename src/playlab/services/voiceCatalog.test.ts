import { describe, expect, it } from 'vitest';
import { accentName, isEnglish, listEnglishVoices, normalizeLang, pickAutoVoice, resolveVoice, voiceId, type VoiceLike } from './voiceCatalog';

const V = (name: string, lang: string, localService = true, voiceURI?: string): VoiceLike => ({ name, lang, localService, voiceURI });

describe('language normalisation', () => {
  it('handles underscores, case and bare languages', () => {
    expect(normalizeLang('en_US')).toBe('en-US');
    expect(normalizeLang('EN-us')).toBe('en-US');
    expect(normalizeLang('en')).toBe('en');
    expect(normalizeLang(undefined)).toBe('');
    expect(isEnglish('en_GB')).toBe(true);
    expect(isEnglish('en')).toBe(true);
    expect(isEnglish('es-ES')).toBe(false);
    expect(isEnglish('eng-X')).toBe(false); // "eng" is not "en"
  });
  it('names the accents we recognise and falls back to plain English', () => {
    expect(accentName('en-US')).toBe('American English');
    expect(accentName('en_GB')).toBe('British English');
    expect(accentName('en-PH')).toBe('English');
  });
});

describe('listEnglishVoices', () => {
  const raw = [
    V('Zeta', 'en-GB'),
    V('Online US', 'en-US', false, 'uri-online'),
    V('Español', 'es-ES'),
    V('Mandarin', 'zh-CN'),
    V('Anna', 'en_US'),
    V('Anna', 'en-US'), // duplicate id once normalised? no: ids differ by raw lang, both kept
    V('Daisy', 'en-GB', false),
    V('Bubbles', 'en-US'), // no novelty filter: shown like any other English voice
  ];
  const list = listEnglishVoices(raw);

  it('keeps English voices only (and does NOT filter novelty-style names)', () => {
    expect(list.map((o) => o.name)).not.toContain('Español');
    expect(list.map((o) => o.name)).not.toContain('Mandarin');
    expect(list.map((o) => o.name)).toContain('Bubbles');
  });

  it('orders American on-device, American online, other on-device, other online', () => {
    const order = list.map((o) => `${o.american ? 'US' : 'xx'}${o.online ? '-online' : ''}`);
    const firstOnlineUs = order.indexOf('US-online');
    const firstOther = order.findIndex((x) => x.startsWith('xx'));
    expect(order.lastIndexOf('US')).toBeLessThan(firstOnlineUs);
    expect(firstOnlineUs).toBeLessThan(firstOther);
    expect(order[order.length - 1]).toBe('xx-online');
  });

  it('labels accents and online voices clearly', () => {
    expect(list.find((o) => o.name === 'Online US')?.label).toBe('Online US (American English, online)');
    expect(list.find((o) => o.name === 'Daisy')?.label).toBe('Daisy (British English, online)');
    expect(list.find((o) => o.name === 'Zeta')?.label).toBe('Zeta (British English)');
  });

  it('uses voiceURI as id when present, else name|lang; de-duplicates identical ids', () => {
    expect(voiceId(V('A', 'en-US', true, 'x://a'))).toBe('x://a');
    expect(voiceId(V('A', 'en-US'))).toBe('A|en-US');
    expect(listEnglishVoices([V('A', 'en-US'), V('A', 'en-US')])).toHaveLength(1);
  });

  it('returns an empty list for no voices or no English voices', () => {
    expect(listEnglishVoices([])).toEqual([]);
    expect(listEnglishVoices([V('Español', 'es-ES')])).toEqual([]);
  });
});

describe('pickAutoVoice (existing automatic behaviour preserved)', () => {
  it('prefers an exact en-US match, on-device first', () => {
    const raw = [V('GB', 'en-GB'), V('Online US', 'en-US', false), V('Local US', 'en-US')];
    expect(pickAutoVoice(raw, 'en-US')?.name).toBe('Local US');
  });
  it('falls back to another English voice when there is no American one', () => {
    expect(pickAutoVoice([V('GB', 'en-GB'), V('ES', 'es-ES')], 'en-US')?.name).toBe('GB');
  });
  it('takes an online voice if it is all there is, and null when nothing matches', () => {
    expect(pickAutoVoice([V('Only', 'en-US', false)], 'en-US')?.name).toBe('Only');
    expect(pickAutoVoice([V('ES', 'es-ES')], 'en-US')).toBeNull();
    expect(pickAutoVoice([], 'en-US')).toBeNull();
  });
  it('still works for another language (future content packs)', () => {
    expect(pickAutoVoice([V('Hindi', 'hi_IN'), V('US', 'en-US')], 'hi-IN')?.name).toBe('Hindi');
  });
});

describe('resolveVoice', () => {
  const raw = [V('Local US', 'en-US'), V('Daisy', 'en-GB', true, 'daisy-uri'), V('ES', 'es-ES', true, 'es-uri')];
  it('uses the saved English voice when present', () => {
    expect(resolveVoice(raw, 'en-US', 'daisy-uri')?.name).toBe('Daisy');
  });
  it('silently falls back to automatic for a stale or unknown id', () => {
    expect(resolveVoice(raw, 'en-US', 'gone-uri')?.name).toBe('Local US');
    expect(resolveVoice(raw, 'en-US', null)?.name).toBe('Local US');
  });
  it('ignores a saved id that points at a non-English voice, and ignores it for non-English requests', () => {
    expect(resolveVoice(raw, 'en-US', 'es-uri')?.name).toBe('Local US');
    expect(resolveVoice([...raw, V('Hindi', 'hi-IN')], 'hi-IN', 'daisy-uri')?.name).toBe('Hindi');
  });
});

describe('pickAutoVoice: the one teacher voice', () => {
  it('prefers a named American teacher voice over a plain American voice', () => {
    expect(pickAutoVoice([V('Local US', 'en-US'), V('Samantha (Enhanced)', 'en-US')], 'en-US')?.name).toBe('Samantha (Enhanced)');
  });

  it('keeps speech on the device when a preferred voice is installed there (no text sent to a vendor)', () => {
    expect(pickAutoVoice([V('Microsoft Aria Online (Natural)', 'en-US', false), V('Microsoft Zira Desktop', 'en-US')], 'en-US')?.name).toBe(
      'Microsoft Zira Desktop',
    );
  });

  it('uses a preferred online voice when no preferred voice is on the device', () => {
    expect(pickAutoVoice([V('Local US', 'en-US'), V('Google US English', 'en-US', false)], 'en-US')?.name).toBe('Google US English');
  });

  it('gives the same voice whatever order the browser lists the voices in', () => {
    const voices = [V('Local US', 'en-US'), V('Samantha', 'en-US'), V('Zoe', 'en-US'), V('Google US English', 'en-US', false)];
    const forward = pickAutoVoice(voices, 'en-US')?.name;
    expect(forward).toBe('Samantha');
    expect(pickAutoVoice([...voices].reverse(), 'en-US')?.name).toBe(forward);
    expect(pickAutoVoice(voices, 'en-US')?.name).toBe(forward);
  });

  it('falls back to a stable American voice when none of the preferred ones is installed', () => {
    const voices = [V('Zoe', 'en-US'), V('Local US', 'en-US'), V('Daisy', 'en-GB')];
    expect(pickAutoVoice(voices, 'en-US')?.name).toBe('Local US');
    expect(pickAutoVoice([...voices].reverse(), 'en-US')?.name).toBe('Local US');
  });

  it('a request for an English saved voice still beats the automatic teacher choice', () => {
    const voices = [V('Samantha', 'en-US'), V('Daisy', 'en-GB', true, 'daisy')];
    expect(resolveVoice(voices, 'en-US', 'daisy')?.name).toBe('Daisy');
    expect(resolveVoice(voices, 'en-US', null)?.name).toBe('Samantha');
  });
});
