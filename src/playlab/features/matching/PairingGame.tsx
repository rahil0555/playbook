import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { FeedbackMessage } from '../../components/FeedbackMessage';
import { Icon } from '../../components/Icon';
import { PairingBoard, type PairItem } from '../../components/PairingBoard';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { RoundSummary } from '../../components/RoundSummary';
import { useSpeech } from '../../hooks/useAudio';
import { Illustration } from '../../illustrations/Illustration';
import { letterColor } from '../../lib/accents';
import { pairCount } from '../../lib/level';
import { PRAISE, pickLine, TRY_AGAIN } from '../../lib/messages';
import { shuffle } from '../../lib/random';
import { starsForScore } from '../../services/progressService';
import type { ActivityCompletion, LetterEntry } from '../../types/learning';

type Variant = 'letter-picture' | 'sound-letter';

/** Pick `n` letters, never two with the same sound (c and k), so every sound has exactly one right letter. */
function pickLetters(all: readonly LetterEntry[], n: number): LetterEntry[] {
  const out: LetterEntry[] = [];
  const symbols = new Set<string>();
  for (const l of shuffle(all)) {
    if (symbols.has(l.sound.symbol)) continue;
    symbols.add(l.sound.symbol);
    out.push(l);
    if (out.length === n) break;
  }
  return out;
}

const letterCard = (l: LetterEntry, i: number) => (
  <span aria-hidden="true" className="flex items-baseline gap-1" style={{ color: letterColor(i + l.id.charCodeAt(0)) }}>
    <span className="text-5xl">{l.upper}</span>
    <span className="text-4xl">{l.lower}</span>
  </span>
);

/** Letter-to-picture and sound-to-letter matching. A round is finished when every pair is matched. */
export function PairingGame({ variant, onPickGame }: { variant: Variant; onPickGame: () => void }) {
  const { content, level, recordStart, recordAnswer, recordCompletion } = usePlayLab();
  const { sayLetterSound, sayWord, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const total = pairCount(level);

  const [letters, setLetters] = useState(() => pickLetters(content.letters, total));
  const [matched, setMatched] = useState<ReadonlySet<string>>(new Set());
  const [wrong, setWrong] = useState<{ left: string; right: string } | null>(null);
  const [message, setMessage] = useState<'none' | 'wrong'>('none');
  const [summary, setSummary] = useState<ActivityCompletion | null>(null);
  const attempts = useRef<Record<string, number>>({});
  const firstTry = useRef(0);
  const startedAt = useRef(Date.now());
  const started = useRef(false);
  const wrongTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    recordStart('matching');
  }, [recordStart]);
  useEffect(() => () => clearTimeout(wrongTimer.current), []);

  const { left, right } = useMemo(() => {
    const leftItems: PairItem[] =
      variant === 'letter-picture'
        ? letters.map((l, i) => ({ id: `L-${l.id}`, pairId: l.id, label: `Letter ${l.upper}`, content: letterCard(l, i), onActivate: () => sfx('tap') }))
        : letters.map((l, i) => ({
            id: `S-${l.id}`,
            pairId: l.id,
            label: `Sound ${i + 1}. Tap to hear it`,
            content: (
              <span className="flex items-center gap-2 text-sky-700" aria-hidden="true">
                <Icon name="speaker" size={32} /> <span className="text-2xl">Sound {i + 1}</span>
              </span>
            ),
            onActivate: () => void sayLetterSound(l),
          }));
    const rightItems: PairItem[] =
      variant === 'letter-picture'
        ? letters.map((l) => ({
            id: `P-${l.id}`,
            pairId: l.id,
            label: `Picture of a ${l.word.text}`,
            content: (
              <span className="flex flex-col items-center gap-1" aria-hidden="true">
                <Illustration name={l.word.illustration} className="h-14 w-14 sm:h-16 sm:w-16" />
                <span className="text-base">{l.word.text}</span>
              </span>
            ),
            onActivate: () => void sayWord(l.word.text, l.audio?.word),
          }))
        : letters.map((l, i) => ({ id: `T-${l.id}`, pairId: l.id, label: `Letter ${l.upper}`, content: letterCard(l, i), onActivate: () => sfx('tap') }));
    // shuffle each column independently so rows never line up with the answer
    return { left: shuffle(leftItems), right: shuffle(rightItems) };
  }, [letters, variant, sayLetterSound, sayWord, sfx]);

  const finish = useCallback(() => {
    const score = firstTry.current;
    setSummary(
      recordCompletion({
        activityId: 'matching',
        score,
        total,
        stars: starsForScore(score, total),
        durationMs: Date.now() - startedAt.current,
        variant,
      }),
    );
  }, [recordCompletion, total, variant]);

  const attempt = (leftId: string, rightId: string) => {
    const l = left.find((i) => i.id === leftId);
    const r = right.find((i) => i.id === rightId);
    if (!l || !r || matched.has(l.pairId)) return;
    const n = (attempts.current[l.pairId] = (attempts.current[l.pairId] ?? 0) + 1);
    const ok = l.pairId === r.pairId;
    recordAnswer({ activityId: 'matching', questionId: `${variant}:${l.pairId}`, correct: ok, attempt: n, response: r.pairId, expected: l.pairId });
    if (ok) {
      if (n === 1) firstTry.current += 1;
      sfx('correct');
      fire('burst', { x: 50, y: 40 });
      setMessage('none');
      const next = new Set(matched).add(l.pairId);
      setMatched(next);
      if (next.size === total) setTimeout(finish, 900);
    } else {
      sfx('oops');
      setWrong({ left: leftId, right: rightId });
      setMessage('wrong');
      clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrong(null), 600);
    }
  };

  const restart = () => {
    setLetters(pickLetters(content.letters, total));
    setMatched(new Set());
    setWrong(null);
    setMessage('none');
    setSummary(null);
    attempts.current = {};
    firstTry.current = 0;
    startedAt.current = Date.now();
    recordStart('matching');
  };

  if (summary) return <RoundSummary completion={summary} onPlayAgain={restart} extra={{ label: 'Pick another game', onClick: onPickGame }} />;

  return (
    <div className="relative mx-auto max-w-3xl space-y-5">
      <CelebrationEffect burst={burst} onDone={clear} />
      <ProgressIndicator done={matched.size} total={total} accent="plum" text={`Pairs matched: ${matched.size} of ${total}`} />
      <div className="rounded-5xl bg-white/70 p-4 shadow-soft sm:p-6">
        <PairingBoard
          left={left}
          right={right}
          matched={matched}
          wrong={wrong}
          onAttempt={attempt}
          leftTitle={variant === 'letter-picture' ? 'Letters' : 'Sounds'}
          rightTitle={variant === 'letter-picture' ? 'Pictures' : 'Letters'}
        />
      </div>
      <div className="min-h-[5.5rem]" aria-live="polite">
        {message === 'wrong' ? (
          <FeedbackMessage tone="retry" title={pickLine(TRY_AGAIN, matched.size + Object.keys(attempts.current).length)} action={{ label: 'Got it', onClick: () => setMessage('none') }}>
            That is not a pair. Try another!
          </FeedbackMessage>
        ) : matched.size > 0 ? (
          <FeedbackMessage tone="success" title={pickLine(PRAISE, matched.size)}>
            {matched.size} of {total} matched.
          </FeedbackMessage>
        ) : null}
      </div>
    </div>
  );
}
