import { useRef } from 'react';
import { usePlayLab } from '../../../app/PlayLabContext';
import { ActivityHeader } from '../../../components/ActivityHeader';
import { ProgressIndicator } from '../../../components/ProgressIndicator';
import { RoundSummary } from '../../../components/RoundSummary';
import { useRound } from '../../../hooks/useRound';
import { filterByLevel, ROUND_LENGTH } from '../../../lib/level';
import { pickFresh } from '../../../lib/random';
import type { WordEntry } from '../../../types/learning';
import { MagicQuestion } from './MagicQuestion';

/**
 * "Magic Letters": the redesigned drag-and-drop mode of Word Builder.
 * Reports as the 'word-builder' activity (same progress, badges and callbacks as classic mode).
 */
export function MagicWordBuilder() {
  const { content, level } = usePlayLab();
  const seen = useRef(new Set<string>());
  const round = useRound<WordEntry>('word-builder', () => {
    const picks = pickFresh(filterByLevel(content.words, level), ROUND_LENGTH, seen.current);
    picks.forEach((p) => seen.current.add(p.id));
    return picks;
  });

  return (
    <div data-mode="magic">
      <ActivityHeader
        activityId="word-builder"
        title="Magic Letters"
        instruction="Drag each letter onto its glowing outline to spell the word. You can also tap a letter, then tap a spot."
      >
        {!round.summary ? <ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="brand" noun="Word" /> : null}
      </ActivityHeader>
      {round.summary ? (
        <RoundSummary completion={round.summary} onPlayAgain={round.restart} />
      ) : round.current ? (
        <MagicQuestion key={round.current.id} round={round} word={round.current} />
      ) : null}
    </div>
  );
}
