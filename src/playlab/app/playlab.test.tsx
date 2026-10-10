import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PlayLab } from './PlayLab';
import { createMemoryAdapter, createEmptySnapshot } from '../services/progressService';
import type { PlayLabView, ProgressAdapter } from '../types/learning';
import { renderPlayLab } from '../test/utils';

describe('Navigation', () => {
  it('opens every activity from home and returns home from each', async () => {
    const { user } = renderPlayLab();
    expect(await screen.findByRole('heading', { level: 1, name: /Hello, explorer/ })).toBeInTheDocument();
    const cases: [string, RegExp][] = [
      ['Letter Playground', /Letter Playground/],
      ['Sound Discovery', /Sound Discovery/],
      ['Word Builder', /Word Builder/],
      ['Sentence Fun', /Sentence Fun/],
      ['Match & Play', /Match & Play/],
    ];
    for (const [title, heading] of cases) {
      await user.click((await screen.findByText(title, { selector: 'span' })).closest('button')!);
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Back to home' }));
      expect(await screen.findByRole('heading', { level: 1, name: /Hello, explorer/ })).toBeInTheDocument();
    }
  });

  it('has a working My Stars screen and header navigation', async () => {
    const { user } = renderPlayLab();
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'My Stars' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'My Stars' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: 'Edurance PlayLab, go to home' }));
    expect(await screen.findByRole('heading', { level: 1, name: /Hello/ })).toBeInTheDocument();
  });

  it('opens straight to initialActivity', async () => {
    renderPlayLab({ initialActivity: 'word-builder' });
    expect(await screen.findByRole('heading', { level: 1, name: 'Word Builder' })).toBeInTheDocument();
  });

  it('supports controlled navigation (host mirrors the screen in its own URL)', async () => {
    const seen: PlayLabView[] = [];
    function Host() {
      const [view, setView] = useState<PlayLabView>('home');
      return <PlayLab view={view} onViewChange={(v) => (seen.push(v), setView(v))} progressAdapter={createMemoryAdapter()} />;
    }
    const user = userEvent.setup();
    render(<Host />);
    await user.click(await screen.findByRole('button', { name: 'My Stars' }));
    expect(seen).toEqual(['progress']);
    expect(await screen.findByRole('heading', { level: 1, name: 'My Stars' })).toBeInTheDocument();
  });

  it('shows "Back to Edurance" only when the host provides onExit, and calls it', async () => {
    const { unmount } = renderPlayLab();
    await screen.findByRole('heading', { level: 1, name: /Hello/ });
    expect(screen.queryByRole('button', { name: 'Back to Edurance' })).toBeNull();
    unmount();
    const onExit = vi.fn();
    const { user } = renderPlayLab({ onExit });
    await user.click(await screen.findByRole('button', { name: 'Back to Edurance' }));
    expect(onExit).toHaveBeenCalledTimes(1);
  });
});

describe('Configuration', () => {
  it('greets a learner by display name', async () => {
    renderPlayLab({ learner: { id: 'abc', displayName: 'Maya' } });
    expect(await screen.findByRole('heading', { level: 1, name: /Hello, Maya!/ })).toBeInTheDocument();
  });

  it('level="starter" limits words to 3 letters, shows guide letters, and hides the level picker', async () => {
    const { user } = renderPlayLab({ initialActivity: 'word-builder', level: 'starter' });
    await screen.findByText('Spell the word (3 letters)');
    expect(document.querySelectorAll('[data-slot]')).toHaveLength(3);
    const guides = [...document.querySelectorAll('[data-slot] > span[aria-hidden="true"]')];
    expect(guides).toHaveLength(3); // faint guide letters in empty slots
    await user.click(screen.getByRole('button', { name: 'Settings' }));
    expect(screen.queryByRole('radio', { name: /Starter/ })).toBeNull();
  });

  it('lets the child change level in settings when the host does not lock it', async () => {
    const { user } = renderPlayLab({ initialActivity: 'word-builder' });
    await user.click(await screen.findByRole('button', { name: 'Settings' }));
    await user.click(screen.getByRole('radio', { name: /Starter/ }));
    await screen.findByText('Spell the word (3 letters)');
  });

  it('applies a custom brand colour as CSS variables, and forced reduced motion as a data attribute', async () => {
    const { container } = renderPlayLab({ theme: { brandColor: '#3366cc', motion: 'reduce' } });
    await screen.findByRole('heading', { level: 1, name: /Hello/ });
    const root = container.querySelector<HTMLElement>('[data-playlab]')!;
    expect(root.style.getPropertyValue('--pl-brand-500')).toBe('51 102 204');
    expect(root).toHaveAttribute('data-motion', 'reduce');
  });

  it('does not set brand variables for the default colour', async () => {
    const { container } = renderPlayLab();
    await screen.findByRole('heading', { level: 1, name: /Hello/ });
    expect(container.querySelector<HTMLElement>('[data-playlab]')!.getAttribute('style') ?? '').not.toContain('--pl-brand');
  });

  it('toggles sound from the header and tells assistive tech the state', async () => {
    const { user } = renderPlayLab();
    const btn = await screen.findByRole('button', { name: /Sound is on/ });
    await user.click(btn);
    expect(await screen.findByRole('button', { name: /Sound is off/ })).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to English for an unknown language', async () => {
    renderPlayLab({ language: 'zz', initialActivity: 'alphabet' });
    expect(await screen.findByRole('button', { name: /^Letter A,/ })).toBeInTheDocument();
  });

  it('a throwing host callback never breaks the activity', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { user } = renderPlayLab({
      initialActivity: 'alphabet',
      onActivityComplete: () => {
        throw new Error('host bug');
      },
    });
    for (const l of 'abcde') await user.click(await screen.findByRole('button', { name: new RegExp(`^Letter ${l.toUpperCase()},`) }));
    expect(await screen.findByText(/5 letters found/)).toBeInTheDocument();
    err.mockRestore();
  });
});

describe('Progress', () => {
  it('updates session and lifetime numbers after playing, and shows the finished round under recent', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    for (const l of 'abcde') await user.click(await screen.findByRole('button', { name: new RegExp(`^Letter ${l.toUpperCase()},`) }));
    await user.click(screen.getByRole('button', { name: 'My Stars' }));
    await screen.findByRole('heading', { level: 1, name: 'My Stars' });
    expect(screen.getByTestId('session-rounds-finished')).toHaveTextContent('1');
    expect(screen.getByTestId('session-stars-earned')).toHaveTextContent('3');
    const recent = screen.getByRole('region', { name: 'Recently finished' });
    expect(within(recent).getByText('Letter Playground')).toBeInTheDocument();
    expect(screen.getByText(/Letters found 5\/26/)).toBeInTheDocument();
  });

  it('persists across a remount through the progress adapter (browser refresh)', async () => {
    const adapter = createMemoryAdapter();
    const first = renderPlayLab({ initialActivity: 'alphabet', progressAdapter: adapter });
    for (const l of 'abcde') await first.user.click(await screen.findByRole('button', { name: new RegExp(`^Letter ${l.toUpperCase()},`) }));
    first.unmount();
    const second = renderPlayLab({ initialActivity: 'progress', progressAdapter: adapter });
    await screen.findByRole('heading', { level: 1, name: 'My Stars' });
    const allTime = screen.getByRole('region', { name: 'All time' });
    expect(within(allTime).getByText('Rounds finished').previousSibling).toHaveTextContent('1');
    // but this visit's session numbers start fresh
    expect(screen.getByTestId('session-rounds-finished')).toHaveTextContent('0');
    second.unmount();
  });

  it('works with a slow async adapter (queues events until loaded)', async () => {
    let finish!: (v: ReturnType<typeof createEmptySnapshot> | null) => void;
    const saved: unknown[] = [];
    const adapter: ProgressAdapter = { load: () => new Promise((r) => (finish = r)), save: (s) => void saved.push(s) };
    const { user } = renderPlayLab({ initialActivity: 'alphabet', progressAdapter: adapter });
    await user.click(await screen.findByRole('button', { name: /^Letter A,/ }));
    expect(saved).toHaveLength(0); // nothing is lost, nothing is overwritten before load finishes
    await act(async () => finish({ ...createEmptySnapshot(), stars: 9 }));
    expect(saved.length).toBeGreaterThan(0);
    expect((saved.at(-1) as { stars: number; exploredLetters: string[] }).stars).toBe(9);
    expect((saved.at(-1) as { exploredLetters: string[] }).exploredLetters).toEqual(['a']);
  });

  it('"Start over" asks first, then clears progress', async () => {
    const adapter = createMemoryAdapter({ ...createEmptySnapshot(), stars: 12 });
    const { user } = renderPlayLab({ initialActivity: 'progress', progressAdapter: adapter });
    await screen.findByRole('heading', { level: 1, name: 'My Stars' });
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    await user.click(screen.getByRole('button', { name: 'Keep my stars' }));
    expect(adapter.load()).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Start over' }));
    await user.click(screen.getByRole('button', { name: 'Yes, start over' }));
    expect(adapter.load()).toBeNull();
  });
});
