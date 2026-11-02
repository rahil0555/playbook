import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { allow, callerOf, MAX_TEXT_LENGTH, RATE_LIMIT, rejectReason } from './voice';

/** A response the test can read back. */
function fakeRes() {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 0,
    headers,
    body: undefined as string | Uint8Array | undefined,
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v;
    },
    end: (b?: string | Uint8Array) => {
      res.body = b;
    },
  };
  return res;
}
const req = (t: string, ip = '1.2.3.4') => ({ method: 'GET', url: `/api/voice?t=${encodeURIComponent(t)}`, headers: { 'x-forwarded-for': ip } });
const json = (res: ReturnType<typeof fakeRes>) => JSON.parse(String(res.body)) as { error: string };

const KEY = 'secret-key-value-do-not-leak';

describe('what the endpoint will speak', () => {
  it('refuses an empty line, one that is too long, and one with characters this voice does not say', () => {
    expect(rejectReason('')).toBe('no text');
    expect(rejectReason('a'.repeat(MAX_TEXT_LENGTH + 1))).toMatch(/longer than/);
    expect(rejectReason('<script>alert(1)</script>')).toMatch(/characters/);
    expect(rejectReason('rm -rf / && echo $HOME')).toMatch(/characters/);
  });

  it('accepts the lines the app actually says', () => {
    expect(rejectReason('Hooray! You spelled cat!')).toBeNull();
    expect(rejectReason('Let\u2019s learn it together!')).toBeNull();
    expect(rejectReason('Where is my blue hat?')).toBeNull();
  });
});

describe('who is asking', () => {
  it('reads the first address the platform forwarded', () => {
    expect(callerOf({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' } })).toBe('9.9.9.9');
    expect(callerOf({ headers: {}, socket: { remoteAddress: '7.7.7.7' } })).toBe('7.7.7.7');
    expect(callerOf({ headers: {} })).toBe('unknown');
  });

  it('allows a caller its share and then turns it down', () => {
    const caller = `rate-${Math.random()}`;
    for (let i = 0; i < RATE_LIMIT; i++) expect(allow(caller, 1_000)).toBe(true);
    expect(allow(caller, 1_000)).toBe(false);
    // ...and lets it through again once the window has passed
    expect(allow(caller, 1_000 + 60_001)).toBe(true);
  });
});

describe('the endpoint', () => {
  beforeEach(() => {
    process.env.ELEVENLABS_API_KEY = KEY;
    process.env.ELEVENLABS_VOICE_ID = 'voice-1';
  });
  afterEach(() => {
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_VOICE_ID;
    vi.unstubAllGlobals();
  });

  it('says it is not configured, rather than failing, when the keys are missing', async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const res = fakeRes();
    await handler(req('Hello'), res);
    expect(res.statusCode).toBe(503);
    expect(json(res).error).toMatch(/not configured/);
  });

  it('only answers GET', async () => {
    const res = fakeRes();
    await handler({ ...req('Hello'), method: 'POST' }, res);
    expect(res.statusCode).toBe(405);
  });

  it('sends the key to ElevenLabs as a header and never in the answer', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const res = fakeRes();
    await handler(req('A line that is only said once'), res);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('audio/mpeg');
    const init = fetchMock.mock.calls[0]![1];
    expect((init.headers as Record<string, string>)['xi-api-key']).toBe(KEY);
    expect(String(res.body)).not.toContain(KEY);
    expect(JSON.stringify(res.headers)).not.toContain(KEY);
  });

  it('answers the same line from memory the second time, without asking the voice service again', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ ok: true, arrayBuffer: async () => new Uint8Array([4, 5]).buffer }) as unknown as Response);
    vi.stubGlobal('fetch', fetchMock);
    const line = `A cached line ${Math.random()}`.replace(/[^A-Za-z ]/g, '');
    await handler(req(line), fakeRes());
    const second = fakeRes();
    await handler(req(line), second);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second.headers['x-voice-cache']).toBe('hit');
  });

  it('never passes the voice service’s own message through', async () => {
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 401, text: async () => `invalid key ${KEY}` }) as unknown as Response);
    const res = fakeRes();
    await handler(req(`A refused line ${Date.now()}`.replace(/[^A-Za-z ]/g, '')), res);
    expect(res.statusCode).toBe(502);
    expect(String(res.body)).not.toContain(KEY);
  });

  it('turns down a line it will not speak before any key is used', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = fakeRes();
    await handler(req('<script>'), res);
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
