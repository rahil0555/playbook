import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '../hooks/useAudio';
import { sfxDurationMs, type Scheduled } from '../services/audioService';
import type { PhonemeId } from '../types/learning';
import { createRepeatGate } from './gate';
import { SPEECH_AFTER_SOUND_MS } from './timing';

export { SPEECH_AFTER_SOUND_MS } from './timing';

/** Silence between the end of a fanfare and the spoken line that follows it. */
export const SPEECH_AFTER_FANFARE_GAP_MS = 120;
/** A celebration's spoken line waits for the whole fanfare (its real length, not a guess) and a short gap. */
export const CELEBRATION_SPEECH_MS = sfxDurationMs('celebrate') + SPEECH_AFTER_FANFARE_GAP_MS;
/** Pops are not repeated faster than this (rapid taps stay quiet). */
export const POP_GAP_MS = 110;

/**
 * The shared "Magic Moments" sound layer. Every activity plays its feedback through here, so that:
 * - a pop is never repeated faster than POP_GAP_MS, however fast the child taps,
 * - anything spoken waits until the sound before it has finished, and a newer line replaces a pending one,
 * - timers of this activity are dropped when it goes (no sound from a question that is no longer on screen),
 * - a spoken line that is waiting is owned by the audio service: it survives moving to the next question of the same
 *   activity, and is cancelled when the child leaves the activity, the page is hidden, or a round starts again.
 * Sound effects respect the sound toggle (the audio service mutes them); speech does too.
 */
export function useMoments() {
  const { sfx, speakLater, laterPhonic } = useSpeech();
  const [pops] = useState(() => createRepeatGate(POP_GAP_MS));
  const pending = useRef(new Set<ReturnType<typeof setTimeout>>());
  /** the spoken line that is waiting for its sound to finish: cancel it to drop it */
  const waitingLine = useRef<(() => void) | null>(null);

  const dropWaitingLine = useCallback(() => {
    waitingLine.current?.();
    waitingLine.current = null;
  }, []);

  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const after = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      pending.current.delete(t);
      fn();
    }, ms);
    pending.current.add(t);
  }, []);

  /**
   * Put one line in the single waiting slot: whatever was still waiting is dropped. A letter sound, a cheer and any other
   * line share this slot, so a newer one always replaces an older one that has not started yet.
   */
  const queueWith = useCallback(
    (schedule: () => Scheduled): Scheduled => {
      dropWaitingLine();
      const line = schedule();
      waitingLine.current = line;
      return line;
    },
    [dropWaitingLine],
  );

  /** speak `text` after `delayMs`, replacing a line that is still waiting */
  const queueLine = useCallback((text: string, delayMs: number) => queueWith(() => speakLater(text, delayMs)), [queueWith, speakLater]);

  return useMemo(
    () => ({
      /** a soft playful pop: the answer to a tap */
      pop: () => {
        if (pops.allow('pop')) sfx('boing');
      },
      /** a gentle success chime: a letter or tile has landed in the right place */
      chime: () => sfx('chime'),
      /** the bigger fanfare: a whole word or sentence is finished */
      celebrate: () => sfx('celebrate'),
      /** the fanfare now, and the line read aloud once the fanfare has finished (never over it) */
      celebrateThenSay: (text: string) => {
        sfx('celebrate');
        queueLine(text, CELEBRATION_SPEECH_MS);
      },
      /** run something a moment later (e.g. the spoken letter sound after its pop) */
      after,
      /** speak a line after the sound before it; a newer line replaces one still waiting */
      say: (text: string, delayMs = SPEECH_AFTER_SOUND_MS) => queueLine(text, delayMs),
      /** a letter's sound (its recording), after `delayMs`; replaces a line still waiting. Returns a handle: `done` settles when it has played */
      sayPhonic: (id: PhonemeId, delayMs = SPEECH_AFTER_SOUND_MS): Scheduled => queueWith(() => laterPhonic(id, delayMs)),
      /** forget a line that is still waiting (e.g. "Start again": nothing from the old round may speak) */
      cancelSpeech: dropWaitingLine,
    }),
    [after, pops, queueLine, queueWith, laterPhonic, dropWaitingLine, sfx],
  );
}
