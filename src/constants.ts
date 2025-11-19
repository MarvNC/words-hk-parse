import type { Language } from './types.js';

/**
 * Language metadata including display names and ISO codes
 */
export interface LanguageInfo {
  name: string;
  shortName: string;
  langCode: string;
}

/**
 * Map of all supported languages with their metadata
 */
export const LANGUAGES_DATA: Record<Language, LanguageInfo> = {
  yue: {
    name: '廣東話',
    shortName: '粵',
    langCode: 'yue',
  },
  eng: {
    name: '英文',
    shortName: '英',
    langCode: 'en',
  },
  zho: {
    name: '中文',
    shortName: '中',
    langCode: 'zh-Hant',
  },
  jpn: {
    name: '日文',
    shortName: '日',
    langCode: 'ja',
  },
  kor: {
    name: '韓文',
    shortName: '韓',
    langCode: 'ko',
  },
  vie: {
    name: '越南文',
    shortName: '越',
    langCode: 'vi',
  },
  lzh: {
    name: '文言文',
    shortName: '文',
    langCode: 'zh-Hant',
  },
  por: {
    name: '葡萄牙文',
    shortName: '葡',
    langCode: 'pt',
  },
  deu: {
    name: '德文',
    shortName: '德',
    langCode: 'de',
  },
  fra: {
    name: '法文',
    shortName: '法',
    langCode: 'fr',
  },
  mnc: {
    name: '滿文',
    shortName: '滿',
    langCode: 'mnc',
  },
  lat: {
    name: '拉丁文',
    shortName: '拉',
    langCode: 'la',
  },
  tib: {
    name: '藏文',
    shortName: '藏',
    langCode: 'bo',
  },
  量詞: {
    name: '量詞',
    shortName: '量詞',
    langCode: '',
  },
};

/**
 * Map of Chinese tag names to English translations
 * Used for parts of speech and labels in dictionary entries
 */
export const TAG_TRANSLATIONS: Record<string, string> = {
  // Parts of speech
  名詞: 'noun',
  動詞: 'verb',
  語句: 'phrase',
  形容詞: 'adjective',
  量詞: 'classifier',
  感嘆詞: 'interjection',
  代詞: 'pronoun',
  助詞: 'particle',
  語素: 'morpheme',
  區別詞: 'distinguishing word',
  副詞: 'adverb',
  擬聲詞: 'onomatopoeia',
  連詞: 'conjunction',
  詞綴: 'affix',
  介詞: 'preposition',
  數詞: 'numeral',
  方位詞: 'locative',
  術語: 'term',
  // Labels
  馬來西亞: 'Malaysia',
  粗俗: 'vulgar',
  香港: 'Hong Kong',
  專名: 'proper noun',
  俚語: 'slang',
  潮語: 'trendy expression',
  外來語: 'loanword',
  書面語: 'written language',
  舊式: 'old-fashioned',
  大陸: 'Mainland China',
  文言: 'classical Chinese',
  gpt: 'GPT',
  台灣: 'Taiwan',
  爭議: 'controversial',
  黃賭毒: 'vice',
  日本: 'Japan',
  口語: 'colloquial',
  錯字: 'misspelling',
  玩嘢: 'playful',
  民間傳説: 'folklore',
  澳門: 'Macau',
};
