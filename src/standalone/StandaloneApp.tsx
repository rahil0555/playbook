import { useCallback, useEffect, useState } from 'react';
import { PlayLab, isPlayLabView } from '../playlab';
import type { PlayLabView } from '../playlab';

/**
 * Standalone host. Mirrors the current screen in the URL hash (#/word-builder)
 * so refresh and back/forward work on any static host and under any sub-path,
 * with no server rewrite rules. This is also a reference for how the main app
 * can mount <PlayLab /> with controlled navigation.
 */
const readHash = (): PlayLabView => {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return isPlayLabView(raw) ? raw : 'home';
};

export function StandaloneApp() {
  const [view, setView] = useState<PlayLabView>(readHash);

  useEffect(() => {
    const onHash = () => setView(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const onViewChange = useCallback((next: PlayLabView) => {
    window.location.hash = `/${next}`;
  }, []);

  return <PlayLab view={view} onViewChange={onViewChange} />;
}
