/**
 * Edu's voice, for the lines that cannot be pre-generated.
 *
 * SECURITY: the ElevenLabs key is read here and ONLY here. It is a server environment variable with no VITE_
 * prefix, so Vite can never inline it into the browser bundle, and the audio is streamed back as plain mp3 - the
 * key never leaves this function.
 *
 * It is a GET so the browser can play it straight from an <audio src>: the app already knows how to fall back from
 * a clip that will not play to the browser's own speech, so a failure here is silent and the app keeps working.
 *
 * Most lines never reach this endpoint: they are pre-generated into /audio/edu by scripts/generate-voice.ts.
 */

import { createHash } from 'node:crypto';

/** The most text one request may turn into speech. Long enough for the longest line the app says, and no longer. */
export const MAX_TEXT_LENGTH = 300;
/** Requests one caller may make in RATE_WINDOW_MS. */
export const RATE_LIMIT = 30;
export const RATE_WINDOW_MS = 60_000;
/** Clips held in this instance's memory. Small: the CDN and the browser do the real caching. */
const CACHE_MAX = 200;

/** Only ordinary sentence characters: this is a children's reading app, not a general text-to-speech service. */
const ALLOWED = /^[\p{L}\p{N} .,!?'"\u2018\u2019\u201c\u201d:;()\-\u2013\u2014/]+$/u;

/** The minimum of a Node request/response this handler uses, so it needs no `@vercel/node` dependency. */
interface Req {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}
interface Res {
  statusCode: number;
  setHeader(name: string, value: string): void;
  end(body?: string | Uint8Array): void;
}

const cache = new Map<string, Uint8Array>();
const hits = new Map<string, number[]>();

/** The caller, as far as the platform can tell. Behind Vercel this is the real client IP. */
export function callerOf(req: Req): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return (first ?? '').split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

/** True while this caller is inside its allowance. Keeps only the timestamps still inside the window. */
export function allow(caller: string, now = Date.now()): boolean {
  const recent = (hits.get(caller) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(caller, recent);
    return false;
  }
  recent.push(now);
  hits.set(caller, recent);
  // the map must not grow without bound on a long-lived instance
  if (hits.size > 5000) for (const key of [...hits.keys()].slice(0, 2500)) hits.delete(key);
  return true;
}

/** Why a line cannot be spoken, or null when it can. */
export function rejectReason(text: string): string | null {
  if (!text) return 'no text';
  if (text.length > MAX_TEXT_LENGTH) return `text longer than ${MAX_TEXT_LENGTH} characters`;
  if (!ALLOWED.test(text)) return 'text has characters this voice does not speak';
  return null;
}

export const cacheKey = (text: string, voiceId: string) => createHash('sha256').update(`${voiceId}\n${text}`).digest('hex');

function remember(key: string, audio: Uint8Array) {
  cache.set(key, audio);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

const fail = (res: Res, status: number, why: string) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: why }));
};

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'use GET');

  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  // Not configured is not an error the child should ever see: the app falls back to the browser's own voice.
  if (!apiKey || !voiceId) return fail(res, 503, 'voice is not configured on this server');

  const text = (new URL(req.url ?? '/', 'http://localhost').searchParams.get('t') ?? '').trim();
  const why = rejectReason(text);
  if (why) return fail(res, 400, why);

  const key = cacheKey(text, voiceId);
  const cached = cache.get(key);
  if (cached) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Voice-Cache', 'hit');
    return res.end(cached);
  }

  if (!allow(callerOf(req))) return fail(res, 429, 'too many voice requests; try again in a minute');

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({
        text,
        model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true },
      }),
    });
    if (!upstream.ok) {
      // never pass the provider's message through: it can name the account or the key
      return fail(res, 502, `the voice service answered ${upstream.status}`);
    }
    const audio = new Uint8Array(await upstream.arrayBuffer());
    remember(key, audio);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('X-Voice-Cache', 'miss');
    res.end(audio);
  } catch {
    fail(res, 502, 'the voice service could not be reached');
  }
}
