import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { starsForScore } from '../services/progressService';
import type { ActivityCompletion, ActivityId, AnswerResult } from '../types/learning';

interface QuestionResult {
  attempts: number;
  solved: boolean;
  firstTry: boolean;
}

export interface Round<T> {
  items: T[];
  current: T | undefined;
  index: number;
  total: number;
  /** Attempts made so far on the current question. */
  attempts: number;
  /** Current question has been answered correctly. */
  solved: boolean;
  /** How many questions are solved so far (drives the progress indicator). */
  solvedCount: number;
  finished: boolean;
  summary: ActivityCompletion | null;
  /** Report an answer. Records progress, fires host callbacks, returns the result. */
  submit: (response: string, expected: string, correct: boolean) => AnswerResult;
  /** Move to the next question, or finish the round after the last one. */
  next: () => void;
  /** Start a fresh round with newly built items. */
  restart: () => void;
}

/**
 * Shared state machine for question-based activities.
 *  - never penalises: wrong answers just add an attempt
 *  - a round is finished after the last question is solved and `next()` is called
 *  - stars are always >= 1
 */
export function useRound<T extends { id: string }>(
  activityId: ActivityId,
  buildItems: () => T[],
  variant?: string,
): Round<T> {
  const { recordStart, recordAnswer, recordCompletion } = usePlayLab();
  const [items, setItems] = useState<T[]>(buildItems);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, QuestionResult>>({});
  const [summary, setSummary] = useState<ActivityCompletion | null>(null);
  const startedAt = useRef(Date.now());
  const startedOnce = useRef(false);
  const buildRef = useRef(buildItems);
  buildRef.current = buildItems;

  // Count the start once per mount (StrictMode re-runs effects but keeps refs).
  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    recordStart(activityId);
  }, [activityId, recordStart]);

  const current = items[index];
  const currentResult = current ? results[current.id] : undefined;
  // Synchronous mirrors of the state above. A second tap in the same frame reads these, not the stale render's values,
  // so a double tap on Check or Finish is counted once and cannot skip a question.
  const resultsRef = useRef(results);
  resultsRef.current = results;
  const finishedRef = useRef(false);
  const movingRef = useRef(-1);

  const submit = useCallback<Round<T>['submit']>(
    (response, expected, correct) => {
      if (!current) throw new Error('No current question');
      const prev = resultsRef.current[current.id];
      if (prev?.solved) {
        // Already solved: do not double count (e.g. rapid double tap).
        return { activityId, questionId: current.id, correct, attempt: prev.attempts, response, expected, timestamp: Date.now() };
      }
      const attempt = (prev?.attempts ?? 0) + 1;
      const next = { ...resultsRef.current, [current.id]: { attempts: attempt, solved: correct, firstTry: correct && attempt === 1 } };
      resultsRef.current = next;
      setResults(next);
      return recordAnswer({ activityId, questionId: current.id, correct, attempt, response, expected });
    },
    [activityId, current, recordAnswer],
  );

  const solvedCount = useMemo(() => Object.values(results).filter((r) => r.solved).length, [results]);

  const next = useCallback(() => {
    if (index + 1 < items.length) {
      // a double tap on "Next" moves once: the first call already asked for index + 1
      if (movingRef.current === index) return;
      movingRef.current = index;
      setIndex(index + 1);
      return;
    }
    // a double tap on "Finish" records the completion once (host callbacks fire once too)
    if (finishedRef.current) return;
    finishedRef.current = true;
    const score = Object.values(resultsRef.current).filter((r) => r.firstTry).length;
    const total = items.length;
    const completion = recordCompletion({
      activityId,
      score,
      total,
      stars: starsForScore(score, total),
      durationMs: Date.now() - startedAt.current,
      variant,
    });
    setSummary(completion);
  }, [activityId, index, items.length, recordCompletion, variant]);

  const restart = useCallback(() => {
    setItems(buildRef.current());
    setIndex(0);
    setResults({});
    resultsRef.current = {};
    setSummary(null);
    finishedRef.current = false;
    movingRef.current = -1;
    startedAt.current = Date.now();
    recordStart(activityId);
  }, [activityId, recordStart]);

  return {
    items,
    current,
    index,
    total: items.length,
    attempts: currentResult?.attempts ?? 0,
    solved: currentResult?.solved ?? false,
    solvedCount,
    finished: summary !== null,
    summary,
    submit,
    next,
    restart,
  };
}
