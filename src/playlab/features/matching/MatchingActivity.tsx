import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ActivityHeader } from '../../components/ActivityHeader';
import { Icon } from '../../components/Icon';
import { Illustration } from '../../illustrations/Illustration';
import type { IllustrationId } from '../../types/learning';
import { springs } from '../../motion/variants';
import { PairingGame } from './PairingGame';
import { WordCompletion } from './WordCompletion';

export type MatchingGame = 'letter-picture' | 'sound-letter' | 'word-completion';

const GAMES: { id: MatchingGame; title: string; blurb: string; art: IllustrationId; color: string }[] = [
  { id: 'letter-picture', title: 'Letter ↔ Picture', blurb: 'Match each letter to the picture that starts with it.', art: 'fox', color: '#d9741c' },
  { id: 'sound-letter', title: 'Sound ↔ Letter', blurb: 'Listen to each sound and match it to its letter.', art: 'bird', color: '#2f8fd8' },
  { id: 'word-completion', title: 'Missing Letter', blurb: 'Find the letter that finishes the word.', art: 'kite', color: '#8a5cc7' },
];

const INSTRUCTIONS: Record<MatchingGame | 'hub', string> = {
  hub: 'Pick a game. Each one is a quick round of five.',
  'letter-picture': 'Tap a letter, then tap its picture. You can drag letters, too.',
  'sound-letter': 'Tap a speaker to hear a sound. Then tap the letter that makes it.',
  'word-completion': 'Look at the picture. Which letter is missing from the word?',
};

export default function MatchingActivity() {
  const [game, setGame] = useState<MatchingGame | null>(null);
  const hub = () => setGame(null);

  return (
    <div>
      <ActivityHeader
        activityId="matching"
        instruction={INSTRUCTIONS[game ?? 'hub']}
        title={game ? GAMES.find((g) => g.id === game)?.title : undefined}
        back={game ? { label: 'Pick another game', onClick: hub } : undefined}
      />
      {game === null ? (
        <ul className="grid gap-5 md:grid-cols-3 md:gap-6">
          {GAMES.map((g, i) => (
            <li key={g.id}>
              <motion.button
                type="button"
                data-game={g.id}
                onClick={() => setGame(g.id)}
                initial={{ opacity: 0, y: 30, rotate: i % 2 ? 2 : -2 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ ...springs.bouncy, delay: i * 0.1 }}
                whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
                whileTap={{ scale: 0.97 }}
                className="group relative flex h-full w-full flex-col items-center gap-3 text-center"
              >
                {/* a signboard on two posts */}
                <span aria-hidden="true" className="absolute inset-x-8 -bottom-5 top-1/2 -z-10 flex justify-between">
                  <span className="h-full w-4 rounded-b bg-[#8a4b1e] shadow-[inset_-3px_0_0_rgba(0,0,0,0.2)]" />
                  <span className="h-full w-4 rounded-b bg-[#8a4b1e] shadow-[inset_-3px_0_0_rgba(0,0,0,0.2)]" />
                </span>
                <span className="pl-board flex w-full flex-1 flex-col items-center gap-3 rounded-[2rem] px-4 pb-5 pt-4">
                  <span className="pl-wood w-full rounded-full px-3 py-1 font-display text-xl font-bold sm:text-2xl">{g.title}</span>
                  <span aria-hidden="true" className="pl-frame grid h-24 w-24 place-items-center rounded-[1.6rem]">
                    <Illustration name={g.art} className="h-[78%] w-[78%]" />
                  </span>
                  <span className="text-[1.02rem] leading-snug text-ink">{g.blurb}</span>
                  <span className="pl-gem mt-auto inline-flex min-h-[3rem] items-center gap-1.5 rounded-full px-6 font-display text-lg font-semibold" style={{ '--gem': g.color } as CSSProperties}>
                    Play <Icon name="arrow-right" size={20} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </span>
              </motion.button>
            </li>
          ))}
        </ul>
      ) : game === 'word-completion' ? (
        <WordCompletion onPickGame={hub} />
      ) : (
        <PairingGame key={game} variant={game} onPickGame={hub} />
      )}
    </div>
  );
}
