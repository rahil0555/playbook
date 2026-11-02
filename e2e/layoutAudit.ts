/**
 * The layout gate's single measuring tape, shared by the width audit (audit-layout.spec.ts) and the
 * responsive matrix (responsive.spec.ts).
 *
 * `AUDIT` runs inside the page (it is passed to `page.evaluate`), so it may only use browser globals:
 * no imports, no closures over anything in the test file.
 */

export type Finding = {
  /** the document's scrollWidth when the page scrolls sideways, else 0 */
  horizontalOverflow: number;
  offscreen: string[];
  smallTargets: number;
  smallSample: string[];
  overlaps: string[];
  clipped: string[];
  /** the character (Pip) sitting on top of a control or a playable tile */
  mascotOverlaps: string[];
  /** content taller than the box that clips it: cut off at the top or the bottom (landscape phones) */
  clippedV: string[];
};

export const AUDIT = (): Finding => {
  const vw = window.innerWidth;
  const vis = (el: Element) => {
    const s = getComputedStyle(el as HTMLElement);
    const r = el.getBoundingClientRect();
    return s.visibility !== 'hidden' && s.display !== 'none' && r.width > 0 && r.height > 0;
  };
  const label = (el: Element) => ((el.textContent ?? '') || el.getAttribute('aria-label') || el.tagName).trim().slice(0, 30);
  const interactive = [...document.querySelectorAll<HTMLElement>('button, a[href], [role="button"], [data-tile], [data-magic-tile], [data-option], [data-choice], [data-side], [data-game]')].filter(vis);
  const offscreen = interactive
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 || r.left < -1;
    })
    .map(label);
  const small = interactive.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width < 44 || r.height < 44;
  });
  const overlaps: string[] = [];
  const buttons = interactive.filter((el) => el.tagName === 'BUTTON');
  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const a = buttons[i]!, b = buttons[j]!;
      if (a.contains(b) || b.contains(a)) continue;
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ix > 4 && iy > 4) overlaps.push(`${label(a)} / ${label(b)}`);
    }
  }
  // content that sticks out of the box that clips it (a card, a board, a scroller)
  const clipped = [...document.querySelectorAll<HTMLElement>('p, span, h1, h2, h3, button, label, [data-tile], [data-magic-tile], [data-option]')]
    .filter((el) => vis(el) && !el.closest('.sr-only'))
    // the storybook card is a transient cutscene that turns over on its own: its page-turn is not the layout at rest
    .filter((el) => !el.closest('.pl-storybook-overlay'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      let anc = el.parentElement;
      while (anc && anc !== document.body) {
        const o = getComputedStyle(anc);
        if (o.overflowX !== 'visible' || o.overflow !== 'visible') {
          const a = anc.getBoundingClientRect();
          return r.right > a.right + 2 || r.left < a.left - 2;
        }
        anc = anc.parentElement;
      }
      return false;
    })
    .map(label);
  // text and controls cut off at the top or the bottom of the box that clips them (short landscape phones)
  const clippedV = [...document.querySelectorAll<HTMLElement>('p, h1, h2, h3, button, label, [data-tile], [data-magic-tile], [data-option]')]
    .filter((el) => vis(el) && !el.closest('.sr-only') && !el.closest('.pl-storybook-overlay'))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      let anc = el.parentElement;
      while (anc && anc !== document.body) {
        const o = getComputedStyle(anc);
        // only a box that really clips vertically, and not one that the child can scroll
        if ((o.overflowY === 'hidden' || o.overflowY === 'clip') && o.overflowX !== 'scroll') {
          const a = anc.getBoundingClientRect();
          return r.bottom > a.bottom + 2 || r.top < a.top - 2;
        }
        anc = anc.parentElement;
      }
      return false;
    })
    .map(label);
  // the character must never sit on top of a control or a playable tile
  const mascotOverlaps: string[] = [];
  for (const m of [...document.querySelectorAll<HTMLElement>('[data-mascot-mood]')].filter(vis)) {
    const rm = m.getBoundingClientRect();
    for (const el of interactive) {
      if (m.contains(el) || el.contains(m)) continue;
      const r = el.getBoundingClientRect();
      const ix = Math.min(rm.right, r.right) - Math.max(rm.left, r.left);
      const iy = Math.min(rm.bottom, r.bottom) - Math.max(rm.top, r.top);
      if (ix > 6 && iy > 6) mascotOverlaps.push(`mascot / ${label(el)}`);
    }
  }
  return {
    horizontalOverflow: document.documentElement.scrollWidth > vw + 1 ? document.documentElement.scrollWidth : 0,
    offscreen: [...new Set(offscreen)],
    smallTargets: small.length,
    smallSample: [...new Set(small.map((el) => `${label(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`))].slice(0, 6),
    overlaps: [...new Set(overlaps)].slice(0, 6),
    clipped: [...new Set(clipped)].slice(0, 6),
    mascotOverlaps: [...new Set(mascotOverlaps)].slice(0, 6),
    clippedV: [...new Set(clippedV)].slice(0, 6),
  };
};
