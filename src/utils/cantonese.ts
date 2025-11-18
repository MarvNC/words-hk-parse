import {
  punctuations,
  isHanzi,
  isJyuutping,
  isPunctuation,
} from './text.js';
import type { TextReadingPair } from '../types.js';

/**
 * Parses a text string into an array matching each character to the readings
 *
 * @example
 * ```ts
 * const text = "你get唔get到我講咩？";
 * const reading = "nei5 get1 m4 get1 dou2 ngo5 gong2 me1?";
 * const result = parseCantoneseReadings(text, reading);
 * // => [{text: "你", reading: "nei5"}, {text: "get", reading: "get1"}, ...]
 * ```
 *
 * @param rawText - The text to parse (Chinese characters with optional English)
 * @param readings - The Jyutping readings corresponding to the text
 * @returns An array of text-reading pairs
 * @throws Error if the text and readings cannot be properly matched
 */
export function parseCantoneseReadings(
  rawText: string,
  readings: string
): TextReadingPair[] {
  const resultArray: TextReadingPair[] = [];

  const textArray = splitString(rawText);
  const readingsArray = splitString(readings);

  let readingIndex = 0;
  let textIndex = 0;
  for (let i = 0; i < Math.max(textArray.length, readingsArray.length); i++) {
    const text = textArray[textIndex];
    const reading = readingsArray[readingIndex];
    const isTextHanzi = isHanzi(text);
    const isTextAlphanumeric = isJyuutping(text);
    const isTextPunctuation = isPunctuation(text);
    const isReadingJyutping = isJyuutping(reading);
    const isReadingPunctuation = isPunctuation(reading);
    // Ideal case
    if (
      !!text &&
      !!reading &&
      ((isTextHanzi && isReadingJyutping) ||
        // Case where for example text is 'bu' and reading is 'bu4'
        (isTextAlphanumeric && isReadingJyutping))
    ) {
      resultArray.push({ text, reading });
      textIndex++;
      readingIndex++;
    } else if (
      !!text &&
      ((isTextPunctuation && isReadingJyutping) ||
        (!!text && reading === undefined) ||
        (!isTextAlphanumeric && !isTextHanzi && isReadingJyutping))
    ) {
      // Send empty string to reading
      resultArray.push({ text, reading: '' });
      textIndex++;
    } else if (
      !!text &&
      !!reading &&
      ((isTextPunctuation && isReadingPunctuation) ||
        // Where both are special characters
        (!isTextAlphanumeric && !isTextHanzi && !isReadingJyutping))
    ) {
      // Don't add the punctuation but consume it
      resultArray.push({ text, reading: '' });
      textIndex++;
      readingIndex++;
    } else {
      throw new Error(
        `Unexpected text "${text}" and reading "${reading}" at index ${i} in ${rawText}: ${readings}`
      );
    }
  }
  // Check if remaining readings exist
  if (readingIndex < readingsArray.length) {
    throw new Error(
      `Unexpected reading "${readingsArray[readingIndex]}" at index ${readingIndex} in ${rawText}: ${readings}`
    );
  }
  return resultArray;
}

/**
 * Splits a string into tokens (Chinese characters, Jyutping, punctuation).
 * Groups alphanumeric characters together while separating individual Chinese characters.
 *
 * @param input - The string to split
 * @returns An array of tokens
 */
function splitString(input: string): string[] {
  const resultArray: string[] = [];
  let current = '';
  for (const char of input) {
    if (/[a-zA-Z0-9]/.test(char)) {
      // Check if alphabetical or numeric
      const isAlphabetical = /[a-zA-Z]/.test(char);
      if (current.length > 0) {
        // Check if previous character was alphabetical or numeric
        const isPreviousAlphabetical = /[a-zA-Z]/.test(
          current[current.length - 1]
        );
        if (isAlphabetical && !isPreviousAlphabetical) {
          // Probably a case where the reading was typo'd like bit1ging1
          resultArray.push(current);
          current = '';
        }
      }
      current += char;
    } else if (punctuations.includes(char)) {
      if (current) {
        resultArray.push(current);
        current = '';
      }
      resultArray.push(char);
    } else {
      if (current) {
        resultArray.push(current);
        current = '';
      }
      resultArray.push(char);
    }
  }
  // Push the last current
  if (current) {
    resultArray.push(current);
  }

  // Remove empty strings
  const resultArrayFiltered = resultArray
    .map((item) => item.trim())
    .filter((item) => item);
  return resultArrayFiltered;
}
