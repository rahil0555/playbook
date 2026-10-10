import type { DifficultyLevel } from '../types/learning';

export const LEVELS: { id: DifficultyLevel; label: string; hint: string }[] = [
  { id: 'starter', label: 'Starter', hint: 'Short words and extra help' },
  { id: 'explorer', label: 'Explorer', hint: 'A few longer words' },
  { id: 'adventurer', label: 'Adventurer', hint: 'All the words' },
];

export function levelNumber(level: DifficultyLevel): 1 | 2 | 3 {
  return level === 'starter' ? 1 : level === 'explorer' ? 2 : 3;
}

/** Items up to and including the chosen level. */
export function filterByLevel<T extends { level: number }>(items: readonly T[], level: DifficultyLevel): T[] {
  const max = levelNumber(level);
  return items.filter((i) => i.level <= max);
}

/** Starter shows faint guide letters in the answer slots (as in the reference reel). */
export const showGuideLetters = (level: DifficultyLevel): boolean => level === 'starter';

/** Number of answer choices in listen-and-choose style questions. */
export const choiceCount = (level: DifficultyLevel): number => (level === 'starter' ? 3 : 4);

/** Number of pairs on a matching board. */
export const pairCount = (level: DifficultyLevel): number => 2 + levelNumber(level);

export const ROUND_LENGTH = 5;
