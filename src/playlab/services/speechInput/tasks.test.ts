import { describe, expect, it } from 'vitest';
import {
  evaluateVoiceTask,
  FAILURE_COPY,
  letterNameTask,
  numberValue,
  phonicsSoundTask,
  VOICE_LOW_CONFIDENCE,
  type NumberWordTask,
  type PhonicsSoundTask,
  type SpellingTask,
  type SpokenWordTask,
} from './tasks';

const bee = letterNameTask({ id: 'b', name: 'bee' });
const doubleYou = letterNameTask({ id: 'w', name: 'double you' });
const ballSound: PhonicsSoundTask = phonicsSoundTask({ id: 'b', name: 'bee' }, ['ball', 'bat', 'bus']);
const appleSound: PhonicsSoundTask = phonicsSoundTask({ id: 'a', name: 'ay' }, ['apple', 'ant', 'alligator']);
const word = (text: string): SpokenWordTask => ({ kind: 'spoken-word', key: `word:${text}`, word: text });
const number = (value: number): NumberWordTask => ({ kind: 'number-word', key: `number:${value}`, value });
const spell = (text: string): SpellingTask => ({ kind: 'spelling', key: `spell:${text}`, word: text });

describe('letter names', () => {
  it('accepts the letter name, in any capitalisation, with punctuation, spacing or a repeat', () => {
    for (const heard of ['bee', 'Bee', ' bee. ', 'BEE!', 'bee bee', 'b', 'B']) {
      expect(evaluateVoiceTask(bee, heard).outcome, heard).toBe('correct');
    }
  });

  it('accepts a two-word name only in full, as "double you"', () => {
    expect(evaluateVoiceTask(doubleYou, 'double you').outcome).toBe('correct');
    expect(evaluateVoiceTask(doubleYou, 'double').outcome).toBe('incorrect');
  });

  it('marks another letter or an unrelated word incorrect, and says the right name', () => {
    const verdict = evaluateVoiceTask(bee, 'dog');
    expect(verdict.outcome).toBe('incorrect');
    expect(verdict.message).toContain('“bee”');
  });

  it('does not accept a number merely because its digit resembles the letter', () => {
    expect(evaluateVoiceTask(bee, '2').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(bee, 'two').outcome).toBe('incorrect');
  });

  it('asks for a retry when the name is buried in other speech, instead of marking it right or wrong', () => {
    expect(evaluateVoiceTask(bee, 'I think it is bee').outcome).toBe('uncertain');
    expect(evaluateVoiceTask(bee, 'the big bee').outcome).toBe('uncertain');
  });
});

describe('phonics sound: only the listed words are accepted, and the letter name never is', () => {
  it('accepts each listed word that carries the sound, in any capitalisation or punctuation', () => {
    expect(evaluateVoiceTask(ballSound, 'ball').outcome).toBe('correct');
    expect(evaluateVoiceTask(ballSound, 'Bat!').outcome).toBe('correct');
    expect(evaluateVoiceTask(ballSound, 'bus').outcome).toBe('correct');
    expect(evaluateVoiceTask(appleSound, 'Alligator.').outcome).toBe('correct');
  });

  it('names the listed word it accepted, so the child sees what was right', () => {
    expect(evaluateVoiceTask(ballSound, 'bat').message).toBe('Yes! That sound is in “bat”.');
  });

  it('rejects the letter name, in any form, and says to say a word with the sound instead', () => {
    for (const heard of ['bee', 'b', 'B.']) {
      const verdict = evaluateVoiceTask(ballSound, heard);
      expect(verdict.outcome, heard).toBe('incorrect');
      expect(verdict.message, heard).toContain("letter's name");
      expect(verdict.message, heard).toContain('Say a word that has the sound');
    }
  });

  it('does not accept a real word that is not on the list, or a near miss of a listed word (no fuzzy matching)', () => {
    for (const heard of ['dog', 'bal', 'bells', 'bass']) {
      const verdict = evaluateVoiceTask(ballSound, heard);
      expect(verdict.outcome, heard).toBe('incorrect');
      expect(verdict.message, heard).toContain('Try another word that has the sound');
    }
  });

  it("does not accept another letter's word for this sound", () => {
    expect(evaluateVoiceTask(ballSound, 'apple').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(appleSound, 'ball').outcome).toBe('incorrect');
  });

  it('asks again for speech of more than one word, instead of marking it', () => {
    expect(evaluateVoiceTask(ballSound, 'I like the ball').outcome).toBe('uncertain');
    expect(evaluateVoiceTask(ballSound, 'ball ball ball bat').outcome).toBe('uncertain');
  });
});

describe('spoken words', () => {
  it('accepts the word, and a word said back-to-back twice', () => {
    expect(evaluateVoiceTask(word('ball'), 'ball').outcome).toBe('correct');
    expect(evaluateVoiceTask(word('ball'), 'ball ball').outcome).toBe('correct');
  });

  it('does not accept a word just because it contains the answer', () => {
    expect(evaluateVoiceTask(word('cat'), 'the cat sat').outcome).toBe('uncertain');
  });

  it('does not fuzzy-match a short word: one changed letter is a different word', () => {
    const verdict = evaluateVoiceTask(word('cat'), 'cot');
    expect(verdict.outcome).toBe('incorrect');
    expect(verdict.message).not.toContain('Almost');
  });

  it('calls a near miss "almost" only for a longer word with one changed letter', () => {
    const verdict = evaluateVoiceTask(word('apple'), 'applo');
    expect(verdict.outcome).toBe('incorrect');
    expect(verdict.message).toContain('Almost');
  });

  it('does not treat a fragment of a longer word as right', () => {
    expect(evaluateVoiceTask(word('ball'), 'bal').outcome).toBe('incorrect');
  });
});

describe('number words and digits', () => {
  it('regression: "two" and "2" are the same answer for a number-word question', () => {
    expect(evaluateVoiceTask(number(2), 'two').outcome).toBe('correct');
    expect(evaluateVoiceTask(number(2), '2').outcome).toBe('correct');
    expect(evaluateVoiceTask(number(2), 'Two.').outcome).toBe('correct');
  });

  it('applies the same equivalence to other supported numbers', () => {
    const pairs: [number, string, string][] = [
      [1, 'one', '1'],
      [2, 'two', '2'],
      [3, 'three', '3'],
      [4, 'four', '4'],
      [5, 'five', '5'],
      [12, 'twelve', '12'],
    ];
    for (const [value, spoken, digits] of pairs) {
      expect(evaluateVoiceTask(number(value), spoken).outcome, spoken).toBe('correct');
      expect(evaluateVoiceTask(number(value), digits).outcome, digits).toBe('correct');
    }
  });

  it('accepts repeats of the right number, in either form', () => {
    expect(evaluateVoiceTask(number(2), 'two two').outcome).toBe('correct');
    expect(evaluateVoiceTask(number(2), 'two 2').outcome).toBe('correct');
  });

  it('treats a different number as incorrect, and a homophone is not a number', () => {
    expect(evaluateVoiceTask(number(2), 'one').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(number(2), '1').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(number(2), 'to').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(number(2), 'too').outcome).toBe('incorrect');
  });

  it('does not find the number inside other speech or a larger number', () => {
    expect(evaluateVoiceTask(number(2), 'I have two').outcome).toBe('uncertain');
    expect(evaluateVoiceTask(number(2), 'twenty two').outcome).toBe('uncertain');
    expect(evaluateVoiceTask(number(2), 'two three').outcome).toBe('uncertain');
  });

  it('reads only the supported number words and digits', () => {
    expect(numberValue('two')).toBe(2);
    expect(numberValue('20')).toBe(20);
    expect(numberValue('21')).toBeUndefined();
    expect(numberValue('02')).toBeUndefined();
    expect(numberValue('to')).toBeUndefined();
  });
});

describe('spelling: the letters, in order', () => {
  it('accepts the letters said one at a time, with or without dashes or spaces', () => {
    expect(evaluateVoiceTask(spell('two'), 't w o').outcome).toBe('correct');
    expect(evaluateVoiceTask(spell('two'), 'T-W-O').outcome).toBe('correct');
  });

  it('keeps a doubled letter: "a p p l e" is right, "a p l e" is not', () => {
    expect(evaluateVoiceTask(spell('apple'), 'a p p l e').outcome).toBe('correct');
    expect(evaluateVoiceTask(spell('apple'), 'a p l e').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(spell('aa'), 'a a').outcome).toBe('correct');
  });

  it('accepts the whole spelling said twice in a row as one answer', () => {
    expect(evaluateVoiceTask(spell('two'), 't w o t w o').outcome).toBe('correct');
  });

  it('wrong order is incorrect, and a partial spelling asks for more letters', () => {
    expect(evaluateVoiceTask(spell('two'), 't o w').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(spell('two'), 't w').outcome).toBe('incomplete');
  });

  it('does not accept a spoken word where letters were asked for, or digits', () => {
    expect(evaluateVoiceTask(spell('two'), 'two').outcome).toBe('uncertain');
    expect(evaluateVoiceTask(spell('two'), '2').outcome).toBe('uncertain');
  });
});

describe('nothing heard, and uncertain results', () => {
  it('asks to try again when nothing was heard', () => {
    for (const heard of ['', '   ', '...']) {
      expect(evaluateVoiceTask(bee, heard).outcome, JSON.stringify(heard)).toBe('nothing-heard');
    }
  });

  it('does not mark a child wrong on a result the browser was unsure of', () => {
    expect(evaluateVoiceTask(bee, 'dog', VOICE_LOW_CONFIDENCE - 0.1).outcome).toBe('uncertain');
    expect(evaluateVoiceTask(bee, 'dog', 0.9).outcome).toBe('incorrect');
    expect(evaluateVoiceTask(bee, 'dog').outcome).toBe('incorrect');
  });

  it('a correct answer is still correct when the browser was unsure', () => {
    expect(evaluateVoiceTask(bee, 'bee', 0.1).outcome).toBe('correct');
  });

});

describe('task keys and failure copy', () => {
  it('names each question so that a late answer for another question can be recognised', () => {
    expect(bee.key).not.toBe(letterNameTask({ id: 'c', name: 'see' }).key);
    expect(ballSound.key).toBe('phonics-sound:b');
  });

  it('gives every way listening can fail its own words', () => {
    const copy = Object.values(FAILURE_COPY);
    expect(copy.length).toBe(11);
    expect(new Set(copy).size).toBe(copy.length);
  });

  it('keeps a microphone problem distinct from a speech-service problem', () => {
    expect(FAILURE_COPY['no-microphone']).not.toBe(FAILURE_COPY['speech-service']);
    expect(FAILURE_COPY['speech-service']).not.toMatch(/microphone/i);
  });
});

describe('letter names: the way a child naturally says it', () => {
  const letterA = { kind: 'letter-name' as const, key: 'letter-name:a', letter: 'a', name: 'ay', example: 'apple' };
  it('accepts the letter, its name, and the letter or name with its example word', () => {
    for (const said of ['A', 'ay', 'A for apple', 'A is for apple', 'ay for apple', 'Ay is for Apple!']) {
      expect(evaluateVoiceTask(letterA, said).outcome, said).toBe('correct');
    }
    expect(evaluateVoiceTask(letterA, 'bee for apple').outcome).toBe('incorrect'); // a different letter's name with the example is not this answer
  });
  it('does not accept the example word alone as the letter', () => {
    expect(evaluateVoiceTask(letterA, 'apple').outcome).not.toBe('correct');
    expect(evaluateVoiceTask(letterA, 'apple').outcome).toBe('uncertain');
  });
  it('marks a different letter with its example as wrong, kindly, and does not mark unrelated speech right', () => {
    expect(evaluateVoiceTask(letterA, 'B for ball').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(letterA, 'dog').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(letterA, 'the big dog ran').outcome).toBe('uncertain');
  });
});

describe('sound words: "B for ball" is accepted when ball is a listed word, and a letter name is not', () => {
  it('accepts the letter then a listed word for its sound', () => {
    expect(evaluateVoiceTask(ballSound, 'B for ball').outcome).toBe('correct');
    expect(evaluateVoiceTask(ballSound, 'B is for ball').outcome).toBe('correct');
    expect(evaluateVoiceTask(ballSound, 'bee for ball').outcome).toBe('correct');
  });
  it('still never accepts the letter name on its own, or a word that is not listed for the sound', () => {
    expect(evaluateVoiceTask(ballSound, 'bee').outcome).toBe('incorrect');
    expect(evaluateVoiceTask(ballSound, 'B for dog').outcome).not.toBe('correct');
  });
});

describe('letter names: an example word that repeats itself is kept whole', () => {
  it('accepts "Y for yo-yo", whose example is a repeat', () => {
    const yoyo = { kind: 'letter-name' as const, key: 'letter-name:y', letter: 'y', name: 'why', example: 'yo-yo' };
    expect(evaluateVoiceTask(yoyo, 'Y for yo-yo').outcome).toBe('correct');
    expect(evaluateVoiceTask(yoyo, 'why for yo yo').outcome).toBe('correct');
  });
});
