import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSpeech } from '../hooks/useAudio';
import { sfxDurationMs } from '../services/audioService';
import { createRepeatGate } from './gate';

/** A spoken line starts this long after the pop or chime before it, so the two never overlap. */
export const SPEECH_AFTER_SOUND_MS = 170;
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
 * - sounds and timers still waiting when the activity goes are dropped, but a line already decided on is still said
 *   (after any fanfare still playing), so a child who moves on at once still hears the praise for the word they finished.
 * Sound effects respect the sound toggle (the audio service mutes them); speech does too.
 */
export function useMoments() {
  const { sfx, speak } = useSpeech();
  const [pops] = useState(() => createRepeatGate(POP_GAP_MS));
  const pending = useRef(new Set<ReturnType<typeof setTimeout>>());
  /** the spoken line that is waiting for its sound to finish: when it may start, and what it says */
  const waitingLine = useRef<{ id: ReturnType<typeof setTimeout>; text: string; at: number } | null>(null);
  const speakRef = useRef(speak);
  speakRef.current = speak;

  const dropWaitingLine = useCallback(() => {
    if (waitingLine.current) clearTimeout(waitingLine.current.id);
    waitingLine.current = null;
  }, []);

  useEffect(() => {
    const timers = pending.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      const line = waitingLine.current;
      if (line) {
        clearTimeout(line.id);
        waitingLine.current = null;
        // still say it, but not on top of a fanfare that is still playing
        const wait = Math.max(0, line.at - Date.now());
        setTimeout(() => void speakRef.current(line.text), wait);
      }
    };
  }, []);

  const after = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(() => {
      pending.current.delete(t);
      fn();
    }, ms);
    pending.current.add(t);
  }, []);

  /** speak `text` at `at` (epoch ms), replacing a line that is still waiting */
  const queueLine = useCallback(
    (text: string, delayMs: number) => {
      dropWaitingLine();
      const at = Date.now() + delayMs;
      const id = setTimeout(() => {
        waitingLine.current = null;
        void speakRef.current(text);
      }, delayMs);
      waitingLine.current = { id, text, at };
    },
    [dropWaitingLine],
  );

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
      /** forget a line that is still waiting (e.g. "Start again": nothing from the old round may speak) */
      cancelSpeech: dropWaitingLine,
    }),
    [after, pops, queueLine, dropWaitingLine, sfx],
  );
}
