import { useMemo, useRef, type CSSProperties } from 'react';
import { usePlayLab, useProgressState } from '../../app/PlayLabContext';
import { ActivityCard } from '../../components/ActivityCard';
import { AnimatedLetter, type AnimatedLetterHandle } from '../../components/AnimatedLetter';
import { Button } from '../../components/Button';
import { Companion } from '../../components/Companion';
import { Icon } from '../../components/Icon';
import { StickerArt } from '../../components/StickerArt';
import { ACTIVITIES } from '../../data/activities';
import { BADGES } from '../../data/badges';
import { STICKERS, STICKER_SLOTS, stickerSummary } from '../../data/stickers';
import { useSpeech } from '../../hooks/useAudio';
import { useLikes } from '../../hooks/useLikes';
import { letterColor } from '../../lib/accents';
import { animationFor } from '../../motion/variants';
import type { Like } from '../../services/likesService';

const HERO_WORD = ['p', 'l', 'a', 'y'];
const KIND_NAME = { letter: 'letter', word: 'word', sentence: 'sentence' } as const;

function Stat({ icon, value, label, color }: { icon: 'star' | 'check' | 'trophy' | 'sparkle'; value: number | string; label: string; color: string }) {
  return (
    <div className="pl-paper flex items-center gap-3 rounded-[1.8rem] p-3 pr-5">
      <span className="pl-gem grid h-14 w-14 shrink-0 place-items-center rounded-2xl" style={{ '--gem': color } as CSSProperties}>
        <Icon name={icon} size={28} filled={icon === 'star'} />
      </span>
      <span>
        <span className="block font-display text-3xl font-bold leading-none">{value}</span>
        <span className="block text-sm text-ink-soft">{label}</span>
      </span>
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, learner, content } = usePlayLab();
  const { lifetime, session } = useProgressState();
  const { sayLetterName, speak, sfx } = useSpeech();
  const { likes } = useLikes();
  const handles = useRef<Record<string, AnimatedLetterHandle | null>>({});
  const featured = ACTIVITIES[2]!;
  const heroLetters = useMemo(() => HERO_WORD.map((id) => content.letters.find((l) => l.id === id)).filter((l) => !!l), [content]);
  const name = learner?.displayName?.trim();
  const { unlocked, extra } = stickerSummary(lifetime.activitiesCompleted);

  /** Tap a loved thing to hear it again. Letters say their name, words and sentences are read aloud. */
  const hearLike = (like: Like) => {
    sfx('tap');
    if (like.kind === 'letter') {
      const letter = content.letters.find((l) => l.id === like.id);
      if (letter) void sayLetterName(letter);
      return;
    }
    void speak(like.label);
  };

  const pipSays =
    lifetime.activitiesCompleted === 0
      ? 'Hi! I’m Pip. Let’s learn together!'
      : `${unlocked + extra} sticker${unlocked + extra === 1 ? '' : 's'} so far! Pick a place to play.`;

  return (
    <div className="space-y-8 sm:space-y-10">
      <section aria-labelledby="pl-home-title" className="pl-board relative rounded-[2.6rem] p-5 sm:p-8 lg:p-10">
        <div className="relative grid items-center gap-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="pl-wood inline-block rounded-full px-5 py-1 font-display text-lg font-semibold">Welcome to PlayLab</p>
            <h1 id="pl-home-title" className="mt-3 font-display text-4xl font-bold leading-[1.05] text-ink sm:text-5xl">
              {name ? `Hello, ${name}!` : 'Hello, explorer!'}
              <span className="block text-brand-700">Let’s play with letters.</span>
            </h1>
            <p className="mt-3 max-w-md text-lg text-ink-soft">Tap a letter to hear it, then choose a place to play.</p>
            <ul aria-label="Tap a letter to hear it" className="mt-5 flex gap-2.5 sm:gap-3">
              {heroLetters.map((l, i) => (
                <li key={l.id}>
                  <span className="pl-gem-soft grid h-[4.5rem] w-[4.5rem] place-items-center rounded-[1.6rem] sm:h-24 sm:w-24" style={{ '--gem': letterColor(i) } as CSSProperties}>
                    <AnimatedLetter
                      ref={(h) => {
                        handles.current[l.id] = h;
                      }}
                      glyph={l.lower}
                      label={`Letter ${l.upper}. Tap to hear its name`}
                      color={letterColor(i)}
                      animation={animationFor(i + 2)}
                      className="h-full w-full text-5xl sm:text-6xl"
                      onTap={() => {
                        sfx('pop');
                        void sayLetterName(l);
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button size="lg" variant="primary" accent="sun" iconRight="arrow-right" onClick={() => navigate(featured.id)}>
                {featured.cta}
              </Button>
              <Button size="lg" variant="secondary" accent="brand" onClick={() => navigate('progress')}>
                See my stickers
              </Button>
            </div>
          </div>
          <div className="hidden items-end justify-center gap-2 md:flex">
            <p className="pl-paper relative mb-24 max-w-[9rem] rounded-[1.6rem] px-4 py-3 text-center font-display text-lg font-semibold leading-snug text-ink" data-testid="pip-says">
              {pipSays}
              <span aria-hidden="true" className="absolute -right-2 bottom-4 h-4 w-4 rotate-45 border-r-[3px] border-t-[3px] border-[#f3dca8] bg-[#fff8e6]" />
            </p>
            <Companion mood="happy" className="h-48 w-48 lg:h-56 lg:w-56" />
          </div>
        </div>
      </section>

      <section aria-labelledby="pl-progress-title">
        <h2 id="pl-progress-title" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">
          Your progress
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon="star" value={lifetime.stars} label="stars collected" color="#d9741c" />
          <Stat icon="check" value={lifetime.activitiesCompleted} label="rounds finished" color="#16a286" />
          <Stat icon="trophy" value={`${lifetime.badges.length} / ${BADGES.length}`} label="badges" color="#8a5cc7" />
          <Stat icon="sparkle" value={`${unlocked} / ${STICKER_SLOTS}`} label="stickers" color="#2f8fd8" />
        </div>
        <p className="mt-3 inline-block rounded-full bg-white/85 px-4 py-1.5 text-ink shadow-soft">
          {session.questionsAnswered > 0
            ? `This visit: ${session.correctAnswers} correct answer${session.correctAnswers === 1 ? '' : 's'} out of ${session.questionsAnswered} tried. Keep going!`
            : 'Nothing played yet this visit. Pick an activity to start!'}
        </p>
      </section>

      <section aria-labelledby="pl-love-title">
        <h2 id="pl-love-title" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">
          Things you love
        </h2>
        {likes.length === 0 ? (
          <p className="pl-paper flex items-center gap-3 rounded-[1.8rem] p-4 text-ink">
            <Icon name="heart" size={26} className="shrink-0 text-coral-500" />
            Tap “Love it” on a letter, word or sentence you enjoy. It will wait for you here!
          </p>
        ) : (
          <ul aria-label="Things you love" className="flex flex-wrap gap-3">
            {likes.slice(0, 12).map((l) => (
              <li key={`${l.kind}-${l.id}`}>
                <button
                  type="button"
                  onClick={() => hearLike(l)}
                  aria-label={`Hear ${KIND_NAME[l.kind]}: ${l.label}`}
                  className="pl-paper flex min-h-[3.25rem] items-center gap-2 rounded-full px-4 font-display text-xl font-bold text-ink"
                >
                  <Icon name="heart" size={20} filled className="text-coral-500" />
                  <span aria-hidden="true" className={l.kind === 'letter' ? '' : 'max-w-[18rem] truncate text-lg'}>
                    {l.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="pl-stickers-title">
        <h2 id="pl-stickers-title" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">
          My stickers
        </h2>
        <ul className="pl-board flex flex-wrap items-center justify-center gap-3 rounded-[2rem] p-4 sm:gap-4 sm:p-5" aria-label="Sticker book">
          {STICKERS.map((s, i) => (
            <li key={s.id}>
              <StickerArt sticker={s} slot={i + 1} locked={i >= unlocked} size="h-14 w-14 sm:h-16 sm:w-16" />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="pl-activities-title">
        <h2 id="pl-activities-title" className="pl-wood mb-4 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">
          Pick an activity
        </h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {ACTIVITIES.map((a, i) => (
            <li key={a.id} className={i < 3 ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <ActivityCard activity={a} progress={lifetime.perActivity[a.id]} onOpen={() => navigate(a.id)} index={i} station={i + 1} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
