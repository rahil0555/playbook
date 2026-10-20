/**
 * Speech input for Play Lab: one reusable listener that turns what a child says into a transcript. It uses the browser's
 * own speech recognition (Chrome and Edge, including Android; Safari on iOS). It needs no key and no server of ours: the
 * browser decides what it sends to its speech service (see docs/VOICE.md). Browsers without it (Firefox) get a typed answer
 * instead. Nothing in this file knows about Play Lab, so other activities can use it too.
 */

export type VoiceErrorKind = 'unsupported' | 'permission' | 'no-speech' | 'stt' | 'network';

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
  /** listening failed; `kind` says why, so the caller can say what to do */
  onError: (kind: VoiceErrorKind) => void;
}

export interface Listening {
  /** finish now: the transcript heard so far is still delivered through onResult */
  stop(): void;
  /** drop it: no callback will run */
  cancel(): void;
}

/** Maps the browser's error names to ours. Anything not listed is a speech-recognition failure. */
export function voiceErrorKind(error: string): VoiceErrorKind {
  switch (error) {
    case 'not-allowed':
    case 'service-not-allowed':
    case 'audio-capture':
      return 'permission';
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

/** Listens for one phrase. Calls exactly one of onResult or onError, once. */
export function listenOnce(create: RecognizerFactory, opts: ListenOptions, cb: ListenCallbacks): Listening {
  const rec = create();
  if (!rec) {
    cb.onError('unsupported');
    return { stop() {}, cancel() {} };
  }
  let done = false;
  let heard: RecognizedResult | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const finish = (report: () => void) => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    report();
  };

  rec.lang = opts.lang;
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onstart = () => {
    if (!done) cb.onListening();
  };
  rec.onresult = (event) => {
    const last = event.results[event.results.length - 1];
    const best = last?.[0];
    if (last?.isFinal && best) heard = { transcript: best.transcript, confidence: usableConfidence(best.confidence) };
  };
  rec.onerror = (event) => finish(() => cb.onError(voiceErrorKind(event.error)));
  rec.onend = () => finish(() => (heard && heard.transcript.trim() ? cb.onResult(heard) : cb.onError('no-speech')));

  timer = setTimeout(() => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  }, opts.timeoutMs);

  try {
    rec.start();
  } catch {
    finish(() => cb.onError('stt'));
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
      clearTimeout(timer);
      try {
        rec.abort();
      } catch {
        /* already stopped */
      }
    },
  };
}
