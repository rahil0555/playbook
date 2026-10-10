import { useMemo, useState } from 'react';
import { PlayLab, createLocalStorageAdapter } from '../playlab';
import type { ActivityCompletion, AnswerResult, DifficultyLevel, ProgressAdapter, ProgressEvent } from '../playlab';

/**
 * Example of the main Edurance app embedding <PlayLab />. Open the demo with /?host
 *
 * It shows how a host can:
 *  - mount PlayLab inside its own page and handle "Back to Edurance" (onExit)
 *  - pass student configuration (opaque learner id, level, language)
 *  - plug in its own progress adapter (here: wraps local storage and logs events)
 *  - receive answer / completion callbacks
 *  - coexist with aggressive global CSS (toggle "Legacy CSS" to see PlayLab is unaffected)
 */
const LEGACY_CSS = `
  /* typical legacy global rules (no !important): element selectors AND wrapper-scoped selectors */
  button { background: #c00; color: #ff0; border: 4px dotted #000; padding: 30px; border-radius: 0; font-family: 'Times New Roman', serif; }
  h1, h2 { font: 10px/1 monospace; color: #f0f; margin: 40px; }
  p, ul, li { margin: 24px; padding: 12px; }
  * { box-sizing: content-box; }
  .host-legacy button { background: #060; border: 6px double #fff; padding: 22px; }
  .host-legacy h1, .host-legacy h2 { font-size: 9px; color: #f60; }
  .host-legacy ul, .host-legacy li { margin: 18px; padding: 10px; }
`;

export function HostExample() {
  const [screen, setScreen] = useState<'dashboard' | 'playlab'>('dashboard');
  const [legacy, setLegacy] = useState(false);
  const [level, setLevel] = useState<DifficultyLevel | ''>('');
  const [log, setLog] = useState<string[]>([]);
  const push = (line: string) => setLog((l) => [line, ...l].slice(0, 8));

  // Host-owned persistence: here we wrap the local-storage adapter, but this is where a call to the main app's API would go.
  const adapter = useMemo<ProgressAdapter>(() => {
    const inner = createLocalStorageAdapter('host-demo-student');
    return {
      load: () => inner.load(),
      save: (snapshot) => {
        inner.save(snapshot);
        push(`save → ${snapshot.stars} stars, ${snapshot.activitiesCompleted} rounds`);
      },
      track: (e: ProgressEvent) => push(`track → ${e.type}`),
      clear: () => inner.clear?.(),
    };
  }, []);

  return (
    <div className={legacy ? 'host-legacy' : undefined} style={{ minHeight: '100vh', background: '#f4f6f8', fontFamily: 'system-ui' }}>
      {legacy ? <style>{LEGACY_CSS}</style> : null}
      <header style={{ background: '#16324f', color: '#fff', padding: '12px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
        <strong>Edurance (host app mock-up)</strong>
        <label>
          <input type="checkbox" checked={legacy} onChange={(e) => setLegacy(e.target.checked)} data-testid="legacy-toggle" /> Legacy CSS
        </label>
        <label>
          Level{' '}
          <select value={level} onChange={(e) => setLevel(e.target.value as DifficultyLevel | '')} data-testid="host-level">
            <option value="">(child chooses)</option>
            <option value="starter">starter</option>
            <option value="explorer">explorer</option>
            <option value="adventurer">adventurer</option>
          </select>
        </label>
      </header>

      {screen === 'dashboard' ? (
        <main style={{ padding: 24 }}>
          <h1 style={{ margin: 0 }}>Student dashboard</h1>
          <p>This is the host application. PlayLab is one route inside it.</p>
          <button type="button" onClick={() => setScreen('playlab')} data-testid="open-playlab" style={{ padding: '10px 16px' }}>
            Open PlayLab
          </button>
          <section aria-label="Host event log" style={{ marginTop: 24 }}>
            <h2>Events received by the host</h2>
            <ul data-testid="host-log">
              {log.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </section>
        </main>
      ) : (
        <div data-testid="playlab-slot">
          <PlayLab
            language="en"
            initialActivity="alphabet"
            level={level || undefined}
            learner={{ id: 'host-demo-student', displayName: 'Maya' }}
            theme={{ brandColor: '#16a286' }}
            progressAdapter={adapter}
            onAnswerSubmit={(r: AnswerResult) => push(`answer → ${r.activityId} ${r.questionId} ${r.correct ? '✓' : '✗'}`)}
            onActivityComplete={(c: ActivityCompletion) => push(`complete → ${c.activityId} ${c.score}/${c.total} ★${c.stars}`)}
            onExit={() => setScreen('dashboard')}
          />
        </div>
      )}
    </div>
  );
}
