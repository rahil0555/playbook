import type { StoryScene, WordEntry } from '../../types/learning';

/**
 * One Magic Letters round per target word, in the order the stories are played: a story's words come one after another, and the
 * next story starts when the last word of the one before is spelled. A round's clue is its sentence (the story stage shows the
 * sentence instead of a picture). No letter here has a sound of its own, so the only spoken words are the sentence and the word the
 * child taps.
 */
export function storyRounds(stories: readonly StoryScene[]): WordEntry[] {
  return stories.flatMap((story) =>
    story.targets.map((text, index) => ({
      id: `${story.id}:${index}`,
      text,
      level: 1,
      clue: story.sentence,
      illustration: 'sun',
      sounds: text.split('').map(() => null),
    })),
  );
}

/** The story a round belongs to. A round's id starts with its story's id and a colon. */
export function storyOf(stories: readonly StoryScene[], round: WordEntry): StoryScene | undefined {
  return stories.find((story) => round.id.startsWith(`${story.id}:`));
}

/** The reference's three colours. A target word takes its colour from its place in the sentence: "are" orange, "two" blue, "one" green. */
export const STORY_WORD_COLORS = ['#e8833a', '#3a3fa6', '#4ea03a'] as const;

/**
 * The colour of every letter tile on the story and word-builder screens. One colour for all the letters keeps the tray calm and
 * readable, and the letters' own shapes carry the meaning. Dark teal on the pale tray passes WCAG AA for text.
 */
export const LETTER_TILE_COLOR = '#2a6b5a';
