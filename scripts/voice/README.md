# PlayLab voice audition (OpenAI TTS)

Purpose: decide the PlayLab teaching voice **by listening**, before any app change. This tool only makes a small
audition set. It does not change the app, does not generate the full audio library, and the app still uses the
browser voice until a voice is approved.

Target persona (sent with every phrase): a playful, energetic cartoon teacher; clear General American English;
warm, upbeat and encouraging, lively but **not** exaggerated; slightly slow, very clear, for young children.

## What it generates

10 phrases x 3 candidate voices = **30 short clips** (about 100 characters of text per voice):

| Group | Phrases | Why |
| --- | --- | --- |
| Letter names | `ay`, `bee`, `zee` | The *name* of a letter (American "zee") |
| Isolated phonics sounds | `buh`, `sss`, `mmm`, `aah` | Hardest case: sounds, not names. Each carries an extra "say only the sound, not the letter name" instruction. |
| A simple word | `apple` | Everyday word |
| Encouragement | "Great job! You spelled cat!" | Persona and warmth |
| Sentence | "The cat is sleeping." | Read-aloud |

Candidate voices (default): `marin`, `coral`, `nova`. These names come from third-party lists of OpenAI voices and are
**not verified**; the API rejects an unknown name and the script reports it. Pick others with `--voices a,b,c`.
Voice personality is decided by listening, not by name.

## Expected cost (estimate)

* The default run is **about $0.01 to $0.02**; a generous upper bound is under **$0.20** even if the estimate is off 10x.
* The estimate assumes about **$0.015 per audio minute** for `gpt-4o-mini-tts`, from third-party pages. OpenAI's own
  pricing page could not be fetched while preparing this, so **confirm it at https://openai.com/api/pricing/** before running.
* The script prints its estimate before doing anything, refuses to exceed `--max-requests` (default 40), and skips
  files that already exist (re-runs cost nothing).
* You need an OpenAI account with billing enabled. Use a **separate key** from any other project (for example the
  Edurance AI tutor), ideally with a low monthly spending limit set in the OpenAI dashboard.

## Setup (on the generation machine only)

Requires Node 20.6+ (the project uses Node 22).

```bash
# 1. Create your local, git-ignored env file (it starts with an empty value):
cp .env.example .env.local

# 2. Open .env.local in your editor and paste your key after OPENAI_API_KEY=
#    (do it in the editor: don't type it on a command line, so it never lands in shell history, and don't paste it in chat)

# 3. Confirm Git will ignore the file (this should print the file name):
git check-ignore -v .env.local

# 4. Optional: restrict the file to your user
chmod 600 .env.local
```

Never commit the key, put it in code or docs, or paste it into chat. Rotate the key in the OpenAI dashboard if it
is ever exposed.

## Run

```bash
# A. Dry run (default, no network, no key needed): shows the plan and cost estimate
node scripts/voice/audition.mjs

# B. Offline self-test of the tool itself (mock server, fake key; never contacts OpenAI)
node --test scripts/voice/audition.test.mjs

# C. Generate the audition set (only this step spends money; requires --yes)
node --env-file=.env.local scripts/voice/audition.mjs --yes

# D. Listen: open voice-audition/index.html in a browser
```

Useful flags: `--voices marin,cedar` · `--only sound-b,sound-a` (just some phrases) · `--force` (regenerate) ·
`--out dir` · `--max-requests N`.

## What to listen for

1. American English, clear, warm and playful, **not** over the top, easy for a small child to follow.
2. **Isolated sounds, separately:** does `buh` sound like the start of "ball" (not "bee" or "bu-huh")? Does `sss` hold
   a clean hiss, `mmm` a hum, and `aah` the short a of "apple"? If the AI cannot do these accurately, the recommendation
   is to use **human-recorded clips for the phonics sounds** and keep AI voice for names, words, praise and sentences.
3. Letter names: "zee" (American), "ay", "bee".

## Where output goes

`voice-audition/<voice>/<phrase>.mp3`, `voice-audition/index.html` (listening page) and `manifest.json` (model, voices,
persona, phrase list; never the key). The folder is git-ignored. Nothing here is read by the app.
