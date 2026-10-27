import { beforeEach, describe, expect, it } from 'vitest';
import type { ActivityCompletion, ProgressEvent, ProgressSnapshot } from '../types/learning';
import { createEmptySnapshot, createLocalStorageAdapter, createMemoryAdapter } from './progressService';
import { ProgressStore } from './progressStore';

const correctAnswer = (questionId: string): ProgressEvent => ({
  type: 'answer_submitted',
  result: { activityId: 'word-builder', questionId, correct: true, attempt: 1, response: 'a', expected: 'a', timestamp: 1 },
});
const roundFinished = (over: Partial<ActivityCompletion> = {}): ProgressEvent => ({
  type: 'activity_completed',
  completion: { activityId: 'word-builder', score: 4, total: 5, stars: 2, durationMs: 1, level: 'adventurer', timestamp: 5, ...over },
});

beforeEach(() => {
  window.localStorage.clear();
});

describe('rewards are given by the completion rule, once', () => {
  it('a correct answer earns no star by itself, and a finished round earns its stars once', () => {
    const store = new ProgressStore(createMemoryAdapter());
    store.record(correctAnswer('q1'));
    store.record(correctAnswer('q2'));
    expect(store.getState().lifetime).toMatchObject({ stars: 0, activitiesCompleted: 0, firstTryCorrect: 2 });
    store.record(roundFinished({ stars: 2 }));
    expect(store.getState().lifetime).toMatchObject({ stars: 2, activitiesCompleted: 1 });
  });

  it('a finished round is still rewarded once after a refresh, and nothing is added again by later play', () => {
    const before = new ProgressStore(createLocalStorageAdapter('refresh-kid'));
    before.record(correctAnswer('q1'));
    before.record(roundFinished({ stars: 3 }));

    // a refresh: a new store reads back what was saved
    const after = new ProgressStore(createLocalStorageAdapter('refresh-kid'));
    expect(after.getState().lifetime).toMatchObject({ stars: 3, activitiesCompleted: 1, firstTryCorrect: 1 });
    expect(after.getState().lifetime.badges.filter((b) => b === 'first-steps')).toHaveLength(1);

    after.record({ type: 'letter_explored', letter: 'a', timestamp: 9 });
    after.record(correctAnswer('q2'));
    expect(after.getState().lifetime).toMatchObject({ stars: 3, activitiesCompleted: 1 });
    expect(after.getState().lifetime.badges.filter((b) => b === 'first-steps')).toHaveLength(1);
  });

  it('a round finished before the saved progress has loaded is kept, and rewarded once when it arrives', async () => {
    let finishLoad: (snapshot: ProgressSnapshot) => void = () => undefined;
    const store = new ProgressStore({
      load: () => new Promise<ProgressSnapshot>((resolve) => (finishLoad = resolve)),
      save: () => undefined,
      clear: () => undefined,
    });
    store.record(roundFinished({ stars: 2 }));
    expect(store.getState().hydrated).toBe(false);

    finishLoad({ ...createEmptySnapshot(), stars: 1, activitiesCompleted: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(store.getState().hydrated).toBe(true);
    expect(store.getState().lifetime).toMatchObject({ stars: 3, activitiesCompleted: 2 });
  });
});
