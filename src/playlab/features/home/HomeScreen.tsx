import { useMemo, useRef } from 'react';
import { usePlayLab, useProgressState } from '../../app/PlayLabContext';
import { ActivityCard } from '../../components/ActivityCard';
import { AnimatedLetter, type AnimatedLetterHandle } from '../../components/AnimatedLetter';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Mascot } from '../../components/Mascot';
import { ACTIVITIES } from '../../data/activities';
import { BADGES } from '../../data/badges';
import { useSpeech } from '../../hooks/useAudio';
import { letterColor } from '../../lib/accents';
import { animationFor } from '../../motion/variants';

const HERO_WORD = ['p', 'l', 'a', 'y'];

function Stat({ icon, value, label }: { icon: 'star' | 'check' | 'trophy'; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-white p-3 pr-5 shadow-soft">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
        <Icon name={icon} size={26} filled={icon === 'star'} />
      </span>
      <span>
        <span className="block font-display text-2xl font-bold leading-none">{value}</span>
        <span className="block text-sm text-ink-soft">{label}</span>
      </span>
    </div>
  );
}

export default function HomeScreen() {
  const { navigate, learner, content } = usePlayLab();
  const { lifetime, session } = useProgressState();
  const { sayLetterName, sfx } = useSpeech();
  const handles = useRef<Record<string, AnimatedLetterHandle | null>>({});
  const featured = ACTIVITIES[0]!;
  const others = ACTIVITIES.slice(1);
  const heroLetters = useMemo(() => HERO_WORD.map((id) => content.letters.find((l) => l.id === id)).filter((l) => !!l), [content]);
  const name = learner?.displayName?.trim();

  return (
    <div className="space-y-8 sm:space-y-10">
      <section aria-labelledby="pl-home-title" className="relative overflow-hidden rounded-5xl bg-brand-700 p-5 text-white sm:p-8 lg:p-10">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-600/60" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-800/50" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="font-display text-lg font-semibold text-brand-100">Welcome to PlayLab</p>
            <h1 id="pl-home-title" className="mt-1 font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
              {name ? `Hello, ${name}!` : 'Hello, explorer!'}
              <span className="block text-brand-100">Let’s play with letters.</span>
            </h1>
            <p className="mt-3 max-w-md text-lg text-brand-50">Tap the letters below and watch them move. Then jump into a game.</p>
            <ul aria-label="Tap a letter to hear it" className="mt-5 flex gap-2.5 sm:gap-3">
              {heroLetters.map((l, i) => (
                <li key={l.id}>
                  <span className="grid h-[4.5rem] w-[4.5rem] place-items-center rounded-3xl bg-white shadow-chunk sm:h-24 sm:w-24">
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
              <Button size="lg" variant="ghost" accent="brand" onClick={() => navigate('progress')} className="!text-white hover:!bg-white/10">
                See my stars
              </Button>
            </div>
          </div>
          <div className="hidden justify-center md:flex">
            <Mascot mood="cheer" className="h-52 w-52 lg:h-60 lg:w-60" float />
          </div>
        </div>
      </section>

      <section aria-labelledby="pl-progress-title">
        <h2 id="pl-progress-title" className="mb-3 font-display text-2xl font-bold">
          Your progress
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat icon="star" value={lifetime.stars} label="stars collected" />
          <Stat icon="check" value={lifetime.activitiesCompleted} label="rounds finished" />
          <Stat icon="trophy" value={`${lifetime.badges.length} / ${BADGES.length}`} label="badges" />
        </div>
        <p className="mt-3 text-ink-soft">
          {session.questionsAnswered > 0
            ? `This visit: ${session.correctAnswers} correct answer${session.correctAnswers === 1 ? '' : 's'} out of ${session.questionsAnswered} tried. Keep going!`
            : 'Nothing played yet this visit. Pick an activity to start!'}
        </p>
      </section>

      <section aria-labelledby="pl-activities-title">
        <h2 id="pl-activities-title" className="mb-3 font-display text-2xl font-bold">
          Pick an activity
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[featured, ...others].map((a) => (
            <li key={a.id}>
              <ActivityCard activity={a} progress={lifetime.perActivity[a.id]} onOpen={() => navigate(a.id)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
