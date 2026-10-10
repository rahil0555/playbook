# Testing summary

Everything under **Executed** was actually run, in this repository, on the final code (Node 22, Chromium from Playwright 1.56). Everything under **Not tested** was not, and no claim is made about it.

## Executed

| Check | Command | Result |
| --- | --- | --- |
| TypeScript, strict mode (`strict`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`) | `npx tsc -b` | no errors |
| Unit + component tests (Vitest 3, jsdom, React Testing Library, user-event) | `npm test` | **87 passed**, 11 files |
| Production build | `npm run build` | succeeds; main JS 339 kB (110.8 kB gzip), CSS 38.8 kB (6.7 kB gzip) |
| Integration package build | `npm run build:lib` | succeeds (`dist-lib/` with ESM, CSS, `.d.ts`, `package.json`) |
| End-to-end, real Chromium against the **production build** (Playwright) | `npm run test:e2e` | **39 passed** |
| Integration package consumed by a **separate scratch app** (tarball install → strict `tsc` with `skipLibCheck:false` → `vite build` → opened in Chromium) | manual, scripted | typechecks, builds, renders; fonts load; no console errors; no failed requests |
| Deployment under a deep sub-path (`/deep/er/playlab/`) incl. refresh | manual, scripted | all assets load; refresh keeps the screen |

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
| Touch | e2e: touch-emulated context, tap selects/builds; **CDP touch events** drag a tile into a slot and a letter onto a picture without scrolling the page; all buttons ≥ 44 × 44 px on a 375 px phone |
| No console errors | every e2e test fails on any `console.error` or uncaught exception |
| Accessibility (automated) | axe-core WCAG 2.1 A/AA on all 7 screens and 12 interactive states (selected letter, quiz, game board, partly filled word, after a check, settings, …): **0 violations** (including colour contrast) |
| Integration contract | e2e on the example host: callbacks received, `onExit`, host-controlled level hides picker, learner id (not name) in storage key, **hostile global CSS leaves PlayLab's computed styles unchanged**; unit: controlled navigation, `onExit`, throwing callback, async/throwing adapters, StrictMode (start counted once, goal completes once, no focus steal) |

### Bugs the testing found (all fixed)

1. Progress dots animated three keyframes with a *spring* transition, which Framer rejects, so a dot filling would throw in the browser. (unit test)
2. Local-storage adapter ignored its in-memory fallback when writes failed. (unit test)
3. Alphabet recorded round completion inside a `setState` updater: a React purity violation that double-recorded under StrictMode. (unit warning → StrictMode regression test)
4. With Tailwind preflight off, `border-2` etc. had no border style, so many borders were invisible (progress dots, correct-answer rings…). (visual QA via screenshots)
5. Host CSS tie-breaks: wrapper-scoped host rules (`.app button`) beat PlayLab's zero-specificity resets. (e2e hostile-CSS test) → resets and utilities re-levelled.
6. `aria-label` on generic `div`/`span`/`p` (prohibited by ARIA). (axe)
7. Phone layout: alphabet stage overflowed at 375 px; sticky stage was see-through. (screenshots)
8. Test-harness bugs found along the way (fake audio snapshot identity, drop target below the viewport, strict-mode locators) were fixed in the tests, not the app.

## Not tested (no claims)

* **Real devices.** No physical iPhone/iPad/Android phone or tablet. "Touch" above is emulated (Chromium touch emulation and CDP touch events). Real-finger feel, multi-touch, palm rejection and on-screen-keyboard interactions are unverified.
* **Other browsers.** Safari/WebKit and Firefox were not run. iOS Safari in particular has stricter audio/speech autoplay rules.
* **Real voices.** Headless Chromium has no speech voices; speech was verified only through fakes and failure paths. How the browser's TTS actually pronounces each letter name/sound/word (and whether the isolated sounds are intelligible) must be listened to on target devices.
* **Assistive technology.** No screen-reader (VoiceOver, TalkBack, NVDA) or switch-control session was run. axe-core automation does not replace it.
* **Performance on low-cost hardware.** Bundle sizes are measured; frame rate, memory, and load time on a low-end phone/tablet were not profiled, and no Lighthouse run was made.
* **Visual review coverage.** I reviewed screenshots of home, alphabet (desktop and 375 px), phonics, word builder (including success and summary), sentences, matching (375 px), progress and the example host. I did not individually inspect every screen at every width, and there are no automated visual-regression tests.
* **Animation *feel*.** Tests prove animations run, stop, and respect reduced motion; whether the timing feels right to a child needs human play-testing.
* **Versions.** Only React 18.3.1, Framer Motion 12.43, Vite 6, Node 22 were used. React 19, Framer Motion 11, Node 18 and Next.js are untested.
* **Long sessions / many rounds** (memory growth), very large `localStorage` data, and multiple PlayLab instances on one page were not exercised.
* The unit suite's console output includes Framer Motion's informational "Reduced Motion enabled" notice in the test that forces reduced motion; that is expected.

## Re-running

```bash
npm install
npx tsc -b && npm test          # types + 87 unit/component tests
npm run test:e2e                # builds, serves the production build, runs 39 Chromium tests (first run: npx playwright install chromium if needed)
npm run build:lib               # integration package
```
