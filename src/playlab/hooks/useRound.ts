import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { starsForScore } from '../services/progressService';
import type { ActivityCompletion, ActivityId, AnswerResult } from '../types/learning';
import { useProgression } from './useProgression';

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
  /**
   * The current question has been answered right and its success is on screen. After a short celebration, and once `hold` (the
   * praise being spoken) has finished, the next question comes by itself, or after the last one the round's summary. Only the first
   * call for a question counts, so the child is never moved on twice.
   */
  celebrate: (hold?: PromiseLike<unknown> | null) => void;
  /** Start a fresh round with newly built items. Any celebration still counting down is dropped. */
  restart: () => void;
}

/**
 * Shared state machine for question-based activities.
 *  - never penalises: wrong answers just add an attempt, and never move the child on
 *  - a question is moved past by `celebrate` (see useProgression), never by a button
 *  - the round is recorded as finished the moment its last question is answered right; its summary follows the celebration
 *  - stars are always >= 1
 */
export function useRound<T extends { id: string }>(
  activityId: ActivityId,
  buildItems: () => T[],
  variant?: string,
): Round<T> {
  const { recordStart, recordAnswer, recordCompletion, audio } = usePlayLab();
  const [items, setItems] = useState<T[]>(buildItems);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<Record<string, QuestionResult>>({});
  const [summary, setSummary] = useState<ActivityCompletion | null>(null);
  const startedAt = useRef(Date.now());
  const startedOnce = useRef(false);
  const buildRef = useRef(buildItems);
  buildRef.current = buildItems;
  const progression = useProgression();

  // Count the start once per mount (StrictMode re-runs effects but keeps refs).
  useEffect(() => {
    if (startedOnce.current) return;
    startedOnce.current = true;
    recordStart(activityId);
  }, [activityId, recordStart]);

  const current = items[index];
  const currentResult = current ? results[current.id] : undefined;
  // Synchronous mirrors of the state above. A second tap in the same frame, or a countdown that fires after a render, reads these
  // rather than a stale render's values, so each question is judged, counted and left exactly once.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const indexRef = useRef(index);
  indexRef.current = index;
  const resultsRef = useRef(results);
  resultsRef.current = results;
  /** the round's completion, once it has been recorded (it is recorded when the last question is answered right) */
  const completion = useRef<ActivityCompletion | null>(null);

  const finishRound = useCallback(() => {
    if (completion.current) return;
    const total = itemsRef.current.length;
    const score = Object.values(resultsRef.current).filter((r) => r.firstTry).length;
    completion.current = recordCompletion({
      activityId,
      score,
      total,
      stars: starsForScore(score, total),
      durationMs: Date.now() - startedAt.current,
      variant,
    });
  }, [activityId, recordCompletion, variant]);

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
      const result = recordAnswer({ activityId, questionId: current.id, correct, attempt, response, expected });
      if (correct && itemsRef.current.every((item) => next[item.id]?.solved)) finishRound();
      return result;
    },
    [activityId, current, finishRound, recordAnswer],
  );

  const solvedCount = useMemo(() => Object.values(results).filter((r) => r.solved).length, [results]);

  /** the countdown is over: the next question, or after the last one the summary of the round */
  const advance = useCallback(() => {
    const i = indexRef.current;
    if (i + 1 < itemsRef.current.length) {
      indexRef.current = i + 1;
      setIndex(i + 1);
      return;
    }
    finishRound();
    setSummary(completion.current);
  }, [finishRound]);

  const celebrate = useCallback(
    (hold?: PromiseLike<unknown> | null) => {
      const item = itemsRef.current[indexRef.current];
      if (!item || !resultsRef.current[item.id]?.solved) return;
      progression.arm(item.id, advance, hold);
    },
    [advance, progression],
  );

  const restart = useCallback(() => {
    progression.cancel(); // nothing from the last round may move this one on
    audio.stop(); // a new round starts in silence: nothing from the last one may still be waiting to be said
    const fresh = buildRef.current();
    itemsRef.current = fresh;
    setItems(fresh);
    indexRef.current = 0;
    setIndex(0);
    resultsRef.current = {};
    setResults({});
    completion.current = null;
    setSummary(null);
    startedAt.current = Date.now();
    recordStart(activityId);
  }, [activityId, audio, progression, recordStart]);

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
    celebrate,
    restart,
  };
}
