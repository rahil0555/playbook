import { useEffect, useRef } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { Icon } from './Icon';

/**
 * The learner's settings: just sound on or off. PlayLab speaks with one teacher voice in every activity, and every child plays
 * at the same level, so there is nothing else to choose here.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { soundEnabled, setSoundEnabled } = usePlayLab();
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
      className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-4xl border-2 border-black/5 bg-white p-5 shadow-[0_24px_48px_-16px_rgba(18,49,44,0.35)]"
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
          className={`relative h-11 w-[4.25rem] rounded-full transition-colors ${soundEnabled ? 'bg-brand-700' : 'bg-black/20'}`}
        >
          <span className={`absolute left-1.5 top-1.5 h-8 w-8 rounded-full bg-white shadow transition-transform ${soundEnabled ? 'translate-x-6' : ''}`} />
          <span className="sr-only">{soundEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>
    </div>
  );
}
