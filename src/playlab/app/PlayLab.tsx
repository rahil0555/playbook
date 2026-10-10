import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import { getContentPack } from '../data/registry';
import { AppShell } from '../components/AppShell';
import { brandCssVars } from '../lib/theme';
import { createAudioService } from '../services/audioService';
import { createLocalStorageAdapter } from '../services/progressService';
import { ProgressStore } from '../services/progressStore';
import { loadSettings, saveSettings } from '../services/settingsService';
import type { PlayLabProps } from '../types/api';
import type { ActivityCompletion, AnswerResult, BadgeId, DifficultyLevel, PlayLabView } from '../types/learning';
import { PlayLabContext, type PlayLabContextValue } from './PlayLabContext';
import { ViewRouter } from './routes';
import '../styles/playlab.css';

/**
 * <PlayLab /> - the public entry point of the feature.
 * Self-contained: own state, own audio, own progress store, no router, no global CSS.
 * See docs/INTEGRATION.md for the full contract.
 */
export function PlayLab({
  initialActivity = 'home',
  view: viewProp,
  onViewChange,
  language = 'en',
  level: levelProp,
  theme,
  learner,
  progressAdapter,
  onAnswerSubmit,
  onActivityComplete,
  onExit,
  className = '',
}: PlayLabProps) {
  const content = useMemo(() => getContentPack(language), [language]);
  const learnerId = learner?.id;

  /* ---- services (created once per mount / per learner) ---- */
  const audio = useMemo(() => createAudioService(), []);
  const [badgeQueue, setBadgeQueue] = useState<BadgeId[]>([]);
  const adapter = useMemo(() => progressAdapter ?? createLocalStorageAdapter(learnerId), [progressAdapter, learnerId]);
  const store = useMemo(
    () => new ProgressStore(adapter, { alphabetSize: content.letters.length, onBadges: (ids) => setBadgeQueue((q) => [...q, ...ids]) }),
    [adapter, content.letters.length],
  );
  useEffect(() => () => audio.stop(), [audio]);

  /* ---- settings ---- */
  const [settings, setSettings] = useState(() => loadSettings(learnerId));
  useEffect(() => {
    setSettings(loadSettings(learnerId));
  }, [learnerId]);
  useEffect(() => saveSettings(settings, learnerId), [settings, learnerId]);
  useEffect(() => audio.setMuted(!settings.sound), [audio, settings.sound]);
  useEffect(() => audio.setVoice(settings.voice), [audio, settings.voice]);
  const level: DifficultyLevel = levelProp ?? settings.level;
  const setLevel = useCallback((l: DifficultyLevel) => setSettings((s) => ({ ...s, level: l })), []);
  const setSoundEnabled = useCallback((on: boolean) => setSettings((s) => ({ ...s, sound: on })), []);
  const setVoice = useCallback((voice: string | null) => setSettings((s) => ({ ...s, voice })), []);

  /* ---- motion preference: OS setting OR host override ---- */
  const systemReduced = useReducedMotion();
  const reducedMotion = theme?.motion === 'reduce' || !!systemReduced;

  /* ---- navigation (uncontrolled unless `view` is passed) ---- */
  const [innerView, setInnerView] = useState<PlayLabView>(initialActivity);
  const view = viewProp ?? innerView;
  const onViewChangeRef = useRef(onViewChange);
  onViewChangeRef.current = onViewChange;
  const controlled = viewProp !== undefined;
  const navigate = useCallback(
    (next: PlayLabView) => {
      if (!controlled) setInnerView(next);
      onViewChangeRef.current?.(next);
    },
    [controlled],
  );

  /* ---- host callbacks (latest versions, stable identities) ---- */
  const cb = useRef({ onAnswerSubmit, onActivityComplete, onExit });
  cb.current = { onAnswerSubmit, onActivityComplete, onExit };
  const levelRef = useRef(level);
  levelRef.current = level;

  const recordStart = useCallback<PlayLabContextValue['recordStart']>(
    (activityId) => store.record({ type: 'activity_started', activityId, timestamp: Date.now() }),
    [store],
  );
  const recordAnswer = useCallback<PlayLabContextValue['recordAnswer']>(
    (answer) => {
      const result: AnswerResult = { ...answer, timestamp: Date.now() };
      store.record({ type: 'answer_submitted', result });
      safely(() => cb.current.onAnswerSubmit?.(result));
      return result;
    },
    [store],
  );
  const recordCompletion = useCallback<PlayLabContextValue['recordCompletion']>(
    (partial) => {
      const completion: ActivityCompletion = { ...partial, level: levelRef.current, timestamp: Date.now() };
      store.record({ type: 'activity_completed', completion });
      safely(() => cb.current.onActivityComplete?.(completion));
      return completion;
    },
    [store],
  );
  const exploreLetter = useCallback((letter: string) => store.record({ type: 'letter_explored', letter, timestamp: Date.now() }), [store]);
  const exit = useCallback(() => cb.current.onExit?.(), []);
  const dismissBadgeToast = useCallback(() => setBadgeQueue((q) => q.slice(1)), []);

  const value = useMemo<PlayLabContextValue>(
    () => ({
      content,
      level,
      levelLocked: levelProp !== undefined,
      setLevel,
      soundEnabled: settings.sound,
      setSoundEnabled,
      voice: settings.voice,
      setVoice,
      reducedMotion,
      audio,
      store,
      view,
      navigate,
      learner,
      canExit: !!onExit,
      exit,
      recordStart,
      recordAnswer,
      recordCompletion,
      exploreLetter,
      badgeToast: badgeQueue[0] ?? null,
      dismissBadgeToast,
    }),
    [content, level, levelProp, setLevel, settings.sound, setSoundEnabled, settings.voice, setVoice, reducedMotion, audio, store, view, navigate, learner, onExit, exit, recordStart, recordAnswer, recordCompletion, exploreLetter, badgeQueue, dismissBadgeToast],
  );

  const style = brandCssVars(theme?.brandColor) as CSSProperties;

  return (
    <div className={`pl-root pl-backdrop ${className}`} style={style} data-motion={reducedMotion ? 'reduce' : undefined} lang={content.language} data-playlab="">
      <MotionConfig reducedMotion={theme?.motion === 'reduce' ? 'always' : 'user'}>
        <PlayLabContext.Provider value={value}>
          <AppShell>
            <ViewRouter />
          </AppShell>
        </PlayLabContext.Provider>
      </MotionConfig>
    </div>
  );
}

function safely(fn: () => void) {
  try {
    fn();
  } catch (error) {
    // a host callback must never break the learning flow
    console.error('[PlayLab] host callback threw', error);
  }
}
