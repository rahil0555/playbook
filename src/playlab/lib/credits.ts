import type { ActivityId, ProgressSnapshot } from '../types/learning';

/**
 * The free-play credits, in ONE place.
 *
 * Free play is spent as the child plays, not when a screen is opened: each activity hands out a
 * number of units (letters, words, sentences, games) and the wall appears the moment the last one
 * is used, in the middle of the activity. The wall pauses what the child was doing, and a
 * subscription resumes it exactly where it stopped.
 *
 * The decision is *data*: a host can change any number, or the word that unit is called, without
 * touching a component. Usage comes from the EXISTING progress snapshot (services/progressService),
 * so no screen keeps a counter of its own and nothing can drift out of step with what was played.
 */
export type CreditUnit = 'letters-explored' | 'letters-answered' | 'words-built' | 'sentences-built' | 'rounds-started';

/** One activity's free allowance. */
export interface CreditRule {
  /** how many units of `spentOn` are free */
  free: number;
  /** the saved progress counter that the allowance is spent on */
  spentOn: CreditUnit;
  /** the word for ONE unit, so the wall's own copy is right ("12 letters", "4 words") */
  noun: string;
}

export type CreditsPolicy = Partial<Record<ActivityId, CreditRule>>;

/** An activity that gives no free play (used by tests and by a host that gates everything). */
export const NO_CREDITS: CreditRule = { free: 0, spentOn: 'rounds-started', noun: 'round' };

/**
 * The demo allowance, from the product owner's own numbers:
 *  - Letter Playground: 12 letters
 *  - Sound Discovery: 12 letters (each answered sound question is one letter gone through)
 *  - Word Builder: 16 words (4 rounds of 4 words)
 *  - Sentence Fun: 4 sentences
 *  - Match & Play: 2 games
 * Home, My Stars and the story page are never gated: the wall always has somewhere to go back to.
 */
export const DEFAULT_CREDITS_POLICY: CreditsPolicy = {
  alphabet: { free: 12, spentOn: 'letters-explored', noun: 'letter' },
  phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' },
  'word-builder': { free: 16, spentOn: 'words-built', noun: 'word' },
  sentences: { free: 4, spentOn: 'sentences-built', noun: 'sentence' },
  matching: { free: 2, spentOn: 'rounds-started', noun: 'game' },
};

/** How many units of `unit` the child has used, read from the saved progress. Missing state is no usage. */
export function usedUnits(unit: CreditUnit, state: ProgressSnapshot | null | undefined): number {
  if (!state) return 0;
  const at = (id: ActivityId) => Math.max(0, state.perActivity?.[id]?.started ?? 0);
  switch (unit) {
    case 'letters-explored':
      return Array.isArray(state.exploredLetters) ? state.exploredLetters.length : 0;
    // Sound Discovery walks a letter at a time: a question heard and answered is a letter gone through
    case 'letters-answered':
      return Math.max(0, state.perActivity?.phonics?.answered ?? 0);
    // a word is built when it is spelled right
    case 'words-built':
      return Math.max(0, state.perActivity?.['word-builder']?.correct ?? 0);
    case 'sentences-built':
      return Math.max(0, state.perActivity?.sentences?.correct ?? 0);
    // a matching game is an attempt, counted when it starts (a replay is a new attempt)
    case 'rounds-started':
      return Math.max(0, state.perActivity?.matching?.completed ?? at('matching'));
  }
}

export interface CreditDecision {
  /** true = the child may carry on with this activity */
  allowed: boolean;
  /** free units used so far, never more than the allowance */
  used: number;
  /** the allowance this decision was made with */
  free: number;
  /** how many units are left (0 when the wall is due) */
  remaining: number;
  /** the word for one unit */
  noun: string;
}

/** The rule for an activity, or the no-free-play rule that gates everything a host left out. */
export function ruleFor(activityId: ActivityId, policy: CreditsPolicy = DEFAULT_CREDITS_POLICY): CreditRule {
  return policy[activityId] ?? NO_CREDITS;
}

/**
 * Pure decision: may the child play on in this activity? `unlocked` (a subscription) wins outright.
 * No timers, no storage, no side effects: the same inputs always give the same answer.
 */
export function evaluateCredits(
  activityId: ActivityId,
  state: ProgressSnapshot | null | undefined,
  policy: CreditsPolicy = DEFAULT_CREDITS_POLICY,
  unlocked = false,
): CreditDecision {
  const rule = ruleFor(activityId, policy);
  const free = Math.max(0, rule.free);
  if (unlocked) return { allowed: true, used: 0, free, remaining: free, noun: rule.noun };
  const usedRaw = usedUnits(rule.spentOn, state);
  const used = Math.min(usedRaw, free);
  const remaining = Math.max(0, free - usedRaw);
  return { allowed: remaining > 0, used, free, remaining, noun: rule.noun };
}

/** Convenience for the UI: is this activity's free play used up right now? */
export function isExhausted(activityId: ActivityId, state: ProgressSnapshot | null | undefined, policy: CreditsPolicy = DEFAULT_CREDITS_POLICY): boolean {
  return !evaluateCredits(activityId, state, policy).allowed;
}

/** True when every activity's free play is used up: the whole app is behind the wall. */
export function allExhausted(state: ProgressSnapshot | null | undefined, policy: CreditsPolicy = DEFAULT_CREDITS_POLICY): boolean {
  const ids = Object.keys(policy) as ActivityId[];
  return ids.length > 0 && ids.every((id) => isExhausted(id, state, policy));
}

/** How a unit is said in a sentence: "1 letter" / "3 letters". */
export function unitsLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}
