import type {
  ActivityCompletion,
  AnswerResult,
  DifficultyLevel,
  LanguageCode,
  PlayLabView,
  ProgressAdapter,
} from './learning';

export interface PlayLabTheme {
  /** Main brand color. Default Edurance teal '#16a286'. Must be a 6-digit hex value. */
  brandColor?: string;
  /**
   * 'system' (default) follows the OS setting. 'reduce' always minimizes motion,
   * e.g. when the host app has its own accessibility switch.
   */
  motion?: 'system' | 'reduce';
}

export interface PlayLabLearner {
  /** Opaque id from the host, used only to namespace saved progress. Do not pass names or emails here. */
  id: string;
  /** Optional first name or nickname, shown in the greeting only. Never stored by PlayLab. */
  displayName?: string;
}

export interface PlayLabProps {
  /** Screen to open first. Default 'home'. */
  initialActivity?: PlayLabView;
  /**
   * Controlled navigation (optional). Pass `view` together with `onViewChange`
   * if the host wants to mirror the current screen in its own URL.
   */
  view?: PlayLabView;
  onViewChange?: (view: PlayLabView) => void;
  /** Content language. Default 'en'. Unknown languages fall back to English. */
  language?: LanguageCode;
  /**
   * Difficulty band. When provided, the in-app level picker is hidden and the
   * host stays in charge. When omitted the child/parent can choose (default 'adventurer').
   */
  level?: DifficultyLevel;
  theme?: PlayLabTheme;
  learner?: PlayLabLearner;
  /** Replace local-storage persistence with the host's own. */
  progressAdapter?: ProgressAdapter;
  /** Fired for every answer attempt. */
  onAnswerSubmit?: (result: AnswerResult) => void;
  /** Fired once when a round of an activity is finished. */
  onActivityComplete?: (completion: ActivityCompletion) => void;
  /**
   * Fired by the "Back to Edurance" button. The button is only shown when this
   * prop is provided.
   */
  onExit?: () => void;
  /** Extra class names for the root element (layout only, e.g. height). */
  className?: string;
}
