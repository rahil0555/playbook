import { useState } from 'react';
import { motion } from 'framer-motion';
import { ActivityHeader } from '../../components/ActivityHeader';
import { Icon } from '../../components/Icon';
import { springs } from '../../motion/variants';
import { PairingGame } from './PairingGame';
import { WordCompletion } from './WordCompletion';

export type MatchingGame = 'letter-picture' | 'sound-letter' | 'word-completion';

const GAMES: { id: MatchingGame; title: string; blurb: string; emoji: string }[] = [
  { id: 'letter-picture', title: 'Letter ↔ Picture', blurb: 'Match each letter to the picture that starts with it.', emoji: '🔤' },
  { id: 'sound-letter', title: 'Sound ↔ Letter', blurb: 'Listen to each sound and match it to its letter.', emoji: '🎧' },
  { id: 'word-completion', title: 'Missing Letter', blurb: 'Find the letter that finishes the word.', emoji: '🧩' },
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
        <ul className="grid gap-4 md:grid-cols-3">
          {GAMES.map((g) => (
            <li key={g.id}>
              <motion.button
                type="button"
                data-game={g.id}
                onClick={() => setGame(g.id)}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                transition={springs.snappy}
                className="flex h-full w-full flex-col items-start gap-2 rounded-4xl bg-plum-100 p-5 text-left shadow-soft"
              >
                <span className="grid h-16 w-16 place-items-center rounded-3xl bg-white/80 text-4xl" aria-hidden="true">{g.emoji}</span>
                <span className="font-display text-2xl font-bold">{g.title}</span>
                <span className="text-ink-soft">{g.blurb}</span>
                <span className="mt-auto inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full bg-plum-700 px-4 font-display font-semibold text-white">
                  Play <Icon name="arrow-right" size={18} />
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
