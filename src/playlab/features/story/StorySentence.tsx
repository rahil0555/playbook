import { useState } from 'react';
import { Button } from '../../components/Button';
import { PronunciationControl } from '../../components/PronunciationControl';
import { useSpeech } from '../../hooks/useAudio';
import { STORY_WORD_COLORS } from './storyRounds';

/** What the sentence needs for one round: the sentence, its target words in order, the one being built, the ones already spelled, and a gentle hint. */
export interface StoryStage {
  sentence: string;
  targets: readonly string[];
  spelled: readonly string[];
  hint?: string;
}

/** The sentence split into its words and the text between them, so it reads exactly as written. */
export function sentenceParts(sentence: string): { text: string; word: boolean }[] {
  return sentence
    .split(/([A-Za-z]+)/)
    .filter((part) => part.length > 0)
    .map((text) => ({ text, word: /^[A-Za-z]+$/.test(text) }));
}

/**
 * The sentence in display groups. The punctuation right after a word (the "!" in "one!") joins the word's group, and a group that
 * has such punctuation is kept on one line, so a line never breaks between a word and its punctuation. The spaces are their own
 * groups, so the sentence can still wrap between words.
 */
export function sentenceGroups(sentence: string): { text: string; word: boolean }[][] {
  const groups: { text: string; word: boolean }[][] = [];
  for (const part of sentenceParts(sentence)) {
    if (part.word) {
      groups.push([part]);
      continue;
    }
    const punctuation = part.text.match(/^\S+/)?.[0] ?? '';
    const space = part.text.slice(punctuation.length);
    if (punctuation && groups.length > 0) groups[groups.length - 1]!.push({ text: punctuation, word: false });
    else if (punctuation) groups.push([{ text: punctuation, word: false }]);
    if (space) groups.push([{ text: space, word: false }]);
  }
  return groups;
}

interface StorySentenceProps extends StoryStage {
  /** the target word the child is building now */
  target: string;
  /** the target word has been spelled in this round */
  complete: boolean;
}

/**
 * The sentence the child reads along with. Every word can be tapped to hear it. The word being built is underlined; a word that is
 * already spelled takes its colour. Plain words stay ink-coloured.
 */
export function StorySentence({ sentence, targets, spelled, hint, target, complete }: StorySentenceProps) {
  const { speak } = useSpeech();
  // the hint is kept back until the child asks for it, and it is read aloud when it appears
  const [hintShown, setHintShown] = useState(false);
  return (
    <section aria-label="The sentence" data-story-sentence className="w-full rounded-[1.8rem] bg-white/80 px-4 py-3 text-center shadow-soft">
      <p className="font-display text-2xl font-bold leading-relaxed text-ink sm:text-3xl">
        {sentenceGroups(sentence).map((group, g) => (
          <span key={g} className={group.length > 1 ? 'whitespace-nowrap' : undefined}>
            {group.map((part, i) => {
              if (!part.word) return <span key={i}>{part.text}</span>;
              const lower = part.text.toLowerCase();
              const index = targets.indexOf(lower);
              const state = index < 0 ? 'plain' : lower === target ? (complete ? 'done' : 'target') : spelled.includes(lower) ? 'done' : 'waiting';
              const colour = index >= 0 && state !== 'waiting' && state !== 'plain' ? STORY_WORD_COLORS[index % STORY_WORD_COLORS.length] : undefined;
              return (
                <button
                  key={i}
                  type="button"
                  data-story-word={lower}
                  data-state={state}
                  aria-label={`Hear “${part.text}”`}
                  aria-current={state === 'target' ? 'step' : undefined}
                  onClick={() => speak(part.text)}
                  style={colour ? { color: colour } : undefined}
                  className={`rounded-xl px-0.5 transition active:scale-95 ${state === 'target' ? 'underline decoration-4 underline-offset-[6px]' : ''} ${state === 'done' ? 'font-extrabold' : ''}`}
                >
                  {part.text}
                </button>
              );
            })}
          </span>
        ))}
      </p>
      <PronunciationControl label="Hear the sentence" accent="brand" onPlay={() => speak(sentence)} className="mt-2" />
      {hint ? (
        <div className="mt-2 flex flex-col items-center gap-2">
          {hintShown ? (
            <p role="status" className="text-base font-semibold text-ink-soft">
              Hint: {hint}
            </p>
          ) : (
            <Button
              variant="secondary"
              accent="sun"
              icon="sparkle"
              onClick={() => {
                setHintShown(true);
                speak(hint);
              }}
            >
              Show a hint
            </Button>
          )}
        </div>
      ) : null}
    </section>
  );
}
