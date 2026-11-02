/**
 * Every fixed line Pip can say, in ONE place.
 *
 * This is the single source of truth shared by:
 *  - `scripts/generate-voice.ts`, which turns each line into an mp3 in Edu's ElevenLabs voice; and
 *  - the app, which looks a line up by its text at play time (see services/eduVoice.ts).
 *
 * A line that is not listed here is not broken: it falls through to the dynamic voice endpoint, and then to the
 * browser's own speech. Listing a line only means it can be pre-generated, which is faster, cheaper and works offline.
 *
 * Nothing here touches the network or the DOM, so the generator script can import it under plain Node.
 */

import { ACTIVITIES } from '../data/activities';
import { englishLetters } from '../data/en/alphabet';
import { SOUND_WORDS } from '../data/en/soundWords';
import { englishSentences } from '../data/en/sentences';
import { englishStories } from '../data/en/story';
import { englishWords } from '../data/en/words';
import { ENCOURAGE_LINES, FINISH_LINE, HEAR_LINE, PRAISE_LINES, REPEAT_LINE, SOUND_LEAD_IN } from '../lib/lessonLines';
import { PRAISE, TRY_AGAIN } from '../lib/messages';
import { FAILURE_COPY, phonicsSoundPrompt } from '../services/speechInput/tasks';

/**
 * The key a line is stored and looked up under. Punctuation is kept (it changes how a line is read), but the
 * curly quotes the copy uses, the surrounding space and the capitalisation are not, so "Well done!" and
 * "well done!" are one clip.
 */
export function voiceKey(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** A line to pre-generate: the text to speak, and where in the app it is heard (for the manifest and the README). */
export interface VoiceLine {
  text: string;
  /** e.g. 'lesson', 'word', 'activity' - only for reading the manifest, never used at play time */
  group: string;
}

/** Every fixed line, de-duplicated by `voiceKey` and in a stable order (so a re-run regenerates nothing new). */
export function allVoiceLines(): VoiceLine[] {
  const out: VoiceLine[] = [];
  const seen = new Set<string>();
  const add = (group: string, text: string | undefined | null) => {
    const value = (text ?? '').trim();
    if (!value) return;
    const key = voiceKey(value);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: value, group });
  };

  // the teacher's own short lines
  PRAISE_LINES.forEach((l) => add('lesson', l));
  ENCOURAGE_LINES.forEach((l) => add('lesson', l));
  add('lesson', REPEAT_LINE);
  add('lesson', HEAR_LINE);
  add('lesson', FINISH_LINE);
  PRAISE.forEach((l) => add('feedback', l));
  TRY_AGAIN.forEach((l) => add('feedback', l));
  Object.values(FAILURE_COPY).forEach((l) => add('microphone', l));

  // the instruction read aloud by "Hear instructions" at the top of each activity
  ACTIVITIES.forEach((a) => add('activity', a.instruction));
  add('activity', SOUND_LEAD_IN);

  // letters: the name, the example word, and every line the two guided lessons say about the letter
  englishLetters.forEach((letter) => {
    add('letter', letter.nameSpeech);
    add('letter', letter.sound.speech);
    add('letter', letter.word.text);
    add('lesson-step', `Say ${letter.upper} for ${letter.word.text}!`);
    add('lesson-step', `${letter.upper} is for ${letter.word.text}. Let's learn it together!`);
    add('lesson-step', `${letter.upper} is for ${letter.word.text}. Let\u2019s learn it together!`);
    add('lesson-step', phonicsSoundPrompt(letter.upper));
    add('lesson-step', `${letter.upper} says the sound in ${letter.word.text}. Let's learn it together!`);
    add('lesson-step', `${letter.upper} says the sound in ${letter.word.text}. Let\u2019s learn it together!`);
  });
  Object.values(SOUND_WORDS).forEach((words) => words.forEach((w) => add('sound-word', w)));

  // words: the word, its clue, and the cheer for spelling it
  englishWords.forEach((word) => {
    add('word', word.text);
    add('word', word.clue);
    add('word', `Hooray! You spelled ${word.text}!`);
  });

  // sentences: the sentence, each of its words (every word is tappable), and the fill-in prompt
  englishSentences.forEach((s) => {
    add('sentence', `${s.words.join(' ')}${s.punctuation}`);
    s.words.forEach((w) => add('sentence-word', w));
    (s.distractors ?? []).forEach((w) => add('sentence-word', w));
    if (s.mode === 'fill' && s.blankIndex !== undefined) {
      add('sentence', `${s.words.slice(0, s.blankIndex).join(' ')}... what? ${s.words.slice(s.blankIndex + 1).join(' ')}`);
    }
  });

  // the story: each sentence, its hint, and each word in it
  englishStories.forEach((scene) => {
    add('story', scene.sentence);
    add('story', scene.hint);
    scene.sentence.split(/[^A-Za-z']+/).forEach((w) => add('story-word', w));
  });

  return out;
}
