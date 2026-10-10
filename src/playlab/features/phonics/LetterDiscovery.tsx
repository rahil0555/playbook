import { useCallback, useMemo, useState } from 'react';
import { usePlayLab } from '../../app/PlayLabContext';
import { AnimatedLetter } from '../../components/AnimatedLetter';
import { CelebrationEffect, useBurst } from '../../components/CelebrationEffect';
import { LetterGrid } from '../../components/LetterGrid';
import { PronunciationControl } from '../../components/PronunciationControl';
import { Illustration } from '../../illustrations/Illustration';
import { useSpeech } from '../../hooks/useAudio';
import { SPEECH_STYLE } from '../../services/audioService';
import { letterColor } from '../../lib/accents';
import { animationFor } from '../../motion/variants';
import type { LetterEntry } from '../../types/learning';

/** Letter name vs letter sound, side by side, with an example word and replay controls. */
export function LetterDiscovery() {
  const { content } = usePlayLab();
  const { sayLetterName, sayLetterSound, sayWord, speakSequence, sfx } = useSpeech();
  const { burst, fire, clear } = useBurst();
  const letters = content.letters;
  const [selectedId, setSelectedId] = useState(letters[0]?.id ?? 'a');
  const [seen, setSeen] = useState<ReadonlySet<string>>(new Set());
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

  const sayAll = () =>
    speakSequence([
      { text: letter.nameSpeech, src: letter.audio?.name },
      { text: letter.sound.speech, src: letter.audio?.sound, rate: SPEECH_STYLE.soundRate },
      { text: letter.word.text, src: letter.audio?.word },
    ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-8">
      <section aria-label={`About the letter ${letter.upper}`} className="relative space-y-4 lg:order-1">
        <CelebrationEffect burst={burst} onDone={clear} />
        <p className="rounded-3xl bg-sky-100 p-4 text-[1.05rem] leading-snug">
          <strong>{letter.upper}</strong> is <em>called</em> “{letter.name}”, but it <em>says</em> <strong>{letter.sound.symbol}</strong> in <strong>{letter.word.text}</strong>.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <article className="flex flex-col items-center rounded-4xl bg-white p-4 text-center shadow-soft">
            <h2 className="font-display text-xl font-bold text-ink-soft">Letter name</h2>
            <AnimatedLetter
              glyph={`${letter.upper}${letter.lower}`}
              color={color}
              animation={animationFor(index)}
              label={`Letter ${letter.upper}. Tap to hear its name`}
              className="my-1 h-28 px-4 text-[5.2rem]"
              onTap={() => void sayLetterName(letter)}
            />
            <p className="font-display text-3xl font-bold">“{letter.name}”</p>
            <PronunciationControl label="Say the name" accent="coral" onPlay={() => sayLetterName(letter)} className="mt-3" />
          </article>

          <article className="flex flex-col items-center rounded-4xl bg-white p-4 text-center shadow-soft">
            <h2 className="font-display text-xl font-bold text-ink-soft">Letter sound</h2>
            <p className="my-1 grid h-28 place-items-center font-display text-6xl font-bold" style={{ color }}>
              {letter.sound.symbol}
            </p>
            <p className="min-h-[2.8rem] text-[0.98rem] leading-snug text-ink-soft">{letter.sound.tip}</p>
            <PronunciationControl label="Play the sound" accent="sky" variant="primary" onPlay={() => sayLetterSound(letter)} className="mt-3" />
          </article>
        </div>

        <article className="flex flex-wrap items-center gap-4 rounded-4xl bg-white p-4 shadow-soft">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-cream">
            <Illustration name={letter.word.illustration} className="h-20 w-20" label={letter.word.text} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold text-ink-soft">Example word</h2>
            <p className="font-display text-4xl font-bold leading-tight">
              <span style={{ color }}>{letter.word.text.slice(0, 1)}</span>
              {letter.word.text.slice(1)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PronunciationControl label="Hear the word" accent="plum" onPlay={() => sayWord(letter.word.text, letter.audio?.word)} />
            <PronunciationControl label="Hear all three" accent="brand" variant="primary" icon="play" onPlay={sayAll} />
          </div>
        </article>
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
