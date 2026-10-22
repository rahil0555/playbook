import { useEffect } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { RoundSummary } from '../../components/RoundSummary';
import { useSpeech } from '../../hooks/useAudio';
import { useRound } from '../../hooks/useRound';
import type { WordEntry } from '../../types/learning';
import { MagicQuestion } from '../word-builder/magic/MagicQuestion';
import { storyRounds } from './storyRounds';

/**
 * The read-along story: one sentence, and its target words built one after another with Magic Letters. It reports as the
 * 'word-builder' activity, so stars, progress and the completion callbacks are the same as Magic Letters.
 */
export function StoryActivity() {
  const { content } = usePlayLab();
  const { speakLater } = useSpeech();
  const story = content.story;
  const round = useRound<WordEntry>('word-builder', () => (story ? storyRounds(story) : []), 'story');

  // the sentence is read aloud when the child arrives; leaving before it is read cancels it
  useEffect(() => {
    if (!story) return;
    const cancel = speakLater(story.sentence, 700);
    return () => cancel();
  }, [story, speakLater]);

  if (!story) {
    return (
      <div data-mode="story">
        <ActivityHeader activityId="word-builder" title="Story words" instruction="This language does not have a story yet." compact />
      </div>
    );
  }

  const spelled = round.items.slice(0, round.index).map((word) => word.text);
  return (
    <div data-mode="story">
      <ActivityHeader activityId="word-builder" title="Story words" instruction="Spell each underlined word in the sentence. Tap any word to hear it." compact>
        {!round.summary ? <ProgressIndicator done={round.solvedCount} total={round.total} currentIndex={round.index} accent="brand" noun="Word" /> : null}
      </ActivityHeader>
      {round.summary ? (
        <RoundSummary completion={round.summary} onPlayAgain={round.restart} />
      ) : round.current ? (
        <MagicQuestion key={round.current.id} round={round} word={round.current} storyStage={{ sentence: story.sentence, targets: story.targets, spelled }} />
      ) : null}
    </div>
  );
}

export default StoryActivity;
