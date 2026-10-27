import type { SessionStats } from '../../types/learning';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * The line under the progress stats for this visit. An answer is an attempt, and a round counts as finished only when the whole
 * round is done, so the two are never mixed up. Until the saved progress has loaded, the line says so instead of showing zeros.
 */
export function visitLine(hydrated: boolean, session: SessionStats): string {
  if (!hydrated) return 'Loading your progress…';
  const { questionsAnswered, correctAnswers, activitiesCompleted } = session;
  if (questionsAnswered === 0 && activitiesCompleted === 0) return 'Nothing played yet this visit. Pick an activity to start!';
  const rounds = `${plural(activitiesCompleted, 'round')} finished`;
  // some activities (the alphabet goal) finish a round without any answer, so a round can be reported on its own
  if (questionsAnswered === 0) return `This visit: ${rounds}. Keep going!`;
  const answers = `${correctAnswers} of ${plural(questionsAnswered, 'answer')} right`;
  if (activitiesCompleted === 0) return `This visit: ${answers}. Finish a whole round to earn stars and stickers.`;
  return `This visit: ${answers}, and ${rounds}. Keep going!`;
}
