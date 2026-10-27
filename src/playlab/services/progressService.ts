import { ACTIVITY_IDS } from '../data/activities';
import type {
  ActivityId,
  ActivityProgress,
  BadgeId,
  ProgressAdapter,
  ProgressEvent,
  ProgressSnapshot,
  SessionStats,
} from '../types/learning';

/**
 * Pure progress logic + the two built-in adapters. No React in here.
 * The main Edurance app can supply its own ProgressAdapter instead of the
 * local-storage one; the reducer stays the same.
 */

export const STORAGE_PREFIX = 'edurance.playlab.progress.v1';
export const RECENT_LIMIT = 8;
export const MATCHING_VARIANTS = ['letter-picture', 'sound-letter', 'word-completion'] as const;

const emptyActivity = (): ActivityProgress => ({
  started: 0,
  answered: 0,
  correct: 0,
  firstTryCorrect: 0,
  completed: 0,
  bestStars: 0,
});

export function createEmptySnapshot(): ProgressSnapshot {
  return {
    version: 1,
    stars: 0,
    activitiesStarted: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    firstTryCorrect: 0,
    activitiesCompleted: 0,
    perActivity: Object.fromEntries(ACTIVITY_IDS.map((id) => [id, emptyActivity()])) as Record<ActivityId, ActivityProgress>,
    exploredLetters: [],
    matchingVariantsDone: [],
    badges: [],
    recent: [],
  };
}

export function createEmptySession(now: number = Date.now()): SessionStats {
  return {
    startedAt: now,
    activitiesStarted: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    firstTryCorrect: 0,
    activitiesCompleted: 0,
    stars: 0,
    streak: 0,
    bestStreak: 0,
  };
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0);

/** Defensive parse of whatever an adapter hands back (corrupt storage, old versions, ...). */
export function normalizeSnapshot(raw: unknown): ProgressSnapshot {
  const base = createEmptySnapshot();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<ProgressSnapshot>;
  const per = (r.perActivity ?? {}) as Record<string, Partial<ActivityProgress>>;
  for (const id of ACTIVITY_IDS) {
    const p = per[id] ?? {};
    base.perActivity[id] = {
      started: num(p.started),
      answered: num(p.answered),
      correct: num(p.correct),
      firstTryCorrect: num(p.firstTryCorrect),
      completed: num(p.completed),
      bestStars: num(p.bestStars),
    };
  }
  base.stars = num(r.stars);
  base.activitiesStarted = num(r.activitiesStarted);
  base.questionsAnswered = num(r.questionsAnswered);
  base.correctAnswers = num(r.correctAnswers);
  base.firstTryCorrect = num(r.firstTryCorrect);
  base.activitiesCompleted = num(r.activitiesCompleted);
  base.exploredLetters = Array.isArray(r.exploredLetters) ? [...new Set(r.exploredLetters.filter((l): l is string => typeof l === 'string'))] : [];
  base.matchingVariantsDone = Array.isArray(r.matchingVariantsDone) ? r.matchingVariantsDone.filter((v): v is string => typeof v === 'string') : [];
  base.badges = Array.isArray(r.badges) ? (r.badges.filter((b): b is BadgeId => typeof b === 'string')) : [];
  base.recent = Array.isArray(r.recent)
    ? r.recent
        .filter((e) => e && typeof e === 'object' && ACTIVITY_IDS.includes((e as { activityId: ActivityId }).activityId))
        .slice(0, RECENT_LIMIT)
    : [];
  return base;
}

export interface ReduceContext {
  /** number of letters in the current alphabet (for the explorer badge) */
  alphabetSize?: number;
}

export interface ReduceResult {
  lifetime: ProgressSnapshot;
  session: SessionStats;
  newBadges: BadgeId[];
}

function evaluateBadges(s: ProgressSnapshot, session: SessionStats, ctx: ReduceContext): BadgeId[] {
  const earned: Partial<Record<BadgeId, boolean>> = {
    'first-steps': s.activitiesCompleted >= 1,
    'letter-explorer': s.exploredLetters.length >= (ctx.alphabetSize ?? 26),
    'sound-detective': s.perActivity.phonics.correct >= 5,
    'word-builder': s.perActivity['word-builder'].correct >= 5,
    'sentence-star': s.perActivity.sentences.correct >= 5,
    'match-maker': MATCHING_VARIANTS.every((v) => s.matchingVariantsDone.includes(v)),
    'super-streak': session.bestStreak >= 5,
  };
  return (Object.keys(earned) as BadgeId[]).filter((id) => earned[id] && !s.badges.includes(id));
}

/** Apply one event. Never mutates its inputs. */
export function reduceProgress(
  state: { lifetime: ProgressSnapshot; session: SessionStats },
  event: ProgressEvent,
  ctx: ReduceContext = {},
): ReduceResult {
  const lifetime: ProgressSnapshot = {
    ...state.lifetime,
    perActivity: { ...state.lifetime.perActivity },
  };
  const session: SessionStats = { ...state.session };

  switch (event.type) {
    case 'activity_started': {
      lifetime.activitiesStarted += 1;
      session.activitiesStarted += 1;
      lifetime.perActivity[event.activityId] = {
        ...lifetime.perActivity[event.activityId],
        started: lifetime.perActivity[event.activityId].started + 1,
      };
      break;
    }
    case 'answer_submitted': {
      const { result } = event;
      const firstTry = result.correct && result.attempt === 1;
      const per = lifetime.perActivity[result.activityId];
      lifetime.questionsAnswered += 1;
      session.questionsAnswered += 1;
      if (result.correct) {
        lifetime.correctAnswers += 1;
        session.correctAnswers += 1;
      }
      // a single answer earns no star: stars come from finished rounds only (activity_completed), so one success is rewarded once
      if (firstTry) {
        lifetime.firstTryCorrect += 1;
        session.firstTryCorrect += 1;
      }
      // A wrong or retried answer simply restarts the streak; it is never shown as a loss.
      session.streak = firstTry ? session.streak + 1 : 0;
      session.bestStreak = Math.max(session.bestStreak, session.streak);
      lifetime.perActivity[result.activityId] = {
        ...per,
        answered: per.answered + 1,
        correct: per.correct + (result.correct ? 1 : 0),
        firstTryCorrect: per.firstTryCorrect + (firstTry ? 1 : 0),
      };
      break;
    }
    case 'activity_completed': {
      const c = event.completion;
      const per = lifetime.perActivity[c.activityId];
      lifetime.activitiesCompleted += 1;
      session.activitiesCompleted += 1;
      lifetime.stars += c.stars;
      session.stars += c.stars;
      lifetime.perActivity[c.activityId] = {
        ...per,
        completed: per.completed + 1,
        bestStars: Math.max(per.bestStars, c.stars),
      };
      lifetime.recent = [
        { activityId: c.activityId, stars: c.stars, score: c.score, total: c.total, at: c.timestamp, variant: c.variant },
        ...lifetime.recent,
      ].slice(0, RECENT_LIMIT);
      if (c.variant && !lifetime.matchingVariantsDone.includes(c.variant)) {
        lifetime.matchingVariantsDone = [...lifetime.matchingVariantsDone, c.variant];
      }
      break;
    }
    case 'letter_explored': {
      if (!lifetime.exploredLetters.includes(event.letter)) {
        lifetime.exploredLetters = [...lifetime.exploredLetters, event.letter];
      }
      break;
    }
  }

  const newBadges = evaluateBadges(lifetime, session, ctx);
  if (newBadges.length) lifetime.badges = [...lifetime.badges, ...newBadges];
  return { lifetime, session, newBadges };
}

/** Stars for a finished round: always at least 1, never negative. */
export function starsForScore(score: number, total: number): 1 | 2 | 3 {
  if (total <= 0) return 1;
  const ratio = score / total;
  return ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : 1;
}

/* --------------------------------- adapters --------------------------------- */

export function createMemoryAdapter(initial: ProgressSnapshot | null = null): ProgressAdapter {
  let saved: ProgressSnapshot | null = initial;
  return {
    load: () => saved,
    save: (snapshot) => {
      saved = snapshot;
    },
    clear: () => {
      saved = null;
    },
  };
}

/** Local-storage adapter for the standalone demo. Every access is guarded: storage can be blocked or full. */
export function createLocalStorageAdapter(learnerId?: string): ProgressAdapter {
  const key = learnerId ? `${STORAGE_PREFIX}:${learnerId}` : STORAGE_PREFIX;
  const fallback = createMemoryAdapter();
  // Once a write has failed, the in-memory copy is the newest truth for this visit.
  let degraded = false;
  return {
    load() {
      if (degraded) return fallback.load();
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? normalizeSnapshot(JSON.parse(raw)) : fallback.load();
      } catch {
        return fallback.load();
      }
    },
    save(snapshot) {
      void fallback.save(snapshot);
      try {
        window.localStorage.setItem(key, JSON.stringify(snapshot));
        degraded = false;
      } catch {
        degraded = true;
      }
    },
    clear() {
      void fallback.clear?.();
      degraded = false;
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* storage unavailable */
      }
    },
  };
}
