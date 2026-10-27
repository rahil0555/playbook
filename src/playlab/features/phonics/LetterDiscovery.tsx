import { useCallback, useMemo, useState } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { AnimatedLetter } from '../../components/AnimatedLetter';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { LetterGrid } from '../../components/LetterGrid';
import { PronunciationControl } from '../../components/PronunciationControl';
import { VoiceTaskPanel } from '../../components/VoiceTaskPanel';
import { Illustration } from '../../illustrations/Illustration';
import { useSpeech } from '../../hooks/useAudio';
import { letterColor } from '../../lib/accents';
import { animationFor } from '../../motion/variants';
import { soundWordsFor } from '../../data/en/soundWords';
import { phonicsSoundPrompt, phonicsSoundTask } from '../../services/speechInput/tasks';
import type { LetterEntry } from '../../types/learning';

/** Letter name vs letter sound, side by side, with an example word and replay controls. */
export function LetterDiscovery() {
  const { content } = usePlayLab();
  const { sayLetterName, sayLetterSound, sayLetterFully, sayWord, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const letters = content.letters;
  const [selectedId, setSelectedId] = useState(letters[0]?.id ?? 'a');
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
  /** true while the child's microphone is on: the speech buttons are off then, so nothing is said over the child */
  const [listening, setListening] = useState(false);
  const index = Math.max(0, letters.findIndex((l) => l.id === selectedId));
  const letter = letters[index] as LetterEntry;
  const color = letterColor(index);
  const exploredIds = useMemo(() => seen, [seen]);

  const choose = useCallback(
    (l: LetterEntry) => {
      setSelectedId(l.id);
      setSeen((s) => new Set(s).add(l.id));
      fire('burst', { x: 50, y: 30 });
      sfx('pop');
      void sayLetterName(l);
    },
    [fire, sayLetterName, sfx],
  );

  /** the name, then the sound in its example word: "all three" */
  const sayAll = () => sayLetterFully(letter);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
      <section aria-label={`About the letter ${letter.upper}`} className="relative space-y-4 lg:order-1">
        <CelebrationEffect burst={burst} onDone={clear} />
        <p className="pl-paper rounded-[1.8rem] p-4 text-[1.05rem] leading-snug">
          <strong>{letter.upper}</strong> is <em>called</em> “{letter.name}”, but it <em>says</em> <strong>{letter.sound.symbol}</strong> in <strong>{letter.word.text}</strong>.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="flex flex-col items-center pl-paper rounded-[2rem] p-4 text-center">
            <h2 className="font-display text-xl font-bold text-ink-soft">Letter name</h2>
            <AnimatedLetter
              glyph={`${letter.upper}${letter.lower}`}
              color={color}
              animation={animationFor(index)}
              label={`Letter ${letter.upper}. Tap to hear its name`}
              className="my-1 h-28 px-4 text-[5.2rem]"
              disabled={listening}
              onTap={() => void sayLetterName(letter)}
            />
            <p className="font-display text-3xl font-bold">“{letter.name}”</p>
            <PronunciationControl label="Say the name" accent="coral" disabled={listening} onPlay={() => sayLetterName(letter)} className="mt-3" />
          </article>

          <article className="flex flex-col items-center pl-paper rounded-[2rem] p-4 text-center">
            <h2 className="font-display text-xl font-bold text-ink-soft">Letter sound</h2>
            <p className="my-1 grid h-28 place-items-center font-display text-6xl font-bold" style={{ color }}>
              {letter.sound.symbol}
            </p>
            <p className="min-h-[2.8rem] text-[0.98rem] leading-snug text-ink-soft">{letter.sound.tip}</p>
            <PronunciationControl label="Play the sound" accent="sky" variant="primary" disabled={listening} onPlay={() => sayLetterSound(letter)} className="mt-3" />
          </article>
        </div>

        <article className="flex flex-wrap items-center gap-4 pl-paper rounded-[2rem] p-4">
          <span className="grid pl-frame h-24 w-24 shrink-0 place-items-center rounded-3xl">
            <Illustration name={letter.word.illustration} className="h-20 w-20" label={letter.word.text} />
          </span>
          <div className="min-w-[9rem] flex-1">
            <h2 className="font-display text-xl font-bold text-ink-soft">Example word</h2>
            <p className="font-display text-4xl font-bold leading-tight">
              <span style={{ color }}>{letter.word.text.slice(0, 1)}</span>
              {letter.word.text.slice(1)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PronunciationControl label="Hear the word" accent="plum" disabled={listening} onPlay={() => sayWord(letter.word.text, letter.audio?.word)} />
            <PronunciationControl label="Hear all three" accent="brand" variant="primary" icon="play" disabled={listening} onPlay={sayAll} />
          </div>
        </article>

        {/* no model is played here: the question must not name a word the child is checked on (the teaching buttons above do) */}
        <VoiceTaskPanel
          key={letter.id}
          task={phonicsSoundTask(letter, soundWordsFor(letter.id))}
          prompt={phonicsSoundPrompt(letter.upper)}
          onListeningChange={setListening}
        />
      </section>

      <div className="lg:order-2">
        <h2 className="mb-3 font-display text-xl font-bold">Pick a letter</h2>
        <LetterGrid
          letters={letters}
          selectedId={selectedId}
          exploredIds={exploredIds}
          onSelect={choose}
          className="grid-cols-5 min-[460px]:grid-cols-7 md:grid-cols-9 lg:grid-cols-6 xl:grid-cols-7"
        />
      </div>
    </div>
  );
}
