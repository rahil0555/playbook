import type { PhonemeId } from '../types/learning';
import { PHONIC_CLIPS } from '../audio/phonics';
import type { PlayRequest } from './audioService';

/**
 * The one place a Magic Letters sound becomes a request to the audio service. It asks for the sound's recording and nothing
 * else: a sound with no recording gets a request with no `src`, which plays nothing and is never spoken. To use better or
 * different recordings, change audio/phonics/ only; the screens and this function do not change.
 */
export function phonicRequest(id: PhonemeId): PlayRequest {
  return { text: id, clipOnly: true, src: PHONIC_CLIPS[id]?.url };
}
