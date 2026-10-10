import { useEffect, useRef } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { LEVELS } from '../lib/level';
import { useAudioStatus } from '../hooks/useAudio';
import { Icon } from './Icon';

/**
 * Small settings popover: sound on/off and difficulty level.
 * The level picker is hidden when the host app controls `level`.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { level, setLevel, levelLocked, soundEnabled, setSoundEnabled, content } = usePlayLab();
  const { voiceName, unavailable } = useAudioStatus();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Settings"
      tabIndex={-1}
      className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-4xl border-2 border-black/5 bg-white p-5 shadow-[0_24px_48px_-16px_rgba(18,49,44,0.35)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Settings</h2>
        <button type="button" aria-label="Close settings" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-black/5">
          <Icon name="close" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span id="pl-sound-label" className="text-base font-semibold">Sound</span>
        <button
          type="button"
          role="switch"
          aria-checked={soundEnabled}
          aria-labelledby="pl-sound-label"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`relative h-9 w-16 rounded-full transition-colors ${soundEnabled ? 'bg-brand-700' : 'bg-black/20'}`}
        >
          <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${soundEnabled ? 'left-8' : 'left-1'}`} />
          <span className="sr-only">{soundEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      {!levelLocked ? (
        <fieldset className="mt-5">
          <legend className="text-base font-semibold">Level</legend>
          <div className="mt-2 grid gap-2">
            {LEVELS.map((l) => (
              <label key={l.id} className={`flex min-h-[3rem] cursor-pointer items-center gap-3 rounded-2xl border-2 px-3 py-2 ${level === l.id ? 'border-brand-700 bg-brand-50' : 'border-black/10'}`}>
                <input type="radio" name="pl-level" value={l.id} checked={level === l.id} onChange={() => setLevel(l.id)} className="h-5 w-5 accent-[#0c7260]" />
                <span>
                  <span className="block font-semibold leading-tight">{l.label}</span>
                  <span className="block text-sm text-ink-soft">{l.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <p className="mt-4 text-sm leading-snug text-ink-soft">
        Voices come from your browser and device, so they may sound different on each one.
        {unavailable ? ' No voice is available right now.' : voiceName ? ` Current voice: ${voiceName}.` : ''} Language: {content.label}.
      </p>
    </div>
  );
}
