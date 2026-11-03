import { describe, expect, it } from 'vitest';
import { HIRAGANA, KATAKANA } from './kana';
import { tokenize } from '../romaji/matcher';

describe('datos de kana', () => {
  it('todos los kana tienen romanización y forman una sola unidad', () => {
    for (const group of [...HIRAGANA, ...KATAKANA]) {
      for (const item of group.items) {
        expect(tokenize(item.reading), item.text).toHaveLength(1);
      }
    }
  });
});
