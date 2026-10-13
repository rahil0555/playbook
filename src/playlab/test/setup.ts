import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { audioLog, createFakeAudio, sfxLog, timeline } from './fakeAudio';

// Component tests never touch real speech synthesis; audioService.test.ts imports the real module explicitly.
vi.mock('../services/audioService', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/audioService')>()),
  createAudioService: () => createFakeAudio(),
}));

beforeEach(() => {
  audioLog.length = 0;
  sfxLog.length = 0;
  timeline.length = 0;
  window.localStorage.clear();
});
afterEach(() => cleanup());

// jsdom has no matchMedia.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom lacks PointerEvent; Framer Motion's keyboard press handling constructs one.
if (typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }
  (window as unknown as { PointerEvent: unknown }).PointerEvent = PointerEventPolyfill;
}

// jsdom logs "not implemented" for these; PlayLab only calls them best-effort.
window.scrollTo = (() => undefined) as typeof window.scrollTo;
Element.prototype.scrollIntoView = (() => undefined) as typeof Element.prototype.scrollIntoView;
