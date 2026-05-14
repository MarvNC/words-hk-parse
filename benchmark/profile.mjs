import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { performance } from 'perf_hooks';

const DATA_DIR = path.resolve(import.meta.dirname, 'data');

  // ---- Current (new) implementations ----
const { readCSVFast, parseCsvFile: newParseCsvFile } = await import('../src/parser/csvReader.ts');
const { parseEntry: newParseEntry } = await import('../src/parser/entryParser.ts');
const { LANGUAGES_DATA } = await import('../src/constants.ts');

// ---- Old implementations (from git master) ----

const csvHeaders = ['id', 'headword', 'entry', 'variants', 'warning', 'public'];

async function oldReadCSVAsync(csvPath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(csvPath)
      .pipe(
        csv({
          headers: csvHeaders,
          strict: true,
          skipLines: 2,
          quote: '"',
        })
      )
      .on('data', (data) => {
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

function oldParseEntry(entry) {
  const id = parseInt(entry.id);
  if (isNaN(id)) {
    throw new Error(`Invalid id: ${entry.id}`);
  }

  const headwords = entry.headword.split(',').map((headword) => {
    const [text, ...readings] = headword.split(':');
    if (!text || !readings) {
      throw new Error(`Invalid headword: ${headword}`);
    }
    return { text, readings };
  });

  const variants = entry.variants
    ? entry.variants.split(',').map((v) => v.trim()).filter(Boolean)
    : undefined;

  const entryLines = entry.entry.split('\n');

  // old parseTags (mutates entryLines)
  if (!entryLines[0].startsWith('(pos:')) {
    throw new Error(`Entry does not start with (pos:): ${entryLines[0]}`);
  }
  const firstLine = entryLines.shift();
  if (!firstLine) {
    throw new Error(`Entry is empty: ${entryLines.toString()}`);
  }
  const tags = firstLine.split(')(').map((tag) => {
    tag = tag.replace(/[()]/g, '');
    let colonIndex = tag.indexOf(':');
    const name = tag.slice(0, colonIndex).trim();
    const value = tag.slice(colonIndex + 1).trim();
    return { name, value };
  });
  if (tags.length === 0) {
    throw new Error(`No tags found: ${firstLine}`);
  }

  const explanationsText = entryLines.join('\n');
  const explanationsTexts = explanationsText.split(/^----$/gm).map((text) => text);

  const senses = [];
  for (const text of explanationsTexts) {
    senses.push(oldParseSense(text));
  }

  return { id, headwords, tags, senses, variants };
}

function oldParseSense(entryText) {
  entryText = entryText.replace('<explanation>\n', '');
  const [explanationText, ...examplesTexts] = entryText.split(/^<eg>$/gm);

  const explanation = oldParseLanguageData(explanationText);

  const egs = [];
  for (const exampleText of examplesTexts) {
    egs.push(oldParseLanguageData(exampleText));
  }

  return { explanation, egs };
}

function oldParseLanguageData(text) {
  const languageData = {};
  const lines = text.split('\n');

  let currentLang = '';
  let currentLangData = '';

  function addCurrentLangData() {
    if (!currentLang) return;
    if (!currentLangData) return;
    if (!languageData[currentLang]) {
      languageData[currentLang] = [];
    }
    languageData[currentLang].push(currentLangData.trim());
    currentLang = '';
    currentLangData = '';
  }

  for (const line of lines) {
    const matchedLang = line.split(':')[0];
    if (!line.includes(':')) {
      currentLangData += '\n' + line.trim();
      continue;
    }
    if (!LANGUAGES_DATA[matchedLang]) {
      throw new Error(`Invalid language: ${matchedLang}`);
    }
    addCurrentLangData();
    currentLang = matchedLang;
    currentLangData = line.replace(`${currentLang}:`, '').trim();
  }
  addCurrentLangData();
  return languageData;
}

// ---- Helpers ----

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function min(arr) {
  return Math.min(...arr);
}

async function main() {
  const files = fs.readdirSync(DATA_DIR);
  const allCsv = files.find((f) => f.startsWith('all-') && f.endsWith('.csv'));
  if (!allCsv) {
    throw new Error('No all-*.csv file found in benchmark/data/');
  }
  const csvPath = path.join(DATA_DIR, allCsv);
  console.log(`Profiling with: ${allCsv}`);

  const WARMUP = 2;
  const RUNS = 5;

  console.log(`\nWarmup (${WARMUP} runs)...`);
  for (let i = 0; i < WARMUP; i++) {
    await oldReadCSVAsync(csvPath);
    readCSVFast(csvPath);
  }

  // ---- CSV Reading ----
  console.log(`\n=== CSV READING (${RUNS} runs) ===`);
  const oldCsvTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const records = await oldReadCSVAsync(csvPath);
    const end = performance.now();
    oldCsvTimes.push(end - start);
    if (i === 0) console.log(`  old csv-parser: ${records.length} records`);
  }

  const newCsvTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const records = readCSVFast(csvPath);
    const end = performance.now();
    newCsvTimes.push(end - start);
    if (i === 0) console.log(`  new readCSVFast: ${records.length} records`);
  }

  // ---- Entry Parsing ----
  // Use one set of records for fair comparison
  const records = readCSVFast(csvPath);
  console.log(`\n=== ENTRY PARSING (${RUNS} runs, ${records.length} records) ===`);

  const oldParseTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    let count = 0;
    for (const record of records) {
      try {
        oldParseEntry(record);
        count++;
      } catch {
        // skip
      }
    }
    const end = performance.now();
    oldParseTimes.push(end - start);
    if (i === 0) console.log(`  old parseEntry: ${count} succeeded`);
  }

  const newParseTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    let count = 0;
    for (const record of records) {
      try {
        newParseEntry(record);
        count++;
      } catch {
        // skip
      }
    }
    const end = performance.now();
    newParseTimes.push(end - start);
    if (i === 0) console.log(`  new parseEntry: ${count} succeeded`);
  }

  // ---- Full Pipeline ----
  console.log(`\n=== FULL PIPELINE (${RUNS} runs) ===`);

  // Old: readCSVAsync + direct loop
  const oldFullTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const data = await oldReadCSVAsync(csvPath);
    const entries = [];
    for (const entry of data) {
      if (entry.entry === '未有內容 NO DATA') continue;
      if (
        entry.warning.includes(
          '未經覆核，可能有錯漏 UNREVIEWED ENTRY - MAY CONTAIN ERRORS OR OMISSIONS'
        )
      ) {
        // unreviewed but still parse
      }
      if (entry.public !== '已公開') {
        // unpublished but still parse
      }
      try {
        entries.push(oldParseEntry(entry));
      } catch {
        // skip
      }
    }
    const end = performance.now();
    oldFullTimes.push(end - start);
    if (i === 0) console.log(`  old full pipeline: ${entries.length} entries`);
  }

  // New: readCSVFast + async generator
  async function* newParseStream(csvPath) {
    const data = readCSVFast(csvPath);
    for (const entry of data) {
      if (entry.entry === '未有內容 NO DATA') continue;
      if (
        entry.warning.includes(
          '未經覆核，可能有錯漏 UNREVIEWED ENTRY - MAY CONTAIN ERRORS OR OMISSIONS'
        )
      ) {
        // unreviewed
      }
      if (entry.public !== '已公開') {
        // unpublished
      }
      try {
        yield newParseEntry(entry);
      } catch {
        // skip
      }
    }
  }

  const newStreamTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const entries = [];
    for await (const entry of newParseStream(csvPath)) {
      entries.push(entry);
    }
    const end = performance.now();
    newStreamTimes.push(end - start);
    if (i === 0) console.log(`  new async gen:   ${entries.length} entries`);
  }

  // New: readCSVFast + direct loop (no async generator)
  const newDirectTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const data = readCSVFast(csvPath);
    const entries = [];
    for (const entry of data) {
      if (entry.entry === '未有內容 NO DATA') continue;
      if (
        entry.warning.includes(
          '未經覆核，可能有錯漏 UNREVIEWED ENTRY - MAY CONTAIN ERRORS OR OMISSIONS'
        )
      ) {
        // unreviewed
      }
      if (entry.public !== '已公開') {
        // unpublished
      }
      try {
        entries.push(newParseEntry(entry));
      } catch {
        // skip
      }
    }
    const end = performance.now();
    newDirectTimes.push(end - start);
    if (i === 0) console.log(`  new direct loop: ${entries.length} entries`);
  }

  // New: actual exported parseCsvFile
  const newExportedTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const entries = await newParseCsvFile(csvPath);
    const end = performance.now();
    newExportedTimes.push(end - start);
    if (i === 0) console.log(`  new exported fn: ${entries.length} entries`);
  }

  // Hybrid: old csv-parser + new parseEntry (best of both)
  const hybridTimes = [];
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    const data = await oldReadCSVAsync(csvPath);
    const entries = [];
    for (const entry of data) {
      if (entry.entry === '未有內容 NO DATA') continue;
      try {
        entries.push(newParseEntry(entry));
      } catch {
        // skip
      }
    }
    const end = performance.now();
    hybridTimes.push(end - start);
    if (i === 0) console.log(`  hybrid (old csv + new parse): ${entries.length} entries`);
  }

  // ---- Report ----
  console.log(`\n========== RESULTS ==========`);
  console.log(`CSV Reading:`);
  console.log(`  old (csv-parser):  ${avg(oldCsvTimes).toFixed(2)}ms avg  (best: ${min(oldCsvTimes).toFixed(2)}ms)`);
  console.log(`  new (readCSVFast): ${avg(newCsvTimes).toFixed(2)}ms avg  (best: ${min(newCsvTimes).toFixed(2)}ms)`);
  const csvDiff = avg(newCsvTimes) - avg(oldCsvTimes);
  console.log(`  diff:              ${csvDiff > 0 ? '+' : ''}${csvDiff.toFixed(2)}ms`);

  console.log(`\nEntry Parsing:`);
  console.log(`  old parseEntry:    ${avg(oldParseTimes).toFixed(2)}ms avg  (best: ${min(oldParseTimes).toFixed(2)}ms)`);
  console.log(`  new parseEntry:    ${avg(newParseTimes).toFixed(2)}ms avg  (best: ${min(newParseTimes).toFixed(2)}ms)`);
  const parseDiff = avg(newParseTimes) - avg(oldParseTimes);
  console.log(`  diff:              ${parseDiff > 0 ? '+' : ''}${parseDiff.toFixed(2)}ms`);

  const oldTotal = avg(oldCsvTimes) + avg(oldParseTimes);
  const newTotal = avg(newCsvTimes) + avg(newParseTimes);
  const totalDiff = newTotal - oldTotal;

  console.log(`\nTotal (csv + parse):`);
  console.log(`  old: ${oldTotal.toFixed(2)}ms`);
  console.log(`  new: ${newTotal.toFixed(2)}ms`);
  console.log(`  diff: ${totalDiff > 0 ? '+' : ''}${totalDiff.toFixed(2)}ms (${((newTotal / oldTotal - 1) * 100).toFixed(1)}%)`);

  console.log(`\n========== BREAKDOWN ==========`);
  if (totalDiff > 0) {
    const csvBlame = csvDiff / totalDiff;
    const parseBlame = parseDiff / totalDiff;
    console.log(`Of the ${totalDiff.toFixed(2)}ms total slowdown:`);
    console.log(`  ${(csvBlame * 100).toFixed(0)}% from CSV reading  (${csvDiff.toFixed(2)}ms)`);
    console.log(`  ${(parseBlame * 100).toFixed(0)}% from entry parsing (${parseDiff.toFixed(2)}ms)`);
  } else {
    console.log(`New implementation is actually faster overall.`);
  }

  console.log(`\nFull Pipeline:`);
  console.log(`  old (direct):        ${avg(oldFullTimes).toFixed(2)}ms avg  (best: ${min(oldFullTimes).toFixed(2)}ms)`);
  console.log(`  new (async gen):     ${avg(newStreamTimes).toFixed(2)}ms avg  (best: ${min(newStreamTimes).toFixed(2)}ms)`);
  console.log(`  new (direct loop):   ${avg(newDirectTimes).toFixed(2)}ms avg  (best: ${min(newDirectTimes).toFixed(2)}ms)`);
  console.log(`  new (exported fn):   ${avg(newExportedTimes).toFixed(2)}ms avg  (best: ${min(newExportedTimes).toFixed(2)}ms)`);
  console.log(`  hybrid (csv+parse):  ${avg(hybridTimes).toFixed(2)}ms avg  (best: ${min(hybridTimes).toFixed(2)}ms)`);

  const streamOverhead = avg(newStreamTimes) - avg(newDirectTimes);
  const exportedOverhead = avg(newExportedTimes) - avg(newDirectTimes);
  console.log(`\n  Async generator overhead:  ${streamOverhead.toFixed(2)}ms (${(streamOverhead / avg(newDirectTimes) * 100).toFixed(1)}%)`);
  console.log(`  Exported fn overhead:      ${exportedOverhead.toFixed(2)}ms (${(exportedOverhead / avg(newDirectTimes) * 100).toFixed(1)}%)`);

  // Per-record stats
  console.log(`\nPer-record parsing:`);
  console.log(`  old: ${(avg(oldParseTimes) / records.length * 1000).toFixed(3)}us/entry`);
  console.log(`  new: ${(avg(newParseTimes) / records.length * 1000).toFixed(3)}us/entry`);

  console.log(`===============================\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
