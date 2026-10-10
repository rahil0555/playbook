import type { ContentPack, LanguageCode } from '../types/learning';
import { englishPack } from './en';

const packs = new Map<string, ContentPack>([[englishPack.language, englishPack]]);

/**
 * Register an additional language pack (e.g. Hindi) before rendering <PlayLab />.
 * See docs/INTEGRATION.md -> "Adding a language".
 */
export function registerContentPack(pack: ContentPack): void {
  packs.set(pack.language, pack);
}

/** Returns the pack for `language`, falling back to English when it is unknown. */
export function getContentPack(language: LanguageCode | undefined): ContentPack {
  return (language && packs.get(language)) || englishPack;
}

export function listLanguages(): { language: LanguageCode; label: string }[] {
  return [...packs.values()].map(({ language, label }) => ({ language, label }));
}
