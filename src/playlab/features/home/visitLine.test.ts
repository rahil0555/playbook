import { describe, expect, it } from 'vitest';
import { createEmptySession } from '../../services/progressService';
import { visitLine } from './visitLine';

const session = (over: Partial<ReturnType<typeof createEmptySession>> = {}) => ({ ...createEmptySession(0), ...over });

describe('the visit line on Home', () => {
  it('says the progress is loading until the saved progress has arrived', () => {
    expect(visitLine(false, session({ questionsAnswered: 3 }))).toBe('Loading your progress…');
  });

  it('invites a first game when nothing has been played this visit', () => {
    expect(visitLine(true, session())).toBe('Nothing played yet this visit. Pick an activity to start!');
  });

  it('counts answers as attempts, and says a round is still to finish when none is finished', () => {
    expect(visitLine(true, session({ questionsAnswered: 2, correctAnswers: 1 }))).toBe(
      'This visit: 1 of 2 answers right. Finish a whole round to earn stars and stickers.',
    );
    expect(visitLine(true, session({ questionsAnswered: 1, correctAnswers: 1 }))).toBe(
      'This visit: 1 of 1 answer right. Finish a whole round to earn stars and stickers.',
    );
  });

  it('reports a finished round even when no question was answered (the alphabet goal finishes a round by exploring)', () => {
    expect(visitLine(true, session({ activitiesCompleted: 1 }))).toBe('This visit: 1 round finished. Keep going!');
  });

  it('reports finished rounds separately from the answers', () => {
    expect(visitLine(true, session({ questionsAnswered: 5, correctAnswers: 4, activitiesCompleted: 1 }))).toBe(
      'This visit: 4 of 5 answers right, and 1 round finished. Keep going!',
    );
    expect(visitLine(true, session({ questionsAnswered: 9, correctAnswers: 7, activitiesCompleted: 2 }))).toBe(
      'This visit: 7 of 9 answers right, and 2 rounds finished. Keep going!',
    );
  });
});
