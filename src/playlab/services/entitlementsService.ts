

/** What the demo gate remembers on the device. No personal information, no payment data. */
export interface EntitlementState {
  /** true once the parent has unlocked everything (demo unlock only) */
  unlocked: boolean;
  /** when the unlock happened, for the parents' own reference */
  unlockedAt: number | null;
  /** the moment the wall was first shown */
  wallSeenAt: number | null;
}

export const DEFAULT_ENTITLEMENT: EntitlementState = { unlocked: false, unlockedAt: null, wallSeenAt: null };

const KEY = 'edurance.playlab.entitlement.v1';

/**
 * Local, per-learner demo entitlement. PlayLab owns this deliberately for the standalone demo;
 * a real host app replaces the decision (and the unlock) with its own billing state.
 * Every access is guarded, like settingsService: blocked storage simply means "not unlocked".
 */
export function loadEntitlement(learnerId?: string): EntitlementState {
  try {
    const raw = window.localStorage.getItem(learnerId ? `${KEY}:${learnerId}` : KEY);
    if (!raw) return DEFAULT_ENTITLEMENT;
    const parsed = JSON.parse(raw) as Partial<EntitlementState>;
    return {
      unlocked: parsed.unlocked === true,
      unlockedAt: typeof parsed.unlockedAt === 'number' && Number.isFinite(parsed.unlockedAt) ? parsed.unlockedAt : null,
      wallSeenAt: typeof parsed.wallSeenAt === 'number' && Number.isFinite(parsed.wallSeenAt) ? parsed.wallSeenAt : null,
    };
  } catch {
    return DEFAULT_ENTITLEMENT;
  }
}

export function saveEntitlement(state: EntitlementState, learnerId?: string): void {
  try {
    window.localStorage.setItem(learnerId ? `${KEY}:${learnerId}` : KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable - the demo unlock just won't persist */
  }
}


