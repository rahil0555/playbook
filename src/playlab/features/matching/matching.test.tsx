import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { englishWords } from '../../data/en/words';
import { audioLog } from '../../test/fakeAudio';
import { renderPlayLab } from '../../test/utils';

type User = ReturnType<typeof renderPlayLab>['user'];

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
    expect(audioLog.at(-1)?.text).toMatch(/^[a-z]+$/);
    await user.click(cards('left')[0]!); // deselect
    await solvePairs(user);
    expect(await screen.findByRole('region', { name: /Amazing|Great work|You did it/ }, { timeout: 3000 })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ variant: 'sound-letter' }));
  }, 20_000);
});

describe('Word completion', () => {
  it('finishes a full round of missing-letter words', async () => {
    const onActivityComplete = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'matching', onActivityComplete });
    await user.click(await screen.findByText('Missing Letter'));
    for (let i = 0; i < 5; i++) {
      const label = (await screen.findByLabelText(/Word with a missing letter/)).getAttribute('aria-label')!;
      const tokens = label.split(': ')[1]!.split(' ');
      const pattern = new RegExp(`^${tokens.map((t) => (t === 'blank' ? '.' : t)).join('')}$`);
      const word = englishWords.find((w) => pattern.test(w.text) && w.text.length === tokens.length)!;
      const answer = word.text[tokens.indexOf('blank')]!;
      if (i === 0) {
        const wrong = [...document.querySelectorAll<HTMLElement>('[data-choice]')].find((el) => el.dataset.choice !== answer)!;
        await user.click(wrong);
        expect(await screen.findByText(/Say the word out loud/)).toBeInTheDocument();
      }
      await user.click(document.querySelector<HTMLElement>(`[data-choice="${answer}"]`)!);
      await user.click(await screen.findByRole('button', { name: i === 4 ? 'Finish' : 'Next word' }));
    }
    expect(await screen.findByRole('region', { name: /Amazing|Great work|You did it/ })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ variant: 'word-completion', total: 5 }));
  }, 20_000);
});
