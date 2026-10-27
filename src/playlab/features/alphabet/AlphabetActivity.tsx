import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab, useProgressState } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { AnimatedLetter, type AnimatedLetterHandle } from '../../components/AnimatedLetter';
import { Button } from '../../components/Button';
import { Companion } from '../../components/Companion';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { LetterGrid } from '../../components/LetterGrid';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { PronunciationControl } from '../../components/PronunciationControl';
import { StickerReveal } from '../../components/StickerReveal';
import { VoiceLessonPanel } from '../../components/VoiceLessonPanel';
import { getActivity, nextActivityId } from '../../data/activities';
import { useSpeech } from '../../hooks/useAudio';
import { useVoiceLesson, type LessonStep } from '../../hooks/useVoiceLesson';
import { Illustration } from '../../illustrations/Illustration';
import { letterColor } from '../../lib/accents';
import { animationFor, springs } from '../../motion/variants';
import type { LetterEntry } from '../../types/learning';
import { alphabetSteps } from './alphabetLesson';

/** Letters to find per round before a star is awarded. */
const GOAL = 5;

/** The example word with its first letter picked out in the letter's colour. */
function HighlightedWord({ word, color }: { word: string; color: string }) {
  return (
    <span className="font-display text-3xl font-bold leading-none sm:text-4xl">
      <span style={{ color }}>{word.slice(0, 1)}</span>
      <span className="text-ink">{word.slice(1)}</span>
    </span>
  );
}

export default function AlphabetActivity() {
  const { content, store, recordStart, recordAnswer, recordCompletion, exploreLetter, navigate } = usePlayLab();
  const { lifetime } = useProgressState();
  const { sayLetterFully, sfx } = useSpeech();
  const letters = content.letters;

  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const [goalDone, setGoalDone] = useState(false);
  // the goal's stars are awarded once per learner; a later visit that finds every letter again is celebrated without them
  const [goalRewarded, setGoalRewarded] = useState(false);
  const { burst, fire, clear } = useBurst();
  const visitedRef = useRef<ReadonlySet<string>>(new Set());
  const goalDoneRef = useRef(false);
  const startedOnce = useRef(false);

  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    recordStart('alphabet');
  }, [recordStart]);

  const exploredIds = useMemo(() => new Set(lifetime.exploredLetters), [lifetime.exploredLetters]);

  /** a letter is found: by a right answer, or by tapping it. The goal of GOAL letters is rewarded once per learner. */
  const markFound = useCallback(
    (letter: LetterEntry) => {
      exploreLetter(letter.id);
      const seen = visitedRef.current;
      if (seen.has(letter.id) || goalDoneRef.current) return;
      const next = new Set(seen).add(letter.id);
      visitedRef.current = next;
      setVisited(next);
      if (next.size >= GOAL) {
        goalDoneRef.current = true;
        setGoalDone(true);
        // read from the store, not this render's copy, so a goal reached earlier in this visit is not rewarded twice either
        const rewardedBefore = store.getState().lifetime.perActivity.alphabet.completed > 0;
        setGoalRewarded(!rewardedBefore);
        if (!rewardedBefore) recordCompletion({ activityId: 'alphabet', score: GOAL, total: GOAL, stars: 3, durationMs: 0 });
      }
    },
    [exploreLetter, recordCompletion, store],
  );

  const speakLetter = useCallback((letter: LetterEntry) => sayLetterFully(letter), [sayLetterFully]);
  const steps = useMemo<LessonStep[]>(() => alphabetSteps(letters, speakLetter), [letters, speakLetter]);

  const lesson = useVoiceLesson({
    steps,
    onAnswer: (step, verdict) => {
      recordAnswer({ activityId: 'alphabet', questionId: step.key, correct: verdict.outcome === 'correct', attempt: 1, response: verdict.outcome, expected: step.key });
      if (verdict.outcome === 'correct') {
        const letter = letters.find((l) => l.id === step.key);
        if (letter) markFound(letter);
        fire('burst', { x: 50, y: 38 });
      }
    },
    onFinish: () => fire('confetti'),
  });

  const selectedIndex = lesson.index;
  const selected: LetterEntry = letters[selectedIndex] ?? (letters[0] as LetterEntry);
  const [replays, setReplays] = useState(0);
  const upperRef = useRef<AnimatedLetterHandle>(null);
  const lowerRef = useRef<AnimatedLetterHandle>(null);

  // the big letters take a new move each time a letter is shown (or shown again)
  useEffect(() => {
    const anim = animationFor(selectedIndex, replays);
    upperRef.current?.play(anim);
    const t = setTimeout(() => lowerRef.current?.play(anim), 90);
    return () => clearTimeout(t);
  }, [selectedIndex, replays]);

  /** tapping a letter in the grid starts its lesson: the same flow as the lesson, with the teacher's instruction first */
  const choose = (letter: LetterEntry) => {
    const i = letters.findIndex((l) => l.id === letter.id);
    setReplays((r) => (i === selectedIndex ? r + 1 : 0));
    fire('burst', { x: 50, y: 38 });
    sfx('pop');
    markFound(letter);
    lesson.goTo(i);
  };

  const keepExploring = () => {
    visitedRef.current = new Set();
    goalDoneRef.current = false;
    setVisited(new Set());
    setGoalDone(false);
    recordStart('alphabet');
  };

  const startAgain = () => {
    lesson.goTo(0);
  };

  const next = getActivity(nextActivityId('alphabet'));
  const color = letterColor(Math.max(selectedIndex, 0));
  const found = Math.min(visited.size, GOAL);
  const currentStep = lesson.step;
  const finished = lesson.phase === 'finished';

  return (
    <div>
      <ActivityHeader activityId="alphabet">
        <ProgressIndicator done={found} total={GOAL} accent="coral" text={`Letters found: ${found} of ${GOAL}`} />
      </ActivityHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        {/* ------------------------------- stage ------------------------------- */}
        <div className="lg:self-start">
          <section aria-label="Selected letter" className="pl-board relative overflow-hidden rounded-[2.4rem] p-3 sm:p-5">
            <CelebrationEffect burst={burst} onDone={clear} />
            {finished ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <Companion mood="cheer" className="h-32 w-32" />
                <p className="font-display text-2xl font-bold text-ink">You know the whole alphabet!</p>
                <Button variant="primary" accent="coral" icon="refresh" onClick={startAgain} size="lg">
                  Start again
                </Button>
              </div>
            ) : (
              <div key={currentStep.key} className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-y-3 lg:flex-col lg:gap-5">
                <div className="flex shrink-0 items-end justify-center gap-1 sm:gap-3">
                  <div className="text-center">
                    <AnimatedLetter
                      ref={upperRef}
                      glyph={selected.upper}
                      color={color}
                      animation={animationFor(selectedIndex, replays)}
                      draggable
                      label={`Uppercase ${selected.upper}. Tap to hear it again`}
                      className="h-[4.6rem] w-[3.9rem] text-[4.2rem] sm:h-[9rem] sm:w-[8rem] sm:text-[8rem] lg:h-[11.5rem] lg:w-[10rem] lg:text-[10.5rem]"
                      onTap={lesson.replay}
                    />
                  </div>
                  <div className="text-center">
                    <AnimatedLetter
                      ref={lowerRef}
                      glyph={selected.lower}
                      color={color}
                      animation={animationFor(selectedIndex, replays)}
                      draggable
                      label={`Lowercase ${selected.lower}. Tap to hear it again`}
                      className="h-[4.6rem] w-[3.6rem] text-[4.2rem] sm:h-[9rem] sm:w-[7rem] sm:text-[8rem] lg:h-[11.5rem] lg:w-[9rem] lg:text-[10.5rem]"
                      onTap={lesson.replay}
                    />
                  </div>
                </div>

                <div className="pl-paper flex min-w-[9.5rem] flex-1 items-center gap-2 rounded-[1.6rem] p-2 pr-3 sm:gap-3 lg:w-full lg:flex-none">
                  <span className="pl-frame grid h-14 w-14 shrink-0 place-items-center rounded-2xl sm:h-20 sm:w-20">
                    <Illustration name={selected.word.illustration} className="h-12 w-12 sm:h-[4.5rem] sm:w-[4.5rem]" label={selected.word.text} />
                  </span>
                  <span className="min-w-0">
                    <HighlightedWord word={selected.word.text} color={color} />
                    <span className="mt-0.5 block text-sm text-ink-soft">
                      {selected.upper} is for {selected.word.text}
                    </span>
                  </span>
                </div>

                {/* one speaker control: it says the letter, its sound and its example word */}
                <PronunciationControl label="Hear it" accent="sky" onPlay={lesson.replay} disabled={lesson.listening} />

                <div className="w-full">
                  <VoiceLessonPanel
                    phase={lesson.phase}
                    instruction={currentStep.instruction}
                    praise={currentStep.praise}
                    reveal={currentStep.reveal}
                    message={null}
                    interim={lesson.interim}
                    micDown={lesson.micDown}
                    failure={lesson.failure}
                    finished={finished}
                    onSpeak={lesson.speakNow}
                    onStop={lesson.stop}
                    onNext={lesson.next}
                    onStartAgain={startAgain}
                  />
                </div>
                <p className="sr-only" role="status">
                  Selected uppercase {selected.upper} and lowercase {selected.lower}. {selected.upper} is for {selected.word.text}.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* -------------------------------- grid -------------------------------- */}
        <div className="space-y-4">
          <AnimatePresence>
            {goalDone ? (
              <motion.div key="goal" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={springs.soft} className="overflow-hidden">
                <FeedbackMessage tone="success" title={goalRewarded ? `${GOAL} letters found! 3 stars!` : `${GOAL} letters found again!`} action={{ label: 'Keep exploring', onClick: keepExploring, icon: 'sparkle' }}>
                  {/* the goal is a finished round, so it earns a sticker: shown only the first time, when it is actually earned */}
                  {goalRewarded ? <StickerReveal rounds={lifetime.activitiesCompleted} className="mb-3" /> : null}
                  <Button variant="ghost" accent="coral" iconRight="arrow-right" onClick={() => navigate(next.id)} className="-ml-4">
                    Next: {next.title}
                  </Button>
                </FeedbackMessage>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <LetterGrid
            letters={letters}
            selectedId={currentStep.key}
            exploredIds={exploredIds}
            onSelect={choose}
            className="grid-cols-5 min-[460px]:grid-cols-7 md:grid-cols-9 lg:grid-cols-6 xl:grid-cols-7"
          />
          <p className="mx-auto w-fit rounded-full bg-white/90 px-4 py-1 text-center text-sm text-ink shadow-soft">
            {exploredIds.size} of {letters.length} letters found so far ⭐
          </p>
        </div>
      </div>
    </div>
  );
}
