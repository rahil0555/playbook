# Testing summary

Everything under **Executed** was actually run, in this repository (Node 22, Chromium from Playwright 1.56). Everything under **Not tested** was not, and no claim is made about it.

> **The test suite is not fully green.** The unit suite has known failures that also fail on the code *before* Magic Letters was added (see [Known pre-existing failures](#known-pre-existing-failures-reproduced-on-the-baseline)). The e2e suite passed 60 of 60 in the most recent full run, but contains two tests that have flaked. Numbers below are from specific runs and are labelled as such.

## Executed

| Check | Command | Result |
| --- | --- | --- |
| TypeScript, strict mode (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`) | `npx tsc -b` | no errors |
| Unit + component tests (Vitest 3, jsdom, React Testing Library, user-event) | `npm test` | **116 tests in 13 files. 3 consecutive full runs: 115, 114 and 115 passed** (1-2 failures each time; see below). All 29 Magic Letters tests passed in all three runs. |
| Production build | `npm run build` | succeeds; main JS 339 kB (110.9 kB gzip) |
| Integration package build | `npm run build:lib` | succeeds |
| End-to-end, real Chromium against the **production build** (Playwright) | `npm run test:e2e` | **60 tests; the latest full run passed 60 of 60**. Earlier full runs on the same code saw one failure each from the flaky tests listed below. |
| Integration package consumed by a **separate scratch app** (tarball install → strict `tsc` → `vite build` → Chromium) | manual, scripted, run before Magic Letters was added | typechecks, builds, renders; no console errors |
| Deployment under a deep sub-path (`/deep/er/playlab/`) incl. refresh | manual, scripted, run before Magic Letters was added | all assets load; refresh keeps the screen |

### Known pre-existing failures (reproduced on the baseline)

"Baseline" means the code at commit `f85f151`, before Magic Letters. I stashed the Magic Letters work and re-ran these tests on it. These are **not** caused by Magic Letters, and they are **not fixed** (fixing them was out of scope).

| Test | Layer | Behaviour on the baseline | Likely cause |
| --- | --- | --- | --- |
| `Alphabet playground › selects each of the 26 letters…` | unit | **fails every run** (3 of 3 isolated runs, and in all full runs). It passed earlier in the project; it is timing-dependent. | The test now finishes its 26 clicks in under 5 s, but the *Letter Explorer* badge toast is queued behind the *First Steps* toast, which stays for 5 s, so the assertion for it times out. |
| `Word completion › finishes a full round of missing-letter words` | unit | **intermittent** (failed in 1 of 3 full baseline runs; it also failed in 1 of 3 full runs on the current code) | timing under full-suite load |
| `sentences › a full round (arrange and fill-in)…` | e2e | **intermittent** (failed 3 of 6 isolated reruns on the baseline code) | race in the e2e helper `solveSentence`: `isVisible()` does not wait, so it can read the next question before it renders |

One further e2e failure was seen **once** and could **not** be classified: `matching › all three games can be completed` failed in one full parallel run (45 s timeout) but passed 4 of 4 times in isolation (~9 s each). I did not run it on the baseline, so I do not claim it is pre-existing or caused by Magic Letters; it looks like contention in the parallel run.

### Magic Letters: what the new tests cover

Added with the mode: **29 unit/component tests** and **21 e2e tests** (the 50 new tests all passed in the runs above, apart from noted fixes during development).

* `magicBoard.test.ts` (10, pure logic): decoy counts (Starter 0 / Explorer 1 / Adventurer 2); decoys never contain a letter from the word; **all 18 words are completable at all 3 levels**; tiles never start in the solved order; right/wrong/occupied/ignored drops; the repeated P in APPLE; a decoy never fits any slot; typed-letter slot lookup; hint selection.
* `magicMode.test.tsx` (19, component): Classic is the default and unchanged; switching modes both ways; tap-to-select then tap a slot; wrong slot is turned down kindly and recorded as an incorrect answer; tapping a slot first asks for a letter; putting a letter down; APPLE's two P tiles; decoys per level (and that a decoy never lands); hint after two misses; "Start this word again"; typed letters (including a miss); keyboard (Enter on letter then slot); live-region announcements; accessible names; the 8-star burst on a correct landing; **reduced motion (no burst, still lands and is announced)**; a whole round (5 words, one answer per word, progress recorded under Word Builder, next-step buttons); a round with a miss (4/5 first try, still finishes, never says "wrong").
* `e2e/magic-word-builder.spec.ts` (21, real Chromium): mode switch; **mouse drag** snaps into the slot, with burst present then gone; wrong-slot drop springs back to its origin with kind feedback; empty-space release is not a miss; **touch drag via CDP touch events** (no page scroll); tap-tap with mouse and touch emulation; keyboard-only; a full round plus My Stars counting it as Word Builder; **every one of the 18 words finished** in Magic mode; retry + hint; finished state; decoy counts at each level via Settings; reduced motion (letter lands, no burst); **axe WCAG 2.1 A/AA clean** in initial, picked-up, after-a-miss and finished states; no horizontal overflow at 320 / 375 / 768 / 1440 px.

### One existing test was edited

`e2e/playlab.spec.ts`, *touch screen: a finger can DRAG a tile into a slot…*, viewport height changed **1100 → 1250 px** (commit `191560a`). The Classic / Magic Letters switch adds roughly 60-74 px above the Classic board, which could push a two-row tray off the old viewport and make the touch drag scroll the page: the test failed 4 of 6 runs with the switch and 0 of 6 without it. After the change it passed 8 of 8 isolated runs and in the full suite. No application code was changed for this.

### What the tests cover, against the original QA list

| Requirement | Evidence |
| --- | --- |
| All activity navigation works | e2e: every activity from home, back, refresh, browser back, unknown hash → home; unit: all five from home |
| All 26 letters can be selected | unit + e2e: each letter selected; both cases and example word shown; name spoken |
| Letter animations trigger | e2e samples `transform` for 40 frames after a tap and asserts it changes for the tile **and** the stage letter; drag-and-spring-back measured |
| Audio errors handled | unit (8): speech missing, never starts (watchdog), blocked, error, interrupted, muted, clip 404 → speech fallback, sequence + stop. e2e: speech absent, speech throws → app still works and shows the notice |
| Word selection and deselection | unit + e2e: tap tile, tap placed tile, Clear, Backspace, typed letters |
| Word validation with repeated letters | unit (tile logic: two P's interchangeable, swaps, hint skips a correctly placed P) + component test with APPLE (wrong order → states `wrong,wrong,correct,correct,correct` → retry → success) |
| Incomplete answers cannot be submitted | unit + component: Check disabled; Enter key and `isCorrect` guard |
| Every word-building question can be completed | e2e plays rounds until **all 18 words** (incl. the 10 required) have been spelled |
| Sentence exercises | unit (both modes, wrong feedback, read-aloud) + e2e (full rounds, replay) |
| Matching games completed | unit + e2e: all three games from start to finish; either selection order; mouse **and** touch drag |
| Retry and next actions | unit + e2e in every activity ("Try again", "Next…", "Play again", "Go home", next-activity) |
| Progress accuracy | unit (pure reducer: counts, stars, badges once, streaks, caps, immutability, corrupt data) + component (My Stars numbers) + e2e (after a round, after refresh) |
| Refresh keeps navigation and saved progress | e2e: hash route survives reload; lifetime numbers persist, session numbers reset; corrupt storage doesn't crash |
| Keyboard | unit + e2e: Enter/Space on letters, arrow/Home/End in the grid, typed letters in Word Builder, visible focus ring ≥ 3 px, focus moves to the new screen after navigation |
| Reduced motion | e2e with `prefers-reduced-motion: reduce` emulated: root flagged, tile `transform` never leaves identity, selection still shown; unit: host `theme.motion='reduce'` |
| Layouts on mobile, tablet, desktop | e2e at 320, 375, 768, 1024, 1440 px on all 7 screens |
| No horizontal overflow | e2e: `scrollWidth <= innerWidth` for those 35 combinations |
| Touch | e2e: touch-emulated context, tap selects/builds; **CDP touch events** drag a tile into a slot and a letter onto a picture without scrolling the page; every visible button is ≥ 44 × 44 px on a 375 px phone (checked on home, alphabet, word builder and sentences) |
| No console errors | every e2e test fails on any `console.error` or uncaught exception |
| Accessibility (automated) | axe-core WCAG 2.1 A/AA on all 7 screens and 8 interactive states (alphabet with a letter selected, phonics quiz before/after a pick, matching board before/after selecting a card, word builder partly filled and after a check, settings open): **0 violations** (including colour contrast) |
| Integration contract | e2e on the example host: callbacks received, `onExit`, host-controlled level hides picker, learner id (not name) in storage key, **hostile global CSS leaves PlayLab's computed styles unchanged**; unit: controlled navigation, `onExit`, throwing callback, async/throwing adapters, StrictMode (start counted once, goal completes once, no focus steal) |

### Bugs the testing found (all fixed)

1. Progress dots animated three keyframes with a *spring* transition, which Framer rejects, so a dot filling would throw in the browser. (unit test)
2. Local-storage adapter ignored its in-memory fallback when writes failed. (unit test)
3. Alphabet recorded round completion inside a `setState` updater: a React purity violation that double-recorded under StrictMode. (unit warning → StrictMode regression test)
4. With Tailwind preflight off, `border-2` etc. had no border style, so many borders were invisible (progress dots, correct-answer rings…). (visual QA via screenshots)
5. Host CSS tie-breaks: wrapper-scoped host rules (`.app button`) beat PlayLab's zero-specificity resets. (e2e hostile-CSS test) → resets and utilities re-levelled.
6. `aria-label` on generic `div`/`span`/`p` (prohibited by ARIA). (axe)
7. Phone layout: alphabet stage overflowed at 375 px; sticky stage was see-through. (screenshots)
8. Magic Letters (development): the success message was announced twice to screen readers (a live region plus the message); on a 1280 × 720 laptop the slots and tray started below the fold, so the picture now sits beside them on wide screens. (component tests, then a real-browser drag test)
9. Test-harness bugs found along the way (fake audio snapshot identity, drop target below the viewport, strict-mode locators) were fixed in the tests, not the app.

## Not tested (no claims)

* **Real devices.** No physical iPhone/iPad/Android phone or tablet. "Touch" above is emulated (Chromium touch emulation and CDP touch events). Real-finger feel, multi-touch, palm rejection and on-screen-keyboard interactions are unverified.
* **Other browsers.** Safari/WebKit and Firefox were not run. iOS Safari in particular has stricter audio/speech autoplay rules.
* **Real voices.** Headless Chromium has no speech voices; speech was verified only through fakes and failure paths. How the browser's TTS actually pronounces each letter name/sound/word (and whether the isolated sounds are intelligible) must be listened to on target devices.
* **Assistive technology.** No screen-reader (VoiceOver, TalkBack, NVDA) or switch-control session was run. axe-core automation does not replace it.
* **Performance on low-cost hardware.** Bundle sizes are measured; frame rate, memory, and load time on a low-end phone/tablet were not profiled, and no Lighthouse run was made.
* **Visual review coverage.** I reviewed screenshots of home, alphabet (desktop and 375 px), phonics, word builder (including success and summary), sentences, matching (375 px), progress and the example host. I did not individually inspect every screen at every width, and there are no automated visual-regression tests.
* **Magic Letters feel.** The snap / bounce / glow / star-burst timing was checked by screenshots and by tests that the effects appear and disappear, not by children or by frame-rate measurement. On a 375 × 740 phone the second row of loose letters can sit below the fold (documented in the README).
* **Animation *feel*.** Tests prove animations run, stop, and respect reduced motion; whether the timing feels right to a child needs human play-testing.
* **Versions.** Only React 18.3.1, Framer Motion 12.43, Vite 6, Node 22 were used. React 19, Framer Motion 11, Node 18 and Next.js are untested.
* **Long sessions / many rounds** (memory growth), very large `localStorage` data, and multiple PlayLab instances on one page were not exercised.
* The unit suite's console output includes Framer Motion's informational "Reduced Motion enabled" notice in the test that forces reduced motion; that is expected.

## Re-running

```bash
npm install
npx tsc -b && npm test          # types + 116 unit/component tests (expect the known pre-existing failures listed above)
npm run test:e2e                # builds, serves the production build, runs 60 Chromium tests (first run: npx playwright install chromium if needed)
npm run build:lib               # integration package
```
