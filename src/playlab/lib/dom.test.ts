import { afterEach, describe, expect, it } from 'vitest';
import { nearestOpenSlot } from './dom';

// Boxes are stubbed (jsdom has no layout): each element is given the rectangle it should have on screen.
function box(left: number, top: number, width: number, height: number) {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
}
function slot(index: number, rect: DOMRect, state = 'empty') {
  const el = document.createElement('button');
  el.dataset.magicSlot = String(index);
  el.dataset.state = state;
  el.getBoundingClientRect = () => rect;
  document.body.appendChild(el);
  return el;
}
function bubble(rect: DOMRect) {
  const el = document.createElement('button');
  el.getBoundingClientRect = () => rect;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('nearestOpenSlot: the spot a dragged letter is over or close to', () => {
  it('picks the empty spot nearest to the letter\'s centre', () => {
    slot(0, box(0, 0, 80, 80));
    const second = slot(1, box(100, 0, 80, 80));
    const letter = bubble(box(112, 6, 80, 80)); // centre (152, 46): nearest to slot 1
    expect(nearestOpenSlot(letter, '[data-magic-slot]')).toBe(second);
  });

  it('never picks a spot that is already filled', () => {
    slot(0, box(0, 0, 80, 80), 'filled'); // centre (40, 40): nearest to the letter, but taken
    const open = slot(1, box(50, 0, 80, 80)); // centre (90, 40): the next nearest, and open
    const letter = bubble(box(4, 4, 80, 80)); // centre (44, 44)
    expect(nearestOpenSlot(letter, '[data-magic-slot]')).toBe(open);
  });

  it('gives nothing when the letter is not close to any open spot, so it springs back', () => {
    slot(0, box(0, 0, 80, 80));
    const letter = bubble(box(400, 400, 80, 80));
    expect(nearestOpenSlot(letter, '[data-magic-slot]')).toBeNull();
  });

  it('is close enough when the centres are within 80% of a spot\'s width, and not beyond', () => {
    slot(0, box(0, 0, 100, 100));
    const near = bubble(box(40, 0, 100, 100)); // centres 40 apart: inside 80
    expect(nearestOpenSlot(near, '[data-magic-slot]')).not.toBeNull();
    const far = bubble(box(90, 0, 100, 100)); // centres 90 apart: outside 80
    expect(nearestOpenSlot(far, '[data-magic-slot]')).toBeNull();
  });

  it('gives nothing without a letter to measure', () => {
    slot(0, box(0, 0, 80, 80));
    expect(nearestOpenSlot(null, '[data-magic-slot]')).toBeNull();
  });
});
