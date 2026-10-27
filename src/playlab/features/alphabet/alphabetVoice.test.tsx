import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sfxLog } from '../../test/fakeAudio';
import { fakeRecognizers } from '../../test/fakeRecognizer';
import { order } from '../../test/order';
import { renderPlayLab } from '../../test/utils';

// Letter Playground: tap a letter, then speak its name. The browser's recogniser is replaced by a fake, so these tests show what
// the app does with each result. They do not show what a real microphone hears (see docs/VOICE.md).

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

const stage = () => screen.getByRole('region', { name: 'Selected letter' });
const panel = () => screen.getByRole('region', { name: 'Your turn' });
const tile = (letter: string) => screen.findByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) });
const speakNow = () => screen.getByRole('button', { name: 'Speak now' });
const status = () => within(screen.getByRole('region', { name: 'Your turn' })).getByRole('status');

/** one listening attempt: the browser starts, hears the words, and finishes */
function hear(transcript: string) {
  act(() => {
    const session = fake.latest();
    session.begin();
    session.heard(transcript);
    session.end();
  });
}

async function openLetter(letter: string, user: ReturnType<typeof renderPlayLab>['user']) {
  await user.click(await tile(letter));
  return screen.findByRole('region', { name: 'Your turn' });
}

describe('Letter Playground: on a page that is not secure, the letters still work and the page says why', () => {
  const secureBefore = window.isSecureContext;
  afterEach(() => Object.defineProperty(window, 'isSecureContext', { value: secureBefore, configurable: true }));

  it('offers no Speak now button, explains the address, and tapping a letter still shows it', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    expect(screen.queryByRole('button', { name: 'Speak now' })).toBeNull();
    expect(status()).toHaveTextContent("Speaking can't work on this address");
    await user.click(await tile('c'));
    expect(stage()).toHaveTextContent('C is for cat');
  });
});

describe('Letter Playground: say the letter name', () => {
  it('a correct spoken name is praised, and progress does not change (the letter was already found by tapping it)', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    expect(screen.getByText(/1 of 26 letters found so far/)).toBeInTheDocument();
    await user.click(speakNow());
    hear('bee');
    expect(status()).toHaveTextContent("Yes! That's “bee”.");
    expect(screen.queryByRole('button', { name: 'Speak now' })).toBeNull();
    expect(screen.getByText(/1 of 26 letters found so far/)).toBeInTheDocument();
    expect(stage()).toHaveTextContent('B is for ball');
  });

  it('a wrong name says the right name, and "Try again" starts a new attempt', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    hear('dog');
    expect(status()).toHaveTextContent('This letter is called “bee”');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(fake.latest().started).toBe(true);
    hear('bee');
    expect(status()).toHaveTextContent("Yes! That's “bee”.");
  });

  it('nothing heard: the browser has stopped listening, the speech buttons are back, and the child can try again', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    act(() => {
      fake.latest().begin();
      fake.latest().end();
    });
    expect(status()).toHaveTextContent("I couldn't hear anything");
    expect(within(panel()).queryByRole('button', { name: 'Stop' })).toBeNull();
    expect(within(panel()).getByRole('button', { name: 'Listen again' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Hear the sound' })).toBeEnabled();
    expect(within(panel()).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('while the child is listening, every button that says a sound is off, and they come back when listening stops', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    act(() => fake.latest().begin());
    for (const name of ['Say it', 'Hear the sound', 'Hear the word', 'Play again']) {
      expect(screen.getByRole('button', { name }), name).toBeDisabled();
    }
    expect(within(panel()).getByRole('button', { name: 'Listen again' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Uppercase B\. Tap to hear it again/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Lowercase b\. Tap to hear it again/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    for (const name of ['Say it', 'Hear the sound', 'Hear the word', 'Play again']) {
      expect(screen.getByRole('button', { name }), name).toBeEnabled();
    }
  });

  it('a letter tapped while the child is listening: listening stops before its name is said, and a late result is not judged', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    act(() => fake.latest().begin());
    const listening = fake.latest();
    const mark = order.length;
    await user.click(await tile('c'));
    const said = order.slice(mark);
    expect(said, 'the microphone is off before the letter is spoken').toContain('say:see');
    expect(said.indexOf('mic off')).toBeLessThan(said.indexOf('say:see'));
    act(() => {
      listening.heard('see');
      listening.end();
    });
    expect(status()).not.toHaveTextContent('Yes!');
    expect(screen.getByRole('button', { name: 'Speak now' })).toBeInTheDocument();
  });

  it('a tap on a letter while the child listens makes no pop (it could be picked up), and the pop comes back after Stop', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    act(() => fake.latest().begin());
    const mark = sfxLog.length;
    await user.click(await tile('c'));
    expect(sfxLog.slice(mark), 'no pop while listening').not.toContain('pop');
    await user.click(await tile('b'));
    await user.click(await screen.findByRole('button', { name: 'Speak now' }));
    act(() => fake.latest().begin());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    const afterStop = sfxLog.length;
    await user.click(await tile('c'));
    expect(sfxLog.slice(afterStop), 'the pop plays again once listening has stopped').toContain('pop');
  });

  it('a refused microphone is explained, and tapping letters still works', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    act(() => fake.latest().fail('not-allowed'));
    expect(status()).toHaveTextContent('The browser did not get to use the microphone');
    await user.click(await tile('c'));
    expect(stage()).toHaveTextContent('C is for cat');
  });

  it('Stop ends listening without judging anything', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(speakNow());
    act(() => fake.latest().begin());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(fake.latest().aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Speak now' })).toBeInTheDocument();
    expect(status()).not.toHaveTextContent('Yes!');
  });

  it('a browser with no speech recognition says so, and offers no microphone', async () => {
    Reflect.deleteProperty(window, 'SpeechRecognition');
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    expect(status()).toHaveTextContent("This browser can't listen for speech");
    expect(screen.queryByRole('button', { name: 'Speak now' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Hear the sound' })).toBeInTheDocument();
  });

  it('the sound is heard inside its example word, from the same stage', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await openLetter('b', user);
    await user.click(within(stage()).getByRole('button', { name: 'Hear the sound' }));
    expect(stage()).toHaveTextContent('B is for ball');
  });
});
