import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { englishLetters } from '../../data/en/alphabet';
import { audioLog } from '../../test/fakeAudio';
import { renderPlayLab } from '../../test/utils';

/** The quiz plays the answer's sound on appearance; find which letter that is from the audio log. */
const answerLetter = () => {
  const text = [...audioLog].reverse().find((r) => englishLetters.some((l) => l.sound.speech === r.text))?.text;
  const candidates = [...document.querySelectorAll<HTMLElement>('[data-choice]')].map((el) => el.dataset.choice as string);
  return englishLetters.find((l) => l.sound.speech === text && candidates.includes(l.id))!;
};

describe('Sound Discovery: the sounds tab', () => {
  it('shows the letter and the question, and keeps the teaching words back until the child has answered', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    expect(await screen.findByRole('region', { name: /About the letter A/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear the sound' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Say the name|Play the sound|Hear the word|Hear all three/ })).toBeNull();
    expect(screen.queryByText('“ay”')).toBeNull();
  });

  it('the replay says the letter’s name and never the example word', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await user.click(await screen.findByRole('button', { name: 'Hear the sound' }));
    expect(audioLog.at(-1)?.text).toBe('ay');
    expect(audioLog.map((r) => r.text)).not.toContain('apple');
  });

  it('switches letters from the grid', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await user.click(await screen.findByRole('button', { name: /^Letter M,/ }));
    expect(await screen.findByRole('region', { name: /About the letter M/ })).toBeInTheDocument();
  });
});

describe('Sound Discovery: listen and choose', () => {
  it('plays the sound, gives kind feedback for a wrong pick, accepts the right pick, moves on by itself and finishes a round', async () => {
    const { user, adapter } = renderPlayLab({ initialActivity: 'phonics' });
    await user.click(await screen.findByRole('tab', { name: 'Listen & choose' }));

    for (let q = 0; q < 5; q++) {
      await screen.findByText('Which letter makes this sound?');
      const right = answerLetter();
      if (q === 0) {
        // pick a wrong one first
        const wrongEl = [...document.querySelectorAll<HTMLElement>('[data-choice]')].find((el) => el.dataset.choice !== right.id)!;
        await user.click(wrongEl);
        expect(await screen.findByText(/Almost|Not quite|Good try|So close/)).toBeInTheDocument();
        expect(wrongEl).toHaveAttribute('aria-disabled', 'true');
        await user.click(screen.getByRole('button', { name: /Try again/ }));
        expect(audioLog.at(-1)?.text).toBe(right.sound.speech); // retry replays the sound
      }
      await user.click(document.querySelector<HTMLElement>(`[data-choice="${right.id}"]`)!);
      expect(await screen.findByText(new RegExp(`${right.upper} says`))).toBeInTheDocument();
      if (q < 4) {
        // the next question comes by itself once the praise has been said: the feedback for this one goes away
        await waitFor(() => expect(screen.queryByText(new RegExp(`${right.upper} says`))).toBeNull(), { timeout: 4000 });
      }
    }

    const summary = await screen.findByRole('region', { name: /Amazing|Great work|You did it/ }, { timeout: 4000 });
    expect(summary).toBeInTheDocument();
    const saved = adapter.load() as { perActivity: { phonics: { answered: number; correct: number; completed: number } } };
    expect(saved.perActivity.phonics).toMatchObject({ answered: 6, correct: 5, completed: 1 });
    // the first question needed two tries => 4 of 5 on the first try
    expect(screen.getByText(/4 of 5 right on the first try/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(await screen.findByText('Which letter makes this sound?')).toBeInTheDocument();
  }, 40_000);

  it('gives a hint after two wrong picks', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await user.click(await screen.findByRole('tab', { name: 'Listen & choose' }));
    await screen.findByText('Which letter makes this sound?');
    const right = answerLetter();
    const wrongs = [...document.querySelectorAll<HTMLElement>('[data-choice]')].filter((el) => el.dataset.choice !== right.id);
    await user.click(wrongs[0]!);
    await user.click(wrongs[1]!);
    const hint = await screen.findByText(/Here.s a hint/);
    expect(within(hint.closest('[role="status"]') as HTMLElement).getByText(new RegExp(right.word.text))).toBeInTheDocument();
  });
});
