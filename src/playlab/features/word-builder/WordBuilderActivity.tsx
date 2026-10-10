import { useRef, useState } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { RoundSummary } from '../../components/RoundSummary';
import { useRound } from '../../hooks/useRound';
import { filterByLevel, ROUND_LENGTH } from '../../lib/level';
import { pickFresh } from '../../lib/random';
import type { WordEntry } from '../../types/learning';
import { MagicWordBuilder } from './magic/MagicWordBuilder';
import { WordQuestion } from './WordQuestion';

/** The original Word Builder (tray + slots + Check). Unchanged; now one of two modes. */
export function ClassicWordBuilder() {
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

type Mode = 'classic' | 'magic';
const MODES: { id: Mode; label: string }[] = [
  { id: 'classic', label: 'Classic' },
  { id: 'magic', label: 'Magic Letters' },
];

/** Word Builder entry: a Classic / Magic Letters switch above the chosen mode. Classic is the default. */
export default function WordBuilderActivity() {
  const [mode, setMode] = useState<Mode>('classic');
  return (
    <div>
      <div role="tablist" aria-label="Word Builder mode" className="mb-4 inline-flex rounded-full bg-brand-100 p-1.5">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            id={`pl-wb-tab-${m.id}`}
            aria-selected={mode === m.id}
            aria-controls="pl-wb-panel"
            onClick={() => setMode(m.id)}
            className={`min-h-[2.9rem] rounded-full px-5 font-display text-base font-semibold transition-colors sm:px-6 ${mode === m.id ? 'bg-brand-700 text-white shadow-soft' : 'text-brand-800 hover:bg-white/60'}`}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="pl-wb-panel" aria-labelledby={`pl-wb-tab-${mode}`}>
        {mode === 'classic' ? <ClassicWordBuilder /> : <MagicWordBuilder />}
      </div>
    </div>
  );
}
