# words-hk-parse

A standalone TypeScript library for downloading and parsing
[Words.hk](https://words.hk) Cantonese dictionary data.

## Features

- 📥 **Download** latest dictionary data from Words.hk
- 📊 **Parse** CSV data into structured JSON objects
- 🔤 **Process** Cantonese Jyutping readings
- 📝 **TypeScript** first with full type definitions
- ✅ **Tested** with comprehensive test coverage
- 🚀 **Fast** built with modern tooling (tsup, Bun)

## Installation

```bash
npm install words-hk-parse
```

## Usage

### Download and Parse Latest Data

```typescript
import { getLatestData } from 'words-hk-parse';

// Download and parse in one go
const { entries, dateString } = await getLatestData('./data');

console.log(`Loaded ${entries.length} dictionary entries`);
console.log(`Data date: ${dateString}`);
```

### Download CSV Files Only

```typescript
import { downloadLatest } from 'words-hk-parse';

// Download latest CSV files to a directory
const csvPaths = await downloadLatest('./csvs');
console.log('Downloaded files:', csvPaths);
```

### Parse CSV Files

```typescript
import { parseCsvFile } from 'words-hk-parse';

// Parse a local CSV file
const entries = await parseCsvFile('./data/all-12345678.csv');

// Each entry contains:
// - id: unique identifier
// - headwords: array of {text, readings}
// - tags: metadata like part of speech, labels
// - senses: definitions and examples in multiple languages
```

### Parse Cantonese Readings

```typescript
import { parseCantoneseReadings } from 'words-hk-parse';

// Match Chinese text with Jyutping readings
const text = '你好嗎？';
const readings = 'nei5 hou2 maa3?';

const pairs = parseCantoneseReadings(text, readings);
// [
//   { text: '你', reading: 'nei5' },
//   { text: '好', reading: 'hou2' },
//   { text: '嗎', reading: 'maa3' },
//   { text: '？', reading: '' }
// ]
```

### Text Utilities

```typescript
import { isHanzi, isJyuutping, isPunctuation } from 'words-hk-parse';

isHanzi('你'); // true
isHanzi('a'); // false

isJyuutping('nei5'); // true
isJyuutping('你'); // false

isPunctuation('，'); // true
isPunctuation('a'); // false
```

## API Reference

### Types

```typescript
interface DictionaryEntry {
  id: number;
  headwords: Headword[];
  tags: Tag[];
  senses: Sense[];
}

interface Headword {
  text: string;
  readings: string[];
}

interface Tag {
  name: string;
  value: string;
}

interface Sense {
  explanation: LanguageData;
  egs: LanguageData[]; // examples
}

type LanguageData = {
  yue?: string[]; // Cantonese
  eng?: string[]; // English
  zho?: string[]; // Mandarin Chinese
  // ... other languages
};
```

### Main Functions

#### `downloadLatest(outputDir?: string): Promise<string[]>`

Downloads the latest CSV files from Words.hk.

- **Parameters:**
  - `outputDir` - Directory to save files (default: 'csvs')
- **Returns:** Array of downloaded file paths

#### `parseCsvFile(filePath: string): Promise<DictionaryEntry[]>`

Parses a CSV file into dictionary entries.

- **Parameters:**
  - `filePath` - Path to the CSV file
- **Returns:** Array of dictionary entries

#### `getLatestData(outputDir?: string): Promise<{entries, csvPaths, dateString}>`

Downloads and parses the latest data in one call.

- **Parameters:**
  - `outputDir` - Directory for CSV files (default: 'csvs')
- **Returns:** Object containing entries, file paths, and data date

#### `parseCantoneseReadings(text: string, readings: string): TextReadingPair[]`

Matches Chinese text with Jyutping readings.

- **Parameters:**
  - `text` - Chinese text (may include punctuation, English)
  - `readings` - Space-separated Jyutping readings
- **Returns:** Array of text-reading pairs

### Constants

#### Language Data

```typescript
import { LANGUAGES_DATA } from 'words-hk-parse';

// Map of language codes to metadata
LANGUAGES_DATA.yue; // { name: '廣東話', shortName: '粵', langCode: 'yue' }
LANGUAGES_DATA.eng; // { name: '英文', shortName: '英', langCode: 'en' }
// ...
```

#### Tag Translations

```typescript
import { TAG_TRANSLATIONS } from 'words-hk-parse';

// Map of Chinese tags to English translations
// Parts of speech
TAG_TRANSLATIONS['名詞']; // 'noun'
TAG_TRANSLATIONS['動詞']; // 'verb'
TAG_TRANSLATIONS['形容詞']; // 'adjective'

// Labels
TAG_TRANSLATIONS['香港']; // 'Hong Kong'
TAG_TRANSLATIONS['俚語']; // 'slang'
TAG_TRANSLATIONS['粗俗']; // 'vulgar'

// Translate tags in dictionary entries
const entries = await parseCsvFile('./data/all-12345678.csv');
const entry = entries[0];
entry.tags.forEach((tag) => {
  const translation = TAG_TRANSLATIONS[tag.name] || tag.name;
  console.log(`${tag.name} (${translation}): ${tag.value}`);
});
```

## Development

### Prerequisites

- Node.js 18 or higher
- Bun (for testing)

### Setup

```bash
git clone <repo-url>
cd words-hk-parse
npm install
```

### Scripts

```bash
npm run build      # Build the package
npm test           # Run tests with Bun
npm run format     # Format code with Prettier
npm run lint       # Lint code with ESLint
```

### Testing

Tests are written using Bun's test runner:

```bash
bun test
```

All tests use data migrated from the original
[wordshk-yomitan](https://github.com/MarvNC/wordshk-yomitan) project.

## Project Structure

```
words-hk-parse/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Language constants
│   ├── downloader.ts         # Download logic
│   ├── parser/
│   │   ├── csvReader.ts      # CSV file handling
│   │   └── entryParser.ts    # Entry parsing logic
│   └── utils/
│       ├── text.ts           # Text utilities
│       └── cantonese.ts      # Jyutping parsing
├── tests/
│   ├── cantonese.test.ts     # Cantonese reading tests
│   ├── parser.test.ts        # Entry parser tests
│   └── data/
│       └── testdata.csv      # Test data
├── dist/                     # Built output (gitignored)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

## Data Source

This library downloads data from [Words.hk](https://words.hk), a collaborative
Cantonese dictionary.

### Data License

The dictionary data from Words.hk is licensed under the
[Non-Commercial Open Data License 1.0](https://words.hk/base/hoifong/).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
