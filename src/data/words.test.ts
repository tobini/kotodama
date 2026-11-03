import { describe, expect, it } from 'vitest';
import { HIRAGANA_WORDS, KATAKANA_WORDS } from './words';
import { RomajiMatcher } from '../romaji/matcher';
import { toHiragana } from '../romaji/kana';

const all = [...HIRAGANA_WORDS, ...KATAKANA_WORDS].flatMap((g) => g.items);

describe('vocabulario', () => {
  it('todas las palabras se pueden escribir en romaji', () => {
    for (const item of all) {
      expect(() => new RomajiMatcher(item.reading, item.altReadings), item.text).not.toThrow();
    }
  });

  it('ids únicos', () => {
    const ids = all.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('cada grupo está en la escritura que corresponde', () => {
    for (const item of all) {
      const isHiragana = toHiragana(item.text) === item.text;
      expect(isHiragana, item.text).toBe(item.script === 'hiragana');
    }
  });
});
