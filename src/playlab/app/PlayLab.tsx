import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MotionConfig, useReducedMotion } from 'framer-motion';
import { getContentPack } from '../data/registry';
import { AppShell } from '../components/AppShell';
import { Paywall } from '../components/Paywall';
import { DEFAULT_CREDITS_POLICY, evaluateCredits, ruleFor } from '../lib/credits';
import { brandCssVars } from '../lib/theme';
import { createAudioService } from '../services/audioService';
import { loadEntitlement, saveEntitlement } from '../services/entitlementsService';
import { createLocalStorageAdapter } from '../services/progressService';
import { ProgressStore } from '../services/progressStore';
import { loadSettings, saveSettings } from '../services/settingsService';
import type { PlayLabProps } from '../types/api';
import type { ActivityCompletion, ActivityId, AnswerResult, BadgeId, DifficultyLevel, PlayLabView } from '../types/learning';
import { PlayLabContext, PlayLabPausedContext, type PlayLabContextValue } from './PlayLabContext';
import { ViewRouter } from './routes';
import '../styles/playlab.css';

/** The level every child plays at: all the words and stories (see lib/level). */
const FULL_LEVEL: DifficultyLevel = 'adventurer';

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
  paywall: paywallProp,
  unlocked: unlockedProp,
  onUpgradeRequest,
  className = '',
}: PlayLabProps) {
  const content = useMemo(() => getContentPack(language), [language]);
  const learnerId = learner?.id;
  const paywall = useMemo(() => ({ ...DEFAULT_CREDITS_POLICY, ...paywallProp }), [paywallProp]);
  // Host-supplied free/paid flag, or the local demonstration unlock owned by PlayLab.
  const [demoUnlocked, setDemoUnlocked] = useState(false);
  const [blockedActivity, setBlockedActivity] = useState<ActivityId | null>(null);
  useEffect(() => {
    setDemoUnlocked(loadEntitlement(learnerId).unlocked);
    setBlockedActivity(null);
  }, [learnerId]);
  const unlocked = unlockedProp || demoUnlocked;
  const isLocallyUnlocked = demoUnlocked && !unlockedProp;

  /* ---- services (created once per mount / per learner) ---- */
  const audio = useMemo(() => createAudioService(), []);
  const [badgeQueue, setBadgeQueue] = useState<BadgeId[]>([]);
  const adapter = useMemo(() => progressAdapter ?? createLocalStorageAdapter(learnerId), [progressAdapter, learnerId]);
  const store = useMemo(
    () => new ProgressStore(adapter, { alphabetSize: content.letters.length, onBadges: (ids) => setBadgeQueue((q) => [...q, ...ids]) }),
    [adapter, content.letters.length],
  );
  useEffect(() => () => audio.stop(), [audio]);
  // Nothing the previous screen was saying may carry on into the next one, however the view changed
  // (a button, the browser's Back button in the standalone host, or the host app), and not while the page is hidden
  // (switching apps or tabs, locking the screen).
  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === 'hidden') audio.stop();
    };
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', hide);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', hide);
    };
  }, [audio]);

  /* ---- settings ---- */
  const [settings, setSettings] = useState(() => loadSettings(learnerId));
  useEffect(() => {
    setSettings(loadSettings(learnerId));
  }, [learnerId]);
  useEffect(() => saveSettings(settings, learnerId), [settings, learnerId]);
  useEffect(() => audio.setMuted(!settings.sound), [audio, settings.sound]);
  useEffect(() => {
    if (blockedActivity) audio.stop();
  }, [blockedActivity, audio]);
  // every child gets the full word and story content. A host that passes `level` still decides, and a saved level is kept but not used
  const level: DifficultyLevel = levelProp ?? FULL_LEVEL;
  const setSoundEnabled = useCallback((on: boolean) => setSettings((s) => ({ ...s, sound: on })), []);

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
  const lastView = useRef(view);
  useEffect(() => {
    if (lastView.current === view) return;
    lastView.current = view;
    audio.stop();
  }, [view, audio]);

  /* ---- host callbacks (latest versions, stable identities) ---- */
  const cb = useRef({ onAnswerSubmit, onActivityComplete, onExit, onUpgradeRequest });
  cb.current = { onAnswerSubmit, onActivityComplete, onExit, onUpgradeRequest };
  const levelRef = useRef(level);
  levelRef.current = level;

  const checkCredits = useCallback((activityId: ActivityId) => {
    if (isLocallyUnlocked || unlockedProp || !(activityId in paywall)) return;
    const rule = ruleFor(activityId, paywall);
    const decision = evaluateCredits(activityId, store.getState().lifetime, paywall, false);
    if (!decision.allowed && !blockedActivity) {
      setBlockedActivity(activityId);
      audio.stop();
      safely(() => cb.current.onUpgradeRequest?.({ view: activityId, used: decision.used, free: decision.free, unit: rule.noun, timestamp: Date.now() }));
    }
  }, [isLocallyUnlocked, unlockedProp, paywall, store, blockedActivity, audio]);
  const recordStart = useCallback<PlayLabContextValue['recordStart']>(
    (activityId) => {
      store.record({ type: 'activity_started', activityId, timestamp: Date.now() });
      checkCredits(activityId);
    },
    [store, checkCredits],
  );
  const recordAnswer = useCallback<PlayLabContextValue['recordAnswer']>(
    (answer) => {
      const result: AnswerResult = { ...answer, timestamp: Date.now() };
      store.record({ type: 'answer_submitted', result });
      checkCredits(answer.activityId);
      safely(() => cb.current.onAnswerSubmit?.(result));
      return result;
    },
    [store, checkCredits],
  );
  const recordCompletion = useCallback<PlayLabContextValue['recordCompletion']>(
    (partial) => {
      const completion: ActivityCompletion = { ...partial, level: levelRef.current, timestamp: Date.now() };
      store.record({ type: 'activity_completed', completion });
      checkCredits(partial.activityId);
      safely(() => cb.current.onActivityComplete?.(completion));
      return completion;
    },
    [store, checkCredits],
  );
  const exploreLetter = useCallback((letter: string) => {
    store.record({ type: 'letter_explored', letter, timestamp: Date.now() });
    checkCredits('alphabet');
  }, [store, checkCredits]);
  const exit = useCallback(() => cb.current.onExit?.(), []);
  const dismissBadgeToast = useCallback(() => setBadgeQueue((q) => q.slice(1)), []);

  /**
   * The single boundary where a screen is allowed to open. Every activity entry point (home cards,
   * the featured button, the story page) goes through here, so the gate can never be bypassed by a
   * screen that forgets to check. Usage comes from the existing progress snapshot - no new counters.
   */
  const openActivity = useCallback(
    (next: PlayLabView): boolean => {
      if (unlocked || !(next in paywall) || evaluateCredits(next as ActivityId, store.getState().lifetime, paywall, unlocked).allowed) {
        navigate(next);
        return true;
      }
      setBlockedActivity(next as ActivityId);
      audio.sfx('pop');
      const decision = evaluateCredits(next as ActivityId, store.getState().lifetime, paywall, unlocked);
      safely(() => cb.current.onUpgradeRequest?.({ view: next, used: decision.used, free: decision.free, unit: decision.noun, timestamp: Date.now() }));
      return false;
    },
    [unlocked, store, paywall, navigate, audio],
  );
  const closeWall = useCallback(() => {
    setBlockedActivity(null);
    navigate('home');
  }, [navigate]);
  const unlock = useCallback(() => {
    setDemoUnlocked(true);
    saveEntitlement({ unlocked: true, unlockedAt: Date.now(), wallSeenAt: Date.now() }, learnerId);
    // The pending destination is resumed by Paywall only after the demo entitlement is granted.
  }, [learnerId]);
  const resumeBlockedActivity = useCallback(() => {
    if (!blockedActivity) return;
    const pending = blockedActivity;
    setBlockedActivity(null);
    navigate(pending);
  }, [blockedActivity, navigate]);



  const value = useMemo<PlayLabContextValue>(
    () => ({
      content,
      level,
      paywall,
      unlocked,
      openActivity,
      resumeBlockedActivity,
      blockedActivity,
      paused: blockedActivity !== null,
      closeWall,
      unlock,
      levelLocked: levelProp !== undefined,
      soundEnabled: settings.sound,
      setSoundEnabled,
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
    [content, level, levelProp, paywall, unlocked, openActivity, resumeBlockedActivity, blockedActivity, closeWall, unlock, settings.sound, setSoundEnabled, reducedMotion, audio, store, view, navigate, learner, onExit, exit, recordStart, recordAnswer, recordCompletion, exploreLetter, badgeQueue, dismissBadgeToast],
  );

  const style = brandCssVars(theme?.brandColor) as CSSProperties;

  return (
    <div className={`pl-root pl-backdrop ${className}`} style={style} data-motion={reducedMotion ? 'reduce' : undefined} lang={content.language} data-playlab="">
      <MotionConfig reducedMotion={theme?.motion === 'reduce' ? 'always' : 'user'}>
        <PlayLabContext.Provider value={value}>
          <PlayLabPausedContext.Provider value={blockedActivity !== null}>
            <AppShell>
              <ViewRouter />
            </AppShell>
{blockedActivity && !unlocked ? (
              <Paywall
                activityId={blockedActivity}
                decision={evaluateCredits(blockedActivity, store.getState().lifetime, paywall)}
                onUnlock={unlock}
                onResume={resumeBlockedActivity}
                onClose={closeWall}
              />
            ) : null}
          </PlayLabPausedContext.Provider>
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
