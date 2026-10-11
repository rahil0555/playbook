import { useCallback, useSyncExternalStore } from 'react';
import { usePlayLab } from '../app/PlayLabContext';
import { isLiked as isLikedIn, likeKey, readLikes, subscribeLikes, toggleLike, type Like, type LikeKind } from '../services/likesService';

/** The learner's loved letters, words and sentences, for the current learner. */
export function useLikes() {
  const { learner } = usePlayLab();
  const key = likeKey(learner?.id);
  const getSnapshot = useCallback(() => readLikes(key), [key]);
  const likes = useSyncExternalStore(subscribeLikes, getSnapshot, getSnapshot);
  const isLiked = useCallback((kind: LikeKind, id: string) => isLikedIn(likes, kind, id), [likes]);
  const toggle = useCallback((like: Like) => toggleLike(key, like), [key]);
  return { likes, isLiked, toggle };
}
