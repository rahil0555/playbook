import { useRef } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { RoundSummary } from '../../components/RoundSummary';
import { useRound } from '../../hooks/useRound';
import { filterByLevel, ROUND_LENGTH } from '../../lib/level';
import { pickFresh } from '../../lib/random';
import type { WordEntry } from '../../types/learning';
import { WordQuestion } from './WordQuestion';

export default function WordBuilderActivity() {
  const { content, level } = usePlayLab();
  const seen = useRef(new Set<string>());
  const round = useRound<WordEntry>('word-builder', () => {
    const picks = pickFresh(filterByLevel(content.words, level), ROUND_LENGTH, seen.current);
    picks.forEach((p) => seen.current.add(p.id));
    return picks;
  });

  return (
    <div>
      <ActivityHeader activityId="word-builder">
        {!round.summary ? <ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="brand" noun="Word" /> : null}
      </ActivityHeader>
      {round.summary ? (
        <RoundSummary completion={round.summary} onPlayAgain={round.restart} />
      ) : round.current ? (
        <WordQuestion key={round.current.id} round={round} word={round.current} />
      ) : null}
    </div>
  );
}
