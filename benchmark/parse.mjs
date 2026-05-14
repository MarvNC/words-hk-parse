import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DATA_DIR = path.resolve(import.meta.dirname, 'data');

async function ensureDownloaded() {
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    const hasAllCsv = files.some((f) => f.startsWith('all-') && f.endsWith('.csv'));
    if (hasAllCsv) return;
  }
  console.log('CSV not found, running download...');
  execSync('bun run benchmark/download.mjs', { stdio: 'inherit' });
}

async function runBenchmark() {
  const { parseCsvFile } = await import('../src/parser/csvReader.ts');

  const files = fs.readdirSync(DATA_DIR);
  const allCsv = files.find((f) => f.startsWith('all-') && f.endsWith('.csv'));
  if (!allCsv) {
    throw new Error('No all-*.csv file found in benchmark/data/');
  }

  const csvPath = path.join(DATA_DIR, allCsv);
  console.log(`\nBenchmarking parseCsvFile on: ${allCsv}\n`);

  // Warm-up run
  console.log('Warm-up run...');
  await parseCsvFile(csvPath);

  const times = [];
  let entriesParsed = 0;
  let firstRunEntries = 0;

  for (let i = 1; i <= 5; i++) {
    const start = performance.now();
    const entries = await parseCsvFile(csvPath);
    const end = performance.now();

    const durationMs = end - start;
    times.push(durationMs);
    entriesParsed = entries.length;

    if (i === 1) {
      firstRunEntries = entries.length;
    } else if (entries.length !== firstRunEntries) {
      throw new Error(
        `Consistency check failed: run ${i} parsed ${entries.length} entries, but run 1 parsed ${firstRunEntries} entries`
      );
    }

    console.log(`Run ${i}: ${durationMs.toFixed(2)}ms | ${entries.length} entries`);
  }

  const avgMs = times.reduce((a, b) => a + b, 0) / times.length;
  const minMs = Math.min(...times);
  const maxMs = Math.max(...times);
  const variance = times.reduce((sum, t) => sum + Math.pow(t - avgMs, 2), 0) / times.length;
  const stdDevMs = Math.sqrt(variance);
  const timePerEntry = avgMs / entriesParsed;
  const entriesPerSecond = (entriesParsed / avgMs) * 1000;

  console.log(`\n=== Benchmark Results ===`);
  console.log(`File:              ${allCsv}`);
  console.log(`Entries parsed:    ${entriesParsed.toLocaleString()}`);
  console.log(`Iterations:        ${times.length}`);
  console.log(`Min time:          ${minMs.toFixed(2)}ms`);
  console.log(`Max time:          ${maxMs.toFixed(2)}ms`);
  console.log(`Average time:      ${avgMs.toFixed(2)}ms`);
  console.log(`Std deviation:     ${stdDevMs.toFixed(2)}ms`);
  console.log(`Time per entry:    ${timePerEntry.toFixed(4)}ms`);
  console.log(`Entries/second:    ${entriesPerSecond.toFixed(2)}`);
  console.log(`=========================\n`);
}

async function main() {
  await ensureDownloaded();
  await runBenchmark();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
