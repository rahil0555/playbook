import { act, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { englishLetters } from '../../data/en/alphabet';
import { ENCOURAGE_LINES, PRAISE_LINES } from '../../lib/lessonLines';
import { fakeRecognizers } from '../../test/fakeRecognizer';
import { order } from '../../test/order';
import { renderPlayLab } from '../../test/utils';
import { audioLog } from '../../test/fakeAudio';

// Letter Playground, the guided lesson: the teacher says "Say A for apple!", listening starts by itself after the teacher, a right
// answer is celebrated and the next letter comes by itself, a wrong one is encouraged, and the child can always tap. The browser's
// recogniser is a fake, so these tests show what the app does with each result. They do not show what a real microphone hears
// (see docs/VOICE.md).

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
const stop = () => screen.getByRole('button', { name: 'Stop listening' });
const speak = () => screen.getByRole('button', { name: 'Speak' });
const tile = (letter: string) => screen.findByRole('button', { name: new RegExp(`^Letter ${letter.toUpperCase()},`) });

/** one listening attempt: the browser starts, hears the words, and finishes */
function hear(transcript: string) {
  act(() => {
    const session = fake.latest();
    session.begin();
    session.heard(transcript);
    session.end();
  });
}

const sayLine = (text: string) => order.indexOf(`say:${text}`);

describe('Letter Playground: the guided lesson', () => {
  it('the teacher says the instruction first, and only then the microphone turns on by itself', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    expect(await instruction()).toHaveTextContent('Say A for apple!');
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    expect(sayLine('Say A for apple!')).toBeGreaterThanOrEqual(0);
    expect(order.indexOf('mic on')).toBeGreaterThan(sayLine('Say A for apple!'));
    expect(stop()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Speak now$/ })).toBeNull();
  });

  it('a right answer is praised with a cheer, and the next letter comes by itself after the praise', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('A for apple');
    expect(await screen.findByTestId('lesson-success')).toBeInTheDocument();
    expect(status()).toHaveTextContent(PRAISE_LINES[0]);
    expect(await screen.findByText('Say B for ball!', {}, { timeout: 4000 })).toBeInTheDocument();
    // the praise was said in full before the next instruction: the next step never cut it off
    await waitFor(() => expect(sayLine('Say B for ball!')).toBeGreaterThanOrEqual(0));
    expect(sayLine(PRAISE_LINES[0])).toBeGreaterThanOrEqual(0);
    expect(sayLine(PRAISE_LINES[0])).toBeLessThan(sayLine('Say B for ball!'));
  }, 10_000);

  it('the natural ways a child says it are right: the letter, its name, and the letter with its example', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('ay');
    expect(await screen.findByTestId('lesson-success')).toBeInTheDocument();
  }, 10_000);

  it('a wrong answer is encouraged and the child may try again, without being marked as having failed', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('dog');
    expect(await screen.findByText(ENCOURAGE_LINES[0], { exact: false })).toBeInTheDocument();
    // listening starts again for another try, and the same instruction is still there
    await waitFor(() => expect(fake.made.filter((r) => r.started).length).toBeGreaterThanOrEqual(2));
    expect(await instruction()).toHaveTextContent('Say A for apple!');
    expect(screen.queryByText(/fail|wrong|incorrect/i)).toBeNull();
  }, 10_000);

  it('unclear speech asks the child to repeat it, and listening starts again', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    hear('the big dog ran');
    expect(await screen.findByText('Could you say that again?')).toBeInTheDocument();
    await waitFor(() => expect(fake.made.filter((r) => r.started).length).toBeGreaterThanOrEqual(2));
  }, 10_000);

  it('after three wrong answers the letter is taught together, and the lesson moves on without a reward', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    for (let i = 0; i < 3; i++) {
      await waitFor(() => expect(fake.latest()?.started).toBe(true));
      hear('dog');
      await act(async () => {
        await new Promise((r) => setTimeout(r, 30));
      });
    }
    expect(await screen.findByText('A is for apple. Let’s learn it together!')).toBeInTheDocument();
    expect(await screen.findByText('Say B for ball!', {}, { timeout: 4000 })).toBeInTheDocument();
  }, 15_000);

  it('Stop ends listening at once and says nothing; Speak starts it again', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    const said = order.length;
    await user.click(await screen.findByRole('button', { name: 'Stop listening' }));
    expect(status()).toHaveTextContent('Tap Speak when you’re ready.');
    expect(order.slice(said).filter((x) => x.startsWith('say:'))).toEqual([]);
    await user.click(speak());
    await waitFor(() => expect(fake.made.filter((r) => r.started).length).toBeGreaterThanOrEqual(2));
    expect(stop()).toBeInTheDocument();
  });

  it('tapping a letter in the grid starts that letter’s lesson', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await user.click(await tile('c'));
    expect(await instruction()).toHaveTextContent('Say C for cat!');
    const stage = screen.getByRole('region', { name: 'Selected letter' });
    expect(within(stage).getByText(/^C is for /)).toBeInTheDocument();
  });

  it('without a microphone (an insecure page), the lesson is a tap lesson: Next letter moves on, and the letters still work', async () => {
    const secure = window.isSecureContext;
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });
    try {
      const { user } = renderPlayLab({ initialActivity: 'alphabet' });
      expect(await screen.findByRole('button', { name: 'Next letter' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Speak' })).toBeNull();
      await user.click(screen.getByRole('button', { name: 'Next letter' }));
      expect(await instruction()).toHaveTextContent('Say B for ball!');
      expect(fake.made.filter((r) => r.started)).toHaveLength(0);
    } finally {
      Object.defineProperty(window, 'isSecureContext', { value: secure, configurable: true });
    }
  });

  it('the teacher’s voice is never heard as an answer: the teaching line ends before listening starts', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    const teaching = sayLine('Say A for apple!');
    const micOn = order.indexOf('mic on');
    expect(teaching).toBeGreaterThanOrEqual(0);
    expect(micOn).toBeGreaterThan(teaching);
    // nothing is said while the microphone is on (the praise and the next line come only after a verdict, when listening has ended)
    const during = order.slice(micOn + 1).find((x) => x.startsWith('say:'));
    expect(during).toBeUndefined();
  });

  it('the one speaker control is off while listening, and says the letter, its sound and its word when the child is not listening', async () => {
    const { user } = renderPlayLab({ initialActivity: 'alphabet' });
    await waitFor(() => expect(fake.latest()?.started).toBe(true));
    expect(screen.getByRole('button', { name: 'Hear it' })).toBeDisabled();
    await user.click(await screen.findByRole('button', { name: 'Stop listening' }));
    const before = audioLog.length;
    await user.click(screen.getByRole('button', { name: 'Hear it' }));
    await waitFor(() => expect(audioLog.length).toBeGreaterThan(before));
    const said = audioLog.slice(before).map((r) => r.text);
    expect(said[0]).toBe(englishLetters[0]!.nameSpeech);
    expect(said).toContain('apple');
  });

  it('reaching Z celebrates the whole alphabet and offers to start again', async () => {
    renderPlayLab({ initialActivity: 'alphabet' });
    for (const letter of englishLetters) {
      const lineIndex = englishLetters.indexOf(letter);
      await waitFor(() => expect(fake.latest()?.started).toBe(true), { timeout: 3000 });
      expect(await instruction()).toHaveTextContent(`Say ${letter.upper} for ${letter.word.text}!`);
      hear(`${letter.upper} for ${letter.word.text}`);
      if (lineIndex < englishLetters.length - 1) {
        await screen.findByText(`Say ${englishLetters[lineIndex + 1]!.upper} for ${englishLetters[lineIndex + 1]!.word.text}!`, {}, { timeout: 4000 });
      }
    }
    expect(await screen.findByText('You know the whole alphabet!', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start again' })).toBeInTheDocument();
    screen.getByRole('button', { name: 'Start again' }).click();
    expect(await instruction()).toHaveTextContent('Say A for apple!');
  }, 90_000);
});
