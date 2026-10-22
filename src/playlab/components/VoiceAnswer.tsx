import { useSpeechRecognition, type SpeechRecognitionState } from '../hooks/useSpeechRecognition';
import { VOICE_MESSAGES } from '../services/speechInput/evaluate';
import type { RecognizedResult, RecognizerFactory, VoiceErrorKind } from '../services/speechInput/recognizer';
import { Button } from './Button';

/** What the child sees: the hook's states, plus `done` once the word has been spelled by voice. */
export type VoiceAnswerView = SpeechRecognitionState | 'done';

/** Word Builder has no typing box, so the fallback here is the tap and drag the child already has. */
const MESSAGES: Record<VoiceErrorKind, string> = {
  unsupported: 'Speaking answers is not available in this browser. Drag or tap the letters instead.',
  permission: 'The microphone is blocked. You can still drag or tap the letters.',
  'no-speech': VOICE_MESSAGES.noSpeech,
  stt: VOICE_MESSAGES.stt,
  network: VOICE_MESSAGES.network,
};

interface VoiceAnswerProps {
  /** the content language, e.g. 'en' */
  language: string;
  /** the word is already spelled: say so and stop offering the microphone */
  solved?: boolean;
  /** receives the final transcript; the caller judges it and feeds it through the activity's own answer path */
  onTranscript: (result: RecognizedResult) => void;
  /** tests pass a fake recogniser; the app uses the browser's own */
  createRecognizer?: RecognizerFactory;
}

/**
 * Speaking the answer to a picture: one microphone button, a listening state with a Stop control, and a line of status
 * that always says what is happening. It judges nothing itself: the transcript goes to `onTranscript`. A failure is shown
 * with the fallback the child already has, and never counts as an answer.
 */
export function VoiceAnswer({ language, solved = false, onTranscript, createRecognizer }: VoiceAnswerProps) {
  const { state, errorKind, heard, start, stop } = useSpeechRecognition({ language, onResult: onTranscript, createRecognizer });

  if (state === 'checking_support') return null;

  const view: VoiceAnswerView = solved ? 'done' : state;
  const busy = state === 'requesting_permission' || state === 'listening' || state === 'processing';

  const status = (() => {
    if (solved) return 'You said it! The word is spelled.';
    if (state === 'error' && errorKind) return MESSAGES[errorKind];
    if (state === 'requesting_permission') return 'Waiting for the microphone. Allow it if your browser asks.';
    if (state === 'listening') return 'Listening… say the word.';
    if (state === 'processing') return 'Checking what you said…';
    if (heard) return `You heard: “${heard}”`;
    return 'Tap Speak answer, then say the word.';
  })();

  // no microphone at all: explain once, and leave the letters to the child
  const offerMicrophone = !solved && !(state === 'error' && errorKind === 'unsupported');

  return (
    <section aria-label="Voice answer" data-voice-state={view} className="flex w-full flex-col items-center gap-2 text-center">
      {offerMicrophone ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {state === 'listening' ? <span aria-hidden="true" className="pl-aura inline-block h-6 w-6 rounded-full bg-brand-400" /> : null}
          {busy ? (
            <Button variant="secondary" accent="sun" icon="close" onClick={stop}>
              Stop
            </Button>
          ) : (
            <button
              type="button"
              aria-label="Speak answer"
              onClick={start}
              className="inline-flex min-h-[3rem] items-center gap-2 rounded-full bg-brand-600 px-5 font-display text-lg font-bold text-white shadow-[0_5px_0_#0b6b57] transition active:translate-y-0.5"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
              </svg>
              Speak answer
            </button>
          )}
        </div>
      ) : null}
      <p role="status" aria-live="polite" className="text-base text-ink-soft">
        {status}
      </p>
    </section>
  );
}
