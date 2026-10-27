import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { englishLetters } from '../../data/en/alphabet';
import { ENCOURAGE_LINES, PRAISE_LINES } from '../../lib/lessonLines';
import { audioLog } from '../../test/fakeAudio';
import { fakeRecognizers } from '../../test/fakeRecognizer';
import { order } from '../../test/order';
import { renderPlayLab } from '../../test/utils';

// Sound Discovery, the sounds tab, as a guided lesson: the teacher asks for a word with the sound, listening starts by itself, a
// listed word (or "B for ball") is praised and the next letter comes by itself, the letter's name alone is not the sound, and the
// child can always tap. The browser's recogniser is a fake (see docs/VOICE.md for what a real microphone does).

let fake: ReturnType<typeof fakeRecognizers>;
beforeEach(() => {
  fake = fakeRecognizers();
  order.length = 0;
  (window as unknown as Record<string, unknown>).SpeechRecognition = function SpeechRecognitionFake() {
    return fake.factory();
  };
});
afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition');
});

const instruction = () => screen.findByTestId('lesson-instruction');
const status = () => screen.getByTestId('lesson-status');
const soundQuestion = (upper: string) => `Say a word that has the sound of ${upper}. Say the sound, not the letter's name.`;

function hear(transcript: string) {
  act(() => {
    const session = fake.latest();
    session.begin();
    session.heard(transcript);
    session.end();
  });
}

const sayLine = (text: string) => order.indexOf(`say:${text}`);

describe('Sound Discovery: the sound question', () => {
  it('asks the sound question first, and listening starts by itself after the teacher has spoken', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    expect(await instruction()).toHaveTextContent(soundQuestion('A'));
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    expect(order.indexOf('mic on')).toBeGreaterThan(sayLine(soundQuestion('A')));
  });

  it('keeps the example word and its picture back until the child has answered', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await instruction();
    expect(screen.queryByText('apple')).toBeNull();
    expect(screen.queryByText(/says the sound in/)).toBeNull();
  });

  it('a listed sound word is praised, and the next letter’s question comes by itself', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('apple');
    expect(await screen.findByTestId('lesson-success')).toBeInTheDocument();
    expect(status()).toHaveTextContent(PRAISE_LINES[0]);
    // the example is shown once answered
    expect(screen.getByRole('img', { name: 'apple' })).toBeInTheDocument();
    expect(await screen.findByText(soundQuestion('B'), {}, { timeout: 4000 })).toBeInTheDocument();
  }, 10_000);

  it('"B for ball" is right for B, when ball is a listed word', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('A for apple');
    expect(await screen.findByTestId('lesson-success')).toBeInTheDocument();
  }, 10_000);

  it('the letter’s name alone is not the sound: it is kindly refused and the child tries again', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('ay');
    expect(await screen.findByText(ENCOURAGE_LINES[0], { exact: false })).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-success')).toBeNull();
  }, 10_000);

  it('an unrelated word is encouraged, and an unclear result is asked for again', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('dog');
    expect(await screen.findByText(ENCOURAGE_LINES[0], { exact: false })).toBeInTheDocument();
    await waitFor(() => expect(fake.made.filter((r) => r.started).length).toBeGreaterThanOrEqual(2));
    hear('one two three four');
    expect(await screen.findByText('Could you say that again?')).toBeInTheDocument();
  }, 10_000);

  it('three wrong words teach the sound together, and the lesson moves on without a reward', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(fake.latest()?.started).toBe(true));
      hear('dog');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
    }
    expect(await screen.findByText('A says the sound in apple. Let’s learn it together!')).toBeInTheDocument();
    expect(await screen.findByText(soundQuestion('B'), {}, { timeout: 4000 })).toBeInTheDocument();
  }, 15_000);

  it('the teacher’s question is finished before the microphone turns on, so it is never heard as the answer', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    const micOn = order.indexOf('mic on');
    expect(micOn).toBeGreaterThan(sayLine(soundQuestion('A')));
    expect(order.slice(micOn + 1).find((x) => x.startsWith('say:'))).toBeUndefined();
  });

  it('the replay says the letter’s name, never the example word, so it cannot give the answer away', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    // the replay is off while the microphone is on, so the child stops listening first
    await user.click(await screen.findByRole('button', { name: 'Stop listening' }));
    await user.click(await screen.findByRole('button', { name: 'Hear the sound' }));
    const last = audioLog.at(-1)?.text;
    expect(last).toBe(englishLetters[0]!.nameSpeech);
    expect(audioLog.some((r) => r.text === 'apple' && r !== audioLog.at(-1))).toBe(false);
  });

  it('tapping a letter in the grid asks that letter’s question', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await user.click(await screen.findByRole('button', { name: /^Letter M,/ }));
    expect(await instruction()).toHaveTextContent(soundQuestion('M'));
    const stage = screen.getByRole('region', { name: /About the letter M/ });
    expect(within(stage).queryByText('mango')).toBeNull();
  });

  it('without a microphone (an insecure page), the sound lesson is a tap lesson: Next letter moves on', async () => {
    const secure = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    try {
      const { user } = renderPlayLab({ initialActivity: 'phonics' });
      await user.click(await screen.findByRole('button', { name: 'Next letter' }));
      expect(await instruction()).toHaveTextContent(soundQuestion('B'));
      expect(fake.made.filter((r) => r.started)).toHaveLength(0);
    } finally {
      Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
    }
  });
});
