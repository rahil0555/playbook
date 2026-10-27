import { useEffect, useRef } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { useVoiceTask, type VoicePhase } from '../hooks/useVoiceTask';
import type { SpeakOutcome } from '../services/audioService';
import type { RecognizerFactory } from '../services/speechInput/recognizer';
import { FAILURE_COPY, type VoiceTask, type VoiceVerdict } from '../services/speechInput/tasks';
import { Button } from './Button';
import { PronunciationControl } from './PronunciationControl';

interface VoiceTaskPanelProps {
  /** what the child is asked to say, and how it is judged */
  task: VoiceTask;
  /** the question in plain words, e.g. "Say the letter's name." */
  prompt: string;
  /**
   * plays the model pronunciation again, when the question has one. A question whose model would give the answer away (Sound
   * Discovery) has none, so there is no "Listen again" button for it.
   */
  playModel?: () => Promise<SpeakOutcome> | void;
  createRecognizer?: RecognizerFactory;
  /**
   * true while the microphone is on or being turned on, and false again once it is off. The page turns its own speech buttons
   * off while this is true, so nothing is said over the child. It is set to false when this panel goes away.
   */
  onListeningChange?: (listening: boolean) => void;
}

/**
 * The words the child reads for each phase, read aloud by the status line. They never change while the child is only
 * speaking, so the line is not re-read for every word the browser hears (that is shown separately, and is not announced).
 */
function statusFor(phase: VoicePhase, verdict: VoiceVerdict | null, failure: string | null): string {
  if (verdict) return verdict.message;
  switch (phase) {
    case 'ready':
      return 'Tap Speak now when you are ready.';
    case 'starting':
      return 'Getting the microphone ready. Allow it if your browser asks.';
    case 'listening':
      return 'Listening… say it now. Tap Stop when you are done.';
    case 'evaluating':
      return 'Let me check…';
    default:
      return failure && failure in FAILURE_COPY ? FAILURE_COPY[failure as keyof typeof FAILURE_COPY] : 'Something went wrong. Tap Try again.';
  }
}

/**
 * A "Your turn" speaking question, used by Letter Playground and Sound Discovery. One main button is the next step: Speak now,
 * then Stop while listening, then Try again. It stays in the same place from start to failure or a wrong answer, so keyboard
 * focus is never lost. Focus moves on purpose: to Stop when listening starts; to the words after a correct answer (no button is
 * left to focus); and to Try again after any other answer. The model pronunciation is a tap away, and is off while listening.
 */
export function VoiceTaskPanel({ task, prompt, playModel, createRecognizer, onListeningChange }: VoiceTaskPanelProps) {
  const { audio } = usePlayLab();
  const { phase, verdict, interim, failure, start, stop } = useVoiceTask({ task, createRecognizer });
  const primary = useRef<HTMLButtonElement>(null);
  const status = useRef<HTMLParagraphElement>(null);
  const speaking = phase === 'starting' || phase === 'listening';
  // the main button is shown in every phase except a correct answer (nothing more to say), an unsupported browser and a page that is
  // not secure or is framed (a tap cannot change either of those, so the button would only fail again)
  const showPrimary = phase !== 'unsupported' && phase !== 'page-blocked' && phase !== 'correct';

  const listen = () => {
    // the model is stopped first, so the speaker's own voice is not heard by the microphone
    audio.stop();
    start();
  };

  useEffect(() => {
    if (phase === 'listening') primary.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (!verdict) return;
    if (verdict.outcome === 'correct') status.current?.focus();
    else primary.current?.focus();
  }, [verdict]);

  const reportListening = useRef(onListeningChange);
  reportListening.current = onListeningChange;
  useEffect(() => {
    reportListening.current?.(speaking);
  }, [speaking]);
  useEffect(() => () => reportListening.current?.(false), []);

  const heardSoFar = phase === 'listening' && interim ? `I hear: “${interim}”` : null;

  return (
    <section aria-label="Your turn" className="pl-paper rounded-[1.6rem] p-3 text-left">
      <h3 className="font-display text-lg font-bold">Your turn</h3>
      <p className="text-sm text-ink-soft">{prompt}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {playModel ? <PronunciationControl label="Listen again" accent="sky" disabled={speaking} onPlay={() => playModel()} /> : null}
        {showPrimary ? (
          <Button
            ref={primary}
            variant={speaking ? 'secondary' : 'primary'}
            accent={speaking ? 'plum' : 'coral'}
            onClick={speaking ? stop : listen}
            disabled={phase === 'evaluating'}
          >
            {speaking ? 'Stop' : phase === 'ready' || phase === 'evaluating' ? 'Speak now' : 'Try again'}
          </Button>
        ) : null}
      </div>
      <p ref={status} role="status" aria-live="polite" tabIndex={-1} className="mt-2 text-[0.98rem] leading-snug">
        {statusFor(phase, verdict, failure)}
      </p>
      {heardSoFar ? (
        <p aria-live="off" className="text-sm text-ink-soft">
          {heardSoFar}
        </p>
      ) : null}
    </section>
  );
}
