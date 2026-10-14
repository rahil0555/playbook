# Magic Letters: letter sounds

Magic Letters teaches the sound each letter makes in the word on screen, not the letter's name. For CAT, the c says /k/,
the a says the short vowel in "cat", and the t says /t/. The same letter can make a different sound in another word: the
a in WHALE says its name, the o in MOON is a long oo, and the o in LION is the soft schwa.

**Current state: no recordings are in the build.** Magic Letters asks for each sound and plays nothing for it. See
"Blocker" below. Nothing is spoken in place of a missing recording.

## Where things live

- `src/playlab/data/en/words.ts`: each word lists the sound of each letter, in order. `null` means the letter has no sound of
  its own: the second letter of a two-letter sound (the h in FISH, the second o in BOOK) or a silent letter (the e in KITE).
  Unchanged by the recording work.
- `src/playlab/data/en/phonemes.ts`: the catalogue of the 28 sounds, one entry each, with its symbol and a teacher example.
- `src/playlab/audio/phonics/index.ts`: `PHONIC_CLIPS`, the manifest that maps each sound id to its recording, with the source
  and licence of every file. A sound with no entry has no recording.
- `src/playlab/audio/phonics/README.md`: the list of recordings to make, how each should sound, the source and licence rules,
  and how to add one.
- `src/playlab/services/phonics.ts`: `phonicRequest(id)`, the one function that turns a sound into an audio request. It asks
  for the recording only (`clipOnly`), so a missing recording is never replaced by speech.
- `src/playlab/services/audioService.ts`: plays a recording (one at a time), and `later()`, which returns a handle that can be
  cancelled and reports when its sound has finished (`done`).
- `src/playlab/hooks/useAudio.ts` (`laterPhonic`) and `src/playlab/moments/useMoments.ts` (`sayPhonic`): the scheduling used
  by Magic Letters. Only one scheduled line or sound waits at a time.
- `src/playlab/features/word-builder/magic/MagicQuestion.tsx`: decides when each sound is asked for.

## What the child hears

- **Picking up a letter** (tap): the sound it makes in this word, asked for after the pop (about 170 ms), so it never sits on
  top of it. The sound is for the spot the letter is heading for: the first empty spot with that letter.
- **Holding a letter** (drag): its sound for this word repeats until the letter is let go, and stops at once on release.
  A drop then says the letter's sound once, from its landing.
- **Placing a letter** (drop or type): its sound, after its landing chime. A letter that was picked first has already had its
  sound, so placing it does not say it again.
- **One sound at a time.** Picking another letter cancels the sound still waiting, and cuts short the one still playing.
- **Dropping near a spot**: the empty spot a dragged letter is over or close to glows and pulses. The glow and the drop use the
  same spot (the nearest empty one, within most of a spot's width).
- **Silent letters** (the h in FISH, the e in KITE): picking or placing them asks for no sound, and picking one still cancels
  the sound that was on its way.
- **Decoys and spare letters** (a tile that fits no spot): no letter sound.
- **Sound off** (Settings): no sound is asked for, played or spoken.
- **Restart** ("Start this word again" or "Shuffle letters"): cancels any sound or line still waiting or playing from the
  old attempt.
- **The cheer** ("Hooray! You spelled pig!") comes after Pip's fanfare begins, and waits for the last letter's sound to finish
  before it starts. If the last letter has no recording, the cheer does not wait for it.
- **Rapid taps**: the same letter is asked for at most once in a 1.4 s window, so a burst of taps does not stack sounds.

## Blocker

No recordings could be obtained for this change. The build environment could not reach the free audio sources it would need
(Wikimedia, Freesound and Internet Archive were denied by the network proxy). A search for a free, licensed set of isolated
English phoneme recordings found none that could be used: the sets found were non-commercial, were sentence recordings under
an incompatible licence, or cost money.

Consequence: until recordings are added, Magic Letters plays **no letter sounds**. Before this change it spoke approximate
sounds ("tuh", "kuh", "fff"), which the team had rejected as incorrect. Silence is the honest state, and it is a user-visible
change that needs a decision: record the sounds (see `src/playlab/audio/phonics/README.md`), or accept silence for now.

## Recordings still missing

All 28 sounds have no recording:

b, d, f, g, h, k, l, m, n, ng, p, r, s, sh, t, w, z (consonants)
a-short, e-short, i-short, o-short, u-short, oo-short, a-long, i-long, o-long, oo-long, schwa (vowels)

The full list, with symbols and teacher examples, is in `src/playlab/audio/phonics/README.md`.

## Tests

Automated, with the fake audio service (`src/playlab/test/fakeAudio.ts`), which plays each recording in a set time and records
the order of sounds:

- `src/playlab/data/en/phonemes.test.ts`: the word-to-sound mapping (CAT, PIG, silent letters, doubled consonants), the recording
  status of each sound (recorded, or listed as missing), that every recording names its source and licence, and that every
  sound has a symbol and a teacher example.
- `src/playlab/services/phonics.test.ts`: each sound asks for its own file, and a sound with no file asks for nothing audible.
- `src/playlab/services/audioClips.test.ts`: the real audio service plays one recording at a time, cancels and finishes clips,
  and never speaks in place of a recording.
- `src/playlab/features/word-builder/magic/magicFeel.test.tsx`: the timing: sound after the pop, after the chime, once per
  letter, cancelled by another pick, silent letters, sound off, no recording, and the cheer after the last sound.
- `e2e/magic-phonics.spec.ts` and `e2e/magic-feel.spec.ts`: in the browser, no letter name and no spelling is spoken, the
  cheer comes once after the word, and sound off keeps everything silent.

These tests check what the app asks for and when, not what a child hears. They cannot check that a recording sounds right.

## Real desktop listening (not done yet)

Once recordings are in, test on a real desktop before calling the sounds correct. Use Chrome, Edge, Firefox and Safari, with
the sound turned on, and play CAT, PIG, FISH, KITE, MOON and BOOK in each browser.

- [ ] Each sound is the sound, not its letter name (no "ef" for f, "em" for m, "ess" for s, "tee" for t).
- [ ] Each sound is short and clean, with no extra vowel added to a consonant.
- [ ] The short and long vowels are told apart (the i of PIG and the i of KITE).
- [ ] The sh of FISH and the ng of MANGO sound right.
- [ ] Picking a letter: the pop comes first, then the sound, with no overlap.
- [ ] Placing a letter: the chime comes first, then the sound, once.
- [ ] Picking then placing the same letter: one sound.
- [ ] Picking another letter quickly: the first sound stops.
- [ ] A silent letter (the h in FISH): no sound.
- [ ] The last letter's sound finishes before "Hooray! You spelled ...!".
- [ ] Sound off in Settings: no sound and no cheer.
- [ ] Start again mid-word: nothing from the old attempt is heard afterwards.
- [ ] Each recording plays on the device at a normal volume, and the first sound after opening the page is not cut off.
- [ ] Repeat on an Android phone and an iPhone (Safari) before this is used with children.

## Not changed here

The Alphabet activity still speaks each letter's sound with the older speech approximation (`sound.speech` in
`data/en/alphabet.ts`). That was left alone so this change stays in Magic Letters. The same recording approach should be used
there once recordings exist.
