import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeech } from './useAudio';
import { useVoiceTask, type VoicePhase } from './useVoiceTask';
import type { RecognizerFactory } from '../services/speechInput/recognizer';
import { evaluateVoiceTask, FAILURE_COPY, type VoiceTask, type VoiceVerdict } from '../services/speechInput/tasks';
import { encourageFor, HEAR_LINE, REPEAT_LINE } from '../lib/lessonLines';

/** One item of a guided lesson: what the teacher says, how the answer is judged, and what the replay control says. */
export interface LessonStep {
  key: string;
  /** said before the child answers, e.g. "Say A for apple!" */
  instruction: string;
  /** how the child's answer is judged (see services/speechInput/tasks) */
  task: VoiceTask;
  /** the cheerful line for a right answer */
  praise: string;
  /** said when the child has had all their tries: the answer, taught together, e.g. "A is for apple. Let’s learn it together!" */
  reveal: string;
  /** plays the teaching example for this step (the replay control) */
  replay: () => unknown;
}

/** Wrong answers a child can give on one step before the answer is taught together. */
export const LESSON_MAX_TRIES = 3;
/** Unclear results on one step before the lesson moves on (a result that cannot be heard is never the child's fault). */
export const LESSON_MAX_UNCLEAR = 4;
/** Time to see the celebration after its line has been said, before the next step starts. */
export const LESSON_CHEER_MS = 900;

/** Where the lesson is. The phases the screen shows. `tap` is the fallback when the browser cannot listen. */
export type LessonPhase = 'teaching' | 'listening' | 'checking' | 'cheer' | 'encourage' | 'repeat' | 'together' | 'paused' | 'tap' | 'finished';

const MIC_DOWN: VoicePhase[] = ['unsupported', 'page-blocked', 'denied', 'no-microphone', 'service-unavailable'];

export interface VoiceLessonOptions {
  steps: readonly LessonStep[];
  /** the step the lesson starts at */
  start?: number;
  /** each judged answer, once: `tries` counts the wrong answers on this step including this one */
  onAnswer?: (step: LessonStep, verdict: VoiceVerdict, tries: number) => void;
  /** the last step has been celebrated */
  onFinish?: () => void;
  /** tests pass a fake recogniser; the app uses the browser's own */
  createRecognizer?: RecognizerFactory;
}

/**
 * A guided speaking lesson, one step at a time, with no reading needed:
 *  1. the teacher says the instruction (the child can see it too);
 *  2. when the speech has ended, listening starts by itself, so the teacher's own voice is never heard as an answer;
 *  3. a right answer is celebrated (the praise is spoken, and the step waits until it has ended) and the next step starts;
 *  4. a wrong answer is encouraged, and the child tries again (up to LESSON_MAX_TRIES, then the answer is taught together);
 *  5. a result that could not be heard is asked for again (up to LESSON_MAX_UNCLEAR, then the lesson moves on);
 *  6. Stop ends listening at once, and Speak starts it again. Tapping a step, or Next where the browser cannot listen, moves on.
 * Every timed or spoken continuation checks a run number first, so Stop, a change of step, or leaving the screen cancels it.
 */
export function useVoiceLesson({ steps, start = 0, onAnswer, onFinish, createRecognizer }: VoiceLessonOptions) {
  const { speak, stop: stopSpeech } = useSpeech();
  const [index, setIndex] = useState(() => Math.min(Math.max(start, 0), Math.max(steps.length - 1, 0)));
  const step = steps[index] as LessonStep;
  const [phase, setPhase] = useState<LessonPhase>('teaching');
  const [tries, setTries] = useState(0);
  const [unclear, setUnclear] = useState(0);
  const voice = useVoiceTask({ task: step.task, createRecognizer });
  const micDown = MIC_DOWN.includes(voice.phase);

  /** bumped by every new step, Stop and unmount: a continuation that finds a different number does nothing */
  const run = useRef(0);
  const latest = useRef({ steps, index, step, phase, tries, unclear, onAnswer, onFinish, speak, voice, micDown });
  latest.current = { steps, index, step, phase, tries, unclear, onAnswer, onFinish, speak, voice, micDown };

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  /** starts listening for this run (never speaks first) */
  const listenFor = useCallback((id: number) => {
    if (id !== run.current) return;
    setPhase('listening');
    latest.current.voice.start();
  }, []);

  const advance = useCallback(() => {
    const l = latest.current;
    if (l.index + 1 >= l.steps.length) {
      setPhase('finished');
      l.onFinish?.();
      return;
    }
    setIndex(l.index + 1);
  }, []);

  /** the answer taught together, then on to the next step: no reward, and the child is not marked as having failed */
  const teachTogether = useCallback(
    async (id: number) => {
      setPhase('together');
      await latest.current.speak(latest.current.step.reveal);
      if (id !== run.current) return;
      await sleep(LESSON_CHEER_MS);
      if (id !== run.current) return;
      advance();
    },
    [advance],
  );

  // the browser stopped listening for a reason it will not recover from (refused, no microphone, ...): the lesson stops asking for
  // answers, says why, and offers the tap fallback. Whatever was pending is cancelled, so nothing listens again behind the screen.
  useEffect(() => {
    if (!micDown) return;
    if (phase === 'listening' || phase === 'encourage' || phase === 'repeat') {
      run.current += 1;
      setPhase('tap');
    }
  }, [micDown, phase]);

  // a new step: the teacher says the instruction, then listening starts by itself (unless the browser cannot listen)
  useEffect(() => {
    const id = ++run.current;
    setPhase('teaching');
    setTries(0);
    setUnclear(0);
    void (async () => {
      await latest.current.speak(latest.current.step.instruction);
      if (id !== run.current) return;
      if (latest.current.micDown) {
        setPhase('tap');
        return;
      }
      listenFor(id);
    })();
    return () => {
      run.current += 1;
    };
  }, [index, listenFor]);

  // a judged answer: reward it, encourage the child, or ask again. Each judged answer is handled once.
  const verdict = voice.verdict;
  const judge = useCallback((verdict: VoiceVerdict) => {
    const id = run.current;
    const l = latest.current;
    const current = l.step;
    void (async () => {
      if (verdict.outcome === 'correct') {
        setPhase('cheer');
        l.onAnswer?.(current, verdict, l.tries + 1);
        await latest.current.speak(current.praise);
        if (id !== run.current) return;
        await sleep(LESSON_CHEER_MS);
        if (id !== run.current) return;
        advance();
        return;
      }
      if (verdict.outcome === 'incorrect' || verdict.outcome === 'incomplete') {
        const tryNo = l.tries + 1;
        setTries(tryNo);
        l.onAnswer?.(current, verdict, tryNo);
        setPhase('encourage');
        await latest.current.speak(encourageFor(tryNo));
        if (id !== run.current) return;
        if (tryNo >= LESSON_MAX_TRIES) return void teachTogether(id);
        listenFor(id);
        return;
      }
      // uncertain or nothing heard: asked again, and never marked wrong
      const unclearNo = l.unclear + 1;
      setUnclear(unclearNo);
      setPhase('repeat');
      await latest.current.speak(verdict.outcome === 'nothing-heard' ? HEAR_LINE : REPEAT_LINE);
      if (id !== run.current) return;
      if (unclearNo >= LESSON_MAX_UNCLEAR) return void teachTogether(id);
      listenFor(id);
    })();
  }, [advance, listenFor, teachTogether]);

  useEffect(() => {
    if (verdict) judge(verdict);
    // the verdict is the only trigger; judge reads the other values from the latest copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdict]);

  // Silence: the browser heard nothing and the try ended. The hook reports that as a phase rather than a verdict, so the lesson judges
  // it as nothing heard, once for each try, and asks again.
  useEffect(() => {
    if (voice.phase !== 'nothing-heard' || latest.current.phase !== 'listening') return;
    judge(evaluateVoiceTask(latest.current.step.task, ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.phase]);

  // Stop: listening ends at once, nothing else is said, and the child can start again with Speak
  const stop = useCallback(() => {
    run.current += 1;
    latest.current.voice.stop();
    stopSpeech();
    setPhase('paused');
  }, [stopSpeech]);

  // Speak (the one main button): say nothing first, and listen for the current step
  const speakNow = useCallback(() => {
    stopSpeech();
    const id = ++run.current;
    if (latest.current.micDown) return;
    listenFor(id);
  }, [listenFor, stopSpeech]);

  const goTo = useCallback(
    (i: number) => {
      stopSpeech();
      setIndex(Math.min(Math.max(i, 0), latest.current.steps.length - 1));
    },
    [stopSpeech],
  );

  // leaving the screen cancels whatever the lesson was doing
  useEffect(
    () => () => {
      run.current += 1;
      stopSpeech();
    },
    [stopSpeech],
  );

  return {
    index,
    step,
    phase,
    tries,
    /** the mic is on or about to be (the Stop button shows) */
    listening: voice.phase === 'listening' || voice.phase === 'starting',
    /** what the child said so far, while listening */
    interim: voice.interim,
    /** the failure, in words the child can read, when the browser cannot listen (the screen explains it and offers the tap fallback) */
    failure: voice.failure ? FAILURE_COPY[voice.failure] : null,
    micDown,
    speakNow,
    stop,
    goTo,
    next: advance,
    replay: () => {
      if (latest.current.voice.phase === 'listening') return;
      void latest.current.step.replay();
    },
  };
}
