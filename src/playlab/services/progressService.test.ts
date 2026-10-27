import { describe, expect, it, vi } from 'vitest';
import type { ActivityCompletion, AnswerResult, ProgressAdapter, ProgressEvent } from '../types/learning';
import {
  createEmptySession, createEmptySnapshot, createLocalStorageAdapter, createMemoryAdapter, normalizeSnapshot, reduceProgress, starsForScore,
} from './progressService';
import { ProgressStore } from './progressStore';

const answer = (over: Partial<AnswerResult> = {}): ProgressEvent => ({
  type: 'answer_submitted',
  result: { activityId: 'phonics', questionId: 'q', correct: true, attempt: 1, response: 'a', expected: 'a', timestamp: 1, ...over },
});
const completion = (over: Partial<ActivityCompletion> = {}): ProgressEvent => ({
  type: 'activity_completed',
  completion: { activityId: 'word-builder', score: 4, total: 5, stars: 3, durationMs: 1, level: 'adventurer', timestamp: 5, ...over },
});
const start = () => ({ lifetime: createEmptySnapshot(), session: createEmptySession(0) });

function run(events: ProgressEvent[]) {
  let state = start();
  const badges: string[] = [];
  for (const e of events) {
    const r = reduceProgress(state, e);
    state = { lifetime: r.lifetime, session: r.session };
    badges.push(...r.newBadges);
  }
  return { ...state, badges };
}

describe('reduceProgress', () => {
  it('counts started activities, answers and first-try answers', () => {
    const { lifetime, session } = run([
      { type: 'activity_started', activityId: 'phonics', timestamp: 1 },
      answer({ correct: false, attempt: 1 }),
      answer({ correct: true, attempt: 2 }),
      answer({ questionId: 'q2', correct: true, attempt: 1 }),
    ]);
    expect(lifetime.activitiesStarted).toBe(1);
    expect(lifetime.questionsAnswered).toBe(3);
    expect(lifetime.correctAnswers).toBe(2);
    expect(lifetime.firstTryCorrect).toBe(1);
    expect(lifetime.stars).toBe(0); // a single answer earns no star; stars come from finished rounds
    expect(lifetime.perActivity.phonics).toMatchObject({ started: 1, answered: 3, correct: 2, firstTryCorrect: 1 });
    expect(session.questionsAnswered).toBe(3);
  });

  it('adds stars on completion and keeps the most recent finished rounds first', () => {
    const { lifetime } = run([completion({ stars: 2, timestamp: 1 }), completion({ stars: 3, timestamp: 2 })]);
    expect(lifetime.activitiesCompleted).toBe(2);
    expect(lifetime.stars).toBe(5);
    expect(lifetime.perActivity['word-builder'].bestStars).toBe(3);
    expect(lifetime.recent.map((r) => r.at)).toEqual([2, 1]);
  });

  it('caps the recent list at 8', () => {
    const events = Array.from({ length: 12 }, (_, i) => completion({ timestamp: i }));
    expect(run(events).lifetime.recent).toHaveLength(8);
  });

  it('awards badges once, and a wrong answer only resets the session streak', () => {
    const fiveRight = Array.from({ length: 5 }, (_, i) => answer({ questionId: `q${i}` }));
    const r = run([...fiveRight, completion(), answer({ correct: false })]);
    expect(r.badges).toEqual(expect.arrayContaining(['sound-detective', 'first-steps', 'super-streak']));
    expect(new Set(r.badges).size).toBe(r.badges.length); // never twice
    expect(r.session.streak).toBe(0);
    expect(r.session.bestStreak).toBe(5);
  });

  it('awards Letter Explorer after all 26 distinct letters and Match Maker after all three games', () => {
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('').map<ProgressEvent>((letter) => ({ type: 'letter_explored', letter, timestamp: 1 }));
    expect(run([...letters, ...letters]).badges).toEqual(['letter-explorer']);
    const games = ['letter-picture', 'sound-letter', 'word-completion'].map((variant) => completion({ activityId: 'matching', variant }));
    expect(run(games).badges).toEqual(expect.arrayContaining(['match-maker']));
  });

  it('never mutates its input', () => {
    const s = start();
    const frozen = JSON.stringify(s);
    reduceProgress(s, answer());
    expect(JSON.stringify(s)).toBe(frozen);
  });
});

describe('each badge unlocks at its own threshold: one short does not earn it, the threshold does', () => {
  const badgesFor = (events: ProgressEvent[]) => run(events).badges;
  const answers = (n: number, over: Partial<AnswerResult> = {}) => Array.from({ length: n }, (_, i) => answer({ questionId: `q${i}`, ...over }));
  const game = (variant: string) => completion({ activityId: 'matching', variant: variant as ActivityCompletion['variant'] });
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const explored = (ls: string[]) => ls.map<ProgressEvent>((letter) => ({ type: 'letter_explored', letter, timestamp: 1 }));

  it('First Steps: no round, then one finished round', () => {
    expect(badgesFor([])).not.toContain('first-steps');
    expect(badgesFor([completion()])).toContain('first-steps');
  });

  it('Letter Explorer: 25 different letters, then all 26', () => {
    expect(badgesFor(explored(letters.slice(0, 25)))).not.toContain('letter-explorer');
    expect(badgesFor(explored(letters))).toContain('letter-explorer');
  });

  it('Sound Detective: 4 right listening answers, then 5', () => {
    expect(badgesFor(answers(4, { activityId: 'phonics' }))).not.toContain('sound-detective');
    expect(badgesFor(answers(5, { activityId: 'phonics' }))).toContain('sound-detective');
  });

  it('Word Builder: 4 words spelled right, then 5', () => {
    expect(badgesFor(answers(4, { activityId: 'word-builder' }))).not.toContain('word-builder');
    expect(badgesFor(answers(5, { activityId: 'word-builder' }))).toContain('word-builder');
  });

  it('Sentence Star: 4 sentences right, then 5', () => {
    expect(badgesFor(answers(4, { activityId: 'sentences' }))).not.toContain('sentence-star');
    expect(badgesFor(answers(5, { activityId: 'sentences' }))).toContain('sentence-star');
  });

  it('Match Maker: two different games, then all three; the same game twice counts once', () => {
    expect(badgesFor([game('letter-picture'), game('sound-letter')])).not.toContain('match-maker');
    expect(badgesFor([game('letter-picture'), game('letter-picture'), game('sound-letter')])).not.toContain('match-maker');
    expect(badgesFor([game('letter-picture'), game('sound-letter'), game('word-completion')])).toContain('match-maker');
  });

  it('Super Streak: 4 right on the first try in a row, then 5', () => {
    expect(badgesFor(answers(4, { activityId: 'matching' }))).not.toContain('super-streak');
    expect(badgesFor(answers(5, { activityId: 'matching' }))).toContain('super-streak');
  });

  it('Super Streak: a retried right answer breaks the run, so 4 + retry + 4 is not 5 in a row', () => {
    const events = [...answers(4, { activityId: 'matching' }), answer({ activityId: 'matching', attempt: 2 }), ...answers(4, { activityId: 'matching' })];
    expect(badgesFor(events)).not.toContain('super-streak');
  });
});

describe('stars and snapshots', () => {
  it('always awards at least one star', () => {
    expect(starsForScore(0, 5)).toBe(1);
    expect(starsForScore(3, 5)).toBe(2);
    expect(starsForScore(4, 5)).toBe(3);
    expect(starsForScore(0, 0)).toBe(1);
  });

  it('normalizes corrupt data instead of throwing', () => {
    expect(normalizeSnapshot(null)).toEqual(createEmptySnapshot());
    expect(normalizeSnapshot('junk')).toEqual(createEmptySnapshot());
    const odd = normalizeSnapshot({ stars: -4, correctAnswers: 'x', exploredLetters: ['a', 'a', 7], recent: [{ activityId: 'nope' }], perActivity: { phonics: { correct: 3 } } });
    expect(odd.stars).toBe(0);
    expect(odd.correctAnswers).toBe(0);
    expect(odd.exploredLetters).toEqual(['a']);
    expect(odd.recent).toEqual([]);
    expect(odd.perActivity.phonics.correct).toBe(3);
    expect(odd.perActivity.alphabet.correct).toBe(0);
  });
});

describe('adapters', () => {
  it('local-storage adapter round-trips and namespaces by learner', () => {
    const a = createLocalStorageAdapter('kid-1');
    const b = createLocalStorageAdapter('kid-2');
    const snap = { ...createEmptySnapshot(), stars: 7 };
    a.save(snap);
    expect(a.load()).toMatchObject({ stars: 7 });
    expect(b.load()).toBeNull();
    a.clear?.();
    expect(a.load()).toBeNull();
  });

  it('local-storage adapter survives unavailable storage', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    const a = createLocalStorageAdapter();
    expect(() => a.save({ ...createEmptySnapshot(), stars: 2 })).not.toThrow();
    expect(a.load()).toMatchObject({ stars: 2 }); // memory fallback
    spy.mockRestore();
  });
});

describe('ProgressStore', () => {
  it('hydrates synchronously, saves after every event and notifies subscribers', () => {
    const adapter = createMemoryAdapter({ ...createEmptySnapshot(), stars: 3 });
    const save = vi.spyOn(adapter, 'save');
    const store = new ProgressStore(adapter);
    expect(store.getState().lifetime.stars).toBe(3);
    const listener = vi.fn();
    store.subscribe(listener);
    store.record(answer());
    expect(listener).toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
    expect(store.getState().lifetime.stars).toBe(3); // a single answer adds no star; the round's stars come when it is finished
    expect(store.getState().lifetime.questionsAnswered).toBe(1);
  });

  it('queues events that arrive before an async adapter has loaded, then replays them', async () => {
    let resolve!: (v: ReturnType<typeof createEmptySnapshot>) => void;
    const adapter: ProgressAdapter = { load: () => new Promise((r) => (resolve = r)), save: vi.fn() };
    const store = new ProgressStore(adapter);
    store.record(answer());
    expect(store.getState().hydrated).toBe(false);
    resolve({ ...createEmptySnapshot(), stars: 10 });
    await vi.waitFor(() => expect(store.getState().hydrated).toBe(true));
    expect(store.getState().lifetime.stars).toBe(10);
    expect(store.getState().lifetime.questionsAnswered).toBe(1);
  });

  it('keeps working when the adapter throws, forwards raw events to track(), and can reset', () => {
    const track = vi.fn();
    const adapter: ProgressAdapter = {
      load: () => {
        throw new Error('boom');
      },
      save: () => {
        throw new Error('boom');
      },
      track,
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const store = new ProgressStore(adapter);
    expect(store.getState().hydrated).toBe(true);
    expect(() => store.record(answer())).not.toThrow();
    expect(store.getState().lifetime.questionsAnswered).toBe(1);
    store.reset();
    expect(store.getState().lifetime.questionsAnswered).toBe(0);
    warn.mockRestore();
  });

  it('reports newly earned badges once', () => {
    const onBadges = vi.fn();
    const store = new ProgressStore(createMemoryAdapter(), { onBadges });
    store.record(completion());
    store.record(completion());
    expect(onBadges).toHaveBeenCalledTimes(1);
    expect(onBadges).toHaveBeenCalledWith(['first-steps']);
  });
});
