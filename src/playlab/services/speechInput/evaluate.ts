/**
 * Judges a spoken (or typed) answer against the expected answers. Short answers, such as one word, are matched exactly
 * after normalising case, accents and punctuation. A near miss is "needs improvement", not wrong: a small transcription
 * error should not count against the child. An empty or low-confidence transcript asks for a repeat instead of a score.
 */

export type VoiceResult = 'correct' | 'needs_improvement' | 'retry';

export interface VoiceEvaluation {
  result: VoiceResult;
  /** what the child is told, in plain words */
  feedback: string;
  /** true when the child should say it again */
  needsRetry: boolean;
  transcript: string;
}

/** Below this the browser is guessing: ask again rather than score it. */
export const LOW_CONFIDENCE = 0.3;

/** The messages the child sees for each way speech input can fail (the Play Lab voice specification's table). */
export const VOICE_MESSAGES = {
  /** the browser says the microphone is turned off for this site */
  permission: 'Microphone access is blocked for this site. Allow it in the browser’s site settings, or type your answer.',
  /** the browser refused the microphone, and the page's settings do not explain it */
  refused: 'The browser did not get to use the microphone. Check the microphone privacy setting on this computer, or type your answer.',
  insecure: 'Voice answers need a secure page (an https:// address). This page is not secure, so type your answer instead.',
  embedded: 'This page is inside another page, which may not let the browser use the microphone. Type your answer instead.',
  noMicrophone: 'The browser could not open a microphone. Check the sound settings, or type your answer.',
  speechService: 'Speech recognition is switched off in this browser. Type your answer instead.',
  notStarted: 'The browser did not start listening. If it asked to use the microphone, allow it, then tap the microphone again, or type your answer.',
  noSpeech: "I couldn't hear you. Please try again.",
  stt: "I couldn't understand the recording. Please try again.",
  network: 'Connection problem. Please check your internet and retry.',
  unsupported: "Voice answers aren't available in this browser. Type your answer instead.",
  lowConfidence: "I'm not sure I heard that correctly. Please say it again.",
  empty: "I couldn't hear an answer. Please try again.",
  correct: 'Good answer! That is the word.',
  close: 'Almost! Say it once more, slowly, one sound at a time.',
  wrong: 'That is not the word for this picture. Try again.',
} as const;

/** The words this module treats as the same answer: lower case, no accents, no punctuation, single spaces. */
export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** How many single-character changes turn `a` into `b`. */
export function editDistance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min((row[j] ?? 0) + 1, (next[j - 1] ?? 0) + 1, (row[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    row = next;
  }
  return row[b.length] ?? 0;
}

export function evaluateVoiceAnswer(transcript: string, expected: readonly string[], confidence?: number): VoiceEvaluation {
  const heard = normalizeAnswer(transcript);
  const targets = expected.map(normalizeAnswer).filter(Boolean);
  const say = (result: VoiceResult, feedback: string): VoiceEvaluation => ({ result, feedback, needsRetry: result !== 'correct', transcript });

  if (!heard) return say('retry', VOICE_MESSAGES.empty);
  if (targets.includes(heard)) return say('correct', VOICE_MESSAGES.correct);
  if (confidence !== undefined && confidence < LOW_CONFIDENCE) return say('retry', VOICE_MESSAGES.lowConfidence);
  // one slip for every four letters (at least one) still counts as nearly right
  const close = targets.some((t) => editDistance(heard, t) <= Math.max(1, Math.floor(t.length / 4)));
  return say('needs_improvement', close ? VOICE_MESSAGES.close : VOICE_MESSAGES.wrong);
}
