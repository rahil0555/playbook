import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listenOnce, voiceErrorKind, type RecognizerFactory, type SpeechRecognizerLike } from './recognizer';

/** A recogniser the test drives by hand: it records what it was asked to do and fires the events on demand. */
class FakeRecognizer implements SpeechRecognizerLike {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: SpeechRecognizerLike['onresult'] = null;
  onerror: SpeechRecognizerLike['onerror'] = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  aborted = false;
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
  abort() {
    this.aborted = true;
  }
  begin() {
    this.onstart?.();
  }
  heard(transcript: string, confidence?: number) {
    const alternative = { transcript, confidence };
    this.onresult?.({ results: [{ isFinal: true, length: 1, 0: alternative }] });
  }
  fail(error: string) {
    this.onerror?.({ error });
  }
  end() {
    this.onend?.();
  }
}

function setup(create?: () => FakeRecognizer | null) {
  const made: FakeRecognizer[] = [];
  const factory: RecognizerFactory = create ?? (() => {
    const r = new FakeRecognizer();
    made.push(r);
    return r;
  });
  const cb = { onListening: vi.fn(), onResult: vi.fn(), onError: vi.fn() };
  return { made, factory, cb };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('listenOnce: one phrase, one outcome', () => {
  it('delivers the final transcript and its confidence once the browser has finished', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    const r = made[0]!;
    expect(r.started, 'listening starts').toBe(true);
    expect(r.lang).toBe('en-US');
    expect(r.interimResults, 'only the final result is wanted').toBe(false);
    r.begin();
    expect(cb.onListening).toHaveBeenCalledTimes(1);
    r.heard('apple', 0.92);
    r.end();
    expect(cb.onResult).toHaveBeenCalledWith({ transcript: 'apple', confidence: 0.92 });
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('an end with nothing heard is "no speech"', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledWith('no-speech');
    expect(cb.onResult).not.toHaveBeenCalled();
  });

  it('a blank transcript is "no speech" too', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.heard('   ');
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledWith('no-speech');
  });

  it('an error is reported once, and the end that follows it does not report again', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.fail('network');
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledTimes(1);
    expect(cb.onError).toHaveBeenCalledWith('network');
  });

  it('listening ends by itself after the time limit, so a forgotten microphone never stays on', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 5000 }, cb);
    vi.advanceTimersByTime(4999);
    expect(made[0]!.stopped).toBe(false);
    vi.advanceTimersByTime(1);
    expect(made[0]!.stopped).toBe(true);
  });

  it('stop() finishes now and still delivers what was heard', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb).stop();
    expect(made[0]!.stopped).toBe(true);
    made[0]!.heard('apple');
    made[0]!.end();
    expect(cb.onResult).toHaveBeenCalledWith({ transcript: 'apple', confidence: undefined });
  });

  it('cancel() drops it: no callback runs after that', () => {
    const { made, factory, cb } = setup();
    const handle = listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    handle.cancel();
    expect(made[0]!.aborted).toBe(true);
    made[0]!.heard('apple');
    made[0]!.end();
    made[0]!.fail('network');
    expect(cb.onResult).not.toHaveBeenCalled();
    expect(cb.onError).not.toHaveBeenCalled();
  });

  it('with no recogniser in the browser it says so at once', () => {
    const { factory, cb } = setup(() => null);
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    expect(cb.onError).toHaveBeenCalledWith('unsupported');
  });

  it('if the browser refuses to start, that is a speech failure', () => {
    const { factory, cb } = setup(() => {
      const r = new FakeRecognizer();
      r.start = () => {
        throw new Error('already started');
      };
      return r;
    });
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    expect(cb.onError).toHaveBeenCalledWith('stt');
  });
});

describe('voiceErrorKind: what the browser calls each failure', () => {
  it('maps the browser names to ours', () => {
    expect(voiceErrorKind('not-allowed')).toBe('permission');
    expect(voiceErrorKind('service-not-allowed')).toBe('permission');
    expect(voiceErrorKind('audio-capture')).toBe('permission');
    expect(voiceErrorKind('no-speech')).toBe('no-speech');
    expect(voiceErrorKind('network')).toBe('network');
    expect(voiceErrorKind('aborted')).toBe('stt');
    expect(voiceErrorKind('language-not-supported')).toBe('stt');
  });
});
