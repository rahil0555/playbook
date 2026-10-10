import { createContext, useContext, useSyncExternalStore } from 'react';
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
  level: DifficultyLevel;
  /** true when the host passed `level`, so the in-app picker is hidden */
  levelLocked: boolean;
  setLevel: (level: DifficultyLevel) => void;
  soundEnabled: boolean;
  setSoundEnabled: (on: boolean) => void;
  /** Saved browser voice id (null = automatic) */
  voice: string | null;
  setVoice: (voiceId: string | null) => void;
  /** OS preference OR host-forced */
  reducedMotion: boolean;
  audio: AudioService;
  store: ProgressStore;
  view: PlayLabView;
  navigate: (view: PlayLabView) => void;
  learner?: PlayLabLearner;
  canExit: boolean;
  exit: () => void;
  recordStart: (activityId: ActivityId) => void;
  recordAnswer: (answer: Omit<AnswerResult, 'timestamp'>) => AnswerResult;
  recordCompletion: (completion: Omit<ActivityCompletion, 'timestamp' | 'level'>) => ActivityCompletion;
  exploreLetter: (letterId: string) => void;
  /** First unseen badge, shown as a toast by the shell */
  badgeToast: BadgeId | null;
  dismissBadgeToast: () => void;
}

export const PlayLabContext = createContext<PlayLabContextValue | null>(null);

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
