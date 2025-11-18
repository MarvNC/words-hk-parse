import { LANGUAGES_DATA } from '../constants.js';
import type {
  CsvRecord,
  DictionaryEntry,
  Headword,
  Tag,
  Sense,
  LanguageData,
  Language,
} from '../types.js';

/**
 * Custom error class for parsing errors
 */
export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Parses a CSV record into a structured DictionaryEntry object
 *
 * @param entry - The CSV record to parse
 * @returns A structured dictionary entry
 * @throws ParseError if the entry cannot be parsed
 */
export function parseEntry(entry: CsvRecord): DictionaryEntry {
  const id = parseInt(entry.id);
  if (isNaN(id)) {
    throw new ParseError(`Invalid id: ${entry.id}`);
  }

  const headwords = parseHeadwords(entry.headword);

  const entryLines = entry.entry.split('\n');
  const tags = parseTags(entryLines);

  const explanationsText = entryLines.join('\n');
  const explanationsTexts = explanationsText
    .split(/^----$/gm)
    .map((text) => {
      return text;
    });

  const senses: Sense[] = [];
  for (const text of explanationsTexts) {
    senses.push(parseSense(text));
  }

  return {
    id,
    headwords,
    tags,
    senses,
  };
}

/**
 * Parses a headword string in the format "text:reading,text:reading"
 *
 * @param headwordString - The headword string to parse
 * @returns An array of headword objects
 * @throws ParseError if the headword format is invalid
 */
export function parseHeadwords(headwordString: string): Headword[] {
  return headwordString.split(',').map((headword) => {
    const [text, ...readings] = headword.split(':');
    if (!text || !readings) {
      throw new ParseError(`Invalid headword: ${headword}`);
    }
    return {
      text,
      readings,
    };
  });
}

/**
 * Parses tags from the first line of entry lines in format (pos:value)(label:value)
 *
 * @param entryLines - The entry lines (will be mutated by removing the first line)
 * @returns An array of tag objects
 * @throws ParseError if tags cannot be parsed
 */
export function parseTags(entryLines: string[]): Tag[] {
  if (!entryLines[0].startsWith('(pos:')) {
    throw new ParseError(
      `Entry does not start with (pos:): ${entryLines[0]}`
    );
  }
  // tags in format (pos:名詞)(label:書面語)
  const firstLine = entryLines.shift();
  if (!firstLine) {
    throw new ParseError(`Entry is empty: ${entryLines.toString()}`);
  }
  const tags = firstLine.split(')(').map((tag) => {
    tag = tag.replace(/[()]/g, '');
    let colonIndex = tag.indexOf(':');
    const name = tag.slice(0, colonIndex).trim();
    const value = tag.slice(colonIndex + 1).trim();
    return {
      name,
      value,
    };
  });
  if (tags.length === 0) {
    throw new ParseError(`No tags found: ${firstLine}`);
  }
  return tags;
}

/**
 * Accepts a sense entry string and returns the parsed sense
 *
 * @param entryText - The sense entry text
 * @returns A parsed sense object
 */
export function parseSense(entryText: string): Sense {
  // Remove first line explanations
  entryText = entryText.replace('<explanation>\n', '');
  const [explanationText, ...examplesTexts] = entryText.split(/^<eg>$/gm);

  const explanation = parseLanguageData(explanationText);

  const egs: LanguageData[] = [];
  for (const exampleText of examplesTexts) {
    egs.push(parseLanguageData(exampleText));
  }

  return { explanation, egs };
}

/**
 * Parses a language data multiline string in the format "lang:text\nlang:text"
 * Some texts are multiline and continue on subsequent lines without a language prefix
 *
 * @param text - The language data text to parse
 * @returns A language data object mapping language codes to text arrays
 * @throws ParseError if an invalid language code is encountered
 */
export function parseLanguageData(text: string): LanguageData {
  const languageData: LanguageData = {};
  const lines = text.split('\n');

  let currentLang: Language | '' = '';
  let currentLangData = '';

  /**
   * Adds the currently stored language data to the languageData object
   */
  function addCurrentLangData() {
    if (!currentLang) {
      return;
    }
    if (!currentLangData) {
      return;
    }
    if (!languageData[currentLang]) {
      languageData[currentLang] = [];
    }
    languageData[currentLang]!.push(currentLangData.trim());
    currentLang = '';
    currentLangData = '';
  }

  for (const line of lines) {
    // Check if first few characters are a language followed by :
    const matchedLang = line.split(':')[0];
    if (
      // !(matchedLang.length >= 2 && matchedLang.length <= 4) ||
      !line.includes(':')
    ) {
      // If no language is found, this is a continuation of the previous line
      currentLangData += '\n' + line.trim();
      continue;
    }
    // Check if the language is a possible language
    if (!LANGUAGES_DATA[matchedLang as Language]) {
      throw new ParseError(`Invalid language: ${matchedLang}`);
    }
    // Else a language is found
    addCurrentLangData();
    currentLang = matchedLang as Language;
    currentLangData = line.replace(`${currentLang}:`, '').trim();
  }
  addCurrentLangData();
  return languageData;
}
