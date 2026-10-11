import { useState } from 'react';
import { ActivityHeader } from '../../components/ActivityHeader';
import { LetterDiscovery } from './LetterDiscovery';
import { SoundQuiz } from './SoundQuiz';

type Mode = 'discover' | 'quiz';

const TABS: { id: Mode; label: string }[] = [
  { id: 'discover', label: 'Discover sounds' },
  { id: 'quiz', label: 'Listen & choose' },
];

export default function PhonicsActivity() {
  const [mode, setMode] = useState<Mode>('discover');
  return (
    <div>
      <ActivityHeader
        activityId="phonics"
        instruction={mode === 'discover' ? 'Pick a letter. Hear its name, then hear its sound. They are different!' : 'Listen to the sound. Then tap the letter that makes it.'}
      />
      <div role="tablist" aria-label="Sound activities" className="mb-5 inline-flex rounded-full bg-white/90 p-1.5 shadow-soft">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`pl-tab-${t.id}`}
            aria-selected={mode === t.id}
            aria-controls={`pl-panel-${t.id}`}
            type="button"
            onClick={() => setMode(t.id)}
            className={`min-h-[3rem] rounded-full px-5 font-display text-base font-semibold transition-colors sm:px-7 sm:text-lg ${mode === t.id ? 'bg-sky-700 text-white shadow-soft' : 'text-sky-700 hover:bg-white/60'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`pl-panel-${mode}`} aria-labelledby={`pl-tab-${mode}`}>
        {mode === 'discover' ? <LetterDiscovery /> : <SoundQuiz onExplore={() => setMode('discover')} />}
      </div>
    </div>
  );
}
