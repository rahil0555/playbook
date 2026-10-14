# Magic Letters sound recordings

Magic Letters plays a short recording of the sound each letter makes in the word on screen. The sounds are listed in
`src/playlab/data/en/phonemes.ts` and the word data in `src/playlab/data/en/words.ts`. This folder holds the recordings and
the manifest that maps each sound to its file (`index.ts`, `PHONIC_CLIPS`).

**Status: no recordings are in the repository yet.** None could be obtained from a licensed free source in the environment
this was built in, and none have been made up. Until they are added, Magic Letters asks for each sound and plays nothing for
it. It never falls back to speech: browser speech reads a bare consonant as its letter name ("f" as "ef") or needs a made-up
spelling ("tuh"), and neither is the sound.

## What to record (28 sounds)

Each sound needs one isolated clip of that sound only. It must not be a letter name, a spelling, or a whole word.

| Sound id | Symbol | Teacher example (never played) |
|---|---|---|
| `b` | /b/ | bat |
| `d` | /d/ | dog |
| `f` | /f/ | fish |
| `g` | /g/ | goat |
| `h` | /h/ | hat |
| `k` | /k/ | cat |
| `l` | /l/ | lion |
| `m` | /m/ | moon |
| `n` | /n/ | nest |
| `ng` | /ŋ/ | mango (the ng of sing) |
| `p` | /p/ | pig |
| `r` | /r/ | zebra |
| `s` | /s/ | sun |
| `sh` | /ʃ/ | fish (the sh of ship) |
| `t` | /t/ | tree |
| `w` | /w/ | whale |
| `z` | /z/ | zebra |
| `a-short` | /æ/ | cat |
| `e-short` | /ɛ/ | pen |
| `i-short` | /ɪ/ | pig |
| `o-short` | /ɔ/ | dog |
| `u-short` | /ʌ/ | sun |
| `oo-short` | /ʊ/ | book |
| `a-long` | /eɪ/ | whale |
| `i-long` | /aɪ/ | kite |
| `o-long` | /oʊ/ | mango |
| `oo-long` | /uː/ | moon |
| `schwa` | /ə/ | zebra (the weak vowel in "about") |

The teacher examples are for the person recording, so they can hear the sound in context. They are never played, and they
are never said in the app.

### How each clip should be

- Only the sound: no letter name, no example word, no "the sound of".
- Short: about 0.2 to 0.6 seconds, with the sound starting almost at once and no long tail. While a letter is held down, its
  recording repeats, so it should also loop cleanly: little or no silence at the start and the end.
- Clean and steady: a single voice, a quiet room, no music, no echo.
- Consonants: say the sound itself (`/b/`, `/t/`), with no vowel added. A stop such as /t/ cannot be said without a vowel
  in speech, so record the sound as cleanly as a person can make it, and check it by ear.
- Format: mono MP3 at 44.1 kHz and about 64 to 96 kbps is the suggested default, because it plays in Chrome, Edge, Firefox,
  Safari, and Android browsers. Other formats work if the URL import is changed to match.
- Name the file after its id, for example `files/a-short.mp3`.

## Source and licence (required for every file)

A recording may only be added when its source and licence are known. Each entry in `PHONIC_CLIPS` must say:

- `source`: who recorded it and where it came from. A recording made for this app says so; a downloaded one names the site and
  the page it came from.
- `license`: the licence it is used under, by its standard name (for example "CC0 1.0" or "CC BY 4.0"), or "made for
  Edurance PlayLab, owned by the project" for a recording made for the app.

Do not add a clip with an unknown source or licence, do not add a recording made by a speech engine or a text-to-speech
service, and do not add a clip whose licence forbids this use. `phonemes.test.ts` checks that every entry has a source and a
licence, and that every sound is either recorded or listed as missing.

## How to add a recording

1. Put the file in `files/` in this folder, named after its sound id.
2. In `index.ts`, import its URL and add an entry to `PHONIC_CLIPS`:

   ```ts
   import aShort from './files/a-short.mp3?url';

   export const PHONIC_CLIPS: Partial<Record<PhonemeId, PhonicClip>> = {
     'a-short': { url: aShort, source: 'Recorded by ... for Edurance PlayLab', license: 'Made for Edurance PlayLab' },
   };
   ```

3. Run `npx vitest run src/playlab/data/en/phonemes.test.ts src/playlab/services/phonics.test.ts`.
4. Listen to the clip in a desktop browser (see `docs/PHONICS-AUDIO.md`). Then check that the library build includes the
   `files/` folder: `scripts/finalize-lib.mjs` lists the package files, and a subfolder of audio must be added there.

No screen or word data changes when a recording is added. A sound's recording can be replaced at any time without touching
the rest of the app.
