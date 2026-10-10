import { useEffect, useRef, useState } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { useAudioStatus } from '../hooks/useAudio';
import type { SpeakOutcome } from '../services/audioService';
import type { AccentName } from '../types/learning';
import { Button } from './Button';
import type { IconName } from './Icon';

interface PronunciationControlProps {
  label: string;
  /** Plays the audio. Should return the outcome so the control can explain failures. */
  onPlay: () => Promise<SpeakOutcome> | void;
  accent?: AccentName;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  icon?: IconName;
  className?: string;
  /** On phones show only the icon (label stays available to screen readers) */
  collapse?: boolean;
}

const MESSAGES: Partial<Record<SpeakOutcome, string>> = {
  muted: 'Sound is off. Turn it on with the speaker button at the top.',
  unsupported: 'This browser can’t speak out loud. Look at the picture and the letters instead!',
  blocked: 'Tap the button again to allow sound.',
  error: 'The sound didn’t play. Please try again.',
};

/**
 * A "hear it again" button. Playing is fire-and-forget: the button never waits
 * on audio, so animations and taps stay instant; if audio fails it says so kindly.
 */
export function PronunciationControl({ label, onPlay, accent = 'sky', variant = 'secondary', size = 'md', icon = 'speaker', className = '', collapse = false }: PronunciationControlProps) {
  const { soundEnabled } = usePlayLab();
  const { speaking } = useAudioStatus();
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const handle = () => {
    setNote(null);
    clearTimeout(timer.current);
    const result = onPlay();
    if (result && typeof result.then === 'function') {
      void result.then((outcome) => {
        const msg = MESSAGES[outcome];
        if (msg) {
          setNote(msg);
          timer.current = setTimeout(() => setNote(null), 5000);
        }
      });
    }
  };

  return (
    <span className={`inline-flex flex-col items-start gap-1 ${className}`}>
      <Button variant={variant} accent={accent} size={size} icon={soundEnabled ? icon : 'speaker-off'} onClick={handle} aria-label={label}>
        <span className={collapse ? 'sr-only sm:not-sr-only' : undefined}>{label}</span>
        {speaking ? (
          <span aria-hidden="true" className="ml-1 inline-flex h-4 items-end gap-0.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="pl-bar block w-1 rounded-full bg-current" style={{ height: `${6 + i * 3}px`, opacity: 0.8 }} />
            ))}
          </span>
        ) : null}
      </Button>
      {note ? (
        <span role="status" className="max-w-[18rem] text-sm font-medium text-ink-soft">
          {note}
        </span>
      ) : null}
    </span>
  );
}
