/**
 * Speech input for Play Lab: one reusable listener that turns what a child says into a transcript. It uses the browser's
 * own speech recognition (Chrome and Edge, including Android; Safari on iOS). It needs no key and no server of ours: the
 * browser decides what it sends to its speech service (see docs/VOICE.md). Browsers without it (Firefox) get a typed answer
 * instead. Nothing in this file knows about Play Lab, so other activities can use it too.
 */

/**
 * What went wrong, as the app tells it apart. Every browser error name maps to exactly one kind (see voiceErrorKind), and a
 * kind is never shown as the cause of a different failure.
 */
export type VoiceErrorKind = 'unsupported' | 'permission' | 'no-microphone' | 'speech-service' | 'not-started' | 'no-speech' | 'stt' | 'network';

export interface RecognizedResult {
  transcript: string;
  /** 0 to 1 when the browser reports it; undefined when it does not */
  confidence?: number;
}

/** The part of the browser's SpeechRecognition this module uses (the DOM typings leave it out). */
export interface SpeechRecognizerLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResultLike> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechAlternativeLike {
  readonly transcript: string;
  readonly confidence?: number;
}
interface SpeechResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  readonly [index: number]: SpeechAlternativeLike;
}

/** Makes a recogniser, or null where the browser has none. Tests pass their own. */
export type RecognizerFactory = () => SpeechRecognizerLike | null;

/** The browser's recogniser, when there is one (SpeechRecognition, or Safari's prefixed webkitSpeechRecognition). */
export function browserRecognizer(win: Window = window): RecognizerFactory {
  return () => {
    const w = win as unknown as { SpeechRecognition?: new () => SpeechRecognizerLike; webkitSpeechRecognition?: new () => SpeechRecognizerLike };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    return Ctor ? new Ctor() : null;
  };
}

export interface ListenOptions {
  /** BCP-47 tag, e.g. 'en-US' */
  lang: string;
  /** after this long the listening ends by itself, so a forgotten microphone never stays on */
  timeoutMs: number;
}

export interface ListenCallbacks {
  /** the browser has started listening (after any permission prompt) */
  onListening: () => void;
  /** the final transcript, once the browser has finished listening */
  onResult: (result: RecognizedResult) => void;
  /**
   * listening failed. `kind` says why, so the caller can say what to do. `error` is the browser's own error name (or a short
   * note from this module): it is for the diagnostic log only, and never contains audio or what was said.
   */
  onError: (kind: VoiceErrorKind, error: string) => void;
  /**
   * optional: what the browser thinks it hears so far. It may still change and is never judged; only the final transcript is.
   * Asking for it turns on the browser's interim results, so leave it out where only the final answer matters.
   */
  onInterim?: (transcript: string) => void;
}

export interface Listening {
  /** finish now: the transcript heard so far is still delivered through onResult */
  stop(): void;
  /** drop it: no callback will run */
  cancel(): void;
}

/**
 * How long the browser has to say it has started listening. A permission prompt can wait on the child, so this is generous; but a
 * browser that never starts and never reports an error must not leave the child waiting on "listening" forever.
 */
export const START_WAIT_MS = 12000;

/**
 * Maps the browser's error names to ours. Each name has its own kind: a refused microphone, a microphone that cannot be opened
 * and a speech service that is switched off are different problems with different fixes, so they are never merged. Anything not
 * listed is a speech-recognition failure.
 */
export function voiceErrorKind(error: string): VoiceErrorKind {
  switch (error) {
    // the browser refused the microphone. It also says this for an insecure page or a frame without the microphone permission.
    case 'not-allowed':
      return 'permission';
    // no usable input device, or the browser could not open the one it chose
    case 'audio-capture':
      return 'no-microphone';
    // the browser is not allowing speech recognition at all (its settings or policy)
    case 'service-not-allowed':
      return 'speech-service';
    case 'no-speech':
      return 'no-speech';
    case 'network':
      return 'network';
    default:
      return 'stt';
  }
}

/**
 * A confidence of exactly 0 is treated as "not provided". The specification does not make 0 a measurement, and a browser
 * that cannot score a result may report it; penalising a child for that would be wrong. (Not verified on real devices.)
 */
export function usableConfidence(value: number | undefined): number | undefined {
  return typeof value === 'number' && value > 0 ? value : undefined;
}

/** The name of a thrown error, for the log. Never the message: a message can contain anything. */
function errorName(error: unknown): string {
  return error instanceof Error ? error.name : 'unknown';
}

/** Listens for one phrase. Calls exactly one of onResult or onError, once. */
export function listenOnce(create: RecognizerFactory, opts: ListenOptions, cb: ListenCallbacks): Listening {
  const rec = create();
  if (!rec) {
    cb.onError('unsupported', 'no-api');
    return { stop() {}, cancel() {} };
  }
  let done = false;
  let heard: RecognizedResult | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let startTimer: ReturnType<typeof setTimeout> | undefined;
  const clearTimers = () => {
    clearTimeout(timer);
    clearTimeout(startTimer);
  };
  const finish = (report: () => void) => {
    if (done) return;
    done = true;
    clearTimers();
    report();
  };

  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = Boolean(cb.onInterim);
  rec.maxAlternatives = 1;
  rec.onstart = () => {
    if (done) return;
    clearTimeout(startTimer);
    // the listening limit counts from when the browser has really started, not from the call (a session that never starts has none)
    timer = setTimeout(stopNow, opts.timeoutMs);
    cb.onListening();
  };
  rec.onresult = (event) => {
    if (done) return;
    const last = event.results[event.results.length - 1];
    const best = last?.[0];
    if (last?.isFinal && best) heard = { transcript: best.transcript, confidence: usableConfidence(best.confidence) };
    else if (best?.transcript.trim()) cb.onInterim?.(best.transcript);
  };
  rec.onerror = (event) => finish(() => cb.onError(voiceErrorKind(event.error), event.error));
  rec.onend = () => finish(() => (heard && heard.transcript.trim() ? cb.onResult(heard) : cb.onError('no-speech', 'no-speech-event')));

  const stopNow = () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };

  // no start and no error from the browser: say so, and stop waiting
  startTimer = setTimeout(() => {
    finish(() => {
      try {
        rec.abort();
      } catch {
        /* never started */
      }
      cb.onError('not-started', 'no-start-event');
    });
  }, START_WAIT_MS);

  try {
    rec.start();
  } catch (error) {
    finish(() => cb.onError('not-started', `start-threw:${errorName(error)}`));
  }

  return {
    stop() {
      if (done) return;
      try {
        rec.stop();
      } catch {
        /* already stopped */
      }
    },
    cancel() {
      if (done) return;
      done = true;
      clearTimers();
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}
