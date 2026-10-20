import { describe, expect, it } from 'vitest';
import { editDistance, evaluateVoiceAnswer, LOW_CONFIDENCE, normalizeAnswer, VOICE_MESSAGES } from './evaluate';

describe('normalizeAnswer: what counts as the same answer', () => {
  it('ignores case, surrounding space, punctuation and accents', () => {
    expect(normalizeAnswer('  Apple! ')).toBe('apple');
    expect(normalizeAnswer('Café.')).toBe('cafe');
    expect(normalizeAnswer('the   cat,  sleeps')).toBe('the cat sleeps');
  });
});

describe('editDistance', () => {
  it('counts single-letter changes', () => {
    expect(editDistance('kitten', 'sitting')).toBe(3);
    expect(editDistance('apple', 'aple')).toBe(1);
    expect(editDistance('apple', 'apple')).toBe(0);
  });
});

describe('evaluateVoiceAnswer', () => {
  it('a right answer is correct, however it was said', () => {
    expect(evaluateVoiceAnswer('Apple.', ['apple'])).toMatchObject({ result: 'correct', needsRetry: false, feedback: VOICE_MESSAGES.correct });
  });

  it('any accepted answer counts', () => {
    expect(evaluateVoiceAnswer('apples', ['apple', 'apples']).result).toBe('correct');
  });

  it('an empty transcript asks for a repeat, never a wrong score', () => {
    expect(evaluateVoiceAnswer('   ', ['apple'])).toMatchObject({ result: 'retry', needsRetry: true, feedback: VOICE_MESSAGES.empty });
  });

  it('a near miss is "needs improvement", not wrong: one slip is a transcription error, not a mistake', () => {
    expect(evaluateVoiceAnswer('aple', ['apple'])).toMatchObject({ result: 'needs_improvement', needsRetry: true, feedback: VOICE_MESSAGES.close });
  });

  it('a different word is "needs improvement" with the plain message', () => {
    expect(evaluateVoiceAnswer('banana', ['apple'])).toMatchObject({ result: 'needs_improvement', feedback: VOICE_MESSAGES.wrong });
  });

  it('a low-confidence wrong guess asks the child to say it again instead of scoring it', () => {
    expect(evaluateVoiceAnswer('banana', ['apple'], LOW_CONFIDENCE - 0.1)).toMatchObject({ result: 'retry', feedback: VOICE_MESSAGES.lowConfidence });
  });

  it('a low confidence does not turn a right answer into a retry', () => {
    expect(evaluateVoiceAnswer('apple', ['apple'], 0.05).result).toBe('correct');
  });

  it('keeps what was heard, for the transparent transcript', () => {
    expect(evaluateVoiceAnswer('Apple!', ['apple']).transcript).toBe('Apple!');
  });
});
