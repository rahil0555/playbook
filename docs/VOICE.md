# Play Lab voice input

A student can say an answer instead of typing it. The app shows what it heard, judges it, and gives Correct, Needs
improvement or Try again. Typing is always there as the fallback. This follows the "Voice recognition integration"
specification, with the deviations listed below.

## What is built

| Piece | Where | What it does |
| --- | --- | --- |
| Speech listener | `src/playlab/services/speechInput/recognizer.ts` | Wraps the browser's speech recognition (`SpeechRecognition`, or Safari's `webkitSpeechRecognition`). One phrase, one outcome: a transcript, or an error kind. Stops itself after `listenMs` (8 s). No Play Lab imports, so other activities can reuse it. |
| Answer checker | `src/playlab/services/speechInput/evaluate.ts` | Normalises case, accents and punctuation, then matches exactly. A near miss (one slip per four letters) is "Needs improvement", not wrong. An empty or low-confidence result asks for a repeat instead of a score. |
| Voice component | `src/playlab/components/VoicePractice.tsx` | The microphone button, the states (idle, requesting permission, listening with a timer and Stop, processing, evaluating, success, error), the transcript ("You said: …"), the result, and the typed fallback. Knows the question only through `expected` and `prompt`. |
| Magic Letters | `features/word-builder/magic/MagicQuestion.tsx` | After a word is spelled, "Say the word for the picture" appears under the "Next word" row. Skipping costs nothing. |

Tests: `speechInput/recognizer.test.ts`, `speechInput/evaluate.test.ts`, `components/VoicePractice.test.tsx` (unit, with a
fake recogniser), and `e2e/voice.spec.ts` (browser, with a scripted recogniser: a correct word, a refused microphone then
typing, and a browser with no speech support).

## Deviations from the specification, and why

1. **Transcript from the browser, not an uploaded recording.** The specification allows "audio/blob OR browser transcript".
   The browser transcript needs no key and no server, and no audio is recorded or stored by Play Lab.
2. **No `/api/speech-to-text` and no `/api/evaluate-voice-answer`.** This repository has no server or API routes, and no
   speech-to-text provider key. The answer checker runs in the app. For single-word answers the specification's rule is
   deterministic matching, which the checker does. A rubric service for open answers is not needed by any question yet.
   When a server exists, a speech-to-text route can be added behind the same listener, with the key on the server only.
3. **Only Magic Letters uses it so far.** The component is ready for other questions (for example Sentence Fun) with a new
   `expected` and `prompt`.

## Privacy: what the browser sends

With the browser transcript, the browser sends the speech to its own speech service: Chrome and Edge (including Android)
use Google's and Microsoft's services, and Safari on iOS uses Apple's. Play Lab does not see the audio, but the child's
voice does leave the device for that service. Before children use this, check that this is acceptable for the product,
its privacy notice and the children's-data rules that apply. Firefox has no browser speech recognition, so it gets the
typed answer only. If that trade-off is not acceptable, the server route from the specification is the alternative.

## Browser and device rules the specification asks for

- **HTTPS**: microphone access needs a secure page. `localhost` is allowed for development.
- **Permission refused**: the child sees "Microphone access is blocked. Allow microphone access or type your answer."
  The app checks `navigator.permissions` first where the browser allows it, so a refusal is explained before listening.
- **Stopping**: listening ends on its own after 8 seconds, on Stop, or when the browser ends it. The recogniser is cancelled
  when the question goes away, so the microphone is never left on by Play Lab.
- **No double submit**: one phrase is one result. A second tap while it is busy is ignored.
- **No logging of speech**: transcripts are not logged. Only the outcome matters.

## Error messages

These come from the specification's table, in `services/speechInput/evaluate.ts` (`VOICE_MESSAGES`):

| Situation | Message |
| --- | --- |
| Permission denied | Microphone access is blocked. Allow microphone access or type your answer. |
| No speech detected | I couldn't hear you. Please try again. |
| Speech-to-text failure | I couldn't understand the recording. Please try again. |
| Network failure | Connection problem. Please check your internet and retry. |
| Low confidence | I'm not sure I heard that correctly. Please say it again. |
| Browser has no speech recognition | Voice answers aren't available in this browser. Type your answer instead. |

## Manual checks that automated tests cannot do

Run these on real devices before release. They are not done yet.

- [ ] Chrome on Android: microphone prompt, speech heard, correct word judged, Stop works, the refused prompt message.
- [ ] Safari on iOS: the microphone prompt, speech heard, correct word judged; if it does not hear, the typed answer works.
- [ ] Desktop Chrome: the same flow, with the microphone unplugged (no-speech or capture error message).
- [ ] Desktop Firefox: no microphone button; the typed answer works.
- [ ] A quiet room and a noisy room: how often a correct word is judged "Needs improvement" or "try again".
- [ ] Children's voices: a few children of the target age say each word; note the misses.
