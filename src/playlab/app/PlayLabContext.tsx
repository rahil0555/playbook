import { createContext, useContext, useSyncExternalStore } from 'react';
import type { CreditsPolicy } from '../lib/credits';
import type { AudioService } from '../services/audioService';
import type { ProgressStore } from '../services/progressStore';
import type {
  ActivityCompletion,
  ActivityId,
  AnswerResult,
  BadgeId,
  ContentPack,
  DifficultyLevel,
  PlayLabView,
  ProgressState,
} from '../types/learning';
import type { PlayLabLearner } from '../types/api';

export interface PlayLabContextValue {
  content: ContentPack;
  /** the level every child plays at (all the words and stories); a host that passes `level` sets it */
  level: DifficultyLevel;
  /** true when the host passed `level` */
  levelLocked: boolean;
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
  /** OS preference OR host-forced */
  reducedMotion: boolean;
  audio: AudioService;
  store: ProgressStore;
  view: PlayLabView;
  navigate: (view: PlayLabView) => void;
  learner?: PlayLabLearner;
  canExit: boolean;
  exit: () => void;
  /** Per-activity free credit limits. */
  paywall: CreditsPolicy;
  /** true once everything is unlocked (host `unlocked` prop, or the demo unlock) */
  unlocked: boolean;
  /**
   * Tries to open a screen. When the screen is gated and the free allowance is spent, the wall is
   * shown instead and this returns false. Use it for every activity entry point.
   */
  openActivity: (view: PlayLabView) => boolean;
  /** Resumes the pending activity after the demo parent check succeeds. */
  resumeBlockedActivity: () => void;
  /** the wall's state: which activity was blocked, or null when the wall is closed */
  blockedActivity: ActivityId | null;
  paused: boolean;
  closeWall: () => void;
  /** the demonstration unlock (parent check passed) */
  unlock: () => void;
  recordStart: (activityId: ActivityId) => void;
  recordAnswer: (answer: Omit<AnswerResult, 'timestamp'>) => AnswerResult;
  recordCompletion: (completion: Omit<ActivityCompletion, 'timestamp' | 'level'>) => ActivityCompletion;
  exploreLetter: (letterId: string) => void;
  /** First unseen badge, shown as a toast by the shell */
  badgeToast: BadgeId | null;
  dismissBadgeToast: () => void;
}

export const PlayLabContext = createContext<PlayLabContextValue | null>(null);
export const PlayLabPausedContext = createContext(false);

export function usePlayLab(): PlayLabContextValue {
  const ctx = useContext(PlayLabContext);
  if (!ctx) throw new Error('usePlayLab must be used inside <PlayLab>');
  return ctx;
}

/** Subscribes to lifetime + session progress. */
export function useProgressState(): ProgressState {
  const { store } = usePlayLab();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}
