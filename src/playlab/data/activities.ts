import type { ActivityDefinition, ActivityId, PlayLabView } from '../types/learning';

export const ACTIVITIES: ActivityDefinition[] = [
  {
    id: 'alphabet',
    title: 'Letter Playground',
    tagline: 'Tap a letter and watch it dance!',
    instruction: 'Tap any letter. Tap the big letter again to play it again, or drag it around.',
    accent: 'coral',
    illustration: 'apple',
    cta: 'Play with letters',
  },
  {
    id: 'phonics',
    title: 'Sound Discovery',
    tagline: 'Letters have names AND sounds.',
    instruction: 'Pick a letter to hear its name and its sound, then try the listening game.',
    accent: 'sky',
    illustration: 'whale',
    cta: 'Discover sounds',
  },
  {
    id: 'word-builder',
    title: 'Word Builder',
    tagline: 'Drag magic letters into place.',
    instruction: 'Look at the picture. Drag each letter onto its glowing outline to spell the word.',
    accent: 'brand',
    illustration: 'cat',
    cta: 'Build words',
  },
  {
    id: 'sentences',
    title: 'Sentence Fun',
    tagline: 'Put words together and read aloud.',
    instruction: 'Tap the words to finish each sentence.',
    accent: 'sun',
    illustration: 'bird',
    cta: 'Make sentences',
  },
  {
    id: 'matching',
    title: 'Match & Play',
    tagline: 'Three little games to match, listen and spell.',
    instruction: 'Pick a game, then match the pairs.',
    accent: 'plum',
    illustration: 'kite',
    cta: 'Start matching',
  },
];

export const ACTIVITY_IDS: ActivityId[] = ACTIVITIES.map((a) => a.id);

/** Every screen PlayLab can show; handy for validating a route param in the host app. */
export const PLAYLAB_VIEWS: readonly PlayLabView[] = ['home', 'progress', ...ACTIVITY_IDS];

export const isPlayLabView = (value: unknown): value is PlayLabView => typeof value === 'string' && (PLAYLAB_VIEWS as readonly string[]).includes(value);

export function getActivity(id: ActivityId): ActivityDefinition {
  const found = ACTIVITIES.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown activity: ${id}`);
  return found;
}

/** The activity that follows `id` in the home-screen order (wraps around). */
export function nextActivityId(id: ActivityId): ActivityId {
  const i = ACTIVITY_IDS.indexOf(id);
  return ACTIVITY_IDS[(i + 1) % ACTIVITY_IDS.length] ?? 'alphabet';
}
