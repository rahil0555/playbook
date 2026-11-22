/**
 * Public entry point of Edurance PlayLab.
 * Everything the main Edurance app should import comes from this file.
 */
export { PlayLab } from './app/PlayLab';
export { registerContentPack } from './data/registry';
export { PLAYLAB_VIEWS, isPlayLabView } from './data/activities';
export { createLocalStorageAdapter, createMemoryAdapter } from './services/progressService';
export { DEFAULT_CREDITS_POLICY, evaluateCredits, isExhausted, usedUnits, unitsLabel } from './lib/credits';
export type { CreditDecision, CreditRule, CreditUnit, CreditsPolicy } from './lib/credits';
export { loadEntitlement, saveEntitlement, DEFAULT_ENTITLEMENT } from './services/entitlementsService';
export type { EntitlementState } from './services/entitlementsService';

export type { PlayLabProps, PlayLabTheme, PlayLabLearner, UpgradeRequest } from './types/api';
export { CURRENCY, DEMO_PLANS, DEFAULT_PLAN_ID, findPlan } from './lib/pricing';
export type { Plan } from './lib/pricing';
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
