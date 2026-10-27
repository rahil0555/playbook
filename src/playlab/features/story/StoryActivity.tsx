import { useEffect } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { ActivityHeader } from '../../components/ActivityHeader';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { RoundSummary } from '../../components/RoundSummary';
import { useSpeech } from '../../hooks/useAudio';
import { useRound } from '../../hooks/useRound';
import type { WordEntry } from '../../types/learning';
import { MagicQuestion } from '../word-builder/magic/MagicQuestion';
import { storyOf, storyRounds } from './storyRounds';

/**
 * The read-along stories, one sentence after another. Each sentence's target words are built one at a time with Magic Letters, and
 * the next sentence starts when the last word of the one before is spelled. It reports as the 'word-builder' activity, so stars,
 * progress and the completion callbacks are the same as Magic Letters.
 */
export function StoryActivity() {
  const { content } = usePlayLab();
  const { speakLater } = useSpeech();
  const stories = content.stories ?? [];
  const round = useRound<WordEntry>('word-builder', () => storyRounds(stories), 'story');
  const scene = round.current ? storyOf(stories, round.current) : undefined;

  // a sentence is read aloud when it starts (once per sentence, not once per word); leaving before it is read cancels it
  useEffect(() => {
    if (!scene) return;
    const cancel = speakLater(scene.sentence, 700);
    return () => cancel();
  }, [scene, speakLater]);

  if (stories.length === 0) {
    return (
      <div data-mode="story">
        <ActivityHeader activityId="word-builder" title="Story words" instruction="This language does not have a story yet." compact />
      </div>
    );
  }

  // the rounds of one sentence are next to each other, so the sentence's first round and the words spelled in it come from the list
  const firstRound = scene ? round.items.findIndex((item) => storyOf(stories, item) === scene) : 0;
  const sentenceNo = scene ? stories.indexOf(scene) + 1 : stories.length;
  const sentencesFinished = stories.filter((story) => {
    const lastRound = round.items.reduce((at, item, i) => (storyOf(stories, item) === story ? i : at), -1);
    return lastRound < round.index;
  }).length;
  const spelled = scene ? round.items.slice(firstRound, round.index).map((item) => item.text) : [];
  const wordNo = scene ? round.index - firstRound + 1 : 0;

  return (
    <div data-mode="story">
      <ActivityHeader activityId="word-builder" title="Story words" instruction="Spell each underlined word in the sentence. Tap any word to hear it." compact>
        {!round.summary && scene ? (
          <ProgressIndicator
            done={sentencesFinished}
            total={stories.length}
            currentIndex={sentenceNo - 1}
            accent="brand"
            noun="Sentence"
            text={`Sentence ${sentenceNo} of ${stories.length}, word ${wordNo} of ${scene.targets.length}`}
          />
        ) : null}
      </ActivityHeader>
      {round.summary ? (
        <div className="space-y-4">
          <p className="text-center font-display text-xl font-bold text-ink">You spelled every word in all {stories.length} sentences!</p>
          <RoundSummary completion={round.summary} onPlayAgain={round.restart} />
        </div>
      ) : round.current && scene ? (
        <MagicQuestion
          key={round.current.id}
          round={round}
          word={round.current}
          storyStage={{ sentence: scene.sentence, targets: scene.targets, spelled, hint: scene.hint }}
        />
      ) : null}
    </div>
  );
}

export default StoryActivity;
