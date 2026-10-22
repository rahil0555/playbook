import { PronunciationControl } from '../../components/PronunciationControl';
import { useSpeech } from '../../hooks/useAudio';
import { STORY_WORD_COLORS } from './storyRounds';

/** What the sentence needs for one round: the sentence, its target words in order, the one being built, and the ones already spelled. */
export interface StoryStage {
  sentence: string;
  targets: readonly string[];
  spelled: readonly string[];
}

/** The sentence split into its words and the text between them, so it reads exactly as written. */
export function sentenceParts(sentence: string): { text: string; word: boolean }[] {
  return sentence
    .split(/([A-Za-z]+)/)
    .filter((part) => part.length > 0)
    .map((text) => ({ text, word: /^[A-Za-z]+$/.test(text) }));
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
export function StorySentence({ sentence, targets, spelled, target, complete }: StorySentenceProps) {
  const { speak } = useSpeech();
  return (
    <section aria-label="The sentence" data-story-sentence className="w-full rounded-[1.8rem] bg-white/80 px-4 py-3 text-center shadow-soft">
      <p className="font-display text-2xl font-bold leading-relaxed text-ink sm:text-3xl">
        {sentenceParts(sentence).map((part, i) => {
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
              className={`mx-[0.1em] rounded-xl px-1 transition active:scale-95 ${state === 'target' ? 'underline decoration-4 underline-offset-[6px]' : ''} ${state === 'done' ? 'font-extrabold' : ''}`}
            >
              {part.text}
            </button>
          );
        })}
      </p>
      <PronunciationControl label="Hear the sentence" accent="brand" onPlay={() => speak(sentence)} className="mt-2" />
    </section>
  );
}
