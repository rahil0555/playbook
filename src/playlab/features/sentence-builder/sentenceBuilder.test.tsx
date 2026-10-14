import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { audioLog } from '../../test/fakeAudio';
import { renderPlayLab } from '../../test/utils';

// s1 arrange, s2 fill, s3 arrange, s4 fill, s5 arrange
vi.mock('../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/random')>();
  const ids = ['s1', 's2', 's3', 's4', 's5'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => ids.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

type User = ReturnType<typeof renderPlayLab>['user'];
const word = (w: string) => screen.getByRole('button', { name: new RegExp(`^word ${w}\\.`) });
/** words currently sitting in an answer slot (a tapped word first lifts, then travels, so placement is a moment later) */
const placed = () => document.querySelectorAll('[data-slot] [data-tile]').length;
/** taps every word in order; the sentence is then judged by itself: a wrong order stays on the board, a right one turns into the finished sentence */
const arrange = async (user: User, words: string[]) => {
  for (const w of words) await user.click(word(w));
  await vi.waitFor(() => expect(placed() === words.length || screen.queryByText('You made a whole sentence!') !== null).toBe(true), { timeout: 2000 });
};

describe('Sentence builder', () => {
  it('there is no check button: a wrong order is judged as soon as the last word lands, a right one is celebrated and read aloud', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'sentences', onAnswerSubmit });
    await screen.findByText('Make the sentence');
    expect(screen.queryByRole('button', { name: 'Check my sentence' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    await arrange(user, ['cat', 'The', 'is', 'sleeping']);
    // nothing is pressed: the wrong order is judged by itself
    expect(await screen.findByText(/Green words are in the right place/)).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: false, expected: 'The cat is sleeping' }));

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await user.click(word('The'));
    await user.click(word('cat'));
    expect(await screen.findByText('You made a whole sentence!')).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('The cat is sleeping.')).toBeInTheDocument();
    await vi.waitFor(() => expect(audioLog.at(-1)?.text).toBe('The cat is sleeping.'), { timeout: 2000 }); // read aloud after the fanfare
    expect(screen.getByRole('button', { name: 'Next sentence' })).toBeInTheDocument();
  });

  it('fill-in: a wrong word is turned down kindly, the right word completes the sentence', async () => {
    const { user } = renderPlayLab({ initialActivity: 'sentences' });
    // finish s1 quickly
    await screen.findByText('Make the sentence');
    await arrange(user, ['The', 'cat', 'is', 'sleeping']);
    await user.click(await screen.findByRole('button', { name: 'Next sentence' }));

    await screen.findByText('Finish the sentence');
    expect(screen.getByLabelText('missing word')).toBeInTheDocument();
    const run = document.querySelector<HTMLElement>('[data-option="run"]')!;
    await user.click(run);
    expect(await screen.findByText(/Read the sentence again/)).toBeInTheDocument();
    expect(run).toBeDisabled();
    await user.click(document.querySelector<HTMLElement>('[data-option="apples"]')!);
    expect(await screen.findByText('You made a whole sentence!')).toBeInTheDocument();
    expect(screen.getByLabelText('I like apples.')).toBeInTheDocument();
  });

  it('every sentence can be completed and the round summary appears with progress recorded', async () => {
    const onActivityComplete = vi.fn();
    const { user, adapter } = renderPlayLab({ initialActivity: 'sentences', onActivityComplete });
    const script: Record<string, string[]> = { s1: ['The', 'cat', 'is', 'sleeping'], s3: ['The', 'sun', 'is', 'bright'], s5: ['The', 'pig', 'is', 'big'] };
    const order = ['s1', 's2', 's3', 's4', 's5'];
    for (const id of order) {
      if (script[id]) {
        await screen.findByText('Make the sentence');
        await arrange(user, script[id]!);
      } else {
        await screen.findByText('Finish the sentence');
        await user.click(document.querySelector<HTMLElement>(id === 's2' ? '[data-option="apples"]' : '[data-option="run"]')!);
      }
      await user.click(await screen.findByRole('button', { name: id === 's5' ? 'Finish' : 'Next sentence' }));
    }
    expect(await screen.findByRole('region', { name: 'Amazing!' })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledWith(expect.objectContaining({ activityId: 'sentences', score: 5, total: 5 }));
    expect((adapter.load() as { perActivity: { sentences: { correct: number } } }).perActivity.sentences.correct).toBe(5);
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(await screen.findByText('Make the sentence')).toBeInTheDocument();
  });

  it('a sentence is judged once per completion: taking a word out is not an answer, filling the sentence again is', async () => {
    const onAnswerSubmit = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'sentences', onAnswerSubmit });
    await screen.findByText('Make the sentence');
    await arrange(user, ['cat', 'The', 'is', 'sleeping']);
    await screen.findByText(/Green words are in the right place/);
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Clear' }));
    await vi.waitFor(() => expect(placed()).toBe(0), { timeout: 2000 });
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);

    await arrange(user, ['The', 'cat', 'is', 'sleeping']);
    expect(await screen.findByText('You made a whole sentence!')).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenCalledTimes(2);
  });
});
