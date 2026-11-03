// Conversión entre hiragana y katakana (los bloques Unicode están desfasados 0x60).

const HIRA_START = 0x3041; // ぁ
const HIRA_END = 0x3096; // ゖ
const KATA_START = 0x30a1; // ァ
const KATA_END = 0x30f6; // ヶ
const OFFSET = KATA_START - HIRA_START;

export function toHiragana(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= KATA_START && code <= KATA_END ? String.fromCodePoint(code - OFFSET) : ch;
    })
    .join('');
}

export function toKatakana(text: string): string {
  return [...text]
    .map((ch) => {
      const code = ch.codePointAt(0)!;
      return code >= HIRA_START && code <= HIRA_END ? String.fromCodePoint(code + OFFSET) : ch;
    })
    .join('');
}
