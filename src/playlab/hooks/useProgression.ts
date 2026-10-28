import { useCallback, useEffect, useRef } from 'react';

/** How long a correct answer's celebration stays on screen before the next question (or the round's summary) comes. */
export const CELEBRATE_MS = 1200;
/**
 * The most a celebration waits for its spoken praise. The praise is never cut off, but a line that never reports that it has
 * finished cannot hold the child on the same question for ever.
 */
export const CELEBRATE_MAX_HOLD_MS = 4000;

export interface Progression {
  /**
   * Count down to moving on. `onDone` runs once the celebration has been on screen for CELEBRATE_MS and `hold` (the praise being
   * spoken) has finished, or after CELEBRATE_MAX_HOLD_MS. A key is armed once per round: a second call for it, a repeated one or a
   * late one does nothing, so each question moves on exactly once.
   */
  arm: (key: string, onDone: () => void, hold?: PromiseLike<unknown> | null) => void;
  /** Drop every pending countdown: a restart, or leaving the activity. Nothing armed before this runs afterwards. */
  cancel: () => void;
}

/**
 * The one place that decides when a celebration ends. Every activity that moves on after a right answer uses it, so the timing is
 * the same everywhere and no screen keeps a timer of its own. Unmounting cancels whatever is pending.
 */
export function useProgression(): Progression {
  const armed = useRef(new Set<string>());
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  /** bumped by every cancel: a countdown from before it finds a different number and does nothing */
  const generation = useRef(0);

  const cancel = useCallback(() => {
    generation.current += 1;
    armed.current = new Set();
    timers.current.forEach((t) => clearTimeout(t));
    timers.current.clear();
  }, []);

  useEffect(() => cancel, [cancel]);

  const arm = useCallback((key: string, onDone: () => void, hold?: PromiseLike<unknown> | null) => {
    if (armed.current.has(key)) return;
    armed.current.add(key);
    const gen = generation.current;
    let timeUp = false;
    let heard = !hold;
    let fired = false;
    const fire = () => {
      if (fired || gen !== generation.current || !timeUp || !heard) return;
      fired = true;
      onDone();
    };
    const later = (ms: number, then: () => void) => {
      const t = setTimeout(() => {
        timers.current.delete(t);
        then();
      }, ms);
      timers.current.add(t);
    };
    later(CELEBRATE_MS, () => {
      timeUp = true;
      fire();
    });
    if (hold) {
      later(CELEBRATE_MAX_HOLD_MS, () => {
        heard = true;
        fire();
      });
      hold.then(
        () => {
          heard = true;
          fire();
        },
        () => {
          heard = true;
          fire();
        },
      );
    }
  }, []);

  return { arm, cancel };
}
