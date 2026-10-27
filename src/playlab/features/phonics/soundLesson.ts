import type { LessonStep } from '../../hooks/useVoiceLesson';
import { praiseFor } from '../../lib/lessonLines';
import { soundWordsFor } from '../../data/en/soundWords';
import { phonicsSoundPrompt, phonicsSoundTask } from '../../services/speechInput/tasks';
import type { LetterEntry } from '../../types/learning';

/**
 * The Sound Discovery lesson, A to Z in order: "Say a word that has the sound of B". A right answer is a listed sound word, or
 * "B for ball" with a listed word. The letter's name is never right here. `replay` plays the letter's sound alone, never its example
 * word, so the replay cannot give the answer away before the child has answered.
 */
export function soundSteps(letters: readonly LetterEntry[], replay: (letter: LetterEntry) => unknown): LessonStep[] {
  return letters.map((letter, i) => ({
    key: letter.id,
    instruction: phonicsSoundPrompt(letter.upper),
    task: phonicsSoundTask(letter, soundWordsFor(letter.id)),
    praise: praiseFor(i),
    reveal: `${letter.upper} says the sound in ${letter.word.text}. Let’s learn it together!`,
    replay: () => replay(letter),
  }));
}
