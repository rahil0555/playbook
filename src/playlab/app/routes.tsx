import { lazy, Suspense } from 'react';
import { usePlayLab } from './PlayLabContext';
import { Mascot } from '../components/Mascot';
import type { PlayLabView } from '../types/learning';

/**
 * Screens are lazy-loaded so the first paint only ships the home screen;
 * each activity is its own chunk (good for low-cost phones and tablets).
 */
const screens: Record<PlayLabView, React.LazyExoticComponent<React.ComponentType>> = {
  home: lazy(() => import('../features/home/HomeScreen')),
  progress: lazy(() => import('../features/progress/ProgressScreen')),
  alphabet: lazy(() => import('../features/alphabet/AlphabetActivity')),
  phonics: lazy(() => import('../features/phonics/PhonicsActivity')),
  'word-builder': lazy(() => import('../features/word-builder/WordBuilderActivity')),
  sentences: lazy(() => import('../features/sentence-builder/SentenceBuilderActivity')),
  matching: lazy(() => import('../features/matching/MatchingActivity')),
  story: lazy(() => import('../features/story/StoryActivity')),
};

export function LoadingScreen() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-[50vh] place-items-center">
      <div className="flex flex-col items-center gap-3 text-ink-soft">
        <Mascot mood="think" className="h-24 w-24" float />
        <p className="font-display text-xl font-semibold">Getting ready…</p>
      </div>
    </div>
  );
}

/** Renders the current view. Activities are keyed by language + level so changing either starts a fresh round. */
export function ViewRouter() {
  const { view, content, level } = usePlayLab();
  const Screen = screens[view] ?? screens.home;
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Screen key={`${view}:${content.language}:${level}`} />
    </Suspense>
  );
}
