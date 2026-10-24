import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PlayLabContext, type PlayLabContextValue } from '../app/PlayLabContext';
import { recognitionLanguage, useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { VOICE_MESSAGES } from '../services/speechInput/evaluate';
import { START_WAIT_MS, type RecognizedResult, type RecognizerFactory } from '../services/speechInput/recognizer';
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
    await waitFor(() => expect(status()).toHaveTextContent('The browser did not get to use the microphone.'));
    expect(status()).toHaveTextContent('You can still drag or tap the letters.');
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

/** a page's own settings, set for one test and put back after it */
function setPageSettings(settings: { secure?: boolean; permission?: PermissionState }) {
  const restore: Array<() => void> = [];
  if (settings.secure !== undefined) {
    const before = Object.getOwnPropertyDescriptor(window, 'isSecureContext');
    Object.defineProperty(window, 'isSecureContext', { value: settings.secure, configurable: true });
    restore.push(() => (before ? Object.defineProperty(window, 'isSecureContext', before) : Reflect.deleteProperty(window, 'isSecureContext')));
  }
  if (settings.permission !== undefined) {
    const state = settings.permission;
    Object.defineProperty(navigator, 'permissions', { value: { query: async () => ({ state }) }, configurable: true });
    restore.push(() => Reflect.deleteProperty(navigator, 'permissions'));
  }
  return () => restore.forEach((undo) => undo());
}

describe('VoiceAnswer: each failure says what happened and what to check', () => {
  let undo: () => void = () => undefined;
  beforeEach(() => {
    undo = setPageSettings({ secure: true, permission: 'prompt' });
  });
  afterEach(() => {
    undo();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('a page that is not secure is told so, not told the microphone is blocked', async () => {
    undo();
    undo = setPageSettings({ secure: false, permission: 'prompt' });
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().fail('not-allowed'));
    await waitFor(() => expect(status()).toHaveTextContent('needs a secure page'));
    expect(status()).not.toHaveTextContent('blocked');
  });

  it('a site whose microphone is turned off is told how to allow it', async () => {
    undo();
    undo = setPageSettings({ secure: true, permission: 'denied' });
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().fail('not-allowed'));
    await waitFor(() => expect(status()).toHaveTextContent('turned off for this site'));
    expect(status()).toHaveTextContent('lock icon');
  });

  it('a missing or unusable microphone is not called a blocked microphone', async () => {
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().fail('audio-capture'));
    expect(status()).toHaveTextContent('could not open a microphone');
    expect(status()).not.toHaveTextContent('blocked');
  });

  it('a switched-off speech service is named as that, not as a permission problem', async () => {
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => fake.latest().fail('service-not-allowed'));
    expect(status()).toHaveTextContent('speech service is switched off');
    expect(status()).not.toHaveTextContent('blocked');
  });

  it('a browser that never starts is told so, and the child can try again', () => {
    // plain clicks: user-event waits on real timers, which fake timers would stop
    vi.useFakeTimers();
    const fake = fakeRecognizers();
    renderVoice(fake.factory);
    act(() => mic().click());
    act(() => {
      vi.advanceTimersByTime(START_WAIT_MS + 1);
    });
    expect(status()).toHaveTextContent('did not start listening');
    expect(mic()).toBeInTheDocument();
  });

  it('the diagnostic line holds the browser error name, and never what the child said', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fake = fakeRecognizers();
    const { user } = renderVoice(fake.factory);
    await user.click(mic());
    act(() => {
      fake.latest().heard('secretword');
      fake.latest().fail('network');
    });
    await waitFor(() => expect(warn).toHaveBeenCalled());
    const logged = JSON.stringify(warn.mock.calls);
    expect(logged).toContain('network');
    expect(logged).toContain('environment');
    expect(logged).not.toContain('secretword');
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
