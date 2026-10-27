import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab, useProgressState } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { AnimatedLetter, type AnimatedLetterHandle } from '../../components/AnimatedLetter';
import { Button } from '../../components/Button';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { LetterGrid } from '../../components/LetterGrid';
import { LikeButton } from '../../components/LikeButton';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { PronunciationControl } from '../../components/PronunciationControl';
import { Companion } from '../../components/Companion';
import { VoiceTaskPanel } from '../../components/VoiceTaskPanel';
import { getActivity, nextActivityId } from '../../data/activities';
import { useSpeech } from '../../hooks/useAudio';
import { Illustration } from '../../illustrations/Illustration';
import { letterColor } from '../../lib/accents';
import { animationFor, springs } from '../../motion/variants';
import { letterNameTask } from '../../services/speechInput/tasks';
import type { LetterEntry } from '../../types/learning';

/** Letters to discover per round before a star is awarded. */
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
  const { content, store, recordStart, recordCompletion, exploreLetter, navigate } = usePlayLab();
  const { lifetime } = useProgressState();
  const { sayLetterName, sayLetterSound, sayWord, sfx } = useSpeech();
  const letters = content.letters;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [replays, setReplays] = useState(0);
  const [visited, setVisited] = useState<ReadonlySet<string>>(new Set());
  const [goalDone, setGoalDone] = useState(false);
  // the goal's stars are awarded once per learner; a later visit that finds every letter again is celebrated without them
  const [goalRewarded, setGoalRewarded] = useState(false);
  /** true while the child's microphone is on: the speech buttons are off then, so nothing is said over the child */
  const [listening, setListening] = useState(false);
  const { burst, fire, clear } = useBurst();
  const upperRef = useRef<AnimatedLetterHandle>(null);
  const lowerRef = useRef<AnimatedLetterHandle>(null);
  const startedOnce = useRef(false);
  const visitedRef = useRef<ReadonlySet<string>>(new Set());
  const goalDoneRef = useRef(false);

  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    recordStart('alphabet');
  }, [recordStart]);

  const selectedIndex = useMemo(() => letters.findIndex((l) => l.id === selectedId), [letters, selectedId]);
  const selected: LetterEntry | undefined = letters[selectedIndex];
  const exploredIds = useMemo(() => new Set(lifetime.exploredLetters), [lifetime.exploredLetters]);

  // Run the stage animation after the glyph has changed. Different letters (and replays) get different moves.
  useEffect(() => {
    if (selectedIndex < 0) return;
    const anim = animationFor(selectedIndex, replays);
    upperRef.current?.play(anim);
    const t = setTimeout(() => lowerRef.current?.play(anim), 90);
    return () => clearTimeout(t);
  }, [selectedIndex, replays]);

  const choose = useCallback(
    (letter: LetterEntry) => {
      // 1. instant feedback first (animation + burst + tone); nothing below can delay it
      setReplays((r) => (letter.id === selectedId ? r + 1 : 0));
      setSelectedId(letter.id);
      fire('burst', { x: 50, y: 38 });
      sfx('pop');
      // 2. progress + audio are fire-and-forget
      exploreLetter(letter.id);
      void sayLetterName(letter);
      // Plain reads/writes via refs: state updater functions must stay pure (StrictMode runs them twice).
      const seen = visitedRef.current;
      if (!seen.has(letter.id) && !goalDoneRef.current) {
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
      }
    },
    [exploreLetter, fire, recordCompletion, sayLetterName, selectedId, sfx, store],
  );

  // celebrate when the goal is reached (separate from the letter burst so it reads clearly)
  useEffect(() => {
    if (goalDone) fire('confetti');
  }, [goalDone, fire]);

  const replay = () => {
    setReplays((r) => r + 1);
    fire('burst', { x: 50, y: 38 });
    sfx('pop');
    if (selected) void sayLetterName(selected);
  };

  const keepExploring = () => {
    visitedRef.current = new Set();
    goalDoneRef.current = false;
    setVisited(new Set());
    setGoalDone(false);
    recordStart('alphabet');
  };

  const next = getActivity(nextActivityId('alphabet'));
  const color = letterColor(Math.max(selectedIndex, 0));
  const found = Math.min(visited.size, GOAL);

  return (
    <div>
      <ActivityHeader activityId="alphabet">
        <ProgressIndicator done={found} total={GOAL} accent="coral" text={`Letters found: ${found} of ${GOAL}`} />
      </ActivityHeader>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-8">
        {/* ------------------------------- stage ------------------------------- */}
        {/* on a phone and a tablet the stage scrolls away with the page, so it never covers the letter grid. On desktop it sits beside the
            grid and scrolls with the page too: the grid is shorter than the stage, so a sticky stage would have nothing to move within */}
        <div className="lg:self-start">
          <section
            aria-label="Selected letter"
            className="pl-board relative overflow-hidden rounded-[2.4rem] p-3 sm:p-5"
          >
            <CelebrationEffect burst={burst} onDone={clear} />
            {selected ? (
                <div key="detail" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:gap-y-3 lg:flex-col lg:gap-5">
                  <div className="flex shrink-0 items-end justify-center gap-1 sm:gap-3">
                    <div className="text-center">
                      <AnimatedLetter
                        ref={upperRef}
                        glyph={selected.upper}
                        color={color}
                        animation={animationFor(selectedIndex, replays)}
                        label={`Uppercase ${selected.upper}. Tap to hear it again`}
                        className="h-[4.6rem] w-[3.9rem] text-[4.2rem] sm:h-[9rem] sm:w-[8rem] sm:text-[8rem] lg:h-[11.5rem] lg:w-[10rem] lg:text-[10.5rem]"
                        draggable
                        disabled={listening}
                        onTap={replay}
                      />
                      <p className="sr-only sm:not-sr-only sm:text-sm sm:font-semibold sm:uppercase sm:tracking-wide sm:text-ink-soft">Big</p>
                    </div>
                    <div className="text-center">
                      <AnimatedLetter
                        ref={lowerRef}
                        glyph={selected.lower}
                        color={color}
                        animation={animationFor(selectedIndex, replays)}
                        label={`Lowercase ${selected.lower}. Tap to hear it again`}
                        className="h-[4.6rem] w-[3.6rem] text-[4.2rem] sm:h-[9rem] sm:w-[7rem] sm:text-[8rem] lg:h-[11.5rem] lg:w-[9rem] lg:text-[10.5rem]"
                        draggable
                        disabled={listening}
                        onTap={replay}
                      />
                      <p className="sr-only sm:not-sr-only sm:text-sm sm:font-semibold sm:uppercase sm:tracking-wide sm:text-ink-soft">Small</p>
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

                  <div className="flex w-full flex-wrap justify-center gap-2">
                    <PronunciationControl label="Say it" collapse accent="coral" disabled={listening} onPlay={() => sayLetterName(selected)} />
                    <PronunciationControl label="Hear the sound" collapse accent="plum" disabled={listening} onPlay={() => sayLetterSound(selected)} />
                    <PronunciationControl label="Hear the word" collapse accent="sky" disabled={listening} onPlay={() => sayWord(selected.word.text, selected.audio?.word)} />
                    <Button variant="primary" accent="coral" icon="replay" onClick={replay} aria-label="Play again" disabled={listening}>
                      <span className="sr-only sm:not-sr-only">Play again</span>
                    </Button>
                    <LikeButton kind="letter" id={selected.id} label={`${selected.upper}${selected.lower}`} />
                  </div>
                  <div className="w-full">
                    <VoiceTaskPanel
                      key={selected.id}
                      task={letterNameTask(selected)}
                      prompt="Say the letter's name."
                      playModel={() => sayLetterName(selected)}
                      onListeningChange={setListening}
                    />
                  </div>
                  <p className="sr-only" role="status">
                    Selected uppercase {selected.upper} and lowercase {selected.lower}. {selected.upper} is for {selected.word.text}.
                  </p>
                </div>
              ) : (
                <div key="empty" className="flex items-center gap-4 py-2 lg:flex-col lg:py-10">
                  <Companion mood="happy" className="h-24 w-24 lg:h-40 lg:w-40" />
                  <div className="lg:text-center">
                    <p className="font-display text-2xl font-bold text-ink lg:text-3xl">Tap a letter!</p>
                    <p className="mt-1 text-ink-soft">Pick any letter below to see it dance.</p>
                  </div>
                </div>
            )}
          </section>
          {selected ? <p className="mx-auto mt-3 hidden w-fit rounded-full bg-white/90 px-4 py-1 text-center text-sm text-ink shadow-soft lg:block">Tip: you can drag the big letters around, too!</p> : null}
        </div>

        {/* -------------------------------- grid -------------------------------- */}
        <div className="space-y-4">
          <AnimatePresence>
            {goalDone ? (
              <motion.div key="goal" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={springs.soft} className="overflow-hidden">
                <FeedbackMessage tone="success" title={goalRewarded ? `${GOAL} letters found! 3 stars!` : `${GOAL} letters found again!`} action={{ label: 'Keep exploring', onClick: keepExploring, icon: 'sparkle' }}>
                  <Button variant="ghost" accent="coral" iconRight="arrow-right" onClick={() => navigate(next.id)} className="-ml-4">
                    Next: {next.title}
                  </Button>
                </FeedbackMessage>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <LetterGrid
            letters={letters}
            selectedId={selectedId}
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
