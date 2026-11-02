/**
 * Pip speaks in Edu's voice.
 *
 * A line is looked for in three places, in order, and the first one that plays wins:
 *  1. a pre-generated clip in /audio/edu (made by scripts/generate-voice.ts) - instant, free and offline;
 *  2. the server function /api/voice, which asks ElevenLabs for the same voice and caches the answer;
 *  3. nothing - the audio service then speaks the line with the browser's own voice, exactly as before.
 *
 * No key is ever read here. The browser only ever sees clip URLs, so nothing in this file (or anywhere else
 * in the bundle) can leak the ElevenLabs key.
 *
 * Every function is safe to call at any time: none of them throws, and a missing manifest, a failed request or a
 * server with no keys all simply mean "no clip", which is the browser-voice fallback.
 */

import { voiceKey } from '../audio/voiceLines';

/** What `scripts/generate-voice.ts` writes next to the mp3 files. */
export interface VoiceManifest {
  /** the voice the clips were generated with, for the record */
  voiceId?: string;
  generatedAt?: string;
  /** voiceKey(text) -> file name inside the same folder, e.g. "3f2a...mp3" */
  clips: Record<string, string>;
  /**
   * Whether a line with no clip of its own may be asked of the /api/voice server function.
   * Left off until the clips have been generated: a deployment with no clips has no keys either, so calling the
   * endpoint would only produce a failed request for every line the app says.
   */
  dynamic?: boolean;
}

/** Where the generated clips live, relative to the app's base URL. */
export const CLIP_DIR = 'audio/edu';
export const MANIFEST_PATH = `${CLIP_DIR}/manifest.json`;
/** The server function for a line with no pre-generated clip. */
export const VOICE_API = '/api/voice';
/** Longer than this is not sent to the server (it matches the endpoint's own limit). */
export const MAX_DYNAMIC_LENGTH = 300;

export interface EduVoiceOptions {
  /** base URL of the app's assets, e.g. import.meta.env.BASE_URL ('./' or '/playlab/') */
  base?: string;
  /** injected in tests */
  fetchImpl?: typeof fetch;
  /**
   * Overrides what the manifest says about the server function. Left undefined, the manifest decides (and a
   * missing manifest means off).
   */
  dynamic?: boolean;
}

export interface EduVoice {
  /** The clip URL for `text`, or undefined when the browser's own voice should say it. Never throws. */
  clipFor(text: string): string | undefined;
  /** Starts loading the manifest. Safe to call more than once; the app never waits on it. */
  load(): Promise<void>;
  /** true once the manifest has been loaded (or has failed to load, which is also final) */
  ready(): boolean;
  /** How many pre-generated clips are known. 0 before the manifest arrives, and 0 when there is none. */
  size(): number;
  /** Marks a clip URL as one that would not play, so the same line is not tried again this session. */
  markBroken(url: string): void;
}

/** `base` may be './', '/', or '/playlab/'. Joins it to a path without ever doubling or dropping a slash. */
export function joinBase(base: string, path: string): string {
  const prefix = base === './' || base === '' ? './' : base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${path}`;
}

/** The server-function URL for a line, or undefined when the line is too long or empty. */
export function dynamicUrl(text: string): string | undefined {
  const value = text.trim();
  if (!value || value.length > MAX_DYNAMIC_LENGTH) return undefined;
  return `${VOICE_API}?t=${encodeURIComponent(value)}`;
}

export function createEduVoice({ base = '/', fetchImpl, dynamic }: EduVoiceOptions = {}): EduVoice {
  let clips: Record<string, string> = {};
  let loaded = false;
  let loading: Promise<void> | null = null;
  /** what the manifest said; `dynamic` in the options overrides it */
  let manifestDynamic = false;
  /** lines whose clip would not play: they fall back for the rest of the session rather than failing every time */
  const broken = new Set<string>();
  /** the server function answered once with something that would not play: it is not asked again this session */
  let dynamicDown = false;
  const useDynamic = () => (dynamic ?? manifestDynamic) && !dynamicDown;

  const load = (): Promise<void> => {
    if (loading) return loading;
    const get = fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
    if (!get) {
      loaded = true;
      return (loading = Promise.resolve());
    }
    loading = get(joinBase(base, MANIFEST_PATH))
      .then((r) => (r.ok ? (r.json() as Promise<VoiceManifest>) : null))
      .then((m) => {
        if (!m || !m.clips || typeof m.clips !== 'object') return;
        clips = m.clips;
        manifestDynamic = m.dynamic === true;
      })
      // no manifest is the normal state before the clips have been generated: it is not an error
      .catch(() => undefined)
      .then(() => {
        loaded = true;
      });
    return loading;
  };

  return {
    load,
    ready: () => loaded,
    size: () => Object.keys(clips).length,
    markBroken: (url) => {
      broken.add(url);
      // one failure from the server function is enough: with no keys on the server every line would fail the same way
      if (url.startsWith(VOICE_API)) dynamicDown = true;
    },
    clipFor(text) {
      const file = clips[voiceKey(text)];
      if (file) {
        const url = joinBase(base, `${CLIP_DIR}/${file}`);
        if (!broken.has(url)) return url;
        // the pre-generated clip is missing or will not decode: the server function is still worth a try
      }
      if (!useDynamic()) return undefined;
      const url = dynamicUrl(text);
      return url && !broken.has(url) ? url : undefined;
    },
  };
}
