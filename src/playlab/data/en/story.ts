import type { StoryScene } from '../../types/learning';

/**
 * The read-along stories, in the order they are played. Each sentence is short and simple, and each uses a different sentence
 * pattern (a statement, a question, a command, an exclamation, a sentence about a place or a time), a different character or
 * setting and a different action. Every target word appears once in its sentence, in the order listed. Targets are short, common
 * words, so an early learner can spell them with Magic Letters.
 */
export const englishStories: readonly StoryScene[] = [
  { id: 'rod-and-cone', sentence: 'Rod and Cone are two monsters in one!', targets: ['are', 'two', 'one'], hint: 'Count the monsters on your fingers.' },
  { id: 'cat-on-mat', sentence: 'The cat sat on the mat.', targets: ['cat', 'sat', 'mat'], hint: 'This pet likes to sit and purr.' },
  { id: 'red-sun', sentence: 'I can see a red sun in the sky.', targets: ['red', 'sun', 'sky'], hint: 'It is very bright in the daytime.' },
  { id: 'where-hat', sentence: 'Where is my blue hat?', targets: ['where', 'blue', 'hat'], hint: 'You wear this on your head.' },
  { id: 'dog-runs', sentence: 'My dog can run very fast.', targets: ['dog', 'run', 'fast'], hint: 'A pet that barks and wags its tail.' },
  { id: 'frog-jump', sentence: 'Look! A frog can jump high.', targets: ['look', 'frog', 'jump'], hint: 'A little green animal that hops.' },
  { id: 'bee-flower', sentence: 'A bee sits on a yellow flower.', targets: ['bee', 'yellow', 'flower'], hint: 'A busy insect that makes honey.' },
  { id: 'park-play', sentence: 'Come and play with me in the park.', targets: ['come', 'play', 'park'], hint: 'A place outside with swings and grass.' },
  { id: 'pond-swim', sentence: 'We swim in the warm pond today.', targets: ['swim', 'warm', 'pond'], hint: 'Ducks like to splash in this.' },
  { id: 'bus-school', sentence: 'Hurry, the big bus is here!', targets: ['hurry', 'big', 'bus'], hint: 'A large vehicle that takes children to school.' },
  { id: 'cup-table', sentence: 'Please put the cup on the table.', targets: ['cup', 'table'], hint: 'You drink from this.' },
  { id: 'moon-night', sentence: 'The moon shines at night.', targets: ['moon', 'shines', 'night'], hint: 'You can see it in the sky after dark.' },
];

/** The first story, which the story screen opens with (the one from the reference reel). */
export const englishStory: StoryScene = englishStories[0]!;
