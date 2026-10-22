import type { StoryScene, WordEntry } from '../../types/learning';

/**
 * One Magic Letters round per target word, in sentence order. The sentence is the clue. No letter here has a sound of its own,
 * so the only spoken word is the one the browser reads when the child taps it.
 */
export function storyRounds(story: StoryScene): WordEntry[] {
  return story.targets.map((text) => ({
    id: `${story.id}-${text}`,
    text,
    level: 1,
    clue: story.sentence,
    illustration: 'sun',
    sounds: text.split('').map(() => null),
  }));
}

/** The reference's three colours. A target word takes its colour from its place in the sentence: "are" orange, "two" blue, "one" green. */
export const STORY_WORD_COLORS = ['#e8833a', '#3a3fa6', '#4ea03a'] as const;

/** The letters on the story screen use the same three colours; the same letter always gets the same one. */
const LETTER_COLORS = ['#3a3fa6', '#e8833a', '#4ea03a'] as const;

export function storyLetterColor(letter: string): string {
  return LETTER_COLORS[Math.abs(letter.charCodeAt(0)) % LETTER_COLORS.length] ?? LETTER_COLORS[0];
}
