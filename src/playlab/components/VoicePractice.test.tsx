import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { PlayLabContext, type PlayLabContextValue } from '../app/PlayLabContext';
import { fakeRecognizers } from '../test/fakeRecognizer';
import { VoicePractice } from './VoicePractice';

/** the feedback and buttons read only the motion setting from Play Lab; the rest of the context is not needed here */
const playLab = { reducedMotion: false } as unknown as PlayLabContextValue;
function renderWithProviders(ui: ReactElement) {
  const user = userEvent.setup();
  const utils = render(<PlayLabContext.Provider value={playLab}>{ui}</PlayLabContext.Provider>);
  return { user, ...utils };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mic = () => screen.getByRole('button', { name: 'Speak your answer' });

/** Speaking, with the browser's recogniser replaced by a fake: the test decides what the browser hears, and when. */
function renderVoice(expected = ['apple']) {
  const fake = fakeRecognizers();
  const ui = <VoicePractice expected={expected} prompt="Say the word for the picture" createRecognizer={fake.factory} />;
  return { ...renderWithProviders(ui), fake };
}

/** tap the microphone and let the browser start listening */
async function listen(user: ReturnType<typeof renderWithProviders>['user'], fake: ReturnType<typeof fakeRecognizers>) {
  await user.click(mic());
  await wait(0);
  fake.latest().begin();
}

describe('VoicePractice: speaking an answer', () => {
  it('listens, shows the transcript, and says Correct for the right word', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    expect(await screen.findByText(/Listening/)).toBeInTheDocument();
    fake.latest().heard('Apple.', 0.9);
    fake.latest().end();
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText(/^You said:/, { selector: 'p' })).toHaveTextContent('Apple.');
  });

  it('a near miss is "Needs improvement", and the child is never told they are wrong for a slip', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    fake.latest().heard('aple', 0.9);
    fake.latest().end();
    expect(await screen.findByText('Needs improvement')).toBeInTheDocument();
    expect(screen.queryByText('Correct!')).toBeNull();
  });

  it('nothing heard asks the child to try again', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    fake.latest().end();
    expect(await screen.findByText("I couldn't hear you. Please try again.")).toBeInTheDocument();
  });

  it('a refused microphone says why, and offers typing', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    fake.latest().fail('not-allowed');
    expect(await screen.findByText(/Microphone access is blocked/)).toBeInTheDocument();
    expect(screen.getByLabelText('Type your answer')).toBeInTheDocument();
  });

  it('a network failure says to check the connection', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    fake.latest().fail('network');
    expect(await screen.findByText(/Connection problem/)).toBeInTheDocument();
  });

  it('Stop ends listening and still judges what was heard', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(fake.latest().stopped).toBe(true);
    fake.latest().heard('apple');
    fake.latest().end();
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
  });

  it('Say it again clears the last attempt, so nothing from it stays on screen', async () => {
    const { user, fake } = renderVoice();
    await listen(user, fake);
    fake.latest().heard('apple');
    fake.latest().end();
    await screen.findByText('Correct!');
    await user.click(screen.getByRole('button', { name: 'Say it again' }));
    expect(screen.queryByText('Correct!')).toBeNull();
    expect(screen.queryByText(/You said/)).toBeNull();
    expect(mic()).toBeEnabled();
  });

  it('leaving the question stops listening', async () => {
    const { user, fake, unmount } = renderVoice();
    await listen(user, fake);
    unmount();
    expect(fake.latest().aborted).toBe(true);
  });
});

describe('VoicePractice: typing instead', () => {
  it('a typed answer is judged the same way, and labelled as typed', async () => {
    const { user } = renderVoice();
    await user.click(screen.getByRole('button', { name: 'Type it instead' }));
    await user.type(screen.getByLabelText('Type your answer'), 'apple');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
    expect(screen.getByText(/^You typed:/, { selector: 'p' })).toHaveTextContent('apple');
  });

  it('an empty box cannot be checked', async () => {
    const { user } = renderVoice();
    await user.click(screen.getByRole('button', { name: 'Type it instead' }));
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();
  });
});

describe('VoicePractice: without speech recognition', () => {
  it('says so, and the typed answer is the way in', async () => {
    const { user } = renderWithProviders(
      <VoicePractice expected={['apple']} prompt="Say the word for the picture" createRecognizer={() => null} />,
    );
    expect(screen.queryByRole('button', { name: 'Speak your answer' })).toBeNull();
    expect(screen.getByText(/Voice answers aren’t available|Voice answers aren't available/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Type your answer'), 'apple');
    await user.click(screen.getByRole('button', { name: 'Check' }));
    expect(await screen.findByText('Correct!')).toBeInTheDocument();
  });
});
