import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { browserRecognizer, listenOnce, type Listening, type RecognizerFactory, type VoiceErrorKind } from '../services/speechInput/recognizer';
import { evaluateVoiceAnswer, VOICE_MESSAGES, type VoiceEvaluation } from '../services/speechInput/evaluate';
import { Button } from './Button';
import { FeedbackMessage } from './FeedbackMessage';

/** Where the speaking practice is (the Play Lab voice specification's states). */
export type VoiceState = 'idle' | 'requesting_permission' | 'listening' | 'processing' | 'evaluating' | 'success' | 'error';

interface VoicePracticeProps {
  /** what the child may say: the first is the answer shown in feedback, and every one of them is accepted */
  expected: readonly string[];
  /** the question, in words, e.g. "Say the word for the picture" */
  prompt: string;
  /** BCP-47 tag for the recogniser */
  lang?: string;
  /** after this long, listening ends by itself */
  listenMs?: number;
  /** tests pass a fake recogniser; the app uses the browser's own */
  createRecognizer?: RecognizerFactory;
}

const ERROR_TEXT: Record<VoiceErrorKind, string> = {
  permission: VOICE_MESSAGES.permission,
  'no-speech': VOICE_MESSAGES.noSpeech,
  stt: VOICE_MESSAGES.stt,
  network: VOICE_MESSAGES.network,
  unsupported: VOICE_MESSAGES.unsupported,
};

/** True only when the browser has already refused the microphone. Browsers that cannot say (Safari) ask when listening starts. */
async function microphoneBlocked(): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return status.state === 'denied';
  } catch {
    return false;
  }
}

/**
 * Speaking practice for one question: a microphone button, a listening state with a stop button, the transcript the child
 * said (so the result is transparent), a Correct / Needs improvement / Try again result, and a typed answer whenever speech
 * is not available or fails. Reusable: it knows the question only through `expected` and `prompt`.
 */
export function VoicePractice({ expected, prompt, lang = 'en-US', listenMs = 8000, createRecognizer }: VoicePracticeProps) {
  const factory = useMemo(() => createRecognizer ?? browserRecognizer(), [createRecognizer]);
  const supported = useMemo(() => {
    const probe = factory();
    try {
      probe?.abort();
    } catch {
      /* a recogniser that was never started has nothing to abort */
    }
    return probe !== null;
  }, [factory]);
  const inputId = useId();

  const [state, setState] = useState<VoiceState>(supported ? 'idle' : 'error');
  const [message, setMessage] = useState<string | null>(supported ? null : VOICE_MESSAGES.unsupported);
  const [transcript, setTranscript] = useState('');
  const [typedLast, setTypedLast] = useState(false);
  const [evaluation, setEvaluation] = useState<VoiceEvaluation | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [typing, setTyping] = useState(!supported);
  const [typed, setTyped] = useState('');
  const listening = useRef<Listening | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval>>();
  const mounted = useRef(true);
  /** counts the attempts: a callback from an older attempt (a late result, a late permission answer) does nothing */
  const attempt = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      attempt.current += 1;
      listening.current?.cancel();
      clearInterval(ticker.current);
    };
  }, []);

  const stopTicker = () => clearInterval(ticker.current);

  /** drops the attempt in progress, if any: the microphone is released and nothing it reports from now on is shown */
  const dropAttempt = () => {
    attempt.current += 1;
    listening.current?.cancel();
    listening.current = null;
    stopTicker();
  };

  /** speech failed: say why, and offer typing (the specification: the child can retry or type the answer instead) */
  const fail = (text: string) => {
    stopTicker();
    setMessage(text);
    setEvaluation(null);
    setState('error');
    setTyping(true);
  };

  /** one transcript (spoken or typed) judged against the expected answers */
  const judge = (heard: string, confidence: number | undefined, typedAnswer: boolean) => {
    // the first answer is final: a typed answer releases the microphone, and no late speech can replace it
    dropAttempt();
    setTranscript(heard);
    setTypedLast(typedAnswer);
    setState('processing');
    setState('evaluating');
    const ev = evaluateVoiceAnswer(heard, expected, confidence);
    if (ev.result === 'retry') {
      fail(ev.feedback);
      return;
    }
    setMessage(null);
    setEvaluation(ev);
    setState('success');
  };

  const start = async () => {
    setMessage(null);
    setEvaluation(null);
    setTranscript('');
    setTyping(false);
    setState('requesting_permission');
    const id = ++attempt.current;
    const current = () => id === attempt.current;
    if (await microphoneBlocked()) {
      if (current() && mounted.current) fail(VOICE_MESSAGES.permission);
      return;
    }
    // the child may have typed an answer, retried or left while the browser was answering: then nothing opens
    if (!current() || !mounted.current) return;
    listening.current = listenOnce(factory, { lang, timeoutMs: listenMs }, {
      onListening: () => {
        if (!current()) return;
        setState('listening');
        setSeconds(0);
        stopTicker();
        ticker.current = setInterval(() => setSeconds((n) => n + 1), 1000);
      },
      onResult: (r) => {
        if (!current()) return;
        stopTicker();
        listening.current = null;
        judge(r.transcript, r.confidence, false);
      },
      onError: (kind) => {
        if (!current()) return;
        listening.current = null;
        fail(ERROR_TEXT[kind]);
      },
    });
  };

  const stop = () => listening.current?.stop();

  /** back to the start: nothing from the last attempt stays on screen */
  const again = () => {
    dropAttempt();
    setMessage(supported ? null : VOICE_MESSAGES.unsupported);
    setEvaluation(null);
    setTranscript('');
    setTyped('');
    setTyping(!supported);
    setState(supported ? 'idle' : 'error');
  };

  const submitTyped = () => {
    const text = typed.trim();
    if (!text) return;
    setTyped('');
    judge(text, undefined, true);
  };
  const onTypedSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitTyped();
  };

  const busy = state === 'requesting_permission' || state === 'listening' || state === 'processing' || state === 'evaluating';
  const statusText =
    state === 'idle'
      ? 'Tap the microphone and say the answer.'
      : state === 'requesting_permission'
        ? 'Waiting for the microphone. Allow it if your browser asks.'
        : state === 'listening'
          ? `Listening… ${seconds}s`
          : state === 'processing' || state === 'evaluating'
            ? 'Checking your answer…'
            : '';

  return (
    <section aria-label="Say your answer" data-voice-state={state} className="flex w-full flex-col items-center gap-3 rounded-[2rem] bg-white/85 px-4 py-4 text-center shadow-soft">
      <p className="font-display text-lg font-bold text-ink">{prompt}</p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {supported && state !== 'listening' ? (
          <button
            type="button"
            aria-label="Speak your answer"
            disabled={busy}
            onClick={start}
            className="grid h-16 w-16 place-items-center rounded-full bg-brand-600 text-white shadow-[0_5px_0_#0b6b57] transition active:translate-y-0.5 disabled:opacity-60"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
            </svg>
          </button>
        ) : null}
        {state === 'listening' ? (
          <>
            <span aria-hidden="true" className="pl-aura inline-block h-6 w-6 rounded-full bg-brand-400" />
            <Button variant="secondary" accent="sun" icon="close" onClick={stop}>
              Stop
            </Button>
          </>
        ) : null}
        {state === 'success' ? (
          <Button variant="secondary" accent="brand" icon="refresh" onClick={again}>
            Say it again
          </Button>
        ) : null}
      </div>

      {statusText ? (
        <p role="status" aria-live="polite" className="text-base text-ink-soft">
          {statusText}
        </p>
      ) : null}

      {transcript ? (
        <p className="text-lg text-ink">
          {typedLast ? 'You typed' : 'You said'}: <strong>“{transcript}”</strong>
        </p>
      ) : null}

      {state === 'success' && evaluation ? (
        <FeedbackMessage key="result" tone={evaluation.result === 'correct' ? 'success' : 'hint'} title={evaluation.result === 'correct' ? 'Correct!' : 'Needs improvement'}>
          {evaluation.feedback}
        </FeedbackMessage>
      ) : null}
      {state === 'error' && message ? (
        <FeedbackMessage key="error" tone="retry" title="Let’s try again">
          {message}
        </FeedbackMessage>
      ) : null}

      {typing ? (
        <form onSubmit={onTypedSubmit} className="flex flex-wrap items-center justify-center gap-2">
          <label htmlFor={inputId} className="sr-only">
            Type your answer
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type it here"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="min-h-[3rem] rounded-2xl border-2 border-brand-300 bg-white px-4 font-display text-xl text-ink focus:outline-none focus:ring-4 focus:ring-brand-200"
          />
          <Button variant="primary" accent="brand" icon="check" disabled={!typed.trim()} onClick={submitTyped}>
            Check
          </Button>
        </form>
      ) : supported && (state === 'idle' || state === 'requesting_permission' || state === 'listening') ? (
        <button type="button" onClick={() => setTyping(true)} className="min-h-[2.75rem] px-3 text-sm font-bold text-brand-700 underline">
          Type it instead
        </button>
      ) : null}
    </section>
  );
}
