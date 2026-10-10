/** Encouraging copy. Always kind: wrong answers never say "wrong". */
export const PRAISE = ['Great job!', 'You got it!', 'Awesome!', 'Super!', 'Brilliant!', 'Well done!'];
export const TRY_AGAIN = ['Almost! Have another look.', 'Not quite yet - you can do it!', 'Good try! Let’s try again.', 'So close! Try once more.'];

/** Rotate through lines so it never feels repetitive, but stays deterministic for tests. */
export const pickLine = (lines: readonly string[], n: number): string => lines[Math.abs(n) % lines.length] as string;
