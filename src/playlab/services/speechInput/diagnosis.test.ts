import { afterEach, describe, expect, it, vi } from 'vitest';
import { describeVoiceEnvironment, failureFor, logVoiceFailure, refusalFor, type VoiceEnvironment } from './diagnosis';

const page = (over: Partial<VoiceEnvironment> = {}): VoiceEnvironment => ({
  secureContext: true,
  framed: false,
  policy: 'unknown',
  permission: 'prompt',
  hasSpeechApi: true,
  userAgent: 'test-agent',
  ...over,
});

/** a stand-in for the page's window: only the parts the diagnosis reads */
function fakeWindow(parts: { secure?: boolean; framed?: boolean; policy?: boolean | 'missing'; speech?: 'standard' | 'webkit' | 'none' } = {}) {
  const top = {};
  const self = parts.framed ? {} : top;
  const doc: Record<string, unknown> = {};
  if (parts.policy !== 'missing' && parts.policy !== undefined) doc.permissionsPolicy = { allowsFeature: () => parts.policy as boolean };
  const win: Record<string, unknown> = { isSecureContext: parts.secure ?? true, top, self, document: doc };
  if (parts.speech === 'standard') win.SpeechRecognition = function () {};
  if (parts.speech === 'webkit') win.webkitSpeechRecognition = function () {};
  return win as unknown as Window;
}

const navWith = (query: () => Promise<{ state: PermissionState }>, userAgent = 'ua') =>
  ({ permissions: { query }, userAgent }) as unknown as Navigator;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('refusalFor: why the browser refused the microphone', () => {
  it('a page that is not secure is the cause, whatever the permission says', () => {
    expect(refusalFor(page({ secureContext: false, permission: 'granted' }))).toBe('insecure');
  });

  it('a frame whose page does not allow the microphone is embedded', () => {
    expect(refusalFor(page({ framed: true, policy: 'blocked', permission: 'denied' }))).toBe('embedded');
  });

  it('a frame that reads "denied" with no policy to read is treated as embedded (it may be the parent page)', () => {
    expect(refusalFor(page({ framed: true, policy: 'unknown', permission: 'denied' }))).toBe('embedded');
  });

  it('a frame that the page allows is judged on its own permission, not as embedded', () => {
    expect(refusalFor(page({ framed: true, policy: 'allowed', permission: 'denied' }))).toBe('site-blocked');
  });

  it('a site whose microphone is turned off is site-blocked', () => {
    expect(refusalFor(page({ permission: 'denied' }))).toBe('site-blocked');
  });

  it('otherwise the browser or the device refused, and the message says what to check', () => {
    expect(refusalFor(page({ permission: 'prompt' }))).toBe('refused');
    expect(refusalFor(page({ permission: 'unknown' }))).toBe('refused');
  });
});

describe('failureFor: every browser error keeps its own meaning', () => {
  it('a permission error is only a refusal, and waits for the page to be read', () => {
    expect(failureFor('permission', null)).toBe('refused');
    expect(failureFor('permission', page({ secureContext: false }))).toBe('insecure');
  });

  it('a start that never happens on a page that is not secure is the page, not a silent browser', () => {
    expect(failureFor('not-started', page({ secureContext: false }))).toBe('insecure');
    expect(failureFor('not-started', page({ secureContext: true }))).toBe('not-started');
    expect(failureFor('not-started', null)).toBe('not-started');
  });

  it('a missing device, a switched-off service and a network error keep their own failures', () => {
    expect(failureFor('no-microphone', page({ permission: 'denied' }))).toBe('no-microphone');
    expect(failureFor('speech-service', null)).toBe('speech-service');
    expect(failureFor('network', null)).toBe('network');
    expect(failureFor('no-speech', null)).toBe('no-speech');
    expect(failureFor('stt', null)).toBe('unclear');
    expect(failureFor('unsupported', null)).toBe('unsupported');
  });
});

describe('describeVoiceEnvironment: reads the page, asks for nothing', () => {
  it('reads security, framing, the microphone policy, the permission and the speech API', async () => {
    const env = await describeVoiceEnvironment(fakeWindow({ secure: true, framed: true, policy: false, speech: 'webkit' }), navWith(async () => ({ state: 'denied' }), 'Edg/120'));
    expect(env).toEqual({ secureContext: true, framed: true, policy: 'blocked', permission: 'denied', hasSpeechApi: true, userAgent: 'Edg/120' });
  });

  it('says "unknown" where the browser does not report a value, and never throws', async () => {
    const env = await describeVoiceEnvironment(fakeWindow({ policy: 'missing', speech: 'none' }), navWith(async () => Promise.reject(new Error('not supported'))));
    expect(env.policy).toBe('unknown');
    expect(env.permission).toBe('unknown');
    expect(env.hasSpeechApi).toBe(false);
  });

  it('a browser with no permissions API reports the permission as unknown', async () => {
    const env = await describeVoiceEnvironment(fakeWindow({ speech: 'standard' }), { userAgent: 'x' } as unknown as Navigator);
    expect(env.permission).toBe('unknown');
    expect(env.hasSpeechApi).toBe(true);
  });

  it('never asks for the microphone: it does not call start or getUserMedia', async () => {
    const getUserMedia = vi.fn();
    const nav = { ...navWith(async () => ({ state: 'prompt' })), mediaDevices: { getUserMedia } } as unknown as Navigator;
    await describeVoiceEnvironment(fakeWindow({ speech: 'standard' }), nav);
    expect(getUserMedia).not.toHaveBeenCalled();
  });
});

describe('logVoiceFailure: one line that a grown-up or a developer can share', () => {
  it('holds the browser error name, the failure, and the page settings, and nothing said by the child', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logVoiceFailure('not-allowed', 'permission', 'site-blocked', page({ permission: 'denied', userAgent: 'Chrome' }));
    expect(warn).toHaveBeenCalledTimes(1);
    const [message, detail] = warn.mock.calls[0]!;
    expect(String(message)).toContain('[PlayLab voice]');
    expect(detail).toMatchObject({ error: 'not-allowed', kind: 'permission', reason: 'site-blocked' });
    expect(detail).toMatchObject({ environment: { permission: 'denied', secureContext: true, userAgent: 'Chrome' } });
  });
});
