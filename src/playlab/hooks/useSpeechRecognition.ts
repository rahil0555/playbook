import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  browserRecognizer,
  listenOnce,
  type Listening,
  type RecognizedResult,
  type RecognizerFactory,
  type VoiceErrorKind,
} from '../services/speechInput/recognizer';

/** Where a voice answer is. `checking_support` lasts only until the browser has been asked; `error` also covers "unsupported". */
export type SpeechRecognitionState = 'checking_support' | 'idle' | 'requesting_permission' | 'listening' | 'processing' | 'error';

export interface SpeechRecognitionOptions {
  /** the content language, e.g. 'en' */
  language: string;
  /** the final transcript of a session that heard words. Called once per session. */
  onResult: (result: RecognizedResult) => void;
  /** tests pass a fake recogniser; the app uses the browser's own */
  createRecognizer?: RecognizerFactory;
  /** after this long, listening ends by itself */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 8000;
/** how long the transcript stays on screen after a session */
const HEARD_MS = 4000;

/** The recogniser's language tag. English is listened for as Indian English, as the specification asks. */
export function recognitionLanguage(language: string): string {
  return language === 'en' ? 'en-IN' : language;
}

/** A recogniser is made and dropped, never started, so the microphone is not touched by the check. */
function hasRecognizer(factory: RecognizerFactory): boolean {
  const probe = factory();
  try {
    probe?.abort();
  } catch {
    /* a recogniser that was never started has nothing to abort */
  }
  return probe !== null;
}

/**
 * One speaking session at a time: start, stop without judging, and a clean release on unmount. The transcript is handed to
 * `onResult` only once the browser has finished hearing; judging it is the caller's job. Failures move the state to
 * `error` with a reason, and the next start clears it, so the state can never stay on listening or processing.
 */
export function useSpeechRecognition({ language, onResult, createRecognizer, timeoutMs = DEFAULT_TIMEOUT_MS }: SpeechRecognitionOptions) {
  const factory = useMemo(() => createRecognizer ?? browserRecognizer(), [createRecognizer]);
  // the latest callbacks: a session started earlier still reports to the question that is on screen now
  const latest = useRef({ language, onResult });
  latest.current = { language, onResult };

  const [state, setState] = useState<SpeechRecognitionState>('checking_support');
  const [errorKind, setErrorKind] = useState<VoiceErrorKind | null>(null);
  const [heard, setHeard] = useState<string | null>(null);
  const session = useRef<Listening | null>(null);
  /** counts the sessions: anything a finished or stopped session reports after that does nothing */
  const sessionNo = useRef(0);
  const heardTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (hasRecognizer(factory)) {
      setState('idle');
    } else {
      setErrorKind('unsupported');
      setState('error');
    }
    return () => {
      sessionNo.current += 1;
      session.current?.cancel();
      session.current = null;
      clearTimeout(heardTimer.current);
    };
  }, [factory]);

  const start = useCallback(() => {
    // a repeated tap while a session runs does not open a second one
    if (session.current) return;
    const id = ++sessionNo.current;
    const current = () => id === sessionNo.current;
    // set when the session ends at once (for example, the recogniser refuses to start): then there is no session to keep
    const ended = { value: false };
    const end = () => {
      ended.value = true;
      session.current = null;
    };
    clearTimeout(heardTimer.current);
    setErrorKind(null);
    setHeard(null);
    setState('requesting_permission');

    const handle = listenOnce(factory, { lang: recognitionLanguage(latest.current.language), timeoutMs }, {
      onListening: () => {
        if (current()) setState('listening');
      },
      onResult: (result) => {
        if (!current()) return;
        end();
        setHeard(result.transcript);
        setState('processing');
        heardTimer.current = setTimeout(() => setHeard(null), HEARD_MS);
        try {
          latest.current.onResult(result);
        } finally {
          // whatever the caller did, the child is never left on "processing"
          setState('idle');
        }
      },
      onError: (kind) => {
        if (!current()) return;
        end();
        setErrorKind(kind);
        setState('error');
      },
    });
    if (!ended.value) session.current = handle;
  }, [factory, timeoutMs]);

  /** Stops listening at once and judges nothing: a half-heard answer is never submitted. */
  const stop = useCallback(() => {
    if (!session.current) return;
    sessionNo.current += 1;
    session.current.cancel();
    session.current = null;
    setErrorKind(null);
    setState('idle');
  }, []);

  return { state, errorKind, heard, start, stop };
}
