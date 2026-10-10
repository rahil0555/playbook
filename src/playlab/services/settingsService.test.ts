import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from './settingsService';

const KEY = 'edurance.playlab.settings.v1';

describe('settings: backward compatibility for the saved voice', () => {
  beforeEach(() => window.localStorage.clear());

  it('settings saved before the voice option existed still load (voice defaults to automatic)', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ sound: false, level: 'starter' }));
    expect(loadSettings()).toEqual({ sound: false, level: 'starter', voice: null });
  });

  it('round-trips a saved voice, namespaced per learner', () => {
    saveSettings({ sound: true, level: 'explorer', voice: 'com.apple.voice.compact.en-US.Samantha' }, 'kid-1');
    expect(loadSettings('kid-1').voice).toBe('com.apple.voice.compact.en-US.Samantha');
    expect(loadSettings('kid-2').voice).toBeNull();
    expect(loadSettings().voice).toBeNull();
  });

  it('ignores a corrupt voice value and corrupt JSON', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ sound: true, level: 'starter', voice: 42 }));
    expect(loadSettings().voice).toBeNull();
    window.localStorage.setItem(KEY, JSON.stringify({ voice: 'x'.repeat(500) }));
    expect(loadSettings().voice).toBeNull();
    window.localStorage.setItem(KEY, '{nope');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
