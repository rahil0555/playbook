import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayLab, useProgressState } from '../app/PlayLabContext';
import { getBadge } from '../data/badges';
import { useAudioStatus } from '../hooks/useAudio';
import { Icon, type IconName } from './Icon';
import { Logo } from './Logo';
import { Scene, type SceneName } from './Scene';
import { ScreenBoundary } from './ScreenBoundary';
import { SettingsPanel } from './SettingsPanel';
import { CelebrationEffect, useBurst } from './CelebrationEffect';
import { springs } from '../motion/variants';

interface NavButtonProps {
  icon: IconName;
  label: string;
  current?: boolean;
  onClick: () => void;
  /** show the text label even on narrow screens */
  showLabel?: boolean;
  expanded?: boolean;
  controls?: string;
  pressed?: boolean;
}

function NavButton({ icon, label, current, onClick, showLabel, expanded, pressed }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      aria-expanded={expanded}
      aria-pressed={pressed}
      aria-label={showLabel ? undefined : label}
      className={`inline-flex min-h-[2.9rem] min-w-[2.9rem] items-center justify-center gap-2 rounded-full px-3.5 font-display text-base font-semibold transition-colors ${
        current ? 'pl-gel bg-brand-700 text-white shadow-chunk' : 'bg-brand-50 text-ink hover:bg-brand-100'
      }`}
    >
      <Icon name={icon} size={22} />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}

function BadgeToast() {
  const { badgeToast, dismissBadgeToast, reducedMotion, audio } = usePlayLab();
  const { burst, fire, clear } = useBurst();
  const badge = badgeToast ? getBadge(badgeToast) : undefined;

  useEffect(() => {
    if (!badgeToast) return;
    fire('burst', { x: 50, y: 60 });
    audio.sfx('celebrate');
    const t = setTimeout(dismissBadgeToast, 5000);
    return () => clearTimeout(t);
  }, [badgeToast, dismissBadgeToast, fire, audio]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <AnimatePresence>
        {badge ? (
          <motion.div
            key={badge.id}
            role="status"
            aria-live="polite"
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20 }}
            transition={springs.bouncy}
            className="pointer-events-auto relative flex items-center gap-3 rounded-full bg-ink py-2.5 pl-3 pr-3 text-white shadow-[0_18px_36px_-12px_rgba(18,49,44,0.6)]"
          >
            <CelebrationEffect burst={burst} onDone={clear} />
            <span className="grid h-12 w-12 place-items-center rounded-full bg-sun-500 text-2xl" aria-hidden="true">{badge.emoji}</span>
            <span className="pr-2">
              <span className="block text-sm text-white/80">New badge!</span>
              <span className="block font-display text-lg font-semibold leading-tight">{badge.title}</span>
            </span>
            <button type="button" onClick={dismissBadgeToast} aria-label="Dismiss badge message" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
              <Icon name="close" size={18} />
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** Each screen gets its own painted world. */
const SCENES: Record<string, SceneName> = {
  home: 'meadow',
  alphabet: 'garden',
  phonics: 'dusk',
  'word-builder': 'meadow',
  sentences: 'storybook',
  matching: 'forest',
  progress: 'garden',
};

/** Frame: header with simple navigation, audio notice, main content area, badge toast. */
export function AppShell({ children }: { children: ReactNode }) {
  const { view, navigate, soundEnabled, setSoundEnabled, canExit, exit, learner } = usePlayLab();
  const { unavailable, voices, speechSupported } = useAudioStatus();
  // Tell the truth about why: no voice on this device, or a voice that did not play this time (it may work next time)
  const noVoice = !speechSupported || voices.length === 0;
  const { session } = useProgressState();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  // the notice is information, not a task: it fades away by itself after a while (and can always be dismissed)
  useEffect(() => {
    if (!unavailable || noticeDismissed) return;
    const t = setTimeout(() => setNoticeDismissed(true), 6000);
    return () => clearTimeout(t);
  }, [unavailable, noticeDismissed]);
  const prevView = useRef(view);

  // After navigating, move focus to the new screen (screen readers + keyboard users) and scroll it into view.
  // Compare with the previous view so StrictMode's double-run on mount does not steal focus.
  useEffect(() => {
    if (prevView.current === view) return;
    prevView.current = view;
    mainRef.current?.focus({ preventScroll: true });
    const rect = mainRef.current?.getBoundingClientRect();
    if (rect && rect.top < 0) mainRef.current?.scrollIntoView({ block: 'start' });
  }, [view]);

  return (
    <div className="relative isolate min-h-[var(--pl-min-height,100dvh)] w-full pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
    <Scene name={SCENES[view] ?? 'meadow'} />
    <div className="mx-auto flex min-h-[var(--pl-min-height,100dvh)] w-full max-w-6xl flex-col px-3 pb-[calc(2.5rem+env(safe-area-inset-bottom))] sm:px-6">
      <header className="relative z-40 my-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-[2rem] bg-white/85 px-3 py-1.5 shadow-soft backdrop-blur-sm sm:my-3 sm:px-4 sm:py-2">
        <button type="button" onClick={() => navigate('home')} aria-label="Edurance PlayLab, go to home" className="rounded-2xl p-1">
          <Logo compact />
        </button>

        <nav aria-label="Main" className="order-3 flex w-full justify-center gap-2 md:order-none md:w-auto">
          <NavButton icon="home" label="Home" showLabel current={view === 'home'} onClick={() => navigate('home')} />
          <NavButton icon="star" label="My Stars" showLabel current={view === 'progress'} onClick={() => navigate('progress')} />
        </nav>

        <div className="relative flex items-center gap-2">
          {session.stars > 0 ? (
            <span role="img" className="hidden items-center gap-1 rounded-full bg-sun-100 px-3 py-2 font-display font-semibold text-sun-700 min-[400px]:flex" aria-label={`${session.stars} stars this visit`}>
              <Icon name="star" size={18} filled className="text-sun-500" />
              {session.stars}
            </span>
          ) : null}
          <NavButton
            icon={soundEnabled ? 'speaker' : 'speaker-off'}
            label={soundEnabled ? 'Sound is on. Turn sound off' : 'Sound is off. Turn sound on'}
            pressed={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
          />
          <NavButton icon="settings" label="Settings" expanded={settingsOpen} onClick={() => setSettingsOpen((o) => !o)} />
          {canExit ? <NavButton icon="exit" label="Back to Edurance" showLabel onClick={exit} /> : null}
          {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} /> : null}
        </div>
        {unavailable && !noticeDismissed ? (
          // Spoken words only: the sound effects and pictures still work. The message sits under the header and lets every
          // tap pass through, so it never hides an answer or the Next button; only its own dismiss button takes a tap.
          <div role="status" className="pointer-events-none absolute right-3 top-full z-[55] mt-2 flex w-[min(16rem,calc(100%-1.5rem))] items-center gap-2 rounded-2xl border-2 border-sky-300 bg-sky-100/95 py-2 pl-3 pr-1.5 text-sm shadow-[0_12px_24px_-12px_rgba(18,49,44,0.45)]">
            <Icon name="speaker-off" size={18} className="shrink-0 text-sky-700" />
            <p className="flex-1 leading-snug">
              {noVoice
                ? 'This device has no spoken voice for this browser. Sounds and pictures still work.'
                : 'Spoken words did not play just now. Sounds and pictures still work.'}
            </p>
            <button type="button" aria-label="Dismiss sound message" onClick={() => setNoticeDismissed(true)} className="pointer-events-auto grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full hover:bg-black/5">
              <Icon name="close" size={18} />
            </button>
          </div>
        ) : null}
      </header>

      <main ref={mainRef} tabIndex={-1} id="pl-main" aria-label={learner?.displayName ? `PlayLab for ${learner.displayName}` : 'PlayLab'} className="flex-1 outline-none">
        <ScreenBoundary resetKey={view} onHome={() => navigate('home')}>
          {children}
        </ScreenBoundary>
      </main>
      <BadgeToast />
    </div>
    </div>
  );
}
