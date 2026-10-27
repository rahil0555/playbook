import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  browserRecognizer,
  listenOnce,
  type Listening,
  type RecognizedResult,
  type RecognizerFactory,
  type VoiceErrorKind,
} from '../services/speechInput/recognizer';
import type { AudioService } from '../services/audioService';
import { describeVoiceEnvironment, failureFor, logVoiceFailure, refusalFor, type VoiceFailure } from '../services/speechInput/diagnosis';

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
  /** what the browser hears so far, while the child is still speaking. Shown only; the final answer is what is judged. */
  onInterim?: (transcript: string) => void;
  /**
   * the app's speech. Before the app speaks, listening stops and judges nothing, so the app's own voice is never heard as the
   * child's answer. Leave it out where the app does not speak during listening.
   */
  audio?: Pick<AudioService, 'onBeforePlay' | 'stop' | 'setListening'>;
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
 * What the page already knows before anything is tried: no speech recogniser at all, or a page the browser will not listen on.
 * The first frame shows this, so such a page never says "getting the microphone ready" before it says why it cannot listen.
 */
function knownVoiceState(factory: RecognizerFactory): { state: SpeechRecognitionState; errorKind: VoiceErrorKind | null; failure: VoiceFailure | null } {
  if (!hasRecognizer(factory)) return { state: 'error', errorKind: 'unsupported', failure: 'unsupported' };
  if (!window.isSecureContext) return { state: 'error', errorKind: null, failure: 'insecure' };
  return { state: 'checking_support', errorKind: null, failure: null };
}

/**
 * One speaking session at a time: start, stop without judging, and a clean release on unmount. The transcript is handed to
 * `onResult` only once the browser has finished hearing; judging it is the caller's job. Failures move the state to
 * `error` with a reason, and the next start clears it, so the state can never stay on listening or processing.
 *
 * A failure is first shown as its most likely reason, then refined once the page's own settings have been read (insecure page,
 * frame, site setting). Each failure is logged once, with the browser's error name and those settings, never audio or speech.
 */
export function useSpeechRecognition({ language, onResult, onInterim, audio, createRecognizer, timeoutMs = DEFAULT_TIMEOUT_MS }: SpeechRecognitionOptions) {
  const factory = useMemo(() => createRecognizer ?? browserRecognizer(), [createRecognizer]);
  // the latest callbacks: a session started earlier still reports to the question that is on screen now
  const latest = useRef({ language, onResult, onInterim, audio });
  latest.current = { language, onResult, onInterim, audio };

  const [known] = useState(() => knownVoiceState(factory));
  const [state, setState] = useState<SpeechRecognitionState>(known.state);
  const [errorKind, setErrorKind] = useState<VoiceErrorKind | null>(known.errorKind);
  const [failure, setFailure] = useState<VoiceFailure | null>(known.failure);
  const [heard, setHeard] = useState<string | null>(null);
  const session = useRef<Listening | null>(null);
  /** counts the sessions: anything a finished or stopped session reports after that does nothing */
  const sessionNo = useRef(0);
  const heardTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    // checked before the child taps, and without opening the microphone: the browser will not listen on a page that is not secure,
    // so saying so now is kinder than letting a tap fail, and a site that already refuses the microphone is said so at once
    let mounted = true;
    if (!hasRecognizer(factory)) {
      setErrorKind('unsupported');
      setFailure('unsupported');
      setState('error');
    } else if (!window.isSecureContext) {
      setFailure('insecure');
      setState('error');
    } else {
      setState('idle');
      void describeVoiceEnvironment().then((env) => {
        if (!mounted || session.current || env.secureContext === false || env.permission !== 'denied') return;
        setFailure(refusalFor(env));
        setState('error');
      });
    }
    return () => {
      mounted = false;
      sessionNo.current += 1;
      session.current?.cancel();
      session.current = null;
      clearTimeout(heardTimer.current);
      latest.current.audio?.setListening(false);
    };
  }, [factory]);

  const start = useCallback(() => {
    // a repeated tap while a session runs does not open a second one
    if (session.current) return;
    if (!window.isSecureContext) {
      // never ask the browser for the microphone on a page it will not trust
      setErrorKind(null);
      setFailure('insecure');
      setState('error');
      return;
    }
    const id = ++sessionNo.current;
    const current = () => id === sessionNo.current;
    // interim results are asked for only by a caller that shows them; everyone else keeps the final answer only
    const wantsInterim = latest.current.onInterim !== undefined;
    // set when the session ends at once (for example, the recogniser refuses to start): then there is no session to keep
    const ended = { value: false };
    const end = () => {
      ended.value = true;
      session.current = null;
      // the verdict's own sound (if any) is played after this, so it is not lost to the listening rule
      latest.current.audio?.setListening(false);
    };
    clearTimeout(heardTimer.current);
    setErrorKind(null);
    setFailure(null);
    setHeard(null);
    setState('requesting_permission');
    // sound effects are off from now until this session ends, so none can be picked up by the microphone (see setListening)
    latest.current.audio?.setListening(true);

    const handle = listenOnce(factory, { lang: recognitionLanguage(latest.current.language), timeoutMs }, {
      onListening: () => {
        if (current()) setState('listening');
      },
      onInterim: wantsInterim
        ? (text) => {
            if (current()) latest.current.onInterim?.(text);
          }
        : undefined,
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
      onError: (kind, raw) => {
        if (!current()) return;
        end();
        setErrorKind(kind);
        setFailure(failureFor(kind, null));
        setState('error');
        // the page's own settings decide between "the page is not secure", "a frame may not use the microphone" and the rest
        void describeVoiceEnvironment().then((env) => {
          if (!current()) return;
          const reason = failureFor(kind, env);
          setFailure(reason);
          logVoiceFailure(raw, kind, reason, env);
        });
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
    latest.current.audio?.setListening(false);
    setErrorKind(null);
    setFailure(null);
    setState('idle');
  }, []);

  // before the app speaks, listening stops first (cancel, so nothing it heard is judged), and the app's own voice is never heard
  useEffect(() => audio?.onBeforePlay(stop), [audio, stop]);

  return { state, errorKind, failure, heard, start, stop };
}
