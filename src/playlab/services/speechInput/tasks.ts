/**
 * What a child is asked to say, and how the answer is judged. Each task type has its own rules, because the same words can be
 * right for one question and wrong for another: "b" is right for the letter B, but not when the question asks for the sound.
 *
 * Browser speech recognition only gives a transcript. Nothing here measures how well a child pronounced anything, so a verdict
 * says what the browser heard and how it fits the question, never how good the pronunciation was.
 */
import type { VoiceFailure } from './diagnosis';
import { editDistance, normalizeAnswer } from './evaluate';

export type VoiceTaskKind = 'letter-name' | 'phonics-sound' | 'spoken-word' | 'number-word' | 'spelling';

interface TaskBase {
  kind: VoiceTaskKind;
  /** names the question: a result for another key is never judged for this one, so a late answer cannot change it */
  key: string;
}
/** The letter's name, e.g. "bee" for B. The letter itself is accepted too. */
export interface LetterNameTask extends TaskBase {
  kind: 'letter-name';
  letter: string;
  name: string;
}
/**
 * The sound a letter makes. The child says one word from `words`: a short, explicit list of words that carry the sound (for B:
 * "ball", "bat", "bus"). The letter's name is never right here, and no other word is accepted.
 */
export interface PhonicsSoundTask extends TaskBase {
  kind: 'phonics-sound';
  letter: string;
  name: string;
  words: readonly string[];
}
export interface SpokenWordTask extends TaskBase {
  kind: 'spoken-word';
  word: string;
}
/** A number word, or its digits: "two" and "2" are the same answer here, and only here. */
export interface NumberWordTask extends TaskBase {
  kind: 'number-word';
  value: number;
}
/** The letters of a word, said one at a time, in order: "t", "w", "o" for "two". */
export interface SpellingTask extends TaskBase {
  kind: 'spelling';
  word: string;
}
export type VoiceTask = LetterNameTask | PhonicsSoundTask | SpokenWordTask | NumberWordTask | SpellingTask;

export type VoiceOutcome = 'correct' | 'incorrect' | 'incomplete' | 'uncertain' | 'nothing-heard';

export interface VoiceVerdict {
  outcome: VoiceOutcome;
  /** what the child is told, in plain words. Only ever shown after the verdict, never before it. */
  message: string;
}

/** Below this confidence the browser is guessing. Only used when the browser reports a confidence at all. */
export const VOICE_LOW_CONFIDENCE = 0.3;

/** The number words this module knows. Only these, and only in number-word tasks. */
const NUMBER_WORDS = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
];

/** The value of one recognised word: "two" and "2" are 2. Anything else (including "to" and "too") is not a number here. */
export function numberValue(token: string): number | undefined {
  const asWord = NUMBER_WORDS.indexOf(token);
  if (asWord >= 0) return asWord;
  if (/^(0|[1-9]\d?)$/.test(token) && Number(token) <= 20) return Number(token);
  return undefined;
}

/**
 * Collapses only back-to-back repeats of the same word: "ball ball" becomes "ball". Every other word is kept, so a word is never
 * shortened into a different one.
 */
function dedupeRepeats(phrase: string): string {
  const out: string[] = [];
  for (const word of phrase.split(' ')) if (out[out.length - 1] !== word) out.push(word);
  return out.join(' ');
}

/** True when `target` appears as whole words inside `phrase`, so "bat" is inside "a bat" but not inside "batter". */
const containsWords = (phrase: string, target: string) => ` ${phrase} `.includes(` ${target} `);

const isSingleLetter = (token: string) => /^[a-z]$/.test(token);
const quoted = (text: string) => `“${text}”`;
const NOTHING_HEARD = "I couldn't hear an answer. Try again, a little closer to the microphone.";
const UNSURE = "I'm not sure I heard that clearly. Can you try once more?";

type Judgement = [VoiceOutcome, string];

function judgeLetterName(task: LetterNameTask, phrase: string): Judgement {
  const forms = [...new Set([task.letter, task.name].map(normalizeAnswer))];
  const said = dedupeRepeats(phrase);
  if (forms.includes(said)) return ['correct', `Yes! That's ${quoted(task.name)}.`];
  const wordsInside = said.includes(' ') && forms.some((form) => containsWords(said, form));
  if (wordsInside) return ['uncertain', `Say just the letter's name: ${quoted(task.name)}.`];
  if (said.includes(' ')) return ['uncertain', `I'm not sure I heard that. Say the letter's name: ${quoted(task.name)}.`];
  return ['incorrect', `Good try. This letter is called ${quoted(task.name)}. Let's try again.`];
}

function judgePhonicsSound(task: PhonicsSoundTask, phrase: string): Judgement {
  const accepted = task.words.map((word) => [normalizeAnswer(word), word] as const);
  const forms = [...new Set([task.letter, task.name].map(normalizeAnswer))];
  const said = dedupeRepeats(phrase);
  // the whole phrase first: a listed word that is itself a repeat ("yo-yo" becomes "yo yo") must not be shortened into another word
  const match = accepted.find(([form]) => form === phrase || form === said);
  if (match) return ['correct', `Yes! That sound is in ${quoted(match[1])}.`];
  // the sound is a sound, not a letter name: saying the name of the letter is not an answer to this question
  if (forms.includes(said)) return ['incorrect', "That's the letter's name. Say a word that has the sound, not the name."];
  if (said.includes(' ') && accepted.some(([form]) => containsWords(said, form))) return ['uncertain', 'Say just one word that has the sound.'];
  if (said.includes(' ')) return ['uncertain', "I'm not sure I heard one word. Say one word that has the sound."];
  // a real word that is not on this question's list is not marked wrong: it cannot be checked yet, so the child is asked for another
  return ['uncertain', `I can't check ${quoted(said)} for this sound yet. Try another word that has the sound.`];
}

function judgeSpokenWord(task: SpokenWordTask, phrase: string): Judgement {
  const word = normalizeAnswer(task.word);
  const said = dedupeRepeats(phrase);
  if (said === word) return ['correct', `Great! You said ${quoted(task.word)}.`];
  // a near miss counts only for longer words: on a three-letter word one changed letter makes a different word
  if (!said.includes(' ') && word.length >= 5 && editDistance(said, word) === 1) return ['incorrect', `Almost! Say ${quoted(task.word)} once more, slowly.`];
  if (said.includes(' ') && containsWords(said, word)) return ['uncertain', `Let's say just the word: ${quoted(task.word)}.`];
  if (said.includes(' ')) return ['uncertain', `I'm not sure I heard that. Say the word: ${quoted(task.word)}.`];
  return ['incorrect', `Good try. The word is ${quoted(task.word)}. Try once more.`];
}

function judgeNumberWord(task: NumberWordTask, phrase: string): Judgement {
  const said = dedupeRepeats(phrase).split(' ');
  const values = said.map(numberValue);
  const word = NUMBER_WORDS[task.value] ?? String(task.value);
  if (values.every((value) => value === task.value)) return ['correct', `Yes, that's ${quoted(word)}!`];
  if (values.some((value) => value === task.value)) return ['uncertain', `Say just the number: ${quoted(word)}.`];
  if (said.length === 1) return ['incorrect', `Not quite. The number is ${quoted(word)}.`];
  if (values.every((value) => value !== undefined)) return ['incorrect', `Not quite. Try to say ${quoted(word)}.`];
  return ['uncertain', `I'm not sure I heard that. Say the number: ${quoted(word)}.`];
}

function judgeSpelling(task: SpellingTask, phrase: string): Judgement {
  const word = normalizeAnswer(task.word);
  let letters = phrase.split(' ');
  // the whole word said twice in a row ("t w o t w o") is one answer. Only that exact case is collapsed: a single doubled
  // letter ("a a" for "aa") or a repeated letter inside a word ("a p p l e") is never shortened.
  const half = word.length;
  if (letters.length === 2 * half && letters.slice(0, half).join(' ') === letters.slice(half).join(' ')) letters = letters.slice(0, half);
  if (letters.every(isSingleLetter)) {
    const spelled = letters.join('');
    if (spelled === word) return ['correct', `You spelled ${quoted(task.word)}!`];
    if (spelled.length > 0 && spelled.length < word.length && word.startsWith(spelled)) return ['incomplete', 'Good start! Keep going, there are more letters.'];
    return ['incorrect', `Not quite. The letters of ${quoted(task.word)} are ${word.toUpperCase().split('').join(', ')}.`];
  }
  return ['uncertain', `Say each letter on its own, like ${word.toUpperCase().split('').join(', ')}.`];
}

function judge(task: VoiceTask, phrase: string): Judgement {
  switch (task.kind) {
    case 'letter-name':
      return judgeLetterName(task, phrase);
    case 'phonics-sound':
      return judgePhonicsSound(task, phrase);
    case 'spoken-word':
      return judgeSpokenWord(task, phrase);
    case 'number-word':
      return judgeNumberWord(task, phrase);
    case 'spelling':
      return judgeSpelling(task, phrase);
  }
}

/**
 * Judges what the browser heard against one question. Harmless variation is ignored (case, accents, punctuation, spacing, and
 * back-to-back repeats of a word). A result that cannot be read with confidence asks the child to try again instead of marking
 * them wrong. Nothing is accepted just because it contains the answer.
 */
export function evaluateVoiceTask(task: VoiceTask, transcript: string, confidence?: number): VoiceVerdict {
  const phrase = normalizeAnswer(transcript);
  if (!phrase) return { outcome: 'nothing-heard', message: NOTHING_HEARD };
  const [outcome, message] = judge(task, phrase);
  // a wrong-looking answer the browser was unsure of is not the child's fault: ask again rather than mark it wrong
  if (outcome === 'incorrect' && confidence !== undefined && confidence < VOICE_LOW_CONFIDENCE) return { outcome: 'uncertain', message: UNSURE };
  return { outcome, message };
}

/** What the child is told when listening fails for a reason other than the answer. Each cause has its own text and its own fix. */
export const FAILURE_COPY: Record<VoiceFailure, string> = {
  unsupported: "Speaking isn't available in this browser. You can still tap the letters.",
  insecure: 'Speaking needs a secure page (an https:// address). You can still tap the letters.',
  embedded: 'This page is inside another page, which may not let the browser use the microphone. Open PlayLab in its own tab to speak.',
  'site-blocked': 'The microphone is turned off for this site. A grown-up can allow it with the lock icon in the address bar, then try again.',
  refused: "The browser did not get to use the microphone. A grown-up can check the computer's microphone privacy setting, then try again.",
  'no-microphone': 'No microphone could be opened. Check that one is connected and that no other app is using it.',
  'speech-service': "The speech service is switched off in this browser, so speech can't be understood here.",
  'not-started': 'The browser did not start listening. Tap Try again.',
  network: 'There was a connection problem with the speech service. Check the internet, then try again.',
  'no-speech': "I couldn't hear anything. Try again, a little closer to the microphone.",
  unclear: "I couldn't understand that. Please try again.",
};

/** "Say this letter's name", for the letter with lowercase id `id` and its spoken name `name` (e.g. "b", "bee"). */
export function letterNameTask(letter: { id: string; name: string }): LetterNameTask {
  return { kind: 'letter-name', key: `letter-name:${letter.id}`, letter: letter.id, name: letter.name };
}

/** "Say a word that has this sound": any of `words` is right, and the letter's name never is. */
export function phonicsSoundTask(letter: { id: string; name: string }, words: readonly string[]): PhonicsSoundTask {
  return { kind: 'phonics-sound', key: `phonics-sound:${letter.id}`, letter: letter.id, name: letter.name, words };
}

/**
 * The question for a sound. It names no word the child could say: naming one would give the answer away. The accepted words are
 * checked against the answer, and never shown.
 */
export function phonicsSoundPrompt(upper: string): string {
  return `Say a word that has the sound of ${upper}. Say the sound, not the letter's name.`;
}
