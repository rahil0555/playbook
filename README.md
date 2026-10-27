# Edurance PlayLab

A standalone, interactive learning playground for young children: an animated alphabet, phonics (letter *name* vs letter *sound*), a word-building game, sentence activities, matching mini-games, and a gentle stars-and-badges progress system.

It is built **separately from the main Edurance app** (React + TypeScript + Vite + Tailwind CSS + Framer Motion) so it can be tested and demonstrated on its own, then handed over as a self-contained component. Nothing in this repository imports from, or modifies, the main application.

> **Status:** feature-complete for the scope below, tested (see [docs/TESTING.md](docs/TESTING.md), which lists the known pre-existing flaky/failing tests), **not yet merged into the main app**. Please read [docs/INTEGRATION.md](docs/INTEGRATION.md) (including the *merge checklist*) before integrating.

---

## Quick start

Requirements: Node.js 18+ (developed and tested on Node 22) and npm.

```bash
npm install          # exact dependency ranges are in package.json (React 18.3, Vite 6, Tailwind 3.4, Framer Motion 12, Vitest 3, Playwright 1.56)
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) + production build into `dist/` (works from any URL sub-path) |
| `npm run preview` | Serve the production build at http://localhost:4173 |
| `npm run typecheck` | TypeScript only |
| `npm test` | Unit + component tests (Vitest, jsdom). 205 tests; the final run passed 204. One alphabet test is timing-dependent, see docs/TESTING.md |
| `npm run test:e2e` | End-to-end tests in real Chromium against the production build (Playwright; builds and serves automatically). 156 tests; the final run passed all 156 |
| `npm run build:lib` | **Integration package**: builds `dist-lib/` (ESM + precompiled CSS + `.d.ts` + `package.json`) for the main app |

Handy URLs while developing:

* `/` standalone app (screens are mirrored in the hash: `#/alphabet`, `#/phonics`, `#/word-builder`, `#/sentences`, `#/matching`, `#/progress`)
* `/?host` an **example host app** that embeds `<PlayLab />` the way the main app would (callbacks, own progress adapter, exit button, hostile-CSS toggle)
* `/?gallery` every bundled illustration, for design review

Playwright uses its own Chromium. If your machine already has one, set `PW_CHROMIUM=/path/to/chromium`.

**Testing on real devices and with children:** see [docs/CHILD-TESTING-GUIDE.md](docs/CHILD-TESTING-GUIDE.md) (a step-by-step checklist, the bug-report template and the scorecard). What the automated tests cover, and what still needs a real device, is in the real-device audit section of [docs/TESTING.md](docs/TESTING.md).

### Deploying under a sub-path

`vite.config.ts` uses `base: './'` and navigation uses the URL **hash**, so the contents of `dist/` can be hosted at `/`, `/playlab/`, or `/any/deep/path/` with no rebuild and no server rewrite rules. (Verified by serving the build from `/deep/er/playlab/`: all assets load, refresh keeps the screen.)

---

## What's in it

| Area | What the child can do |
| --- | --- |
| **Home** | Welcome, tappable "PLAY" letters, progress summary, five activity cards |
| **Letter Playground** | Tap any of A–Z. The tile and the big stage letter react immediately with one of six hand-tuned animations (bounce, wobble, spin, jelly, float, pop), a ripple, and a small particle burst. Shows uppercase + lowercase, an example word and illustration, "Say it", "Hear the word", "Play again". Big letters can optionally be dragged (they spring back). Find 5 letters to earn stars. |
| **Sound Discovery** | *Discover*: for each letter the **name** ("ay") and the **sound** (/ă/ as in apple) are shown and played separately. *Listen & choose*: hear a sound, tap the matching letter (kind feedback, "Try again", hint after two misses). |
| **Word Builder** | **Magic Letters** is the only Word Builder mode (the older tile-and-Check "Classic" mode and its mode switch were removed): drag or tap each letter onto its glowing outline; see [below](#magic-letters-word-builder-mode). 18 words (the 10 required: cat, sun, dog, bat, pen, cup, fish, book, apple, mango, plus 8 more). |
| **Sentence Fun** | Arrange the words *or* drag/tap the missing word. Read-aloud, wrong-order feedback that shows which words are already right, a "wave" celebration. 11 sentences (the 5 required plus 6 more). |
| **Match & Play** | Three complete games: **Letter ↔ Picture**, **Sound ↔ Letter**, **Missing Letter** (word completion). Tap-tap or drag to match. |
| **My Stars** | Session and all-time stats, per-activity progress, 7 badges, recently finished rounds, "Start over". |

### Magic Letters (Word Builder mode)

Word Builder *is* Magic Letters: open Word Builder and you are in it (there is no mode switch). It reports as the `word-builder` activity (same progress, stars, badges, and `onAnswerSubmit` / `onActivityComplete` callbacks as before) and the public API is unchanged.

How it plays:

* **Empty glowing slots.** A picture and clue sit beside a row of slots. Every unfilled slot is an *empty* glowing outline: **the target letter is never drawn there** (no ghost, watermark or outlined glyph, not even at Starter level), so the word cannot be read before the child has placed its letters. The loose tiles are shuffled so they never spell the word left to right, with or without decoys. The answer exists only in the internal data used to validate each drop; a slot's accessible name says "Slot 1, empty" until a correct letter has landed. (An earlier version showed faint outline letters in the slots, which gave the answer away; that was removed.)
* **Living letters (touch feel).** A tap on a loose letter answers at once: it wiggles like a jelly toy with squash and stretch, lifts, gets a soft glow and a tiny sparkle, and a short pop plays. Its phonics *sound* (e.g. "puh", never the letter name) is spoken a moment later, so the pop and the voice never overlap, and the same letter is not spoken again within 1.4 s. Rapid taps share one pop. Tapping the picture wiggles it like a toy; it never says the word. A correct landing plays a gentle chime; finishing the word plays a short celebration and then the spoken "Hooray! You spelled …". Pip nudges after each pick and each landing.
* **Loose letters below.** Colourful rounded letter bubbles pop in with a staggered spring. Tap one and it **jiggles side to side with a little squash and stretch, lifts, and gets a soft shadow and glow**; drag one and it lifts and tilts while the slot under the pointer highlights.
* **Each drop is judged immediately** (there is no "Check" button). A letter only lands if it belongs in that slot; repeated letters work, so either P in APPLE fills either P slot.
* **Correct drop:** the *same bubble* that was picked up **flies to its slot** (about 0.35-0.5 s, along a gentle curve with a slight size change and a short fading trail), starting from where it really was: its tray position for tap-tap, or the exact spot where a drag was released. On arrival the bubble hands over to the slot's letter, which becomes the same glossy tile and **squashes and springs in** (one of the existing bounce / jelly / pop moves, varied per slot) with a soft glow flash and a small 8-star burst. The drop is *judged* the instant it happens (so fast taps and drags never block each other); only the visuals follow. Finishing the word waits for the last letter to land, then the letters hop in a staggered wave with a slightly larger burst, the word is read aloud, and a success message offers **Next word**.
* **Wrong drop:** nothing flies into the slot; the letter wobbles and (for a drag) springs back to the tray, with a kind message ("That letter goes in a different spot. Try another!"). Nothing is penalised and the word is never blocked. **Start this word again** reshuffles the letters. After two misses a hint pulses the next outline and puts a star on the matching letter.
* **Tap-to-select fallback.** Dragging is never required: tap a letter (it lifts and glows), then tap a slot. Tapping the letter again puts it down.
* **Keyboard and assistive tech.** Letters and slots are real buttons (Enter on a letter, then Enter on a slot). Typing a letter places it in the first matching empty slot. Every placement, miss and hint is announced through a polite live region.
* **Reduced motion.** With the OS setting (or `theme.motion: 'reduce'`) nothing moves: no jiggle, no flight, no trail; letters appear in their slot instantly, the star burst is omitted, the glow becomes an opacity fade, and the slot's filled colour plus the announcement still make the result clear.

Difficulty levels (same three bands as the rest of PlayLab; the words come from the shared Word Builder list):

| Level | Words | Decoy letters in the tray |
| --- | --- | --- |
| Starter | 3-letter words | **0** (easiest) |
| Explorer | 3- and 4-letter words | **1** |
| Adventurer (default) | all words | **2** |

**Decoy letters** are extra loose letters that are *not* in the word, so they fit no slot and dropping one just gives the gentle "different spot" feedback. They are chosen only from letters absent from the word, so a decoy can never stand in for a needed letter and **every word stays completable** at every level (checked by a unit test that solves all 18 words at all 3 levels).

Code lives in `src/playlab/features/word-builder/magic/`; it reuses existing shared pieces by import only and does not modify `TileBoard`, `lib/tiles`, `useRound`, `CelebrationEffect`, routing, activity registration, or `progressService`.

Design rules followed everywhere: no timers, no penalties, no "wrong" wording, always a way to retry, always a way home, large touch targets (≥ 44 px), visible keyboard focus.

### Difficulty levels

`starter` (Pre-K): 3-letter words, 5 short sentences, 3 answer choices, 3 pairs, no decoy letters in Word Builder ·
`explorer` (K): adds 4-letter words and sentences ·
`adventurer` (Grade 1, default): all content, 5 pairs, 4 choices.
The host app can lock the level with the `level` prop; otherwise it is a setting (gear icon).

---

## Rewards and "things you love" (for children)

Built for children aged about 4–10, so nothing needs reading to be understood: pictures, sounds and big tap targets come first.

* **Sticker book.** Every finished round earns the next sticker (a picture from the set: apple, cat, sun, fish, kite, dog, moon, whale, zebra, lion, tree, nest). Round 1 gives the first one. The book has twelve slots; locked slots show their number, and after twelve rounds the stickers repeat (the book shows the extra count). The round summary reveals the new sticker with a bounce, and the sticker book shows on **Home** and in **My Stars**. Stickers are not stored separately: they come from the rounds-finished count that progress already keeps, so there is no new data to lose or sync.
* **Love it (hearts).** A big "Love it" button appears on the letter you are looking at in Letter Playground, on a word once you have spelled it in Magic Letters, and on a sentence once you have built it. Tap it to keep it, tap again to take it out. Loved things wait in **Things you love** on Home (tap one to hear it again) and in My Stars (with a Remove button). They are saved on this device, per learner, and contain no personal data. If the device blocks storage, the hearts still work for the visit.
* **Magic Moments.** Touch answers feel alike across activities. A tapped word lifts and pops, and a tapped card pops; a placed word or letter travels into its spot and lands with a chime. A finished Magic Letters word makes its picture hop and throw stars; a finished sentence shows its key word big for a moment; a Missing Letter answer flies into the gap; a matched pair joins with a glowing line. Praise is spoken after the sound it follows, never on top of it, and nothing waits: the next step is there at once. Reduced motion keeps the sounds and drops the movement; sound off keeps the movement. The shared code is in `src/playlab/moments/` (`useMoments`, `FlyingTile`, `StarBurst`, `KeyWordReward`).
* **Quality pass (completion and timing).** A finished Magic Letters word brings Pip hopping onto the picture's corner with a small burst; the spoken cheer and the sentence read-aloud now wait for their whole fanfare (the fanfare is 0.6 s long, and the old 0.45 s wait talked over it). The landing chime and burst fire when a Sentence Fun word has actually arrived, not on a timer. Feedback messages wrap their action button underneath on narrow screens instead of squeezing the text.
* **Pip, the teacher.** Pip's speech bubble on Home reacts to progress ("Hi! I’m Pip, let’s learn together!" for a new child, then the sticker count). Pip also reacts with a hop after a right answer and a kind smile after a miss.
* **Numbered stations.** The five activities on Home are numbered 1–5 like stops on an adventure trail, so a child can see the route.

Reduced motion keeps all of this: stickers and hearts still appear and change; only the bounces, wobbles and hops are removed.

## Visual system (storybook world)

Every screen is a small painted world (and a child-friendly set of rewards is described above), built only from SVG, CSS and the animation library already installed (no image files, no new dependencies, no network):

* **Scenery** (`components/Scene.tsx`): a sky, drifting clouds, layered hills, swaying trees, flowers, twinkles and (on some screens) fireflies, a rainbow or mushrooms. Each activity has its own palette: Home and Word Builder = sunny meadow, Sentence Fun = golden storybook, Matching = forest, Letter Playground = rainbow garden, Sound Discovery = dusk. Ambient motion is slow transform/opacity loops only, and is switched off by reduced motion.
* **Surfaces** (`styles/playlab.css`): `pl-wood` (wooden signs, tray shelves), `pl-paper` (parchment strips), `pl-board` (wood-framed learning board), `pl-frame` (picture frame), `pl-gem` / `pl-gem-soft` (glossy candy tiles in any colour via `--gem`). Brand green `#16a286` stays the identity colour, with sky blue, sun yellow, orange, coral and purple around it.
* **Mascot**: the existing mascot "Pip" (there is no rhino asset in this repository, so it was not used). `components/Companion.tsx` makes Pip react: a slow idle float, a head-tilt while a letter is picked up, a gentle sway with a kind small smile after a miss, a hop with raised arms after a right answer. Pip sits next to a speech bubble (`FeedbackMessage`) on every activity.
* **Shared pieces**: a hanging wooden title sign and an adventure-trail progress indicator (stepping stones that turn into golden stars) in `ActivityHeader` / `ProgressIndicator`, a story book for the Sentence Fun picture (`StoryBook`), and a glowing rope of light between matched pairs in `PairingBoard`.
* **Reduced motion**: no scenery movement, no mascot reactions, no flights, trails or bursts; colour, glow and the slot/tile states still show what happened.

## The reference reel: what was observed, what was designed

I studied the attached video by extracting frames (88 s, 530×550, sampled at 2–5 fps; **audio was not analysed**).

**Observed in the frames**

* Loose lowercase letters (e, r, a) in different colours, plus a faint outlined "are" as the target.
* A finger **drags** a letter; it follows the touch; it looks slightly distorted while held.
* Dropped letters **snap** into the outline slots and take a new colour.
* Completing the word: a **burst of yellow stars**, the letters re-colour to a textured orange, and a small character peeks in over the word.
* A sentence screen follows. Tapped words pop out large; completing it triggers another star burst and a full illustrated scene (monsters with tennis rackets).

**Not observable** (so not claimed): exact easing curves, durations, particle counts, any sound, or the app's code. All timings in PlayLab are my own design (see `src/playlab/motion/variants.ts`).

**How it shaped the product**

* Direct manipulation is the core: letters respond *under the finger* (tap squash, drag with spring-back) → Alphabet and Word Builder.
* Ghost outlines + snapping → Word Builder slots, as *empty* glowing outlines (the faint ghost letters were dropped so the answer is not revealed).
* Star-burst on success, colour change as reward → `CelebrationEffect` + success states.
* Sentences made of touchable words → Sentence Fun.

---

## Architecture

```
src/
  main.tsx                       standalone entry (/, /?host, /?gallery)
  standalone/                    NOT part of the integration: hash-sync host, example host app, illustration gallery
  playlab/                       <- the portable feature module (public entry: index.ts)
    index.ts                     public API: PlayLab, registerContentPack, adapters, types
    app/                         PlayLab.tsx (root + providers), PlayLabContext, routes (lazy screens)
    components/                  AppShell, ActivityHeader, ActivityCard, ProgressIndicator, FeedbackMessage,
                                 PronunciationControl, AnimatedLetter, LetterGrid, CelebrationEffect,
                                 TileBoard, PairingBoard, RoundSummary, Button, Mascot, Logo, Icon, SettingsPanel
    features/                    alphabet/ phonics/ word-builder/ sentence-builder/ matching/ home/ progress/
    data/                        en/{alphabet,words,sentences}.ts, activities.ts, badges.ts, registry.ts (language packs)
    hooks/                       useRound (shared question state machine), useAudio, useRipple
    services/                    audioService, progressService (pure reducer + adapters), progressStore, settingsService
    motion/variants.ts           the reusable animation vocabulary
    lib/                         tiles (slot logic), questions, level, random, accents, theme, dom, messages
    illustrations/               32 original inline-SVG illustrations
    styles/                      playlab.css + vendored Latin fonts
    types/                       learning.ts (domain), api.ts (public props)
    test/                        test setup, fake audio
e2e/                             Playwright tests (functional, responsive, a11y/axe, host integration)
docs/                            INTEGRATION.md, TESTING.md
scripts/finalize-lib.mjs         writes dist-lib/package.json
```

Separation of concerns: **content** (`data/`), **presentation** (`components/`, `features/`), **animation** (`motion/`), **progress** (`services/progress*`), and **learning logic** (`lib/tiles.ts`, `lib/questions.ts`) never import each other sideways: logic is pure and unit-tested.

Deviation from the suggested layout: everything lives under `src/playlab/` (instead of `src/app`, `src/components`, ...) so the feature is one folder that cannot collide with the host's folders.

### Motion

`src/playlab/motion/variants.ts` exports the named vocabulary: tap response, spring bounce, gentle rotation, wobble, float, ripple, selection, drag-and-drop, correct, incorrect, completion, celebration. All animate **transform and opacity only**, finish in under ~1 s, and return to rest so input stays responsive. A new burst replaces the previous one, so rapid answers never pile up. Continuous animation is limited to the mascot's idle float/blink.

**Reduced motion** is respected two ways: the OS `prefers-reduced-motion` setting (CSS + Framer `MotionConfig`), and the host's `theme.motion = 'reduce'`. Under reduced motion no transforms run; selection is still unmistakable (colour fill + ring), ripples become a short opacity flash, and confetti becomes a soft glow.

### Audio: what is and isn't there

* **Choosing a voice (free, browser-only).** Open **Settings → Voice**: a dropdown of the English voices on the device (American English first; accents and *online* voices are labelled), **Preview voice** to hear a sample in the highlighted voice *without saving it*, and **Use this voice** to save it. The choice is stored locally with the other settings (per learner id, if one is given) and applies everywhere: Magic Letters and every other activity. "Automatic (best American English)" is the default and prefers on-device `en-US` voices. If the saved voice is not on the device, PlayLab falls back to automatic silently; with no American voice the closest English voice is used (and Settings says so); with no English voice or no speech support Settings explains and the activities still work. No novelty-voice filtering is applied. Speech style is conservative and lives in one constants block (`SPEECH_STYLE` in `services/audioService.ts`: rate 0.9, pitch 1.05); no paid service, API key, or network call is involved. The Web Speech API offers no emotion control, so the "friendly teacher" feel comes from the voice you pick plus these small tweaks.
* **No recorded voice files are bundled** and none are claimed. By default PlayLab uses the browser's built-in speech synthesis, so **pronunciation depends on the browser, the operating system and the installed voice**. Browser speech cannot say a sound on its own, so a letter's sound is heard inside its example word (`sound.speech` in `data/en/alphabet.ts`), and a recording can replace that when one is added (`audio/phonics/`).
* To use real recordings, set `audio: { name, sound, word }` URLs on letter entries (via a content pack). A clip is tried first; speech is the fallback.
* If speech is missing, blocked, silent (no voices) or throws, the UI keeps working, a kind notice appears, and buttons explain what happened. Audio never blocks an animation: every call is fire-and-forget.
* Sound effects are tiny tones **synthesized with Web Audio** (no files). The speaker button in the header mutes everything.

### Assets that may need replacing

| Asset | State | Replace by |
| --- | --- | --- |
| Illustrations (32) | Original simple SVGs, `src/playlab/illustrations/art.tsx` | Edit/replace the entry for an id (view all at `/?gallery`) |
| Logo mark | Supplied Edurance graduation-cap artwork, `src/playlab/assets/edurance-graduation-cap.png`; favicon `public/favicon.png` | Replace the PNG files (the favicon is a square, padded 32 px copy) |
| Mascot "Pip" | Stand-in drawn for this project (`components/Mascot.tsx`) | Official Edurance character |
| Voice recordings | None | `audio` URLs in the content pack |
| Fonts | Andika + Fredoka (SIL OFL), Latin only, vendored in `styles/fonts/` | Add a Devanagari font when adding Hindi |

### Privacy

Everything runs in the browser: no network calls, no analytics, no accounts. Only non-sensitive demo data is stored in `localStorage` (counts, stars, badges, last results, sound/level setting), under `edurance.playlab.*` keys, optionally namespaced by an opaque learner id.

---

## Known limitations and future improvements

* **Browsers/devices:** automated tests ran in Chromium only (desktop, with phone/tablet viewports and *emulated* touch). **Not tested:** real iOS/Android devices, Safari, Firefox, real finger drags, assistive-technology users, low-end-device performance.
* **Voices:** see Audio above. iOS/Safari additionally need a prior user gesture before speech.
* **Languages:** only English content ships. Content (letters/words/sentences) is pluggable via `registerContentPack`; **UI strings are English-only**, and the letter model assumes a bicameral alphabet (upper/lower case), so Hindi will need a small model extension (see INTEGRATION.md → *Adding a language*).
* **Magic Letters on small screens:** on a 375 × 740 phone the second row of loose letters can sit slightly below the fold (all slots and the first row stay visible; tap-to-select covers the rest). Rounds recorded before the Classic mode was removed still show as Word Builder in *Recently finished* (the progress service is unchanged).
* **Test suite status:** the unit suite is **not fully green**: a few older timing-sensitive tests fail on the unmodified baseline too. See [docs/TESTING.md](docs/TESTING.md) for exactly which.
* **Content size:** 26 letters, 18 words, 11 sentences. Enough to demo and test; a real curriculum needs more and curriculum review of the phonics choices (e.g. x → *fox*, q → *quilt*, y → *yo-yo*).
* **Progress model** is deliberately simple (stars, rounds, badges, last 8 rounds). There is no spaced repetition or adaptive difficulty yet; the `AnswerResult` stream is designed so the main app can build that.
* **Hostile CSS:** isolation handles normal global/legacy CSS. Rules using `!important` against bare elements can't be overridden by a scoped stylesheet; embed in an `<iframe>` in that case.
* No ESLint/Prettier configuration is included (TypeScript strict mode, including `noUncheckedIndexedAccess`, is on).
* Bundle: main chunk ≈ 339 kB (≈ 111 kB gzip; React + Framer Motion + shell), each activity is a separate lazy chunk (2–5 kB gzip each), CSS ≈ 6.7 kB gzip, fonts ≈ 68 kB. Not profiled on low-cost hardware.

## Licence notes

Application code: owned by the Edurance team (no licence file added). Bundled fonts are under the SIL Open Font License 1.1 (see `src/playlab/styles/fonts/`).
