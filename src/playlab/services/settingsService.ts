import type { DifficultyLevel } from '../types/learning';

export interface PlayLabSettings {
  sound: boolean;
  level: DifficultyLevel;
  /** Saved browser voice id, or null for automatic. Optional in old saved data. */
  voice: string | null;
}

export const DEFAULT_SETTINGS: PlayLabSettings = { sound: true, level: 'adventurer', voice: null };
const KEY = 'edurance.playlab.settings.v1';

/** Non-sensitive UI preferences only. Every access is guarded. */
export function loadSettings(learnerId?: string): PlayLabSettings {
  try {
    const raw = window.localStorage.getItem(learnerId ? `${KEY}:${learnerId}` : KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<PlayLabSettings>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_SETTINGS.sound,
      level: parsed.level === 'starter' || parsed.level === 'explorer' || parsed.level === 'adventurer' ? parsed.level : DEFAULT_SETTINGS.level,
      voice: typeof parsed.voice === 'string' && parsed.voice.length > 0 && parsed.voice.length <= 300 ? parsed.voice : null,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: PlayLabSettings, learnerId?: string): void {
  try {
    window.localStorage.setItem(learnerId ? `${KEY}:${learnerId}` : KEY, JSON.stringify(settings));
  } catch {
    /* storage unavailable - settings just won't persist */
  }
}
