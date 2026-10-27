import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { englishLetters } from '../../data/en/alphabet';
import { SOUND_LEAD_IN } from '../../hooks/useAudio';
import { audioLog } from '../../test/fakeAudio';
import { renderPlayLab } from '../../test/utils';

/** The quiz plays the answer's sound on appearance; find which letter that is from the audio log. */
const answerLetter = () => {
  const text = [...audioLog].reverse().find((r) => englishLetters.some((l) => l.sound.speech === r.text))?.text;
  const candidates = [...document.querySelectorAll<HTMLElement>('[data-choice]')].map((el) => el.dataset.choice as string);
  return englishLetters.find((l) => l.sound.speech === text && candidates.includes(l.id))!;
};

describe('Phonics: discover', () => {
  it('distinguishes the letter name from the letter sound and plays each separately', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    expect(await screen.findByText('called')).toBeInTheDocument(); // "A is called “ay”, but it says /ă/"
    expect(screen.getByText('“ay”')).toBeInTheDocument();
    expect(screen.getAllByText('/ă/').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'Say the name' }));
    expect(audioLog.at(-1)?.text).toBe('ay');
    await user.click(screen.getByRole('button', { name: 'Play the sound' }));
    // the sound is heard inside its example word, never as a made-up respelling
    expect(audioLog.slice(-2).map((r) => r.text)).toEqual([SOUND_LEAD_IN, 'apple']);
    await user.click(screen.getByRole('button', { name: 'Hear the word' }));
    expect(audioLog.at(-1)?.text).toBe('apple');
    await user.click(screen.getByRole('button', { name: 'Hear all three' }));
    expect(audioLog.slice(-3).map((r) => r.text)).toEqual(['ay', SOUND_LEAD_IN, 'apple']);
  });

  it('switches letters from the grid', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await user.click(await screen.findByRole('button', { name: /^Letter M,/ }));
    expect(screen.getByText('“em”')).toBeInTheDocument();
    expect(screen.getAllByText('/m/').length).toBeGreaterThan(0);
  });
});

describe('Phonics: listen and choose', () => {
  it('plays the sound, gives kind feedback for a wrong pick, accepts the right pick and finishes a round', async () => {
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
      await user.click(screen.getByRole('button', { name: q === 4 ? 'Finish' : 'Next' }));
    }

    const summary = await screen.findByRole('region', { name: /Amazing|Great work|You did it/ });
    expect(summary).toBeInTheDocument();
    const saved = adapter.load() as { perActivity: { phonics: { answered: number; correct: number; completed: number } } };
    expect(saved.perActivity.phonics).toMatchObject({ answered: 6, correct: 5, completed: 1 });
    // the first question needed two tries => 4 of 5 on the first try
    expect(screen.getByText(/4 of 5 right on the first try/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(await screen.findByText('Which letter makes this sound?')).toBeInTheDocument();
  });

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
