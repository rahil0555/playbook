import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createEmptySnapshot } from '../services/progressService';
import type { ActivityId, ProgressAdapter, ProgressSnapshot } from '../types/learning';
import type { PlayLabProps } from '../types/api';
import { renderPlayLab } from '../test/utils';

/** A child who has already finished `rounds` gated rounds: the free allowance is spent, Letter Playground is not. */
function spentRounds(rounds: number): ProgressSnapshot {
  const snap = createEmptySnapshot();
  snap.activitiesCompleted = rounds;
  snap.perActivity.phonics = { started: rounds, completed: rounds, answered: 12, correct: 12, firstTryCorrect: 0, bestStars: 3 };
  return snap;
}

function spentAdapter(rounds = 3): ProgressAdapter {
  const snap = spentRounds(rounds);
  return { load: () => snap, save: () => undefined };
}

/** Exactly one PlayLab per test: all queries stay unambiguous. */
function renderUsedUp(rounds = 3, props: Partial<PlayLabProps> = {}) {
  return renderPlayLab({ ...props, progressAdapter: props.progressAdapter ?? spentAdapter(rounds) });
}

/** The home-screen activity card is a button; its title is a span inside it. */
async function openCard(title: string) {
  // the home screen is a lazy chunk: the first test to touch it pays the import, so allow the settled budget
  const title_ = await screen.findByText(title, { selector: 'span' }, SETTLED);
  return title_.closest('button') as HTMLElement;
}

/** The wall's own heading (the panel is a labelled dialog). */
const WALL_NAME = /free play pause/i;

/**
 * Each activity screen is its own lazy-loaded chunk (app/routes.tsx). The FIRST test to touch a
 * given chunk pays the import cost, which can exceed the 1s default of the async queries.
 */
const SETTLED = { timeout: 15_000 } as const;

/** Read the parent sum out of the wall, so the test never guesses the numbers. */
function readSum(dialog: HTMLElement): number {
  const label = within(dialog).getByText(/What is \d+ \+ \d+\?/).textContent ?? '';
  const [, a, b] = label.match(/(\d+) \+ (\d+)/) ?? [];
  return Number(a) + Number(b);
}

describe('paywall', () => {
  it('lets a fresh child open a premium activity with no wall', async () => {
    const { user } = renderPlayLab();
    await user.click(await openCard('Sound Discovery'));
    expect(await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ }, SETTLED)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('after the free rounds are used up the wall appears instead of the activity', async () => {
    const onUpgradeRequest = vi.fn();
    const { user, container } = renderUsedUp(3, { onUpgradeRequest, paywall: { phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' } } });
    await user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAccessibleName(WALL_NAME);
    // the child is NOT taken into the paid screen: he stays on the free Home screen behind the wall
    expect(container.querySelector('main h1')).toHaveTextContent(/Hello/);
    expect(container.querySelector('[data-paywall]')).not.toBeNull();
    expect(onUpgradeRequest).toHaveBeenCalledTimes(1);
    expect(onUpgradeRequest.mock.calls[0]?.[0]).toMatchObject({ view: 'phonics', used: 12, free: 12, unit: 'sound' });
  });

  it('marks every gated card as locked, and leaves the free one open', async () => {
    const snapshot = spentRounds(3);
    snapshot.exploredLetters = Array.from('abcdefghijkl');
    snapshot.perActivity['word-builder'] = { started: 4, completed: 4, answered: 16, correct: 16, firstTryCorrect: 16, bestStars: 3 };
    snapshot.perActivity.sentences = { started: 4, completed: 4, answered: 4, correct: 4, firstTryCorrect: 4, bestStars: 3 };
    snapshot.perActivity.matching = { started: 2, completed: 2, answered: 0, correct: 0, firstTryCorrect: 0, bestStars: 3 };
    const { container } = renderPlayLab({ progressAdapter: { load: () => snapshot, save: () => undefined } });
    await screen.findByRole('heading', { level: 1, name: /Hello/ });
    for (const id of ['alphabet', 'phonics', 'word-builder', 'sentences', 'matching'] as ActivityId[]) {
      expect(container.querySelector(`[data-activity="${id}"][data-locked="true"]`)).not.toBeNull();
    }
  });

  it('still opens the free activity when the allowance is spent', async () => {
    const { user } = renderUsedUp(12);
    await user.click(await openCard('Letter Playground'));
    expect(await screen.findByRole('heading', { level: 1, name: /Letter Playground/ }, SETTLED)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the parent answer unlocks, the wall closes and the child lands in the activity they wanted', async () => {
    const { user } = renderUsedUp(3);
    await user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/What is \d+ \+ \d+\?/), String(readSum(dialog)));
    await user.click(within(dialog).getByRole('button', { name: 'Unlock everything' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ }, SETTLED)).toBeInTheDocument();
  });

  it('once unlocked, no other activity is gated any more', async () => {
    const { user, container } = renderUsedUp(3);
    await user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/What is \d+ \+ \d+\?/), String(readSum(dialog)));
    await user.click(within(dialog).getByRole('button', { name: 'Unlock everything' }));
    await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ }, SETTLED);
    await user.click(screen.getByRole('button', { name: 'Back to home' }));
    await screen.findByRole('heading', { level: 1, name: /Hello/ });
    expect(container.querySelector('[data-locked="true"]')).toBeNull();
    await user.click(await openCard('Match & Play'));
    expect(await screen.findByRole('heading', { level: 1, name: /Match & Play/ }, SETTLED)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a wrong parent answer keeps the wall open, explains itself and never unlocks', async () => {
    const { user } = renderUsedUp(3, { paywall: { phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' } } });
    await user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/What is \d+ \+ \d+\?/), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Unlock everything' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/not quite right/i);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('the host can skip the gate entirely', async () => {
    const { user } = renderUsedUp(20, { unlocked: true });
    await user.click(await openCard('Sound Discovery'));
    expect(await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('"Not now" closes the wall and returns the child to Home', async () => {
    const { user } = renderUsedUp(3, { paywall: { phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' } } });
    await user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /Not now/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByRole('heading', { level: 1, name: /Hello/ })).toBeInTheDocument();
  });

  it('honours a host policy that makes a different activity free', async () => {
    const { user } = renderUsedUp(5, { paywall: { phonics: { free: 13, spentOn: 'letters-answered', noun: 'sound' } } });
    await user.click(await openCard('Sound Discovery'));
    expect(await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ }, SETTLED)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a labelled modal dialog and moves focus into it', async () => {
    const { user } = renderUsedUp(3);
    await user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName(WALL_NAME);
    // keyboard and screen-reader users are not left behind the wall
    expect(dialog).toHaveFocus();
  });

  it('Escape closes the wall and returns the child to Home', async () => {
    const { user } = renderUsedUp(3, { paywall: { phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' } } });
    await user.click(await openCard('Sound Discovery'));
    await screen.findByRole('dialog');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await screen.findByRole('heading', { level: 1, name: /Hello/ })).toBeInTheDocument();
  });

  it('remembers the parent unlock across a reload', async () => {
    const first = renderUsedUp(3, { paywall: { phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' } } });
    await first.user.click(await openCard('Sound Discovery'));
    const dialog = await screen.findByRole('dialog');
    await first.user.type(within(dialog).getByLabelText(/What is \d+ \+ \d+\?/), String(readSum(dialog)));
    await first.user.click(within(dialog).getByRole('button', { name: 'Unlock everything' }));
    await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ }, SETTLED);
    // the demo unlock is on the device (localStorage), so it survives the page being replaced
    first.unmount();

    const second = renderUsedUp(3, { paywall: { phonics: { free: 12, spentOn: 'letters-answered', noun: 'sound' } } });
    await second.user.click(await openCard('Sound Discovery'));
    expect(await screen.findByRole('heading', { level: 1, name: /Sound Discovery/ }, SETTLED)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
