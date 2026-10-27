import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayLabContext, type PlayLabContextValue } from '../app/PlayLabContext';
import { StickerReveal } from './StickerReveal';

/** the reveal reads only the motion setting from Play Lab; the rest of the context is not needed here */
const playLab = { reducedMotion: true } as unknown as PlayLabContextValue;
const reveal = (rounds: number) => render(<PlayLabContext.Provider value={playLab}><StickerReveal rounds={rounds} /></PlayLabContext.Provider>);

describe('StickerReveal: the sticker a finished round has earned', () => {
  it('round 1 reveals the first sticker as a new one', () => {
    reveal(1);
    expect(screen.getByTestId('sticker-reveal')).toHaveTextContent('New sticker: Apple!');
    expect(screen.getByText('Find it in your sticker book.')).toBeInTheDocument();
  });

  it('the twelfth round fills the last book slot, and is still a new sticker', () => {
    reveal(12);
    expect(screen.getByTestId('sticker-reveal')).toHaveTextContent('New sticker: Nest!');
  });

  it('the thirteenth round repeats the first sticker, and says it is an extra one', () => {
    reveal(13);
    expect(screen.getByTestId('sticker-reveal')).toHaveTextContent('Extra sticker: Apple!');
    expect(screen.getByText('Another one for your sticker book.')).toBeInTheDocument();
  });
});
