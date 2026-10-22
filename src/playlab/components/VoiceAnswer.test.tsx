import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PlayLabContext, type PlayLabContextValue } from '../app/PlayLabContext';
import { recognitionLanguage, useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { VOICE_MESSAGES } from '../services/speechInput/evaluate';
import type { RecognizedResult, RecognizerFactory } from '../services/speechInput/recognizer';
import { fakeRecognizers } from '../test/fakeRecognizer';
import { VoiceAnswer } from './VoiceAnswer';

/** the buttons read only the motion setting from Play Lab; the rest of the context is not needed here */
const playLab = { reducedMotion: false } as unknown as PlayLabContextValue;

function renderVoice(createRecognizer: RecognizerFactory, options: { solved?: boolean } = {}) {
  const user = userEvent.setup();
  const onTranscript = vi.fn<(result: RecognizedResult) => void>();
  const ui: ReactElement = (
    <PlayLabContext.Provider value={playLab}>
      <VoiceAnswer language="en" solved={options.solved} onTranscript={onTranscript} createRecognizer={createRecognizer} />
    </PlayLabContext.Provider>
  );
  return { user, onTranscript, ...render(ui) };
}

const mic = () => screen.getByRole('button', { name: 'Speak answer' });
const status = () => screen.getByRole('status');

describe('VoiceAnswer: browser support', () => {
  it('offers the microphone when the browser has speech recognition', () => {
    const fake = fakeRecognizers();
    renderVoice(fake.factory);
    expect(mic()).toBeInTheDocument();
    expect(status()).toHaveTextContent('Tap Speak answer, then say the word.');
  });

  it('explains, and offers no microphone, when the browser has no speech recognition', () => {
    renderVoice(() => null);
    expect(status()).toHaveTextContent('Speaking answers is not available in this browser. Drag or tap the letters instead.');
    expect(screen.queryByRole('button', { name: 'Speak answer' })).toBeNull();
  });
});

describe('VoiceAnswer: a session', () => {
  it('hands over the final transcript once, with its confidence, and says what it heard', async () => {
    const fake = fakeRecognizers();
    const { user, onTranscript } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => {
      fake.latest().begin();
      fake.latest().heard('cat', 0.9);
      fake.latest().end();
    });
    expect(onTranscript).toHaveBeenCalledTimes(1);
    expect(onTranscript).toHaveBeenCalledWith({ transcript: 'cat', confidence: 0.9 });
    expect(status()).toHaveTextContent('You heard: “cat”');
    expect(mic()).toBeInTheDocument();
  });

  it('shows Listening with a Stop control while the browser listens', async () => {
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().begin());
    expect(status()).toHaveTextContent('Listening… say the word.');
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Speak answer' })).toBeNull();
  });

  it('asks for a repeat when nothing was heard, and hands nothing over', async () => {
    const fake = fakeRecognizers();
    const { user, onTranscript } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => {
      fake.latest().begin();
      fake.latest().end();
    });
    expect(status()).toHaveTextContent(VOICE_MESSAGES.noSpeech);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(mic()).toBeInTheDocument();
  });

  it('explains a refused microphone, hands nothing over, and leaves the letters usable', async () => {
    const fake = fakeRecognizers();
    const { user, onTranscript } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().fail('not-allowed'));
    expect(status()).toHaveTextContent('The microphone is blocked. You can still drag or tap the letters.');
    expect(onTranscript).not.toHaveBeenCalled();
    expect(mic()).toBeInTheDocument();
  });

  it('explains a network error and offers the microphone again', async () => {
    const fake = fakeRecognizers();
    const { user, onTranscript } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().fail('network'));
    expect(status()).toHaveTextContent(VOICE_MESSAGES.network);
    expect(onTranscript).not.toHaveBeenCalled();
    expect(mic()).toBeInTheDocument();
  });

  it('Stop ends listening at once, releases the microphone, and hands nothing over, even if the browser reports late', async () => {
    const fake = fakeRecognizers();
    const { user, onTranscript } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().begin());
    await user.click(screen.getByRole('button', { name: 'Stop' }));
    expect(fake.latest().aborted).toBe(true);
    expect(mic()).toBeInTheDocument();
    act(() => {
      fake.latest().heard('cat');
      fake.latest().end();
    });
    expect(onTranscript).not.toHaveBeenCalled();
  });

  it('releases the microphone when it leaves the screen while listening', async () => {
    const fake = fakeRecognizers();
    const { user, unmount } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().begin());
    unmount();
    expect(fake.latest().aborted).toBe(true);
  });

  it('uses the recogniser for one final phrase, in Indian English for English', async () => {
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    const session = fake.latest();
    expect(session.lang).toBe('en-IN');
    expect(session.continuous).toBe(false);
    expect(session.interimResults).toBe(false);
    expect(session.maxAlternatives).toBe(1);
    expect(session.started).toBe(true);
  });

  it('once the word is spelled, says so and does not offer the microphone again', () => {
    renderVoice(fakeRecognizers().factory, { solved: true });
    expect(status()).toHaveTextContent('You said it! The word is spelled.');
    expect(screen.queryByRole('button', { name: 'Speak answer' })).toBeNull();
  });
});

describe('useSpeechRecognition', () => {
  it('a second start while a session runs opens no second session', () => {
    const fake = fakeRecognizers();
    const { result } = renderHook(() => useSpeechRecognition({ language: 'en', onResult: () => undefined, createRecognizer: fake.factory }));
    // the first recogniser made is the support check; the rest are sessions
    act(() => {
      result.current.start();
      result.current.start();
    });
    expect(fake.made.length - 1).toBe(1);
  });

  it('reports an unsupported browser as an error, without starting anything', () => {
    const { result } = renderHook(() => useSpeechRecognition({ language: 'en', onResult: () => undefined, createRecognizer: () => null }));
    expect(result.current.state).toBe('error');
    expect(result.current.errorKind).toBe('unsupported');
  });

  it('never stays on processing when the caller fails', async () => {
    const fake = fakeRecognizers();
    const { result } = renderHook(() =>
      useSpeechRecognition({
        language: 'en',
        createRecognizer: fake.factory,
        onResult: () => {
          throw new Error('caller failed');
        },
      }),
    );
    act(() => result.current.start());
    act(() => {
      fake.latest().begin();
      fake.latest().heard('cat');
    });
    // the transcript is handed over on the browser's end event, and the caller throws there
    let thrown: unknown = null;
    act(() => {
      try {
        fake.latest().end();
      } catch (error) {
        thrown = error;
      }
    });
    expect((thrown as Error).message).toBe('caller failed');
    // the caller's error must not leave the hook on "processing"
    expect(result.current.state).toBe('idle');
  });
});

describe('recognitionLanguage', () => {
  it('listens for English as en-IN, and any other language as its own tag', () => {
    expect(recognitionLanguage('en')).toBe('en-IN');
    expect(recognitionLanguage('hi')).toBe('hi');
  });
});
