/**
 * The short spoken lines of the guided speaking lessons (Letter Playground and Sound Discovery). They are chosen by position, never
 * at random, so the same step always says the same line. They are short, warm and never scold the child.
 */

/** Said when the child's answer is right. Chosen by step, so the cheer changes from letter to letter. */
export const PRAISE_LINES = ['Hooray! You got it!', 'Amazing! That’s right!', 'Yes! Well done!', 'Super! You did it!'] as const;

/** Said after a wrong answer. Each one lets the child try again without being marked as having failed. */
export const ENCOURAGE_LINES = ['Good try! Let’s try that again!', 'Nearly! Let’s try once more!', 'Good try! You can do it!'] as const;

/** Said when the answer could not be heard or understood clearly. */
export const REPEAT_LINE = 'Could you say that again?';

/** Said when nothing was heard at all. */
export const HEAR_LINE = 'I couldn’t hear you. Try again, a little closer to the microphone.';

/** Said after every letter has been celebrated. */
export const FINISH_LINE = 'You did it! You know the whole alphabet. Hooray!';

/** The praise for a step: the same step always gets the same line. */
export function praiseFor(step: number): string {
  return PRAISE_LINES[((step % PRAISE_LINES.length) + PRAISE_LINES.length) % PRAISE_LINES.length] as string;
}

/** The encouragement after the given wrong try (1 = the first wrong answer). */
export function encourageFor(tries: number): string {
  return ENCOURAGE_LINES[((tries - 1) % ENCOURAGE_LINES.length + ENCOURAGE_LINES.length) % ENCOURAGE_LINES.length] as string;
}
