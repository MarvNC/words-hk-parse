import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(import.meta.dirname, 'data');

async function main() {
  // Check if all-*.csv already exists
  if (fs.existsSync(DATA_DIR)) {
    const files = fs.readdirSync(DATA_DIR);
    const allCsv = files.find((f) => f.startsWith('all-') && f.endsWith('.csv'));
    if (allCsv) {
      console.log(`CSV already cached: ${path.join(DATA_DIR, allCsv)}`);
      return;
    }
  }

  // Download using the library's downloader
  const { downloadLatest } = await import('../src/downloader.ts');
  const csvPaths = await downloadLatest(DATA_DIR);
  console.log('Downloaded CSVs:', csvPaths);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
