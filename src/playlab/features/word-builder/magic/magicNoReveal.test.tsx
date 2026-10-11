import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderPlayLab } from '../../../test/utils';

// Fixed round that starts with PIG, so the "answer is never shown" checks are about a concrete word.
vi.mock('../../../lib/random', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/random')>();
  const order = ['pig', 'cat', 'sun', 'fish', 'book'];
  return {
    ...actual,
    pickFresh: <T extends { id: string }>(pool: readonly T[]) => order.map((id) => pool.find((p) => p.id === id)).filter((x): x is T => !!x),
  };
});

const slots = () => [...document.querySelectorAll<HTMLElement>('[data-magic-slot]')];
const slot = (i: number) => slots()[i]!;
const tiles = () => [...document.querySelectorAll<HTMLElement>('[data-magic-tile]')];
const realTile = (v: string) => tiles().find((t) => t.dataset.value === v && t.dataset.decoy === 'false')!;

async function openPig(props: Parameters<typeof renderPlayLab>[0] = {}) {
  const r = renderPlayLab({ initialActivity: 'word-builder', ...props });
  await screen.findByRole('heading', { level: 1, name: 'Magic Letters' }, { timeout: 5000 }); // lazy-loaded
  await screen.findAllByLabelText(/^Slot \d, empty/);
  return r;
}

/** Everything a child (or a screen reader) could read inside one slot. */
const readable = (el: HTMLElement) => `${el.textContent ?? ''}${el.getAttribute('aria-label') ?? ''}${el.querySelector('svg') ? ' <svg>' : ''}`;

describe('Magic Letters never reveals the answer (PIG)', () => {
  it('shows the picture and clue, and three EMPTY slots: no P, I or G inside them', async () => {
    await openPig();
    expect(slots()).toHaveLength(3);
    for (const [i, s] of slots().entries()) {
      expect(s.textContent, `slot ${i + 1} text`).toBe(''); // no ghost / outline / watermark glyph
      expect(s.querySelector('svg, img, canvas'), `slot ${i + 1} graphics`).toBeNull();
      expect(s).toHaveAttribute('aria-label', `Slot ${i + 1}, empty`); // the accessible name does not name the letter either
      expect(s).toHaveAttribute('data-state', 'empty');
      // nothing in the slot is styled as outlined text either
      expect(s.innerHTML).not.toMatch(/text-stroke|TextStroke/i);
    }
    // the picture and clue are still there
    expect(screen.getByText('A pink farm animal that says oink.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hear the clue' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Picture clue' })).toBeInTheDocument();
  });

  it('the word itself is not written anywhere on the screen before it is solved', async () => {
    await openPig();
    const visible = document.body.innerText ?? document.body.textContent ?? '';
    expect(visible).not.toMatch(/\bpig\b/i);
    // the slot group's own name does not spell it, and the only letters on screen are the (shuffled) tiles
    const outsideTiles = [...document.querySelectorAll<HTMLElement>('[data-magic-slot]')].map(readable).join(' ');
    expect(outsideTiles).not.toMatch(/\b[PIG]\b/i);
    expect(screen.queryByLabelText(/Slot \d: [A-Z], done/)).toBeNull();
  });

  it.each([
    ['starter', 3, 0],
    ['explorer', 4, 1],
    ['adventurer', 5, 2],
  ] as const)('%s: %i shuffled tiles (%i decoy letters), never spelling PIG in order', async (level, count, decoys) => {
    await openPig({ level });
    expect(tiles()).toHaveLength(count);
    expect(tiles().filter((t) => t.dataset.decoy === 'true')).toHaveLength(decoys);
    const real = tiles().filter((t) => t.dataset.decoy === 'false').map((t) => t.dataset.value).join('');
    expect([...real].sort().join('')).toBe('gip'); // exactly the three letters of the word...
    expect(real).not.toBe('pig'); // ...in an order that does not spell it
    for (const d of tiles().filter((t) => t.dataset.decoy === 'true')) expect('pig').not.toContain(d.dataset.value!);
  });

  it('stays empty after a wrong try, and after the hint appears (two misses)', async () => {
    const { user } = await openPig();
    for (let i = 0; i < 2; i++) {
      await user.click(realTile('i'));
      await user.click(slot(0)); // PIG starts with P, so I does not fit here
    }
    expect(slot(0)).toHaveAttribute('data-state', 'hint'); // the glowing hint spot...
    for (const s of slots()) expect(s.textContent).toBe(''); // ...is still an empty outline
    // after "Start this word again" the hint text shows and the glowing spot is STILL an empty outline
    await user.click(await screen.findByRole('button', { name: 'Start this word again' }, { timeout: 4000 }));
    expect(await screen.findByText('Need a hint?', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(slot(0)).toHaveAttribute('data-state', 'hint');
    for (const s of slots()) expect(s.textContent).toBe('');
  });

  it('placing the right letters still works: only a landed letter shows, and only in its own slot', async () => {
    const { user } = await openPig();
    await user.click(realTile('i'));
    await user.click(slot(0)); // wrong slot
    expect(slot(0).textContent).toBe('');
    expect(slot(0)).toHaveAttribute('data-state', 'empty');

    await user.click(realTile('p'));
    await user.click(slot(0));
    expect(slot(0)).toHaveAttribute('aria-label', 'Slot 1: P, done');
    expect(slot(0).textContent?.toUpperCase()).toBe('P'); // (CSS upper-cases it on screen)
    expect(slot(1).textContent).toBe(''); // the other slots keep their secret
    expect(slot(2).textContent).toBe('');

    fireEvent.keyDown(window, { key: 'i' });
    fireEvent.keyDown(window, { key: 'g' });
    expect(await screen.findByText(/You spelled/, {}, { timeout: 4000 })).toBeInTheDocument();
    expect(slots().map((s) => s.textContent).join('').toUpperCase()).toBe('PIG');
  });

  it('reduced motion changes nothing about this: empty slots stay empty, placed letters still appear', async () => {
    const { user } = await openPig({ theme: { motion: 'reduce' } });
    for (const s of slots()) expect(s.textContent).toBe('');
    await user.click(realTile('p'));
    await user.click(slot(0));
    expect(slot(0).textContent?.toUpperCase()).toBe('P');
    expect(slot(1).textContent).toBe('');
  });
});
