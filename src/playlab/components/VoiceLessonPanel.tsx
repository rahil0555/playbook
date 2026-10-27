import { motion } from 'framer-motion';
import type { LessonPhase } from '../hooks/useVoiceLesson';
import { StarBurst } from '../moments/StarBurst';
import { Button } from './Button';
import { Icon } from './Icon';

interface VoiceLessonPanelProps {
  phase: LessonPhase;
  /** the teacher's instruction for this step, e.g. "Say A for apple!" (also spoken; shown so it can be seen) */
  instruction: string;
  /** what the teacher says after a right answer */
  praise: string;
  /** what the teacher says when the answer is taught together */
  reveal: string;
  /** the check on a wrong or unclear answer, in plain words (the same as the spoken line's detail) */
  message?: string | null;
  /** what the browser has heard so far, while listening */
  interim?: string;
  /** the browser cannot listen on this device or page: the screen says why, and the tap fallback is offered */
  micDown: boolean;
  failure?: string | null;
  finished: boolean;
  onSpeak: () => void;
  onStop: () => void;
  onNext: () => void;
  onStartAgain: () => void;
}

/** The words the child reads for each phase. The spoken line says the same thing, so reading is never required. */
function statusFor({ phase, praise, reveal, failure, micDown }: Pick<VoiceLessonPanelProps, 'phase' | 'praise' | 'reveal' | 'failure' | 'micDown'>): string {
  switch (phase) {
    case 'teaching':
      return 'Listen to the teacher…';
    case 'listening':
      return "I'm listening… say it now.";
    case 'checking':
      return 'Let me check…';
    case 'cheer':
      return praise;
    case 'encourage':
      return 'Good try! Let’s try that again!';
    case 'repeat':
      return 'Could you say that again?';
    case 'together':
      return reveal;
    case 'paused':
      return 'Tap Speak when you’re ready.';
    case 'tap':
      return micDown && failure ? failure : 'Tap a letter, or tap Next when you’re ready.';
    case 'finished':
      return 'You did it! You know the whole alphabet.';
  }
}

/**
 * The one speaking area of a guided lesson. It has one main button, which is Speak, or Stop while the browser is listening, and
 * one place for the feedback. The success mark and the star burst show a right answer before any word is read.
 */
export function VoiceLessonPanel({ phase, instruction, praise, reveal, message, interim, micDown, failure, finished, onSpeak, onStop, onNext, onStartAgain }: VoiceLessonPanelProps) {
  const listening = phase === 'listening';
  const busy = phase === 'cheer' || phase === 'checking' || phase === 'together';
  return (
    <section aria-label="Your turn" className="pl-paper relative rounded-[1.8rem] p-4 text-center">
      <p className="font-display text-2xl font-bold leading-snug text-ink sm:text-3xl" data-testid="lesson-instruction">
        {instruction}
      </p>

      <div className="relative mx-auto mt-3 grid h-16 place-items-center">
        {phase === 'cheer' ? (
          <>
            <motion.span
              aria-hidden="true"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="grid h-14 w-14 place-items-center rounded-full bg-brand-600 text-white shadow-soft"
              data-testid="lesson-success"
            >
              <Icon name="check" size={30} />
            </motion.span>
            <StarBurst seed={3} count={8} spread={56} />
          </>
        ) : listening ? (
          <motion.span
            aria-hidden="true"
            animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
            className="grid h-14 w-14 place-items-center rounded-full bg-coral-500 text-white shadow-soft"
          >
            <Icon name="mic" size={28} />
          </motion.span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {micDown ? (
          <Button variant="primary" accent="coral" icon="arrow-right" onClick={onNext} size="lg">
            Next letter
          </Button>
        ) : listening ? (
          <Button variant="secondary" accent="plum" icon="stop" onClick={onStop} aria-label="Stop listening" size="lg">
            Stop
          </Button>
        ) : (
          <Button variant="primary" accent="coral" icon="mic" onClick={onSpeak} disabled={busy || finished} size="lg" aria-label="Speak">
            Speak
          </Button>
        )}
      </div>

      <p role="status" aria-live="polite" className="mt-3 text-[1.02rem] font-semibold leading-snug text-ink" data-testid="lesson-status">
        {statusFor({ phase, praise, reveal, failure, micDown })}
      </p>
      {listening && interim ? <p className="mt-1 text-sm text-ink-soft">I hear: “{interim}”</p> : null}
      {message && !micDown && (phase === 'encourage' || phase === 'repeat') ? <p className="mt-1 text-sm text-ink-soft">{message}</p> : null}

      {finished ? (
        <div className="mt-3">
          <Button variant="secondary" accent="brand" icon="refresh" onClick={onStartAgain}>
            Start again
          </Button>
        </div>
      ) : null}
    </section>
  );
}
