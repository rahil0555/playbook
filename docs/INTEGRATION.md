# Integrating Edurance PlayLab into the main Edurance app

Audience: the co-founder working on the main Edurance web app (React + Vite + TypeScript).

PlayLab is a **self-contained React component**. It brings its own state, audio, progress store and (scoped) CSS. It does **not** import the main app's modules, Supabase client, auth state, global CSS or router, and it never reads or changes the URL by itself.

---

## 0. Merge checklist (please keep this gate)

Nothing from PlayLab should be merged into the main app until **both** are true:

- [ ] The standalone interactions have been **tried by a human** on a phone/tablet (the automated tests below do not replace this; see `docs/TESTING.md` → *Not tested*).
- [ ] **You have reviewed this guide** and agreed the contract (props, callbacks, adapter).

Then, in order:

1. Build the package (§2) and install it in a **throw-away branch** of the main app first.
2. Mount it on one route behind a feature flag (§3).
3. Check the *Integration verification* list at the end of this file.
4. Only then open a PR in the main repo.

PlayLab's own work lives on the branch `claude/edurance-playlab-playground-sqbe8i` of the `playbook` repository, separate from the main app.

---

## 1. Public API

Import everything from the single entry point (`src/playlab/index.ts` / the `@edurance/playlab` package).

```ts
import { PlayLab, registerContentPack, createLocalStorageAdapter, createMemoryAdapter, PLAYLAB_VIEWS, isPlayLabView } from '@edurance/playlab';
import type {
  PlayLabProps, PlayLabTheme, PlayLabLearner,
  ProgressAdapter, ProgressSnapshot, ProgressEvent,
  AnswerResult, ActivityCompletion,
  ContentPack, LetterEntry, WordEntry, SentenceEntry,
  ActivityId, PlayLabView, DifficultyLevel, LanguageCode, BadgeId,
} from '@edurance/playlab';
import '@edurance/playlab/style.css';   // required, once
```

```tsx
<PlayLab language="en" initialActivity="alphabet" onExit={handleExit} />
```

### `PlayLabProps` (all optional)

| Prop | Type | Default | Meaning |
| --- | --- | --- | --- |
| `initialActivity` | `'home' \| 'progress' \| ActivityId` | `'home'` | Screen to open first. `ActivityId` = `'alphabet' \| 'phonics' \| 'word-builder' \| 'sentences' \| 'matching'`. |
| `view`, `onViewChange` | `PlayLabView`, `(v) => void` | uncontrolled | **Controlled navigation.** Pass `view` + `onViewChange` to mirror the current screen in your own URL/router (§4). `onViewChange` also fires in uncontrolled mode. |
| `language` | `LanguageCode` | `'en'` | Content language. Unknown languages fall back to English. See §9. |
| `level` | `'starter' \| 'explorer' \| 'adventurer'` | child chooses (default `adventurer`) | Difficulty band (≈ Pre-K / K / Grade 1). **If you pass it, the in-app level picker is hidden** and you stay in charge. |
| `theme` | `{ brandColor?: string; motion?: 'system' \| 'reduce' }` | `#16a286`, `'system'` | `brandColor`: 6-digit hex; the 10-step scale is derived (use dark/mid colours: white text sits on step 700). `motion: 'reduce'` forces reduced motion (e.g. your own accessibility switch). |
| `learner` | `{ id: string; displayName?: string }` | none | `id` is an **opaque** id used only to namespace saved progress/settings. `displayName` is shown in the greeting and **never stored**. Do not pass emails or full names. |
| `progressAdapter` | `ProgressAdapter` | local storage | Replace persistence (§5). |
| `onAnswerSubmit` | `(r: AnswerResult) => void` | | Every answer attempt (right or wrong). |
| `onActivityComplete` | `(c: ActivityCompletion) => void` | | Once when a round finishes. |
| `onExit` | `() => void` | | Shows a **"Back to Edurance"** button in the header and calls this. **The button only exists when this prop is passed.** |
| `className` | `string` | | Extra class on the root element (layout only). |

Host callbacks are wrapped in `try/catch`: a throwing callback is logged (`console.error`) and never breaks the lesson.

### Callback payloads

```ts
interface AnswerResult {
  activityId: ActivityId;
  questionId: string;          // e.g. 'apple', 's2', 'snd-b', 'letter-picture:t'
  correct: boolean;
  attempt: number;             // 1 = first try at this question
  response: string;            // what the child chose/built
  expected: string;
  timestamp: number;           // ms since epoch
}
interface ActivityCompletion {
  activityId: ActivityId;
  score: number;               // questions right on the FIRST try
  total: number;
  stars: 1 | 2 | 3;            // never 0
  durationMs: number;
  level: DifficultyLevel;
  variant?: string;            // matching only: 'letter-picture' | 'sound-letter' | 'word-completion'
  timestamp: number;
}
```

Semantics worth knowing: a *round* is 5 questions (matching: 3–5 pairs; alphabet: 5 distinct letters). The alphabet reports `score: 5, total: 5, stars: 3` when the child has found 5 new letters, and may report again after "Keep exploring". An answer to an already-solved question is ignored, so double taps do not double count.

---

## 2. Getting PlayLab into the main app

### Option A (recommended): install the built package

In the PlayLab repo:

```bash
npm install
npm run build:lib          # -> dist-lib/  (ESM, one CSS file, .d.ts, package.json)
cd dist-lib && npm pack    # -> edurance-playlab-0.1.0.tgz
```

In the main app:

```bash
npm install /path/to/edurance-playlab-0.1.0.tgz
npm install framer-motion@^12      # peer dependency, if not already installed
```

(Or publish the tarball to your private registry. For quick local iteration `npm install ../playbook/dist-lib` works too, but npm *symlinks* it, which can cause duplicate-`@types/react` errors; prefer the tarball.)

**Peer dependencies:** `react` and `react-dom` ≥ 18.2 (tested with 18.3.1) and `framer-motion` ≥ 12 (tested with 12.43). **Tailwind is not required** in the main app: the stylesheet is precompiled.

This route was verified in a separate scratch project: tarball install → strict `tsc` (with `skipLibCheck: false`) → `vite build` → opened in Chromium; fonts load, no console errors, no failed requests.

### Option B: copy the source folder

Copy `src/playlab/` into the main app. This works, but you must then compile PlayLab's Tailwind setup yourself (see `tailwind.config.ts`: `important: '.pl-root.pl-root'`, `preflight: false`, the `brand`/`ink`/`coral`/`sun`/`sky`/`plum` colours, the two font families, the `content` glob). **If the main app also uses Tailwind, do not merge these settings into its config** (`important` would scope *its* utilities too). Use Option A, or a separate Tailwind build for the PlayLab folder.

### Assets to copy

Nothing, with Option A. The CSS carries the fonts (Latin Andika + Fredoka, base64-embedded, ≈ 130 kB CSS / 77 kB gzip). Illustrations are inline SVG in the JavaScript. There are no audio files. The logo mark and mascot are inline SVG stand-ins (swap for official artwork: `components/Logo.tsx`, `components/Mascot.tsx`).

### Styles to include

`import '@edurance/playlab/style.css'` once, anywhere (e.g. in the route module that renders `<PlayLab />`). With Option B: `import './playlab/styles/playlab.css'` through a Tailwind-enabled pipeline.

---

## 3. Embedding in an existing route

PlayLab renders a normal block element that fills the width of its parent (content is centred, max-width 72 rem). It is not a portal, so put it where you want it in the layout.

```tsx
// src/routes/PlayLabRoute.tsx   (main app, React Router v6 shown; any router works)
import { useNavigate } from 'react-router-dom';
import { PlayLab } from '@edurance/playlab';
import '@edurance/playlab/style.css';

export default function PlayLabRoute() {
  const navigate = useNavigate();
  const student = useCurrentStudent();           // your own hook

  return (
    <PlayLab
      language="en"
      initialActivity="alphabet"
      level={levelFromGrade(student.grade)}      // optional, hides the in-app picker
      learner={{ id: student.id, displayName: student.firstName }}
      progressAdapter={eduranceProgressAdapter(student.id)}   // §5
      onAnswerSubmit={(r) => api.recordAnswer(student.id, r)}
      onActivityComplete={(c) => api.recordCompletion(student.id, c)}
      onExit={() => navigate('/dashboard')}
    />
  );
}
```

Feature-flag it, and load it lazily so the main bundle does not grow:

```tsx
const PlayLabRoute = lazy(() => import('./routes/PlayLabRoute'));
<Route path="/playlab/*" element={flag('playlab') ? <Suspense fallback={<Spinner />}><PlayLabRoute /></Suspense> : <NotFound />} />
```

**Sizing.** By default PlayLab is at least one viewport tall (`100dvh`). Under a fixed app header set a smaller minimum on any ancestor: `style={{ '--pl-min-height': 'calc(100dvh - 64px)' }}`.

**Stacking.** The settings popover is `z-index: 50` inside the component; the "new badge" toast is `position: fixed; z-index: 60` (it is meant to float over the page). If a host ancestor has a CSS `transform`/`filter`, `fixed` positioning is relative to that ancestor.

**SSR / Next.js.** PlayLab is client-side. Mount it from a client component (`'use client'`) or `dynamic(() => import(...), { ssr: false })`. (Not tested in a Next.js app.)

---

## 4. Routing: avoiding conflicts

* PlayLab has **no router dependency** and never touches `location` or `history`. Navigation between its screens is internal state.
* Uncontrolled (default): it manages its own screen; you do nothing.
* Controlled: pass `view` + `onViewChange` to mirror the screen in your URL, so refresh/back/forward work:

```tsx
import { useNavigate, useParams } from 'react-router-dom';
import { PlayLab, isPlayLabView } from '@edurance/playlab';

function PlayLabRoute() {
  const navigate = useNavigate();
  const { view } = useParams();                 // <Route path="/playlab/:view?" ...>
  return (
    <PlayLab
      view={isPlayLabView(view) ? view : 'home'}
      onViewChange={(v) => navigate(`/playlab/${v}`)}
      onExit={() => navigate('/dashboard')}
    />
  );
}
```

* The standalone app itself uses `location.hash` (`#/word-builder`) via `src/standalone/StandaloneApp.tsx`: a ~30-line reference implementation of controlled mode that needs no server rewrites.
* No main-app URLs are hard-coded anywhere.

---

## 5. Connecting progress

PlayLab keeps two kinds of numbers:

* **Lifetime progress** (`ProgressSnapshot`): stars, activities started, answers tried, correct answers, rounds finished, per-activity counts, letters found, badges, last 8 rounds. Persisted through the adapter.
* **Session stats**: this visit only, in memory, reset on every mount.

All state changes are computed by a pure reducer from four event types, so you can also ignore persistence completely and just consume events.

```ts
interface ProgressAdapter {
  load(): ProgressSnapshot | null | Promise<ProgressSnapshot | null>;
  save(snapshot: ProgressSnapshot): void | Promise<void>;   // after every change, full snapshot
  track?(event: ProgressEvent): void;                       // optional raw event stream
  clear?(): void | Promise<void>;                           // "Start over" button
}

type ProgressEvent =
  | { type: 'activity_started';   activityId; timestamp }
  | { type: 'answer_submitted';   result: AnswerResult }
  | { type: 'activity_completed'; completion: ActivityCompletion }
  | { type: 'letter_explored';    letter: string; timestamp };
```

Behaviour you can rely on (all covered by tests):

* `load()` may be async. Events that happen before it resolves are **queued and replayed**; nothing is lost or overwritten.
* `load()`/`save()` may throw or reject; PlayLab logs a warning and keeps working in memory.
* Snapshots coming back from `load()` are validated/normalised, so corrupt or older data cannot crash the UI.
* The default adapter is local storage under `edurance.playlab.progress.v1[:learnerId]`, with an in-memory fallback if storage is blocked or full.

Example: a server-backed adapter.

```ts
export const eduranceProgressAdapter = (studentId: string): ProgressAdapter => ({
  load: async () => (await api.getPlaylabProgress(studentId)) ?? null,
  save: (snapshot) => { void api.putPlaylabProgress(studentId, snapshot); },   // debounce if you like
  track: (e) => analytics.playlab(e),                                          // optional
  clear: () => api.deletePlaylabProgress(studentId),
});
```

Alternatively keep the default adapter and only forward `onAnswerSubmit` / `onActivityComplete` to your API. The star rules are: +1 star per question right on the first try, +1–3 stars when a round ends (always at least 1). Badges are awarded by the same reducer (`services/progressService.ts`).

Store only non-sensitive data. PlayLab itself stores no names, emails or identifiers other than the opaque `learner.id` used in the storage key.

---

## 6. Student-specific configuration (now and later)

Today, pass per-student values as props: `learner.id`, `learner.displayName`, `level`, `language`, `theme.brandColor`, `initialActivity` (e.g. an assigned activity). Because `level` locks the in-app picker, deriving it from the student's grade keeps content appropriate.

Natural next steps that fit the current contract: assign a specific activity via `initialActivity`; adapt difficulty from the `AnswerResult` stream (`attempt`, `correct`, `questionId`); supply recorded audio (§8). If you need more per-student inputs (a custom word list, an allowed-activities list), add them as **new optional props** on `PlayLabProps` (`types/api.ts`); keep the surface small.

---

## 7. CSS isolation: what it does and doesn't guarantee

* Tailwind **preflight is off**; every utility is scoped under `.pl-root.pl-root` (specificity 0,3,0); PlayLab's own reset is `.pl-root.pl-root <element>` (0,2,1); custom classes are prefixed `pl-`. Nothing here restyles the host's elements or classes.
* PlayLab is protected against normal host CSS: unscoped element rules (`button { … }`, `h1 { … }`, `* { box-sizing: content-box }`) and wrapper-scoped rules (`.app button { … }`). This is tested in the browser (`/?host` → "Legacy CSS" toggle; e2e test *aggressive global host CSS does not change how PlayLab looks* compares computed styles with and without hostile CSS).
* **Not defended:** host rules that use `!important` against bare elements, or ID selectors. If your app has those, embed PlayLab in an `<iframe>` (deploy the standalone build and load `/playlab/#/alphabet`).
* Small global leaks that remain, all harmless: the Tailwind base layer defines `--tw-*` custom-property defaults on `*`, `::before`, `::after`; `@font-face` families named `Andika` and `Fredoka Variable`; a few `@keyframes` named `pl-*`.
* Brand colour is exposed as CSS variables `--pl-brand-50 … --pl-brand-900` on the root element (set by `theme.brandColor`).

## 8. Audio

* No recorded voice is bundled. By default the browser's speech synthesis is used (voice quality varies by device; some devices have no voice). PlayLab detects "no voice / blocked / unsupported", shows a kind notice and keeps working.
* To supply recordings, register a content pack whose letters carry `audio: { name?: string; sound?: string; word?: string }` URLs (served by your app). A clip is tried first; speech is the fallback if the file cannot be played.
* Sound effects are synthesized (Web Audio); no files to ship. The header speaker button mutes everything and is remembered per learner.

## 9. Adding a language (e.g. Hindi)

Content is separated from code. A language is a `ContentPack`:

```ts
import { registerContentPack } from '@edurance/playlab';
import type { ContentPack } from '@edurance/playlab';

const hi: ContentPack = {
  language: 'hi',
  label: 'हिन्दी',
  speechLang: 'hi-IN',            // BCP-47 tag handed to speech synthesis
  letters: [/* LetterEntry[] */],
  words: [/* WordEntry[] */],
  sentences: [/* SentenceEntry[] */],
};
registerContentPack(hi);          // before rendering <PlayLab language="hi" />
```

See `src/playlab/data/en/*.ts` for the exact shapes (a `LetterEntry` has separate `name` and `sound`; words/sentences carry `level` 1–3 and an `illustration` id from the bundled set).

What is **not** language-ready yet (honest list):

1. UI chrome strings (buttons, headings, feedback) are English literals in the components; they need extracting into the pack.
2. The alphabet screen assumes a bicameral script (shows "Big/Small" for `upper`/`lower`); Devanagari needs a single-glyph (or conjunct-aware) presentation.
3. A Devanagari-capable font must be added (`styles/fonts/README.md`).
4. Word builder splits a word into tiles by JavaScript characters; Devanagari needs grapheme-aware splitting (`Intl.Segmenter`).
5. Hindi content needs native-speaker/curriculum review.

## 10. Replacing illustrations, logo, mascot

Illustrations are in `src/playlab/illustrations/art.tsx` (`ART[id]` → SVG children; ids are the `IllustrationId` union). Review all of them at `/?gallery`. To use designer artwork, replace the entry for an id with `<image href=… />` or your own SVG. The logo mark (`components/Logo.tsx`) and mascot (`components/Mascot.tsx`) are stand-ins.

---

## 11. Integration verification (run in the main app's throw-away branch)

- [ ] `<PlayLab />` renders on its route; no console errors; fonts load.
- [ ] A throwing `onAnswerSubmit` does not break the lesson (check once on purpose).
- [ ] `onExit` returns to the right place; the button is absent when `onExit` is omitted.
- [ ] Reload mid-activity: with controlled navigation you land on the same screen; progress persists through your adapter.
- [ ] Main-app screens before/after look unchanged (no CSS bleed either way).
- [ ] Phone and tablet, touch: tap, drag, no accidental page scroll while dragging tiles.
- [ ] Device with sound off / no voices: lessons still work and say so.
- [ ] OS "reduce motion" on: no movement, selection still obvious.
- [ ] Bundle: PlayLab is lazy-loaded. The package adds ≈ 30 kB gzip of JavaScript on first open (React and Framer Motion are your peer dependencies, not bundled) plus ≈ 77 kB gzip CSS (mostly the fonts), then 1–5 kB per activity.

## 12. Versioning

`0.x`: the props in §1 and the adapter interface are the intended stable surface; everything else (components, hooks, services) is internal and may change. Tell us what you need before relying on anything not exported from `index.ts`.
