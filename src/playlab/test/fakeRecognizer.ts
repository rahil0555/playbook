import type { RecognizerFactory, SpeechRecognizerLike } from '../services/speechInput/recognizer';
import { order } from './order';

/** A browser recogniser a test drives by hand: it records what it was asked to do and fires events on demand. */
export class FakeRecognizer implements SpeechRecognizerLike {
  lang = '';
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onstart: (() => void) | null = null;
  onresult: SpeechRecognizerLike['onresult'] = null;
  onerror: SpeechRecognizerLike['onerror'] = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;
  aborted = false;
  start() {
    this.started = true;
    order.push('mic on');
  }
  stop() {
    this.stopped = true;
    order.push('mic off');
  }
  abort() {
    this.aborted = true;
    order.push('mic off');
  }
  begin() {
    this.onstart?.();
  }
  heard(transcript: string, confidence?: number) {
    this.onresult?.({ results: [{ isFinal: true, length: 1, 0: { transcript, confidence } }] });
  }
  fail(error: string) {
    this.onerror?.({ error });
  }
  end() {
    this.onend?.();
  }
}

/** A factory that remembers every recogniser it made; the last one is the one a listening session uses. */
export function fakeRecognizers(): { made: FakeRecognizer[]; factory: RecognizerFactory; latest: () => FakeRecognizer } {
  const made: FakeRecognizer[] = [];
  const factory: RecognizerFactory = () => {
    const r = new FakeRecognizer();
    made.push(r);
    return r;
  };
  return { made, factory, latest: () => made[made.length - 1]! };
}
