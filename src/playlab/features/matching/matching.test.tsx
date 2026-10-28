import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { englishWords } from '../../data/en/words';
import { audioLog } from '../../test/fakeAudio';
import { renderPlayLab } from '../../test/utils';

type User = ReturnType<typeof renderPlayLab>['user'];

// The words of the next Missing Letter round, in order, when a test needs to know them. Empty: the app chooses at random, as it does for a child.
const fixedRound = vi.hoisted(() => ({ words: [] as string[] }));
vi.mock('../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/random')>();
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[], count: number, seen: ReadonlySet<string>) =>
      fixedRound.words.length ? fixedRound.words.map((id) => pool.find((p) => p.id === id)).filter((p): p is T => !!p) : actual.pickFresh(pool, count, seen),
  };
});

const cards = (side: 'left' | 'right') => [...document.querySelectorAll<HTMLElement>(`[data-side="${side}"]`)];

async function solvePairs(user: User) {
  const lefts = cards('left');
  // one deliberate mismatch first
  const wrongRight = cards('right').find((r) => r.dataset.pairId !== lefts[0]!.dataset.pairId)!;
  await user.click(lefts[0]!);
  await user.click(wrongRight);
  expect(await screen.findByText(/That is not a pair/)).toBeInTheDocument();
  for (const l of lefts) {
    await user.click(l);
    await user.click(cards('right').find((r) => r.dataset.pairId === l.dataset.pairId)!);
  }
}

describe('Matching hub', () => {
  it('offers three games, each reachable and returnable', async () => {
    const { user } = renderPlayLab({ initialActivity: 'matching' });
    await screen.findByText('Letter ↔ Picture');
    for (const [id, heading] of [['letter-picture', 'Letter ↔ Picture'], ['sound-letter', 'Sound ↔ Letter'], ['word-completion', 'Missing Letter']] as const) {
      await user.click(document.querySelector<HTMLElement>(`[data-game="${id}"]`)!);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Pick another game' }));
      await screen.findByText('Pick a game. Each one is a quick round of five.');
    }
  });
});

describe('Letter to picture', () => {
  it('can be played from start to finish (with a wrong try) and records the variant', async () => {
    const onActivityComplete = vi.fn();
    const onAnswerSubmit = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'matching', onActivityComplete, onAnswerSubmit });
    await user.click(await screen.findByText('Letter ↔ Picture'));
    await screen.findByText('Pairs matched: 0 of 5');
    await solvePairs(user);
    expect(await screen.findByRole('region', { name: /Amazing|Great work|You did it/ }, { timeout: 3000 })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ activityId: 'matching', variant: 'letter-picture', total: 5 }));
    expect(onAnswerSubmit).toHaveBeenCalledWith(expect.objectContaining({ correct: false }));
    expect(onAnswerSubmit.mock.calls.filter(([r]) => r.correct)).toHaveLength(5);
    // the wrong try was on one pair => at most 4 on the first try, stars never below 1
    expect(onActivityComplete.mock.calls[0]![0].score).toBeLessThanOrEqual(4);
    expect(onActivityComplete.mock.calls[0]![0].stars).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    await screen.findByText('Pairs matched: 0 of 5');
  }, 20_000);

  it('works in either selection order (picture first, then letter)', async () => {
    const { user } = renderPlayLab({ initialActivity: 'matching' });
    await user.click(await screen.findByText('Letter ↔ Picture'));
    await screen.findByText('Pairs matched: 0 of 5');
    const left = cards('left')[0]!;
    const right = cards('right').find((r) => r.dataset.pairId === left.dataset.pairId)!;
    await user.click(right);
    await user.click(left);
    expect(await screen.findByText('Pairs matched: 1 of 5')).toBeInTheDocument();
    expect(left).toBeDisabled();
    expect(right).toBeDisabled();
  });
});

describe('Sound to letter', () => {
  it('plays each sound when its card is picked and finishes the round', async () => {
    const onActivityComplete = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'matching', onActivityComplete });
    await user.click(await screen.findByText('Sound ↔ Letter'));
    await screen.findByText('Pairs matched: 0 of 5');
    await user.click(cards('left')[0]!);
    await vi.waitFor(() => expect(audioLog.at(-1)?.text ?? '').toMatch(/^[a-z]+$/), { timeout: 1000 }); // the sound follows the pop
    await user.click(cards('left')[0]!); // deselect
    await solvePairs(user);
    expect(await screen.findByRole('region', { name: /Amazing|Great work|You did it/ }, { timeout: 3000 })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ variant: 'sound-letter' }));
  }, 20_000);
});

describe('Word completion', () => {
  it('finishes a full round of missing-letter words', async () => {
    // The words are fixed so that each answer is the letter of the word really on screen. The picture does not name its word, and a
    // dictionary lookup from the masked letters can pick another word ("_at" could be cat, bat or hat).
    fixedRound.words = ['hat', 'pen', 'lion', 'cat', 'moon'];
    try {
      const onActivityComplete = vi.fn();
      const { user } = renderPlayLab({ initialActivity: 'matching', onActivityComplete });
      await user.click(await screen.findByText('Missing Letter'));
      for (let i = 0; i < 5; i++) {
        const label = (await screen.findByLabelText(/Word with a missing letter/, {}, { timeout: 4000 })).getAttribute('aria-label')!;
        const tokens = label.split(': ')[1]!.split(' ');
        const word = englishWords.find((w) => w.text === fixedRound.words[i])!;
        const blank = tokens.indexOf('blank');
        // the question on screen is this word with one letter hidden
        expect(tokens).toEqual(word.text.split('').map((c, k) => (k === blank ? 'blank' : c)));
        const answer = word.text[blank]!;
        if (i === 0) {
          const wrong = [...document.querySelectorAll<HTMLElement>('[data-choice]')].find((el) => el.dataset.choice !== answer)!;
          await user.click(wrong);
          expect(await screen.findByText(/Say the word out loud/, {}, { timeout: 4000 })).toBeInTheDocument();
        }
        await user.click(document.querySelector<HTMLElement>(`[data-choice="${answer}"]`)!);
        // no Next or Finish button: the next question comes by itself once this one's celebration is over (the loop waits for it)
        expect(screen.queryByRole('button', { name: /^(Next word|Finish)$/ })).toBeNull();
      }
      expect(await screen.findByRole('region', { name: /Amazing|Great work|You did it/ }, { timeout: 8000 })).toBeInTheDocument();
      expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ variant: 'word-completion', total: 5 }));
    } finally {
      fixedRound.words = [];
    }
  }, 20_000);
});
