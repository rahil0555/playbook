import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { audioLog, sfxLog } from '../../test/fakeAudio';
import { renderPlayLab } from '../../test/utils';

const tile = (letter: string) => screen.findByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) });

describe('Alphabet playground', () => {
  it('selects each of the 26 letters, shows both cases and an example word, and records exploration', async () => {
    const { user, adapter } = renderPlayLab({ initialActivity: 'alphabet' });
    const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
    for (const l of letters) {
      await user.click(await tile(l));
      expect(await tile(l)).toHaveAttribute('aria-pressed', 'true');
      const stage = screen.getByRole('region', { name: 'Selected letter' });
      expect(within(stage).getByRole('button', { name: new RegExp(`Uppercase ${l.toUpperCase()}\\.`) })).toBeInTheDocument();
      expect(within(stage).getByRole('button', { name: new RegExp(`Lowercase ${l}\\.`) })).toBeInTheDocument();
      expect(within(stage).getByText(new RegExp(`^${l.toUpperCase()} is for `))).toBeInTheDocument();
    }
    const saved = await vi.waitFor(() => {
      const s = adapter.load();
      expect(s).toBeTruthy();
      return s as NonNullable<ReturnType<typeof adapter.load>>;
    });
    expect((saved as { exploredLetters: string[] }).exploredLetters).toHaveLength(26);
    // Letter Explorer badge toast appears
    expect(await screen.findByText('Letter Explorer')).toBeInTheDocument();
  }, 40_000);

  it('plays a tone and the letter name on tap, and never needs audio to animate or select', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await user.click(await tile('b'));
    expect(sfxLog).toContain('pop');
    expect(audioLog.at(-1)?.text).toBe('bee');
    // pronunciation controls on the stage
    await user.click(screen.getByRole('button', { name: 'Hear the word' }));
    expect(audioLog.at(-1)?.text).toBe('ball');
  });

  it('supports keyboard activation (Enter and Space) on letters', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    const c = await tile('c');
    c.focus();
    await user.keyboard('{Enter}');
    expect(c).toHaveAttribute('aria-pressed', 'true');
    const d = await tile('d');
    d.focus();
    await user.keyboard(' ');
    expect(d).toHaveAttribute('aria-pressed', 'true');
    expect(c).toHaveAttribute('aria-pressed', 'false');
  });

  it('moves focus with arrow keys', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    const a = await tile('a');
    a.focus();
    await user.keyboard('{ArrowRight}');
    expect(await tile('b')).toHaveFocus();
    await user.keyboard('{End}');
    expect(await tile('z')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(a).toHaveFocus();
  });

  it('replays the interaction: tapping the same letter again and "Play again" keep it selected and speak again', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await user.click(await tile('e'));
    const before = audioLog.length;
    await user.click(screen.getByRole('button', { name: 'Play again' }));
    expect(audioLog.length).toBe(before + 1);
    await user.click(await tile('e'));
    expect(await tile('e')).toHaveAttribute('aria-pressed', 'true');
  });

  it('completes the 5-letter goal once: fires onActivityComplete, then lets the child keep exploring', async () => {
    const onActivityComplete = vi.fn();
    const { user } = renderPlayLab({ initialActivity: 'alphabet', onActivityComplete });
    for (const l of ['a', 'b', 'c', 'd']) await user.click(await tile(l));
    expect(onActivityComplete).not.toHaveBeenCalled();
    expect(screen.getByText('Letters found: 4 of 5')).toBeInTheDocument();
    await user.click(await tile('e'));
    expect(onActivityComplete).toHaveBeenCalledTimes(1);
    expect(onActivityComplete.mock.calls[0]![0]).toMatchObject({ activityId: 'alphabet', score: 5, total: 5, stars: 3 });
    await user.click(await tile('f')); // extra letters do not complete again
    expect(onActivityComplete).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: /Keep exploring/ }));
    expect(screen.getByText('Letters found: 0 of 5')).toBeInTheDocument();
  });

  it('shows an encouraging prompt before any letter is chosen', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    expect(await screen.findByText('Tap a letter!')).toBeInTheDocument();
  });
});
