# Play Lab voice input

A child can say an answer instead of typing it. The app shows what it heard, judges it, and gives Correct, Needs
improvement or Try again. Typing is always there as a fallback. The current feature is the browser-based version of the
"Voice recognition integration" specification. The server parts of that specification are **not built** (see below).

## What is implemented

| Piece | File | What it does |
| --- | --- | --- |
| Speech listener | `src/playlab/services/speechInput/recognizer.ts` | Wraps the browser's speech recognition (`SpeechRecognition`, or Safari's `webkitSpeechRecognition`). One phrase, one outcome. Stops itself after 8 seconds. Maps the browser's error names to ours. No Play Lab imports. |
| Answer checker | `src/playlab/services/speechInput/evaluate.ts` | Judges spoken and typed answers with the same rules (below). |
| Voice component | `src/playlab/components/VoicePractice.tsx` | Microphone button, listening state with a timer and Stop, transcript ("You said: …"), result, retry, and the typed fallback. Knows the question only through `expected` and `prompt`. |
| Magic Letters | `src/playlab/features/word-builder/magic/MagicQuestion.tsx` | After a word is spelled, "Say the word for the picture" appears under the "Next word" row. |

### States (as the specification names them)

`idle` → `requesting_permission` → `listening` → `processing` → `evaluating` → `success` or `error`.
A failure in any state goes to `error`, which offers the microphone again and the typed answer.

### Evaluation rules (spoken and typed answers alike)

* Case, accents and punctuation are ignored; spaces are collapsed. "Apple!" and "apple" are the same answer.
* Each accepted answer is compared exactly after normalising. There is no AI scoring.
* A near miss (at most one letter change for a short word, more for longer words) is **Needs improvement**, not wrong.
* A different word is **Needs improvement** with "That is not the word for this picture. Try again."
* An empty transcript, or a transcript with a confidence below 0.3, asks the child to say it again. It is never scored.
* Confidence is used only when the browser reports a value above 0. A value of exactly 0 is treated as "not provided".
  Whether browsers report a meaningful confidence was **not verified** on real devices.
* Numerical answers are not handled, because every current question is a word. Add that before a numeric question is used.

### Attempts, retries and cleanup

* Every tap on the microphone starts a new attempt. A typed answer, a retry, or leaving the question ends the attempt in
  progress. A late speech result or a late permission answer from an ended attempt is ignored.
* The browser's recogniser is cancelled when the question goes away (for example when the child moves to the next word),
  so the microphone is released.
* "Say it again" clears the transcript, the result and the message, and returns to the start.
* Typing is reachable in `idle`, `requesting_permission`, `listening` and `error`. During `processing`/`evaluating` (a moment) and
  after a spoken success it is not shown; after a success, "Say it again" brings it back.

## What is not implemented (future work)

* **No server routes.** The specification's `POST /api/speech-to-text` and `POST /api/evaluate-voice-answer` do not
  exist. This repository has no server, no API routes, and no speech-to-text provider key. Nothing here calls one.
* **No audio recording or upload.** The specification's MediaRecorder path is not used. The browser produces the
  transcript directly. The specification allows this ("audio/blob OR browser transcript").
* **No rubric or AI evaluation** for open-ended answers. Only deterministic matching of short answers exists.
* **Only Magic Letters uses it.** The component is reusable; other questions would pass their own `expected` and `prompt`.

## Browser and provider limitations

* **Support:** the browser API is expected in Chrome and Edge (desktop and Android) and in Safari on iOS. **Those
  browsers were not tested here**; the version requirements are not verified. Firefox does not provide it, so Firefox users
  get the typed answer only. The app checks for the API at runtime and says so.
* **Provider:** the browser sends the speech to its own recognition service. Chrome and Edge use the browser vendor's
  services (Google, Microsoft); Safari on iOS uses Apple's. Whether a given browser recognises on the device or on the
  vendor's servers depends on the browser, OS and language pack, and was **not verified**.
* **Permission:** the browser asks for the microphone when listening starts. The app first checks
  `navigator.permissions` where the browser supports it, so a refusal already made is explained before listening.
  Where that query is not supported (it may be Safari), the check is skipped and the browser's own prompt is used.
* **Quality:** recognition quality for children's voices, accents, background noise and single words was not measured.
  A correct word can be misheard. The app then asks the child to say it again or to type it. It does not mark them wrong
  for a near miss.
* **Timing:** listening stops after 8 seconds, on Stop, or when the browser ends it. If a browser never sends its end
  event, the child can still type the answer; the microphone is released when the typed answer is judged.
* **Confidence:** see the evaluation rules. Not verified on devices.

## Privacy: what happens to a child's speech

What the **application code** does, verified by reading the code and by the checks below:

* It does not capture, record, upload or store audio itself. The browser's recogniser is the only thing that receives the
  microphone.
* It does not write the transcript to storage (no `localStorage`, `sessionStorage` or progress record). The transcript is
  held in the component's state, and it is cleared on retry or when the question goes away.
* It does not log transcripts or speech. The voice code contains no `console` calls.
* It does not write voice results into progress: the voice code never calls the round's submit.
* The app makes no network calls of its own in `src/playlab` (no `fetch`, no XHR). There are no API keys, tokens or
  environment variables in frontend code.

What the **browser** does, which the app cannot control:

* The browser sends the child's speech to its recognition provider (see "Provider" above). **Play Lab does not process
  speech entirely offline, and it does not claim to.** The child's voice leaves the device whenever the browser uses a
  remote recogniser.
* Before children use this feature, decide whether that is acceptable for your product, its privacy notice and the
  children's-data rules that apply. If it is not, the alternative is a server-side recogniser that the product controls.
  That would need a backend, a provider key kept on the server, and a retention decision. None of these exists here.

## Automated tests

Run on commit `16d38f3` (the audit commit). Commands are the ones in `package.json`.

| Check | Command | Result |
| --- | --- | --- |
| Type-check | `npm run typecheck` | Passed |
| Production build | `npm run build` | Passed |
| Library build | `npm run build:lib` | Passed |
| Unit and component tests | `npm test` | 296 passed, 1 failed (`alphabet.test.tsx`, pre-existing, see below) |
| Full Playwright suite | `npx playwright test` | 168 passed, 0 failed, 0 skipped |
| Focused voice, Magic Letters and layout audit | `npx playwright test e2e/voice.spec.ts e2e/magic-feel.spec.ts e2e/magic-word-builder.spec.ts e2e/magic-animation.spec.ts e2e/magic-phonics.spec.ts e2e/audit-layout.spec.ts` | 61 passed, 0 failed |

Voice unit tests (all in the unit run above): `services/speechInput/recognizer.test.ts`, `services/speechInput/evaluate.test.ts`,
`components/VoicePractice.test.tsx`. Voice browser tests: `e2e/voice.spec.ts` (six tests). They use a scripted
recogniser, so they test the app's behaviour, not a real microphone or a real provider.

### Known failure that predates voice input

`src/playlab/features/alphabet/alphabet.test.tsx` ("selects each of the 26 letters") exceeds the 5-second test timeout.
It fails at about 5.1 to 6 seconds on every run in isolation, and it also fails on commit `3814380`, which is before any
voice code. It is not caused by voice input. It has not been fixed here, because that would mean changing unrelated
Alphabet timing.

`src/playlab/features/matching/matching.test.tsx` ("Word completion") takes about 1.4 seconds alone but close to 5 seconds
under the full parallel run. It has passed on most full runs and failed on some. It is timing-sensitive under load. It is
not voice-related.

## Manual checks still required (not performed)

No physical device or real browser microphone was used for this audit. Every item below is **NOT VERIFIED**.

- [ ] **Desktop Chrome:** tap the microphone, allow the prompt, say "apple" on the Magic Letters word, see "You said: apple" and Correct. Deny the microphone and see the blocked message and the typed answer work. Stay silent and see "I couldn't hear you". Say a wrong word and see Needs improvement. Stop while listening. Tap "Say it again". Finish the word, press "Next word", and check the speaking area is clean on the next word. Close the tab while listening and reopen; check the microphone indicator in the browser goes off.
- [ ] **Microsoft Edge (desktop):** the same steps as desktop Chrome.
- [ ] **Chrome on Android:** the same steps on a phone at 390 px width. Check the speaking area does not cover the letters or "Next word", and that the typed answer keyboard does not hide the Check button.
- [ ] **Safari on iOS:** the same steps. Firefox on desktop: the microphone button should be absent and the typed answer should work.
- [ ] **Children's speech:** a few children of the target age say each word; record how often a correct word is misheard.
- [ ] **Noise:** the same words in a quiet room and in a noisy room.
- [ ] **Privacy review:** confirm the provider limitation above is acceptable before any children use it.
