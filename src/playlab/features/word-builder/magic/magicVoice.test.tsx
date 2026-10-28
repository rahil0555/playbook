import { act, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VOICE_MESSAGES } from '../../../services/speechInput/evaluate';
import { fakeRecognizers } from '../../../test/fakeRecognizer';
import { renderPlayLab } from '../../../test/utils';
import type { ActivityCompletion, AnswerResult } from '../../../types/learning';

// A one-word round: its Finish is the round's own completion, so the test can count it.
const round = vi.hoisted(() => ({ order: [] as string[] }));
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => round.order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

type FakeBrowser = ReturnType<typeof fakeRecognizers>;
let fake: FakeBrowser;

// The browser's own constructor is replaced, so the app's real detection and listening path run against the fake.
beforeEach(() => {
  round.order = ['cat'];
  fake = fakeRecognizers();
  (window as unknown as Record<string, unknown>).SpeechRecognition = function SpeechRecognitionFake() {
    return fake.factory();
  };
});
afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
});

async function openRound() {
  const onAnswerSubmit = vi.fn<(result: AnswerResult) => void>();
  const onActivityComplete = vi.fn<(completion: ActivityCompletion) => void>();
  const utils = renderPlayLab({ initialActivity: 'word-builder', onAnswerSubmit, onActivityComplete });
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 });
  await screen.findAllByLabelText(/^Slot \d, empty/);
  // the microphone appears only after the browser's support check has run, which can be a moment after the slots
  await screen.findByRole('button', { name: 'Speak answer' }, { timeout: 5000 });
  return { ...utils, onAnswerSubmit, onActivityComplete };
}

const speakButton = () => screen.getByRole('button', { name: 'Speak answer' });
const realTile = (value: string) => [...document.querySelectorAll<HTMLElement>(`[data-magic-tile][data-value="${value}"]`)].find((t) => t.dataset.decoy === 'false')!;
const slot = (i: number) => document.querySelector<HTMLElement>(`[data-magic-slot="${i}"]`)!;

/** the browser hears one phrase and finishes: the final transcript, then the end of the session */
function hear(transcript: string, confidence?: number) {
  act(() => {
    const session = fake.latest();
    session.begin();
    session.heard(transcript, confidence);
    session.end();
  });
}

describe('Magic Letters: a spoken answer', () => {
  it('a correct word is spelled out and recorded once as a correct answer; Finish completes the round once', async () => {
    const { user, onAnswerSubmit, onActivityComplete } = await openRound();
    await user.click(speakButton());
    hear('Cat.');

    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
    expect(onAnswerSubmit.mock.calls[0]![0]).toMatchObject({ activityId: 'word-builder', correct: true, attempt: 1, response: 'cat', expected: 'cat' });

    // the round's only word is the last one: its summary comes by itself after the celebration
    expect(await screen.findByRole('region', { name: 'Amazing!' }, { timeout: 5000 })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledTimes(1);
  });

  it('a wrong word is one attempt with the retry feedback, and the letters still work by tap', async () => {
    const { user, onAnswerSubmit, onActivityComplete } = await openRound();
    await user.click(speakButton());
    hear('dog');

    expect(await screen.findByText(VOICE_MESSAGES.wrong)).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
    expect(onAnswerSubmit.mock.calls[0]![0]).toMatchObject({ correct: false, attempt: 1, response: 'dog', expected: 'cat' });

    // the same letters, by tap-tap: the word is still spelled through the existing path
    for (const [i, letter] of ['c', 'a', 't'].entries()) {
      await user.click(realTile(letter));
      await user.click(slot(i));
    }
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    expect(onAnswerSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ correct: true, attempt: 2, response: 'cat' }));

    // one word, not spelled first time: the summary is the round's own, and it is recorded once
    expect(await screen.findByRole('region', { name: 'You did it!' }, { timeout: 5000 })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledTimes(1);
  });

  it('an empty session is not an attempt: the child is asked to say it again', async () => {
    const { user, onAnswerSubmit } = await openRound();
    await user.click(speakButton());
    act(() => {
      fake.latest().begin();
      fake.latest().end();
    });
    expect(await screen.findByText(VOICE_MESSAGES.noSpeech)).toBeInTheDocument();
    expect(onAnswerSubmit).not.toHaveBeenCalled();
  });

  it('a refused microphone is not an attempt, and the letters stay usable', async () => {
    const { user, onAnswerSubmit } = await openRound();
    await user.click(speakButton());
    act(() => fake.latest().fail('not-allowed'));
    expect(await screen.findByText(/The browser did not get to use the microphone/)).toBeInTheDocument();
    expect(onAnswerSubmit).not.toHaveBeenCalled();
    expect(realTile('c')).toBeInTheDocument();
  });

  it('a network error is not an attempt', async () => {
    const { user, onAnswerSubmit } = await openRound();
    await user.click(speakButton());
    act(() => fake.latest().fail('network'));
    expect(await screen.findByText(VOICE_MESSAGES.network)).toBeInTheDocument();
    expect(onAnswerSubmit).not.toHaveBeenCalled();
  });

  it('a transcript too unsure to judge asks for a repeat and uses no attempt', async () => {
    const { user, onAnswerSubmit } = await openRound();
    await user.click(speakButton());
    hear('dog', 0.1);
    expect(await screen.findByText(VOICE_MESSAGES.lowConfidence)).toBeInTheDocument();
    expect(onAnswerSubmit).not.toHaveBeenCalled();
  });

  it('a stopped session submits nothing', async () => {
    const { user, onAnswerSubmit } = await openRound();
    await user.click(speakButton());
    act(() => fake.latest().begin());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(fake.latest().aborted).toBe(true);
    expect(await screen.findByRole('button', { name: 'Speak answer' })).toBeInTheDocument();
    expect(onAnswerSubmit).not.toHaveBeenCalled();
  });

  it('a duplicate transcript from one session submits once, and a late result from a finished session is ignored', async () => {
    const { user, onAnswerSubmit, onActivityComplete } = await openRound();
    await user.click(speakButton());
    act(() => {
      fake.latest().begin();
      fake.latest().heard('cat');
      fake.latest().heard('cat');
      fake.latest().end();
    });
    expect(await screen.findByText(/You spelled/, {}, { timeout: 5000 })).toBeInTheDocument();
    act(() => fake.latest().heard('dog'));
    expect(onAnswerSubmit).toHaveBeenCalledTimes(1);
    expect(onAnswerSubmit.mock.calls[0]![0]).toMatchObject({ correct: true, attempt: 1 });
    // once the word is spelled the microphone is not offered, so a second answer cannot start
    expect(screen.queryByRole('button', { name: 'Speak answer' })).toBeNull();
    expect(await screen.findByRole('region', { name: 'Amazing!' }, { timeout: 5000 })).toBeInTheDocument();
    expect(onActivityComplete).toHaveBeenCalledTimes(1);
  });
});
