import XRegExp from '@gerhobbelt/xregexp';

/**
 * List of Chinese and English punctuation marks
 */
export const punctuations = [
  '，',
  ',',
  '。',
  '.',
  '？',
  '?',
  '！',
  '!',
  '；',
  ';',
  '：',
  ':',
  '、',
  ',',
  '，',
  '⋯',
];

/**
 * Returns true if the text is a Chinese character (Hanzi/CJK).
 * Uses Unicode property escapes to match CJK Unified Ideographs and extensions.
 *
 * @param text - The text to check
 * @returns True if the text is a CJK character
 */
export function isHanzi(text: string): boolean {
  XRegExp.install('astral');
  return XRegExp(
    '\\p{InCJK_Unified_Ideographs}|\\p{InCJK_Unified_Ideographs_Extension_A}|\\p{InCJK_Unified_Ideographs_Extension_B}|\\p{InCJK_Unified_Ideographs_Extension_C}|\\p{InCJK_Unified_Ideographs_Extension_D}|\\p{InCJK_Unified_Ideographs_Extension_E}'
  ).test(text);
}

/**
 * Returns true if the text contains Jyutping (alphanumeric) characters.
 *
 * @param text - The text to check
 * @returns True if the text contains alphanumeric characters
 */
export function isJyuutping(text: string): boolean {
  return /[a-zA-Z0-9]/.test(text);
}

/**
 * Returns true if the text is a punctuation mark.
 *
 * @param text - The text to check
 * @returns True if the text is in the punctuations list
 */
export function isPunctuation(text: string): boolean {
  return punctuations.includes(text);
}

/**
 * Returns true if the text ends with a punctuation mark.
 *
 * @param text - The text to check
 * @returns True if the text ends with punctuation
 */
export function isStringSentence(text: string): boolean {
  const lastChar = text[text.length - 1];
  return isPunctuation(lastChar);
}
