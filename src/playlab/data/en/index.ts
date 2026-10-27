import type { ContentPack } from '../../types/learning';
import { englishLetters } from './alphabet';
import { englishSentences } from './sentences';
import { englishStories } from './story';
import { englishWords } from './words';

export const englishPack: ContentPack = {
  language: 'en',
  label: 'English',
  speechLang: 'en-US',
  letters: englishLetters,
  words: englishWords,
  sentences: englishSentences,
  stories: englishStories,
};
