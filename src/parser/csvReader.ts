import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import { parseEntry } from './entryParser.js';
import type { CsvRecord, DictionaryEntry } from '../types.js';

const csvHeaders = ['id', 'headword', 'entry', 'variants', 'warning', 'public'];

/**
 * Reads a CSV file and returns the parsed records
 *
 * @param csvPath - Path to the CSV file
 * @returns Promise resolving to an array of CSV records
 */
async function readCSVAsync(csvPath: string): Promise<CsvRecord[]> {
  return new Promise((resolve, reject) => {
    const results: CsvRecord[] = [];
    fs.createReadStream(csvPath)
      .pipe(
        csv({
          headers: csvHeaders,
          strict: true,
          skipLines: 2,
          quote: '"',
        })
      )
      .on('data', (data: CsvRecord) => {
        results.push(data);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
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
 * Parses CSV entries into structured dictionary entries
 *
 * @param csvPath - Path to the CSV file to parse
 * @returns Promise resolving to an array of dictionary entries
 */
export async function parseCSVEntries(
  csvPath: string
): Promise<DictionaryEntry[]> {
  const data = await readCSVAsync(csvPath);
  console.log(`Read ${data.length} entries from ${csvPath}`);

  const dictionaryEntries: DictionaryEntry[] = [];
  let unpublishedCount = 0;
  let noDataCount = 0;
  let unreviewedCount = 0;
  let errorCount = 0;

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
      dictionaryEntries.push(parsedEntry);
    } catch (error) {
      errorCount++;
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.log(`Error parsing entry ${entry.id}: ${errorMessage}`);
    }
  }
  console.log(`Parsed ${dictionaryEntries.length} entries`);
  console.log(`Skipped ${noDataCount} no data entries`);
  if (errorCount > 0) {
    console.log(`Encountered ${errorCount} parsing errors`);
  }
  return dictionaryEntries;
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
