# Magic Letters: letter sounds

Magic Letters teaches the sound each letter makes in the word on screen, not the letter's name. For CAT, the c says /k/,
the a says the short vowel in "cat", and the t says /t/. The same letter can make a different sound in another word: the
a in WHALE says its name, the o in MOON is a long oo, and the o in LION is the soft schwa.

## Where the sounds live

- `src/playlab/data/en/words.ts`: each word lists the sound of each letter, in order. `null` means the letter has no sound
  of its own: the second letter of a two-letter sound (the h in FISH, the second o in BOOK) or a silent letter (the e in KITE).
- `src/playlab/data/en/phonemes.ts`: the catalogue of sounds, one entry per sound, with what the browser voice is asked to
  say (`speech`), how close it is expected to be (`quality`), and a teacher example.
- `src/playlab/services/phonics.ts`: the one function that turns a sound into a speech request. It sets the slow isolated-sound
  rate (0.8, `SPEECH_STYLE.soundRate`) and uses the English voice the child chose in Settings. A recorded clip (`clip`) would
  be used instead of speech if one were ever supplied; none ships today.

## When a sound is heard

- **Picking up a letter** (tap): the sound it makes in this word, in the spot it is heading for (the first empty spot
  with that letter), after a short pause so it never sits on the pop.
- **Placing a letter** (drop or type): its sound, after its landing chime.
- A sound that was just said for the same letter is not repeated within 1.4 s, so tap-pick-then-place says it once.
- Picking another letter stops the sound still being said or waiting to be said.
- The sound of the last letter comes before Pip's cheer. The cheer waits a moment after its own landing, so the two do not
  overlap on a normal device. A slow voice could still overlap; the cheer then cuts the letter sound short.
- A letter that fits nowhere (a decoy, or a spare copy) gets its usual alphabet sound.

## What the browser can and cannot do

Browser speech reads ordinary text, and it cannot make every isolated sound. Testing with espeak-ng (its IPA output,
`espeak-ng -v en-us --ipa=3 -q "<text>"`) showed:

- A bare consonant is read as a letter name: "f" becomes "ef", "m" becomes "em", "s" becomes "es", "t" becomes "tee".
  Each consonant is therefore said with a short "uh" after it ("fuh", "muh"). Stops such as /t/ cannot be made without a vowel
  at all in browser speech today, so **/t/ still sounds like "tuh"**. That is the single most important sound to listen to.
- Short vowels have no clean isolated form. "eh" and "ih" are read as letter names. The short vowels are said with a
  trailing consonant that keeps them vowels ("an", "ell", "in", "on", "put"), which is an approximation.
- Long vowels and the schwa are clean: "a", "eye", "oh", "oo", "uh".
- The ng sound is unreliable: "ung" is the best respelling found.

Every sound's quality is recorded in `phonemes.ts`. A later change needs only a new `speech` value (or a `clip`) for that
sound. No word or screen changes.

## Listening checklist (not yet done on a real device)

Test each row on Chrome and Safari, on a desktop and on an Android and an iPhone, with each English voice the device offers.
Note the actual sound, not what it should be.

| Sound | Says | Quality now | Example word | Listen for |
|---|---|---|---|---|
| /b/ | buh | approximate | bat | a clear b with no name ("bee") |
| /d/ | duh | approximate | dog | no "dee" |
| /f/ | fuh | approximate | fish | no "ef" or "eff" |
| /g/ | guh | approximate | goat | no "jee" |
| /h/ | huh | approximate | hat | no "aitch" |
| /k/ | kuh | approximate | cat | no "kay" |
| /l/ | luh | approximate | lion | no "el" |
| /m/ | muh | approximate | moon | no "em" |
| /n/ | nuh | approximate | nest | no "en" |
| /ŋ/ | ung | unreliable | mango | the ng of sing, no extra g |
| /p/ | puh | approximate | pig | no "pee" |
| /r/ | ruh | approximate | zebra | a soft r, no "ar" |
| /s/ | suh | approximate | sun | no "ess" |
| /ʃ/ | shuh | approximate | fish | the sh of ship |
| /t/ | tuh | approximate | tree | the t of tree, with the least vowel possible |
| /w/ | wuh | approximate | whale | no "double you" |
| /z/ | zuh | approximate | zebra | no "zee" |
| /æ/ | an | approximate | cat | the short a of cat, without a hard n |
| /ɛ/ | ell | approximate | pen | the short e of pen, without a hard l |
| /ɪ/ | in | approximate | pig | the short i of pig, without a hard n |
| /ɔ/ | on | approximate | dog | the short o of dog |
| /ʌ/ | uh | clean | sun | the u of sun |
| /ʊ/ | put | approximate | book | the oo of book, without a hard t |
| /eɪ/ | a | clean | whale | the name of a |
| /aɪ/ | eye | clean | kite | the i of kite |
| /oʊ/ | oh | clean | mango | the o of mango |
| /uː/ | oo | clean | moon | the oo of moon |
| /ə/ | uh | clean | zebra | a weak uh |

If a sound is wrong on a real device, change its `speech` in `phonemes.ts` (or give it a `clip` once recordings exist),
then run `npx vitest run src/playlab/data/en/phonemes.test.ts`. The test checks that no consonant is said as a letter name and
that no sound gives away a word.

## Not changed here

The Alphabet activity still uses the older single sound for each letter (`sound.speech` in `data/en/alphabet.ts`). Several of
those respellings ("fff", "sss", "mmm", "eh", "ih") are read as letter names by espeak. Fixing those belongs with this
list, and was left alone so this change stays in Magic Letters.
