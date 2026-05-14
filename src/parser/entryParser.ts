import { LANGUAGES_SET } from '../constants.js';
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

// Pre-compiled regex for tag cleanup
const TAGS_CLEANUP_RE = /[()]/g;

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

  const variants = entry.variants
    ? entry.variants.split(',').map(v => v.trim()).filter(Boolean)
    : undefined;

  const entryText = entry.entry;
  const firstNewline = entryText.indexOf('\n');

  let tagLine: string;
  let rest: string;

  if (firstNewline === -1) {
    tagLine = entryText;
    rest = '';
  } else {
    tagLine = entryText.slice(0, firstNewline);
    rest = entryText.slice(firstNewline + 1);
  }

  const tags = parseTags([tagLine]);

  const senses: Sense[] = [];
  let start = 0;
  while (true) {
    const sep = rest.indexOf('\n----\n', start);
    if (sep === -1) {
      const text = rest.slice(start);
      if (text || senses.length === 0) {
        senses.push(parseSense(text));
      }
      break;
    }
    senses.push(parseSense(rest.slice(start, sep + 1)));
    start = sep + 6;
  }

  return {
    id,
    headwords,
    tags,
    senses,
    variants,
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
    if (!text || readings.length === 0) {
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
 * @param entryLines - The entry lines (first line is used for tags)
 * @returns An array of tag objects
 * @throws ParseError if tags cannot be parsed
 */
export function parseTags(entryLines: string[]): Tag[] {
  const firstLine = entryLines[0];
  if (!firstLine) {
    throw new ParseError(`Entry is empty: ${entryLines.toString()}`);
  }
  if (!firstLine.startsWith('(pos:')) {
    throw new ParseError(
      `Entry does not start with (pos:): ${firstLine}`
    );
  }
  // tags in format (pos:名詞)(label:書面語)
  const tags: Tag[] = [];
  const parts = firstLine.split(')(');

  for (let i = 0; i < parts.length; i++) {
    const tag = parts[i].replace(TAGS_CLEANUP_RE, '');
    const colonIndex = tag.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const name = tag.slice(0, colonIndex).trim();
    const value = tag.slice(colonIndex + 1).trim();
    tags.push({ name, value });
  }

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
  let pos = 0;
  if (entryText.startsWith('<explanation>\n')) {
    pos = '<explanation>\n'.length;
  }

  const egs: LanguageData[] = [];

  // Find first <eg> on its own line
  let egPos = entryText.indexOf('\n<eg>\n', pos);
  let explanationText: string;

  if (egPos === -1) {
    explanationText = entryText.slice(pos);
  } else {
    explanationText = entryText.slice(pos, egPos + 1);
    pos = egPos + 6;

    while (true) {
      const nextEgPos = entryText.indexOf('\n<eg>\n', pos);
      if (nextEgPos === -1) {
        egs.push(parseLanguageData(entryText.slice(pos)));
        break;
      }
      egs.push(parseLanguageData(entryText.slice(pos, nextEgPos + 1)));
      pos = nextEgPos + 6;
    }
  }

  const explanation = parseLanguageData(explanationText);

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

  let currentLang: Language | '' = '';
  let currentLangData = '';

  let start = 0;
  while (start <= text.length) {
    // Find next newline
    let end = text.indexOf('\n', start);
    if (end === -1) end = text.length;

    const line = text.slice(start, end);
    start = end + 1;

    // Find colon using direct character scanning
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      // If no colon is found, this is a continuation of the previous line
      currentLangData += '\n' + line.trim();
      continue;
    }

    const matchedLang = line.slice(0, colonIndex);
    // Use Set for O(1) language validation
    if (!LANGUAGES_SET.has(matchedLang)) {
      throw new ParseError(`Invalid language: ${matchedLang}`);
    }

    // Save previous language data if any
    if (currentLang && currentLangData) {
      if (!languageData[currentLang]) {
        languageData[currentLang] = [];
      }
      languageData[currentLang]!.push(currentLangData.trim());
    }

    currentLang = matchedLang as Language;
    currentLangData = line.slice(colonIndex + 1).trim();
  }

  // Save final language data
  if (currentLang && currentLangData) {
    if (!languageData[currentLang]) {
      languageData[currentLang] = [];
    }
    languageData[currentLang]!.push(currentLangData.trim());
  }

  return languageData;
}
