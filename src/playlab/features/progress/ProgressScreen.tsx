import { useState } from 'react';
import { usePlayLab, useProgressState } from '../../app/PlayLabContext';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Illustration } from '../../illustrations/Illustration';
import { ACTIVITIES, getActivity } from '../../data/activities';
import { BADGES } from '../../data/badges';
import { ACCENTS } from '../../lib/accents';
import { STICKERS, STICKER_SLOTS, stickerSummary } from '../../data/stickers';
import { StickerArt } from '../../components/StickerArt';

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="pl-paper rounded-[1.8rem] p-4">
      <p className="font-display text-3xl font-bold leading-none text-ink">{value}</p>
      <p className="mt-1 font-semibold">{label}</p>
      {hint ? <p className="text-sm text-ink-soft">{hint}</p> : null}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${n} out of 3 stars`}>
      {[1, 2, 3].map((i) => (
        <Icon key={i} name="star" size={18} filled className={i <= n ? 'text-sun-500' : 'text-black/15'} />
      ))}
    </span>
  );
}

const when = (t: number) => new Date(t).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function ProgressScreen() {
  const { store, navigate, content } = usePlayLab();
  const { lifetime, session, hydrated } = useProgressState();
  const { unlocked, extra } = stickerSummary(lifetime.activitiesCompleted);
  const [confirming, setConfirming] = useState(false);
  // until the saved progress has loaded, the all-time numbers show a placeholder rather than zeros
  const shown = (value: number) => (hydrated ? value : '…');

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="pl-wood inline-block rounded-[1.6rem] px-8 py-2 font-display text-4xl font-bold">My Stars</h1>
          <p className="mt-2 inline-block rounded-full bg-white/90 px-4 py-1 text-ink shadow-soft">Everything you have tried and learned. Mistakes are part of learning!</p>
        </div>
        <Button variant="secondary" icon="arrow-left" onClick={() => navigate('home')} aria-label="Back to home">
          Home
        </Button>
      </header>

      <section aria-labelledby="pl-p-session" className="pl-board rounded-[2.2rem] p-5 sm:p-6">
        <h2 id="pl-p-session" className="font-display text-2xl font-bold">This visit</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Stars earned', session.stars],
            ['Answers tried', session.questionsAnswered],
            ['Correct answers', session.correctAnswers],
            ['Rounds finished', session.activitiesCompleted],
          ].map(([label, value]) => (
            <div key={label} className="pl-paper rounded-[1.8rem] p-4">
              <dd className="font-display text-3xl font-bold leading-none" data-testid={`session-${String(label).toLowerCase().replace(/ /g, '-')}`}>{value}</dd>
              <dt className="mt-1 font-semibold">{label}</dt>
            </div>
          ))}
        </dl>
        {session.bestStreak >= 2 ? <p className="mt-3 font-semibold text-brand-900">Best streak this visit: {session.bestStreak} in a row on the first try!</p> : null}
      </section>

      <section aria-labelledby="pl-p-stickers">
        <h2 id="pl-p-stickers" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">Sticker book</h2>
        <div className="pl-board rounded-[2.2rem] p-5 sm:p-6">
          <ul className="grid grid-cols-4 justify-items-center gap-3 sm:grid-cols-6" aria-label="Sticker book">
            {STICKERS.map((s, i) => (
              <li key={s.id} data-sticker={i < unlocked ? 'earned' : 'locked'} className="flex flex-col items-center gap-1">
                <StickerArt sticker={s} slot={i + 1} locked={i >= unlocked} size="h-16 w-16 sm:h-20 sm:w-20" />
                {/* a locked slot says which finished round unlocks it: a hint, not a score */}
                <span className="text-center text-xs font-semibold text-ink-soft">{i < unlocked ? s.title : `Round ${i + 1}`}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-center font-display text-lg font-semibold" data-testid="sticker-count">
            {!hydrated
              ? 'Loading your stickers…'
              : unlocked < STICKER_SLOTS
                ? `${unlocked} of ${STICKER_SLOTS} stickers. Finish a round to earn the next one!`
                : `The whole book is full: ${STICKER_SLOTS} of ${STICKER_SLOTS} stickers${extra > 0 ? `, and ${extra} extra` : ''}. Every new round adds one more!`}
          </p>
        </div>
      </section>

      <section aria-labelledby="pl-p-total">
        <h2 id="pl-p-total" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">All time</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5" data-hydrated={hydrated}>
          <Tile label="Stars" value={shown(lifetime.stars)} />
          <Tile label="Activities started" value={shown(lifetime.activitiesStarted)} />
          <Tile label="Answers tried" value={shown(lifetime.questionsAnswered)} />
          <Tile label="Correct answers" value={shown(lifetime.correctAnswers)} hint={hydrated ? `${lifetime.firstTryCorrect} on the first try` : undefined} />
          <Tile label="Rounds finished" value={shown(lifetime.activitiesCompleted)} />
        </div>
      </section>

      <section aria-labelledby="pl-p-act">
        <h2 id="pl-p-act" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">By activity</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {ACTIVITIES.map((a) => {
            const p = lifetime.perActivity[a.id];
            const acc = ACCENTS[a.accent];
            return (
              <li key={a.id} className={`flex items-center gap-4 rounded-3xl p-4 ${acc.soft}`}>
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/80">
                  <Illustration name={a.illustration} className="h-12 w-12" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-semibold">{a.title}</p>
                  <p className="text-sm text-ink-soft">
                    Started {p.started} · Finished {p.completed} · Correct {p.correct}
                    {a.id === 'alphabet' ? ` · Letters found ${lifetime.exploredLetters.length}/${content.letters.length}` : ''}
                  </p>
                </div>
                <Stars n={p.bestStars} />
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="pl-p-badges">
        <h2 id="pl-p-badges" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">Badges</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BADGES.map((b) => {
            const earned = lifetime.badges.includes(b.id);
            return (
              <li key={b.id} data-earned={earned} className={`flex items-center gap-3 rounded-[1.8rem] p-4 ${earned ? 'pl-paper !border-sun-300 !bg-sun-100' : 'pl-paper'}`}>
                <span className={`grid h-14 w-14 place-items-center rounded-full text-3xl ${earned ? 'bg-white' : 'bg-black/5 grayscale'}`} aria-hidden="true">{b.emoji}</span>
                <span>
                  <span className="block font-display text-lg font-semibold leading-tight">{b.title}</span>
                  <span className="block text-sm text-ink-soft">{earned ? 'Earned!' : b.description}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="pl-p-recent">
        <h2 id="pl-p-recent" className="pl-wood mb-3 inline-block rounded-full px-5 py-1 font-display text-2xl font-bold">Recently finished</h2>
        {lifetime.recent.length === 0 ? (
          <p className="pl-paper rounded-[1.8rem] p-5 text-ink-soft">Nothing yet. Finish a round and it will show up here!</p>
        ) : (
          <ol className="space-y-2">
            {lifetime.recent.map((r) => (
              <li key={`${r.at}-${r.activityId}`} className="flex flex-wrap items-center justify-between gap-2 pl-paper rounded-[1.8rem] px-4 py-3">
                <span className="font-semibold">
                  {getActivity(r.activityId).title}
                  {r.variant ? <span className="ml-2 text-sm font-normal text-ink-soft">({r.variant.replace(/-/g, ' ')})</span> : null}
                </span>
                <span className="flex items-center gap-3 text-sm text-ink-soft">
                  {r.score}/{r.total} first try <Stars n={r.stars} /> {when(r.at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border-2 border-dashed border-black/10 p-4">
        <p className="max-w-xl text-sm text-ink-soft">Progress is saved on this device only (demo storage). No names or personal details are stored.</p>
        {confirming ? (
          <span className="flex gap-2">
            <Button
              variant="primary"
              accent="coral"
              onClick={() => {
                store.reset();
                setConfirming(false);
              }}
            >
              Yes, start over
            </Button>
            <Button variant="secondary" accent="brand" onClick={() => setConfirming(false)}>
              Keep my stars
            </Button>
          </span>
        ) : (
          <Button variant="secondary" accent="coral" icon="refresh" onClick={() => setConfirming(true)}>
            Start over
          </Button>
        )}
      </section>
    </div>
  );
}
