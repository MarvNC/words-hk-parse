/**
 * Represents a CSV record from the Words.hk database.
 */
export interface CsvRecord {
  id: string; // The unique identifier for the record.
  headword: string; // The main word or expression in the entry.
  entry: string; // The full text of the dictionary entry.
  variants: string; // The different forms or spellings of the headword.
  warning: string; // Any warnings related to the entry.
  public: string; // Whether the entry is public or not.
}

/**
 * Available languages in the dictionary
 */
export type LanguageArray = [
  'yue',
  'eng',
  'zho',
  'jpn',
  'kor',
  'vie',
  'lzh',
  'por',
  'deu',
  'fra',
  'mnc',
  'lat',
  'tib',
  '量詞'
];

/**
 * Language code type
 */
export type Language = LanguageArray[number];

/**
 * Represents a text with its Jyutping reading
 */
export interface TextReadingPair {
  text: string;
  reading: string;
}

/**
 * Represents a headword with its readings
 */
export interface Headword {
  text: string;
  readings: string[];
}

/**
 * Represents a tag (metadata) for a dictionary entry
 */
export interface Tag {
  name: string;
  value: string;
}

/**
 * Represents a sense (meaning/definition) of a dictionary entry
 */
export interface Sense {
  explanation: LanguageData;
  egs: LanguageData[];
}

/**
 * Represents multilingual data
 */
export type LanguageData = {
  [key in Language]?: string[];
};

/**
 * Represents a complete dictionary entry
 */
export interface DictionaryEntry {
  id: number;
  headwords: Headword[];
  tags: Tag[];
  senses: Sense[];
}
