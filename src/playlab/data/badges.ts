import type { BadgeDefinition } from '../types/learning';

export const BADGES: BadgeDefinition[] = [
  { id: 'first-steps', title: 'First Steps', description: 'Finish your first round.', emoji: '👣' },
  { id: 'letter-explorer', title: 'Letter Explorer', description: 'Find all 26 letters.', emoji: '🔤' },
  { id: 'sound-detective', title: 'Sound Detective', description: 'Get 5 listening answers right.', emoji: '🎧' },
  { id: 'word-builder', title: 'Word Builder', description: 'Spell 5 words.', emoji: '🧱' },
  { id: 'sentence-star', title: 'Sentence Star', description: 'Get 5 sentences right.', emoji: '📖' },
  { id: 'match-maker', title: 'Match Maker', description: 'Finish all 3 matching games.', emoji: '🧩' },
  { id: 'super-streak', title: 'Super Streak', description: '5 right on the first try in a row.', emoji: '🔥' },
];

export function getBadge(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}
