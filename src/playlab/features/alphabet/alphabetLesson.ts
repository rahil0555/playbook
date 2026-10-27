import type { LessonStep } from '../../hooks/useVoiceLesson';
import { praiseFor } from '../../lib/lessonLines';
import { letterNameTask } from '../../services/speechInput/tasks';
import type { LetterEntry } from '../../types/learning';

/**
 * The Letter Playground lesson, A to Z in order: "Say A for apple!". A right answer is letter-name or letter-with-example speech,
 * judged by the letter-name task. `replay` is the one speaker control: the letter's name, sound and example word.
 */
export function alphabetSteps(letters: readonly LetterEntry[], replay: (letter: LetterEntry) => unknown): LessonStep[] {
  return letters.map((letter, i) => ({
    key: letter.id,
    instruction: `Say ${letter.upper} for ${letter.word.text}!`,
    task: letterNameTask(letter),
    praise: praiseFor(i),
    reveal: `${letter.upper} is for ${letter.word.text}. Let’s learn it together!`,
    replay: () => replay(letter),
  }));
}
