import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayLabContext, type PlayLabContextValue } from '../app/PlayLabContext';
import { letterNameTask } from '../services/speechInput/tasks';
import { createFakeAudio } from '../test/fakeAudio';
import { fakeRecognizers } from '../test/fakeRecognizer';
import { order } from '../test/order';
import { VoiceTaskPanel } from './VoiceTaskPanel';

// The panel is the child's "Your turn" question. Its recogniser is a fake, so these tests show what the panel does with each
// result: where focus goes, what is switched off while the child speaks, and that nothing is left listening.

const bee = letterNameTask({ id: 'b', name: 'bee' });

beforeEach(() => {
  order.length = 0;
});

function setup() {
  const fake = fakeRecognizers();
  const audio = createFakeAudio();
  const onListeningChange = vi.fn<(listening: boolean) => void>();
  const value = { content: { language: 'en' }, audio, soundEnabled: true } as unknown as PlayLabContextValue;
  const wrapper = ({ children }: { children: ReactNode }) => <PlayLabContext.Provider value={value}>{children}</PlayLabContext.Provider>;
  const view = render(
    <VoiceTaskPanel
      task={bee}
      prompt="Say the letter's name."
      playModel={() => audio.play({ text: 'bee' })}
      createRecognizer={fake.factory}
      onListeningChange={onListeningChange}
    />,
    { wrapper },
  );
  return { ...view, fake, audio, onListeningChange, user: userEvent.setup() };
}

const panel = () => screen.getByRole('region', { name: 'Your turn' });
const status = () => within(panel()).getByRole('status');
const speakNow = () => within(panel()).getByRole('button', { name: 'Speak now' });
const stopButton = () => within(panel()).getByRole('button', { name: 'Stop' });
const tryAgain = () => within(panel()).getByRole('button', { name: 'Try again' });
const listenAgain = () => within(panel()).getByRole('button', { name: 'Listen again' });

/** one listening attempt: the browser starts, hears the words, and finishes */
function hear(fake: ReturnType<typeof fakeRecognizers>, transcript: string) {
  act(() => {
    fake.latest().begin();
    fake.latest().heard(transcript);
    fake.latest().end();
  });
}

describe('VoiceTaskPanel: on a page that is not secure, the words say why, and there is no button that cannot work', () => {
  const secureBefore = window.isSecureContext;
  afterEach(() => Object.defineProperty(window, 'isSecureContext', { value: secureBefore, configurable: true }));

  it('shows no Speak now button, names the address to use, and still offers the letters', () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    setup();
    expect(screen.queryByRole('button', { name: 'Speak now' })).toBeNull();
    expect(status()).toHaveTextContent("Speaking can't work on this address");
    expect(status()).toHaveTextContent('http://localhost:5173');
  });
});

describe('VoiceTaskPanel: focus stays where the child can use it', () => {
  it('after Speak now, focus is on Stop, the same button, while the microphone starts and listens', async () => {
    const { user, fake } = setup();
    await user.click(speakNow());
    act(() => fake.latest().begin());
    expect(stopButton()).toHaveFocus();
  });

  it('after a correct answer, focus moves to the words, since no button is left to use', async () => {
    const { user, fake } = setup();
    await user.click(speakNow());
    hear(fake, 'bee');
    expect(status()).toHaveTextContent("Yes! That's “bee”.");
    expect(status()).toHaveFocus();
  });

  it('after an incorrect answer, focus is on Try again', async () => {
    const { user, fake } = setup();
    await user.click(speakNow());
    hear(fake, 'dog');
    expect(tryAgain()).toHaveFocus();
  });

  it('after nothing is heard, focus is on Try again', async () => {
    const { user, fake } = setup();
    await user.click(speakNow());
    act(() => {
      fake.latest().begin();
      fake.latest().end();
    });
    expect(tryAgain()).toHaveFocus();
  });

  it('a retry puts focus on Stop again, and a correct answer after it moves focus to the words', async () => {
    const { user, fake } = setup();
    await user.click(speakNow());
    hear(fake, 'dog');
    await user.click(tryAgain());
    act(() => fake.latest().begin());
    expect(stopButton()).toHaveFocus();
    hear(fake, 'bee');
    expect(status()).toHaveFocus();
  });
});

describe('VoiceTaskPanel: nothing is said over the child while the microphone is on', () => {
  it('Listen again is off while listening, and on again once listening stops', async () => {
    const { user, fake } = setup();
    expect(listenAgain()).toBeEnabled();
    await user.click(speakNow());
    act(() => fake.latest().begin());
    expect(listenAgain()).toBeDisabled();
    await user.click(stopButton());
    expect(listenAgain()).toBeEnabled();
  });

  it('the page is told while the microphone is on, and told it is off again when listening stops', async () => {
    const { user, fake, onListeningChange } = setup();
    await user.click(speakNow());
    act(() => fake.latest().begin());
    expect(onListeningChange).toHaveBeenLastCalledWith(true);
    await user.click(stopButton());
    expect(onListeningChange).toHaveBeenLastCalledWith(false);
  });

  it("the app's own speech stops listening first, and nothing it says is heard as the answer", async () => {
    const { user, fake, audio } = setup();
    await user.click(speakNow());
    act(() => fake.latest().begin());
    const listening = fake.latest();
    const mark = order.length;
    act(() => {
      void audio.play({ text: 'bee' });
    });
    expect(order.slice(mark)).toEqual(['mic off', 'say:bee']);
    expect(listening.aborted).toBe(true);
    act(() => {
      listening.heard('bee');
      listening.end();
    });
    expect(status()).not.toHaveTextContent('Yes!');
    expect(speakNow()).toBeInTheDocument();
  });

  it('a question that goes away while the child is listening turns the microphone off and tells the page it is off', async () => {
    const { user, fake, onListeningChange, unmount } = setup();
    await user.click(speakNow());
    act(() => fake.latest().begin());
    const listening = fake.latest();
    unmount();
    expect(listening.aborted).toBe(true);
    expect(onListeningChange, 'the page is not left thinking the microphone is on').toHaveBeenLastCalledWith(false);
  });
});
