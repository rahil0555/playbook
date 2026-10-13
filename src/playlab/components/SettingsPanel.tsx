import { useEffect, useRef, useState } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { LEVELS } from '../lib/level';
import { useAudioStatus } from '../hooks/useAudio';
import { Button } from './Button';
import { Icon } from './Icon';

/** Sample sentence for the voice preview. */
export const PREVIEW_TEXT = 'Hi there! Let\u2019s learn our letters together: A, B, C!';

/**
 * Small settings popover: sound on/off, voice and difficulty level.
 * The level picker is hidden when the host app controls `level`.
 */
export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { level, setLevel, levelLocked, soundEnabled, setSoundEnabled, content, audio, voice, setVoice } = usePlayLab();
  const { voiceName, unavailable, voices, speechSupported } = useAudioStatus();
  // The dropdown only DRAFTS a choice. Preview never saves; "Use this voice" does.
  const savedId = voice !== null && voices.some((v) => v.id === voice) ? voice : '';
  const [draft, setDraft] = useState<string>(savedId);
  const [voiceNote, setVoiceNote] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // browsers load voices late; ask again when the panel opens
    audio.refreshVoices();
  }, [audio]);

  useEffect(() => {
    setDraft(savedId);
  }, [savedId]);

  const draftOption = voices.find((v) => v.id === draft);
  const preview = async () => {
    setVoiceNote('');
    const outcome = await audio.play({ text: PREVIEW_TEXT, lang: content.speechLang, voice: draft === '' ? null : draft });
    if (outcome === 'muted') setVoiceNote('Sound is off. Turn Sound on above to hear the preview.');
    else if (outcome === 'unsupported' || outcome === 'error') setVoiceNote('This voice could not play on this device. Try another one.');
    else if (outcome === 'blocked') setVoiceNote('Tap Preview voice again to allow sound.');
  };
  const useVoice = () => {
    setVoice(draft === '' ? null : draft);
    setVoiceNote(draft === '' ? 'Saved: Automatic voice.' : `Saved: ${draftOption?.name ?? 'your voice'}.`);
  };

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
          className={`relative h-11 w-[4.25rem] rounded-full transition-colors ${soundEnabled ? 'bg-brand-700' : 'bg-black/20'}`}
        >
          <span className={`absolute left-1.5 top-1.5 h-8 w-8 rounded-full bg-white shadow transition-transform ${soundEnabled ? 'translate-x-6' : ''}`} />
          <span className="sr-only">{soundEnabled ? 'On' : 'Off'}</span>
        </button>
      </div>

      {speechSupported && voices.length > 0 ? (
        <div className="mt-5" data-testid="voice-section">
          <label htmlFor="pl-voice-select" className="text-base font-semibold">
            Voice
          </label>
          <select
            id="pl-voice-select"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setVoiceNote('');
            }}
            className="mt-2 min-h-[3rem] w-full rounded-2xl border-2 border-black/15 bg-white px-3 font-body text-base"
          >
            <option value="">Automatic (best American English)</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
          {!voices.some((v) => v.american) ? (
            <p className="mt-2 text-sm text-ink-soft">No American English voice was found on this device, so the closest English voice is used.</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" accent="sky" icon="speaker" onClick={preview}>
              Preview voice
            </Button>
            <Button variant="primary" accent="brand" icon="check" onClick={useVoice} disabled={draft === savedId}>
              Use this voice
            </Button>
          </div>
          <p role="status" className="mt-2 min-h-[1.25rem] text-sm font-medium text-ink-soft">
            {voiceNote}
          </p>
        </div>
      ) : (
        <p className="mt-5 text-sm leading-snug text-ink-soft" data-testid="voice-unavailable">
          {speechSupported
            ? 'No English voice was found on this device, so PlayLab uses whatever voice your browser provides.'
            : 'This browser cannot speak out loud, so there is no voice to choose. The activities still work.'}
        </p>
      )}

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
        {unavailable ? ' The last spoken line did not play.' : voiceName ? ` Current voice: ${voiceName}.` : ''} Language: {content.label}.
      </p>
    </div>
  );
}
