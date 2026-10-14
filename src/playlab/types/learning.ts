/**
 * Domain types for Edurance PlayLab: content, activities, answers and progress.
 * Nothing in this file depends on React.
 */

/** BCP-47-ish content language id. Only 'en' ships today; see docs/INTEGRATION.md to add 'hi'. */
export type LanguageCode = 'en' | 'hi' | (string & {});

/** Pre-K / K / Grade 1 style bands. Controls how much content is used and how much help is shown. */
export type DifficultyLevel = 'starter' | 'explorer' | 'adventurer';

export type ActivityId = 'alphabet' | 'phonics' | 'word-builder' | 'sentences' | 'matching';

/** Screens PlayLab can show. */
export type PlayLabView = 'home' | 'progress' | ActivityId;

export type AccentName = 'brand' | 'coral' | 'sun' | 'sky' | 'plum';

/** Ids of the locally drawn SVG illustrations (see src/playlab/illustrations). */
export type IllustrationId =
  | 'apple' | 'ball' | 'cat' | 'dog' | 'egg' | 'fish' | 'goat' | 'hat' | 'igloo' | 'jar'
  | 'kite' | 'lion' | 'moon' | 'nest' | 'orange' | 'pig' | 'quilt' | 'rabbit' | 'sun' | 'tree'
  | 'umbrella' | 'van' | 'whale' | 'fox' | 'yoyo' | 'zebra' | 'bat' | 'pen' | 'cup' | 'book'
  | 'mango' | 'bird';

/** Optional bundled audio file URLs. PlayLab ships NONE; the browser voice is used when absent. */
export interface AudioClipSet {
  name?: string;
  sound?: string;
  word?: string;
}

export interface LetterEntry {
  /** lowercase identifier, e.g. 'a' */
  id: string;
  upper: string;
  lower: string;
  /** How the letter is called, e.g. "ay" - NOT its sound. */
  name: string;
  /** Text handed to speech synthesis for the letter name. */
  nameSpeech: string;
  sound: {
    /** Kid-friendly phonics notation, e.g. "/ă/" */
    symbol: string;
    /** Text handed to speech synthesis for the phonetic sound (tune per voice). */
    speech: string;
    /** One-line parent/teacher hint. */
    tip: string;
  };
  word: { text: string; illustration: IllustrationId };
  vowel: boolean;
  audio?: AudioClipSet;
}

/**
 * A sound that Magic Letters teaches. Each sound is one entry in data/en/phonemes.ts, shared by every word that uses it.
 * Vowels say which vowel it is (short or long); consonants are the consonant. 'sh' and 'ng' are two-letter sounds.
 */
export type PhonemeId =
  | 'b' | 'd' | 'f' | 'g' | 'h' | 'k' | 'l' | 'm' | 'n' | 'ng' | 'p' | 'r' | 's' | 'sh' | 't' | 'w' | 'z'
  | 'a-short' | 'e-short' | 'i-short' | 'o-short' | 'u-short' | 'oo-short'
  | 'a-long' | 'i-long' | 'o-long' | 'oo-long' | 'schwa';

export interface Phoneme {
  id: PhonemeId;
  /** the sound, for teachers, e.g. "/k/" or "/æ/" */
  symbol: string;
  /** what the browser voice is asked to say (a respelling, chosen by testing; see docs/PHONICS-AUDIO.md) */
  speech: string;
  /** how close the browser voice is expected to get: 'clean', 'approximate' (a short extra sound is added) or 'unreliable' */
  quality: 'clean' | 'approximate' | 'unreliable';
  /** a word that has this sound, for teachers (never spoken, so it cannot give an answer away) */
  example: string;
  /** a recorded clip, when one is supplied; PlayLab ships none */
  clip?: string;
}

export interface WordEntry {
  id: string;
  /** lowercase, letters only */
  text: string;
  level: 1 | 2 | 3;
  clue: string;
  illustration: IllustrationId;
  /**
   * The sound each letter makes in THIS word, one entry per letter, in order. `null` means the letter has no sound of its
   * own here: the second letter of a two-letter sound (the h in fish, the second o in book) or a silent letter (the e in kite).
   */
  sounds: readonly (PhonemeId | null)[];
}

export type SentenceMode = 'arrange' | 'fill';

export interface SentenceEntry {
  id: string;
  /** Tokens in order, without punctuation. */
  words: string[];
  punctuation: '.' | '!' | '?';
  level: 1 | 2 | 3;
  mode: SentenceMode;
  /** 'fill' only: index in `words` that is hidden. */
  blankIndex?: number;
  /** 'fill' only: wrong options (the correct word is added automatically). */
  distractors?: string[];
  illustration: IllustrationId;
}

/** Everything language-specific. Add a pack to support a new language. */
export interface ContentPack {
  language: LanguageCode;
  label: string;
  /** BCP-47 tag handed to speech synthesis, e.g. 'en-US' */
  speechLang: string;
  letters: LetterEntry[];
  words: WordEntry[];
  sentences: SentenceEntry[];
}

export interface ActivityDefinition {
  id: ActivityId;
  title: string;
  tagline: string;
  instruction: string;
  accent: AccentName;
  illustration: IllustrationId;
  /** short verb phrase for the card button */
  cta: string;
}

/* ------------------------------ answers & events ------------------------------ */

export interface AnswerResult {
  activityId: ActivityId;
  questionId: string;
  correct: boolean;
  /** 1 for the first attempt at this question, 2 for the second, ... */
  attempt: number;
  response: string;
  expected: string;
  timestamp: number;
}

export interface ActivityCompletion {
  activityId: ActivityId;
  /** Questions answered correctly on the first try. */
  score: number;
  total: number;
  /** 1-3, never 0: finishing always earns at least one star. */
  stars: 1 | 2 | 3;
  durationMs: number;
  level: DifficultyLevel;
  /** Matching only: 'letter-picture' | 'sound-letter' | 'word-completion' */
  variant?: string;
  timestamp: number;
}

export type ProgressEvent =
  | { type: 'activity_started'; activityId: ActivityId; timestamp: number }
  | { type: 'answer_submitted'; result: AnswerResult }
  | { type: 'activity_completed'; completion: ActivityCompletion }
  | { type: 'letter_explored'; letter: string; timestamp: number };

export type BadgeId =
  | 'first-steps'
  | 'letter-explorer'
  | 'sound-detective'
  | 'word-builder'
  | 'sentence-star'
  | 'match-maker'
  | 'super-streak';

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
}

export interface ActivityProgress {
  started: number;
  answered: number;
  correct: number;
  firstTryCorrect: number;
  completed: number;
  bestStars: number;
}

export interface RecentCompletion {
  activityId: ActivityId;
  stars: number;
  score: number;
  total: number;
  at: number;
  variant?: string;
}

/** Persisted (lifetime) progress. Contains no personal information. */
export interface ProgressSnapshot {
  version: 1;
  stars: number;
  activitiesStarted: number;
  questionsAnswered: number;
  correctAnswers: number;
  firstTryCorrect: number;
  activitiesCompleted: number;
  perActivity: Record<ActivityId, ActivityProgress>;
  exploredLetters: string[];
  /** Matching variants finished at least once. */
  matchingVariantsDone: string[];
  badges: BadgeId[];
  /** Newest first, capped. */
  recent: RecentCompletion[];
}

/** In-memory stats for the current visit; reset every time PlayLab mounts. */
export interface SessionStats {
  startedAt: number;
  activitiesStarted: number;
  questionsAnswered: number;
  correctAnswers: number;
  firstTryCorrect: number;
  activitiesCompleted: number;
  stars: number;
  /** consecutive first-try-correct answers */
  streak: number;
  bestStreak: number;
}

export interface ProgressState {
  lifetime: ProgressSnapshot;
  session: SessionStats;
  hydrated: boolean;
}

/**
 * Replace this to persist progress somewhere else (e.g. the main Edurance backend).
 * All methods may be sync or async.
 */
export interface ProgressAdapter {
  /** Return saved progress, or null when there is none. */
  load(): ProgressSnapshot | null | Promise<ProgressSnapshot | null>;
  /** Called after every change with the full lifetime snapshot. */
  save(snapshot: ProgressSnapshot): void | Promise<void>;
  /** Optional raw event stream, e.g. to forward to analytics owned by the host. */
  track?(event: ProgressEvent): void;
  /** Optional: used by "Start over" on the progress screen. */
  clear?(): void | Promise<void>;
}
