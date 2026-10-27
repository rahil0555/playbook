import { act, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SOUND_LEAD_IN } from '../../hooks/useAudio';
import { audioLog } from '../../test/fakeAudio';
import { fakeRecognizers } from '../../test/fakeRecognizer';
import { order } from '../../test/order';
import { renderPlayLab } from '../../test/utils';

// Sound Discovery: the sound of a letter is said as a word that carries it. The child is asked for that word, and a letter name
// is never accepted as the sound. The browser's recogniser is a fake, so these tests show the app's handling only.

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

const panel = () => screen.getByRole('region', { name: 'Your turn' });
const status = () => within(panel()).getByRole('status');

function hear(transcript: string) {
  act(() => {
    const session = fake.latest();
    session.begin();
    session.heard(transcript);
    session.end();
  });
}

describe('Sound Discovery: on a page that is not secure, the letters still work and the page says why', () => {
  const secureBefore = window.isSecureContext;
  afterEach(() => Object.defineProperty(window, 'isSecureContext', { value: secureBefore, configurable: true }));

  it('offers no Speak now button, explains the address, and tapping a letter still shows its sound question', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    expect(within(panel()).queryByRole('button', { name: 'Speak now' })).toBeNull();
    expect(within(panel()).getByRole('status')).toHaveTextContent("Speaking can't work on this address");
    await user.click(await screen.findByRole('button', { name: /^Letter C,/ }));
    expect(within(panel()).getByText(/sound of C/)).toBeInTheDocument();
  });
});

describe('Sound Discovery: say a word that has the sound', () => {
  it('asks for a word with the sound, and accepts the example word', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    expect(within(panel()).getByText(/Say a word that has the sound of A/)).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: 'Speak now' }));
    hear('apple');
    expect(status()).toHaveTextContent('Yes! That sound is in “apple”.');
  });

  it('refuses the letter name for a sound question, and says what to do instead', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    await user.click(await screen.findByRole('button', { name: 'Speak now' }));
    hear('ay');
    expect(status()).toHaveTextContent("That's the letter's name. Say a word that has the sound, not the name.");
    expect(status()).not.toHaveTextContent('Yes!');
  });

  it('the answer is judged for the letter on screen: after another letter is chosen, an old answer is not carried over', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    await user.click(await screen.findByRole('button', { name: 'Speak now' }));
    hear('apple');
    expect(status()).toHaveTextContent('Yes!');
    await user.click(await screen.findByRole('button', { name: /^Letter B,/ }));
    expect(within(panel()).getByText(/sound of B/)).toBeInTheDocument();
    expect(status()).toHaveTextContent('Tap Speak now when you are ready.');
    expect(screen.getByRole('button', { name: 'Speak now' })).toBeInTheDocument();
  });

  it('a microphone that cannot be opened is named as that, and the letter grid still works', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    await user.click(await screen.findByRole('button', { name: 'Speak now' }));
    act(() => fake.latest().fail('audio-capture'));
    expect(status()).toHaveTextContent('No microphone could be opened');
    await user.click(await screen.findByRole('button', { name: /^Letter C,/ }));
    expect(within(panel()).getByText(/sound of C/)).toBeInTheDocument();
  });

  it('while the child is listening, the sound and word buttons are off, and the teacher is not heard as the answer', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    await user.click(await screen.findByRole('button', { name: 'Speak now' }));
    act(() => fake.latest().begin());
    for (const name of ['Play the sound', 'Hear the word', 'Hear all three', 'Say the name']) {
      expect(screen.getByRole('button', { name }), name).toBeDisabled();
    }
    // the letter grid still works while listening: a tap on another letter stops listening before that letter's name is said
    const mark = order.length;
    await user.click(await screen.findByRole('button', { name: /^Letter C,/ }));
    const said = order.slice(mark);
    expect(said.indexOf('mic off'), 'the microphone is off before the letter is spoken').toBeGreaterThanOrEqual(0);
    expect(said.indexOf('mic off')).toBeLessThan(said.indexOf('say:see'));
  });

  it('the question plays no model and shows no Listen again, so nothing in it gives the answer away', async () => {
    renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    expect(within(panel()).queryByRole('button', { name: 'Listen again' })).toBeNull();
    expect(within(panel()).queryByText(/apple/)).toBeNull();
  });

  it('the teaching button still hears the sound in its example word, from the letter card (not from the question)', async () => {
    const { user } = renderPlayLab({ initialActivity: 'phonics' });
    await screen.findByRole('region', { name: 'Your turn' });
    await user.click(screen.getByRole('button', { name: 'Play the sound' }));
    expect(audioLog.slice(-2).map((r) => r.text)).toEqual([SOUND_LEAD_IN, 'apple']);
  });
});
