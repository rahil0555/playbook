/**
 * Small pure helpers for the Magic Letters "feel": a repeat gate so that rapid taps never stack the same sound or the
 * same spoken phonics sound. Kept free of React and audio so it can be unit-tested directly.
 */
import { createRepeatGate } from '../../../moments/gate';

export { createRepeatGate, type RepeatGate } from '../../../moments/gate';

/** Tap sounds: at most one pop every ~110 ms, however fast the child taps. */
export const tapSoundGate = createRepeatGate(110);
/** Spoken phonics sound for a letter: not again for the same letter within 1.4 s. */
export const PHONICS_GAP_MS = 1400;
/** Wait this long after the pop before the phonics sound starts, so the two never overlap. */
export const PHONICS_DELAY_MS = 170;
