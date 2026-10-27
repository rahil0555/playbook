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
    // Letter Explorer badge toast appears. In jsdom it reaches the page about 2.8 s after the last letter is saved (measured
    // 2.75-2.84 s over three runs), so the wait is longer than the default 1 s. The toast stays up for 5 s, so it is still found.
    expect(await screen.findByText('Letter Explorer', {}, { timeout: 8000 })).toBeInTheDocument();
  }, 40_000);

  it('plays a tone on tap, then the teacher gives the letter’s instruction, and never needs audio to animate or select', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await user.click(await tile('b'));
    expect(sfxLog).toContain('pop');
    expect(audioLog.some((r) => r.text === 'Say B for ball!')).toBe(true);
    expect(await screen.findByTestId('lesson-instruction')).toHaveTextContent('Say B for ball!');
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

  it('tapping the same letter again keeps it selected and starts its lesson again', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await user.click(await tile('e'));
    await user.click(await tile('e'));
    expect(await tile('e')).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByTestId('lesson-instruction')).toHaveTextContent('Say E for egg!');
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

  it('opens on A with the teacher’s instruction shown as text, so the lesson can be followed without hearing it', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    expect(await screen.findByTestId('lesson-instruction')).toHaveTextContent('Say A for apple!');
  });
});
