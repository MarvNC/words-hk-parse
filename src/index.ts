/**
 * words-hk-parse
 * A TypeScript library for downloading and parsing Words.hk Cantonese dictionary data
 * @packageDocumentation
 */

// Export main functions
export { downloadLatest } from './downloader.js';
export { parseCsvFile, parseCSVEntries, getCSVInfo } from './parser/csvReader.js';
export { parseEntry, ParseError } from './parser/entryParser.js';
export { parseCantoneseReadings } from './utils/cantonese.js';
export {
  isHanzi,
  isJyuutping,
  isPunctuation,
  isStringSentence,
  punctuations,
} from './utils/text.js';

// Export types
export type {
  CsvRecord,
  DictionaryEntry,
  Headword,
  Tag,
  Sense,
  LanguageData,
  Language,
  LanguageArray,
  TextReadingPair,
} from './types.js';

// Export constants
export { LANGUAGES_DATA } from './constants.js';
export type { LanguageInfo } from './constants.js';

// Export utility types
export type { CSVInfo, ParseStats } from './parser/csvReader.js';
export type { DownloadResult } from './downloader.js';

/**
 * Helper function that downloads the latest data and parses it
 *
 * @param outputDir - Directory to save downloaded CSV files (defaults to 'csvs')
 * @returns Promise resolving to an object containing dictionary entries and metadata
 *
 * @example
 * ```ts
 * import { getLatestData } from 'words-hk-parse';
 *
 * const { entries, csvPaths } = await getLatestData('./data');
 * console.log(`Loaded ${entries.length} dictionary entries`);
 * ```
 */
export async function getLatestData(outputDir: string = 'csvs') {
  const { downloadLatest } = await import('./downloader.js');
  const { parseCsvFile, getCSVInfo } = await import('./parser/csvReader.js');
  const path = await import('path');

  // Download latest CSV files
  const csvPaths = await downloadLatest(outputDir);

  // Find the "all-" file
  const allCsvPath = csvPaths.find((p) => path.basename(p).startsWith('all-'));
  if (!allCsvPath) {
    throw new Error('No all- CSV file found in downloaded files');
  }

  // Parse the CSV file
  const entries = await parseCsvFile(allCsvPath);

  // Get CSV info for metadata
  const csvInfo = await getCSVInfo(outputDir);

  return {
    entries,
    csvPaths,
    dateString: csvInfo.dateString,
  };
}
