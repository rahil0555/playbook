import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listenOnce, START_WAIT_MS, voiceErrorKind, type RecognizerFactory, type SpeechRecognizerLike } from './recognizer';

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

  it('interim results are asked for only by a caller that shows them, and never replace the final answer', () => {
    const { made, factory, cb } = setup();
    const onInterim = vi.fn();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, { ...cb, onInterim });
    const r = made[0]!;
    expect(r.interimResults, 'interim results are on when a caller shows them').toBe(true);
    r.begin();
    r.onresult?.({ results: [{ isFinal: false, length: 1, 0: { transcript: 'bal' } }] });
    expect(onInterim).toHaveBeenCalledWith('bal');
    r.heard('ball', 0.9);
    r.onresult?.({ results: [{ isFinal: false, length: 1, 0: { transcript: 'ball ball' } }] });
    r.end();
    expect(cb.onResult).toHaveBeenCalledTimes(1);
    expect(cb.onResult).toHaveBeenCalledWith({ transcript: 'ball', confidence: 0.9 });
  });

  it('a confidence of exactly 0 is not a measurement: it is reported as unknown, not as "not confident"', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.heard('banana', 0);
    made[0]!.end();
    expect(cb.onResult).toHaveBeenCalledWith({ transcript: 'banana', confidence: undefined });
  });

  it('an end with nothing heard is "no speech"', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledWith('no-speech', 'no-speech-event');
    expect(cb.onResult).not.toHaveBeenCalled();
  });

  it('a blank transcript is "no speech" too', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.heard('   ');
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledWith('no-speech', 'no-speech-event');
  });

  it('an error is reported once, and the end that follows it does not report again', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.fail('network');
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledTimes(1);
    expect(cb.onError).toHaveBeenCalledWith('network', 'network');
  });

  it('listening ends by itself after the time limit, so a forgotten microphone never stays on', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 5000 }, cb);
    made[0]!.begin();
    vi.advanceTimersByTime(4999);
    expect(made[0]!.stopped).toBe(false);
    vi.advanceTimersByTime(1);
    expect(made[0]!.stopped).toBe(true);
  });

  it('the time limit counts from the browser starting: a session that never starts is "not started", not "no speech"', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 5000 }, cb);
    vi.advanceTimersByTime(START_WAIT_MS + 1);
    expect(cb.onError).toHaveBeenCalledWith('not-started', 'no-start-event');
    expect(cb.onError).not.toHaveBeenCalledWith('no-speech', expect.anything());
    expect(made[0]!.stopped).toBe(false);
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
    expect(cb.onError).toHaveBeenCalledWith('unsupported', 'no-api');
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
    expect(cb.onError).toHaveBeenCalledWith('not-started', 'start-threw:Error');
  });
});

describe('voiceErrorKind: what the browser calls each failure', () => {
  it('maps the browser names to ours, one kind each', () => {
    expect(voiceErrorKind('not-allowed')).toBe('permission');
    expect(voiceErrorKind('audio-capture')).toBe('no-microphone');
    expect(voiceErrorKind('service-not-allowed')).toBe('speech-service');
    expect(voiceErrorKind('no-speech')).toBe('no-speech');
    expect(voiceErrorKind('network')).toBe('network');
    expect(voiceErrorKind('aborted')).toBe('stt');
    expect(voiceErrorKind('language-not-supported')).toBe('stt');
  });

  it('a refused microphone is never reported as a missing device or a switched-off service', () => {
    expect(voiceErrorKind('audio-capture')).not.toBe('permission');
    expect(voiceErrorKind('service-not-allowed')).not.toBe('permission');
  });
});

describe('listenOnce: the browser error name reaches the caller for the log', () => {
  it('passes the browser error name with the kind', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    made[0]!.fail('not-allowed');
    expect(cb.onError).toHaveBeenCalledWith('permission', 'not-allowed');
  });

  it('a missing device and a switched-off service are their own kinds', () => {
    const device = setup();
    listenOnce(device.factory, { lang: 'en-US', timeoutMs: 8000 }, device.cb);
    device.made[0]!.fail('audio-capture');
    expect(device.cb.onError).toHaveBeenCalledWith('no-microphone', 'audio-capture');

    const service = setup();
    listenOnce(service.factory, { lang: 'en-US', timeoutMs: 8000 }, service.cb);
    service.made[0]!.fail('service-not-allowed');
    expect(service.cb.onError).toHaveBeenCalledWith('speech-service', 'service-not-allowed');
  });
});

describe('listenOnce: a browser that never starts does not leave the child waiting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('after the start wait, it stops, says the browser did not start, and reports once', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 8000 }, cb);
    vi.advanceTimersByTime(START_WAIT_MS + 1);
    expect(made[0]!.aborted).toBe(true);
    expect(cb.onError).toHaveBeenCalledTimes(1);
    expect(cb.onError).toHaveBeenCalledWith('not-started', 'no-start-event');
    made[0]!.end();
    expect(cb.onError).toHaveBeenCalledTimes(1);
  });

  it('once the browser has started, the start wait does not fire', () => {
    const { made, factory, cb } = setup();
    listenOnce(factory, { lang: 'en-US', timeoutMs: 30000 }, cb);
    made[0]!.begin();
    vi.advanceTimersByTime(START_WAIT_MS + 1);
    expect(cb.onError).not.toHaveBeenCalled();
    expect(cb.onListening).toHaveBeenCalledTimes(1);
  });
});
