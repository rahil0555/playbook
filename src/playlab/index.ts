/**
 * Public entry point of Edurance PlayLab.
 * Everything the main Edurance app should import comes from this file.
 */
export { PlayLab } from './app/PlayLab';
export { registerContentPack } from './data/registry';
export { createLocalStorageAdapter, createMemoryAdapter } from './services/progressService';
export type { PlayLabProps, PlayLabTheme, PlayLabLearner } from './types/api';
export type {
  ActivityCompletion,
  ActivityId,
  AnswerResult,
  BadgeId,
  ContentPack,
  DifficultyLevel,
  LanguageCode,
  LetterEntry,
  PlayLabView,
  ProgressAdapter,
  ProgressEvent,
  ProgressSnapshot,
  SentenceEntry,
  WordEntry,
} from './types/learning';
