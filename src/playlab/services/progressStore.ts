import type { BadgeId, ProgressAdapter, ProgressEvent, ProgressState } from '../types/learning';
import { createEmptySession, createEmptySnapshot, normalizeSnapshot, reduceProgress } from './progressService';

type Listener = () => void;

export interface ProgressStoreOptions {
  alphabetSize?: number;
  onBadges?: (ids: BadgeId[]) => void;
}

/**
 * Small external store (compatible with React's useSyncExternalStore).
 * Loads from the adapter on creation; events that arrive before an async
 * adapter has finished loading are queued and replayed, so nothing is lost.
 */
export class ProgressStore {
  private state: ProgressState;
  private listeners = new Set<Listener>();
  private queue: ProgressEvent[] = [];
  private disposed = false;

  constructor(
    private adapter: ProgressAdapter,
    private options: ProgressStoreOptions = {},
  ) {
    this.state = { lifetime: createEmptySnapshot(), session: createEmptySession(), hydrated: false };
    this.hydrate();
  }

  getState = (): ProgressState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
  }

  private emit(): void {
    this.listeners.forEach((l) => l());
  }

  private hydrate(): void {
    let loaded: ReturnType<ProgressAdapter['load']>;
    try {
      loaded = this.adapter.load();
    } catch (error) {
      console.warn('[PlayLab] progress adapter.load failed; starting fresh', error);
      loaded = null;
    }
    const finish = (value: unknown) => {
      if (this.disposed) return;
      this.state = { ...this.state, lifetime: value ? normalizeSnapshot(value) : this.state.lifetime, hydrated: true };
      const pending = this.queue;
      this.queue = [];
      this.emit();
      pending.forEach((e) => this.record(e));
    };
    if (loaded instanceof Promise) {
      loaded.then(finish, (error) => {
        console.warn('[PlayLab] progress adapter.load rejected; starting fresh', error);
        finish(null);
      });
    } else {
      this.state = { ...this.state, lifetime: loaded ? normalizeSnapshot(loaded) : this.state.lifetime, hydrated: true };
    }
  }

  record = (event: ProgressEvent): void => {
    if (this.disposed) return;
    if (!this.state.hydrated) {
      this.queue.push(event);
      return;
    }
    const { lifetime, session, newBadges } = reduceProgress(this.state, event, { alphabetSize: this.options.alphabetSize });
    this.state = { ...this.state, lifetime, session };
    this.emit();
    try {
      this.adapter.track?.(event);
      const saved = this.adapter.save(lifetime);
      if (saved instanceof Promise) saved.catch((e) => console.warn('[PlayLab] progress adapter.save failed', e));
    } catch (error) {
      console.warn('[PlayLab] progress adapter failed', error);
    }
    if (newBadges.length) this.options.onBadges?.(newBadges);
  };

  /** "Start over": clears lifetime progress (and the current session). */
  reset = (): void => {
    this.state = { lifetime: createEmptySnapshot(), session: createEmptySession(), hydrated: true };
    this.emit();
    try {
      const cleared = this.adapter.clear?.();
      if (cleared instanceof Promise) cleared.catch(() => undefined);
    } catch (error) {
      console.warn('[PlayLab] progress adapter.clear failed', error);
    }
  };
}
