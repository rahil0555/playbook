import { useCallback, useMemo, useState } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { AnimatedLetter } from '../../components/AnimatedLetter';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { LetterGrid } from '../../components/LetterGrid';
import { PronunciationControl } from '../../components/PronunciationControl';
import { VoiceLessonPanel } from '../../components/VoiceLessonPanel';
import { Illustration } from '../../illustrations/Illustration';
import { useSpeech } from '../../hooks/useAudio';
import { useVoiceLesson, type LessonStep } from '../../hooks/useVoiceLesson';
import { letterColor } from '../../lib/accents';
import { animationFor } from '../../motion/variants';
import type { LetterEntry } from '../../types/learning';
import { soundSteps } from './soundLesson';

/**
 * Sound Discovery, the sounds tab: the child hears the question, says a word with the sound, and is celebrated or helped. The
 * example word and its picture are kept back until the child has answered, so the question is never answered for them.
 */
export function LetterDiscovery() {
  const { content, recordAnswer } = usePlayLab();
  const { speak } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const letters = content.letters;
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());

  /** the sound alone: the recording when there is one, otherwise the letter's name (never the example word) */
  const replaySound = useCallback((l: LetterEntry) => speak(l.nameSpeech, l.audio?.sound), [speak]);
  const steps = useMemo<LessonStep[]>(() => soundSteps(letters, replaySound), [letters, replaySound]);

  const lesson = useVoiceLesson({
    steps,
    onAnswer: (step, verdict) => {
      recordAnswer({ activityId: 'phonics', questionId: step.key, correct: verdict.outcome === 'correct', attempt: 1, response: verdict.outcome, expected: step.key });
      if (verdict.outcome === 'correct') {
        setSeen((s) => new Set(s).add(step.key));
        fire('burst', { x: 50, y: 30 });
      }
    },
  });

  const index = lesson.index;
  const letter = letters[index] as LetterEntry;
  const color = letterColor(index);
  const step = lesson.step;
  /** the example is shown only once the child has answered, or the answer is taught together */
  const answered = lesson.phase === 'cheer' || lesson.phase === 'together';

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
      <section aria-label={`About the letter ${letter.upper}`} className="relative space-y-4 lg:order-1">
        <CelebrationEffect burst={burst} onDone={clear} />

        <div key={step.key} className="grid gap-4 sm:grid-cols-2">
          <article className="flex flex-col items-center pl-paper rounded-[2rem] p-4 text-center">
            <h2 className="font-display text-xl font-bold text-ink-soft">The letter</h2>
            <AnimatedLetter
              glyph={`${letter.upper}${letter.lower}`}
              color={color}
              animation={animationFor(index)}
              label={`Letter ${letter.upper}. Tap to hear its sound`}
              className="my-1 h-28 px-4 text-[5.2rem]"
              onTap={lesson.replay}
            />
            <PronunciationControl label="Hear the sound" accent="sky" onPlay={lesson.replay} disabled={lesson.listening} className="mt-3" />
          </article>

          <article className="flex flex-col items-center pl-paper rounded-[2rem] p-4 text-center">
            <h2 className="font-display text-xl font-bold text-ink-soft">{answered ? 'Its sound' : 'Say a word for it'}</h2>
            {answered ? (
              <>
                <span className="my-1 grid pl-frame h-24 w-24 place-items-center rounded-3xl">
                  <Illustration name={letter.word.illustration} className="h-20 w-20" label={letter.word.text} />
                </span>
                <p className="font-display text-3xl font-bold leading-tight">
                  <span style={{ color }}>{letter.word.text.slice(0, 1)}</span>
                  {letter.word.text.slice(1)}
                </p>
                <p className="mt-1 text-[0.98rem] leading-snug text-ink-soft">
                  {letter.upper} says the sound in {letter.word.text}.
                </p>
              </>
            ) : (
              <p className="my-4 font-display text-6xl font-bold" style={{ color }} aria-hidden="true">
                ?
              </p>
            )}
          </article>
        </div>

        <VoiceLessonPanel
          phase={lesson.phase}
          instruction={step.instruction}
          praise={step.praise}
          reveal={step.reveal}
          interim={lesson.interim}
          micDown={lesson.micDown}
          failure={lesson.failure}
          finished={lesson.phase === 'finished'}
          onSpeak={lesson.speakNow}
          onStop={lesson.stop}
          onNext={lesson.next}
          onStartAgain={() => lesson.goTo(0)}
        />
      </section>

      <div className="lg:order-2">
        <h2 className="mb-3 font-display text-xl font-bold">Pick a letter</h2>
        <LetterGrid
          letters={letters}
          selectedId={step.key}
          exploredIds={seen}
          onSelect={(l) => {
            fire('burst', { x: 50, y: 30 });
            lesson.goTo(letters.findIndex((x) => x.id === l.id));
          }}
          className="grid-cols-5 min-[460px]:grid-cols-7 md:grid-cols-9 lg:grid-cols-6 xl:grid-cols-7"
        />
      </div>
    </div>
  );
}
