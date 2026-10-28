import { useRef } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { RoundSummary } from '../../components/RoundSummary';
import { useRound } from '../../hooks/useRound';
import { filterByLevel, ROUND_LENGTH } from '../../lib/level';
import { pickFresh } from '../../lib/random';
import type { SentenceEntry } from '../../types/learning';
import { SentenceQuestion } from './SentenceQuestion';

export default function SentenceBuilderActivity() {
  const { content, level } = usePlayLab();
  const seen = useRef(new Set<string>());
  const round = useRound<SentenceEntry>('sentences', () => {
    const picks = pickFresh(filterByLevel(content.sentences, level), ROUND_LENGTH, seen.current);
    picks.forEach((p) => seen.current.add(p.id));
    return picks;
  });
  const mode = round.current?.mode;

  return (
    <div>
      <ActivityHeader
        activityId="sentences"
        title={round.summary || !round.current ? undefined : mode === 'fill' ? 'Finish the Sentence' : 'Build the Sentence'}
        compact
        instruction={
          round.summary
            ? 'Great reading! Play again or try the next activity.'
            : mode === 'fill'
              ? 'Which word finishes the sentence? Tap it (or drag it) into the gap.'
              : 'Put the words in order to make a sentence. It starts with a capital letter.'
        }
      >
        {!round.summary ? <ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="sun" noun="Sentence" /> : null}
      </ActivityHeader>
      {round.summary ? (
        <RoundSummary completion={round.summary} onPlayAgain={round.restart} />
      ) : round.current ? (
        <SentenceQuestion key={round.current.id} round={round} sentence={round.current} />
      ) : null}
    </div>
  );
}
