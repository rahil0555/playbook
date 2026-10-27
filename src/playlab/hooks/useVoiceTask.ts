import { useCallback, useEffect, useRef, useState } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import type { VoiceFailure } from '../services/speechInput/diagnosis';
import type { RecognizerFactory } from '../services/speechInput/recognizer';
import { evaluateVoiceTask, type VoiceOutcome, type VoiceTask, type VoiceVerdict } from '../services/speechInput/tasks';
import { type SpeechRecognitionState, useSpeechRecognition } from './useSpeechRecognition';

/** The one state a speaking panel shows at a time. The verdict outcomes are phases too. */
export type VoicePhase =
  | 'ready'
  | 'starting'
  | 'listening'
  | 'evaluating'
  | VoiceOutcome
  | 'denied'
  | 'page-blocked'
  | 'no-microphone'
  | 'service-unavailable'
  | 'unsupported'
  | 'recoverable';

export interface VoiceTaskOptions {
  task: VoiceTask;
  /** called once for each attempt, with the verdict for the question that attempt was made for */
  onVerdict?: (verdict: VoiceVerdict) => void;
  /** tests pass a fake recogniser; the app uses the browser's own */
  createRecognizer?: RecognizerFactory;
}

const PHASE_FOR_FAILURE: Record<VoiceFailure, VoicePhase> = {
  unsupported: 'unsupported',
  insecure: 'page-blocked',
  embedded: 'page-blocked',
  'site-blocked': 'denied',
  refused: 'denied',
  'no-microphone': 'no-microphone',
  'speech-service': 'service-unavailable',
  'not-started': 'recoverable',
  network: 'recoverable',
  'no-speech': 'nothing-heard',
  unclear: 'recoverable',
};

/** Which single state to show, from the speech state, the failure (if any) and the verdict (if any). */
export function phaseFor(state: SpeechRecognitionState, failure: VoiceFailure | null, verdict: VoiceVerdict | null): VoicePhase {
  if (verdict) return verdict.outcome;
  switch (state) {
    case 'checking_support':
    case 'requesting_permission':
      return 'starting';
    case 'listening':
      return 'listening';
    case 'processing':
      return 'evaluating';
    case 'idle':
      return 'ready';
    case 'error':
      return failure ? PHASE_FOR_FAILURE[failure] : 'recoverable';
  }
}

/**
 * One speaking question. It listens for one attempt at a time, judges that attempt against the question it was asked for, and
 * reports the verdict once. A late or repeated result, or one that arrives after the question has changed, is dropped. Listening
 * stops when the question changes and when the tab is hidden, so the microphone is never left on by accident.
 */
export function useVoiceTask({ task, onVerdict, createRecognizer }: VoiceTaskOptions) {
  const { content, audio } = usePlayLab();
  const current = useRef(task);
  current.current = task;
  const verdictHandler = useRef(onVerdict);
  verdictHandler.current = onVerdict;
  /** the question the attempt now listening was asked for; null when no attempt is waiting for a result */
  const asked = useRef<VoiceTask | null>(null);
  const [verdict, setVerdict] = useState<VoiceVerdict | null>(null);
  const [interim, setInterim] = useState('');

  const speech = useSpeechRecognition({
    language: content.language,
    createRecognizer,
    audio,
    onInterim: (text) => {
      if (asked.current?.key === current.current.key) setInterim(text);
    },
    onResult: (result) => {
      const attempt = asked.current;
      if (!attempt || attempt.key !== current.current.key) return;
      asked.current = null;
      setInterim('');
      const next = evaluateVoiceTask(attempt, result.transcript, result.confidence);
      setVerdict(next);
      verdictHandler.current?.(next);
    },
  });
  const { state, failure, start: startListening, stop: stopListening } = speech;

  const start = useCallback(() => {
    asked.current = current.current;
    setVerdict(null);
    setInterim('');
    startListening();
  }, [startListening]);

  const stop = useCallback(() => {
    asked.current = null;
    setInterim('');
    stopListening();
  }, [stopListening]);

  // a failed attempt, or one that was stopped (by the child, by a change of question, or before the app speaks), has no result
  // coming, so nothing may be judged for it later
  useEffect(() => {
    if (state === 'error' || state === 'idle') asked.current = null;
  }, [state]);

  // another question is on screen: stop listening and forget the last verdict, so an old answer never carries over
  useEffect(() => {
    asked.current = null;
    setVerdict(null);
    setInterim('');
    stopListening();
  }, [task.key, stopListening]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);

  return { phase: phaseFor(state, failure, verdict), verdict, interim, failure, start, stop };
}
