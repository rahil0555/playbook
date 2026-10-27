/**
 * Timing constants that the feedback moments depend on. They sit in a module with no React or browser imports, so the end-to-end
 * tests can read them too (the tests check each stage of a celebration against these numbers).
 */

/** A spoken line starts this long after the pop or chime before it, so the two never overlap. */
export const SPEECH_AFTER_SOUND_MS = 170;

/** How long Pip takes to hop from the picture onto the word. The landing (the squash, the burst and the fanfare) happens at its end. */
export const CREATURE_HOP_MS = 480;
