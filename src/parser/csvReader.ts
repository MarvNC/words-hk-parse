import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { parseEntry } from './entryParser.js';
import type { CsvRecord, DictionaryEntry } from '../types.js';

/**
 * Fast custom CSV parser for words.hk format.
 * Reads the whole file and parses it with minimal overhead.
 *
 * @param csvPath - Path to the CSV file
 * @returns Array of CSV records
 */
export function readCSVFast(csvPath: string): CsvRecord[] {
  let content = fs.readFileSync(csvPath, 'utf-8');

  // Strip BOM if present
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const records: CsvRecord[] = [];
  let currentField = '';
  let currentFields: string[] = [];
  let inQuotes = false;
  let linesSkipped = 0;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      currentFields.push(currentField);
      currentField = '';

      if (linesSkipped < 2) {
        linesSkipped++;
        currentFields = [];
        continue;
      }

      if (currentFields.length !== 6) {
        throw new Error(
          `Invalid CSV: expected 6 columns, got ${currentFields.length} at record ${records.length + 1}`
        );
      }

      const [id, headword, entry, variants, warning, publicField] = currentFields;
      records.push({
        id,
        headword,
        entry,
        variants,
        warning,
        public: publicField,
      });
      currentFields = [];
    } else if (char === ',' && !inQuotes) {
      currentFields.push(currentField);
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Handle last record if file doesn't end with newline
  if (currentField !== '' || currentFields.length > 0) {
    currentFields.push(currentField);
    if (linesSkipped >= 2) {
      if (currentFields.length !== 6) {
        throw new Error(
          `Invalid CSV: expected 6 columns, got ${currentFields.length} at record ${records.length + 1}`
        );
      }
      const [id, headword, entry, variants, warning, publicField] = currentFields;
      records.push({
        id,
        headword,
        entry,
        variants,
        warning,
        public: publicField,
      });
    }
  }

  return records;
}

/**
 * Reads a CSV file asynchronously using csv-parser (C++ optimized).
 * This is faster than the custom JS parser for large files.
 *
 * @param csvPath - Path to the CSV file
 * @returns Promise resolving to an array of CSV records
 */
export function readCSVAsync(csvPath: string): Promise<CsvRecord[]> {
  return new Promise((resolve, reject) => {
    const records: CsvRecord[] = [];

    const stream = fs.createReadStream(csvPath).pipe(
      csv({
        skipLines: 2,
        headers: ['id', 'headword', 'entry', 'variants', 'warning', 'public'],
      })
    );

    stream.on('data', (data) => {
      records.push({
        id: data.id,
        headword: data.headword,
        entry: data.entry,
        variants: data.variants,
        warning: data.warning,
        public: data.public,
      });
    });

    stream.on('end', () => resolve(records));
    stream.on('error', reject);
  });
}

/**
 * CSV file information
 */
export interface CSVInfo {
  allCsv: string;
  dateString: string;
}

/**
 * Reads the contents of the data folder and returns the name of the all- file and the date of the data
 *
 * @param dataFolder - Path to the folder containing CSV files
 * @returns Information about the CSV file
 * @throws Error if no all- file is found
 */
export async function getCSVInfo(dataFolder: string): Promise<CSVInfo> {
  // Get contents of data folder
  const files = await fs.promises.readdir(dataFolder);
  // Filter out non-csv files
  const csvFiles = files.filter((file) => file.endsWith('.csv'));
  const allCsv = files.find((file) => file.startsWith('all-'));
  if (!allCsv) {
    throw new Error('No all- file found');
  }

  const dateEpoch = allCsv.split('-')[1].split('.')[0];
  const date = new Date(Number(dateEpoch) * 1000);
  const dateString = date.toISOString().split('T')[0];
  console.log(`Date of data: ${dateString}`);

  return {
    allCsv,
    dateString,
  };
}

/**
 * Statistics about CSV parsing
 */
export interface ParseStats {
  total: number;
  parsed: number;
  noData: number;
  unpublished: number;
  unreviewed: number;
  errors: number;
}

/**
 * Parses a CSV file and yields dictionary entries one at a time.
 * Uses csv-parser for fast CSV reading, then the optimized parseEntry for entry parsing.
 *
 * @param filePath - Path to the CSV file
 * @yields Parsed dictionary entries
 */
export async function* parseCsvFileStream(
  filePath: string
): AsyncGenerator<DictionaryEntry> {
  const data = await readCSVAsync(filePath);
  console.log(`Read ${data.length} entries from ${filePath}`);

  let unpublishedCount = 0;
  let noDataCount = 0;
  let unreviewedCount = 0;
  let errorCount = 0;
  let parsedCount = 0;

  for (const entry of data) {
    if (entry.entry === '未有內容 NO DATA') {
      noDataCount++;
      continue;
    }
    if (
      entry.warning.includes(
        '未經覆核，可能有錯漏 UNREVIEWED ENTRY - MAY CONTAIN ERRORS OR OMISSIONS'
      )
    ) {
      unreviewedCount++;
    }
    if (entry.public !== '已公開') {
      unpublishedCount++;
    }
    try {
      const parsedEntry = parseEntry(entry);
      parsedCount++;
      yield parsedEntry;
    } catch (error) {
      errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`Error parsing entry ${entry.id}: ${errorMessage}`);
    }
  }

  console.log(`Parsed ${parsedCount} entries`);
  console.log(`Skipped ${noDataCount} no data entries`);
  if (errorCount > 0) {
    console.log(`Encountered ${errorCount} parsing errors`);
  }
}

/**
 * Parses CSV entries into structured dictionary entries
 *
 * @param csvPath - Path to the CSV file to parse
 * @returns Promise resolving to an array of dictionary entries
 */
export async function parseCSVEntries(
  csvPath: string
): Promise<DictionaryEntry[]> {
  const entries: DictionaryEntry[] = [];
  for await (const entry of parseCsvFileStream(csvPath)) {
    entries.push(entry);
  }
  return entries;
}

/**
 * Parses a CSV file into structured dictionary entries
 * Main entry point for CSV parsing
 *
 * @param filePath - Path to the CSV file
 * @returns Promise resolving to an array of dictionary entries
 */
export async function parseCsvFile(
  filePath: string
): Promise<DictionaryEntry[]> {
  if (!fs.existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }
  return parseCSVEntries(filePath);
}
