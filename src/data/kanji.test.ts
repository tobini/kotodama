import { describe, expect, it } from 'vitest';
import { KANJI, KANJI_WORDS, N5_KANJI } from './kanji';
import { RomajiMatcher } from '../romaji/matcher';

const KANJI_CHAR = /\p{Script=Han}/u;
// 曜 no está en las listas N5 de kanji, pero los días de la semana sí son vocabulario N5.
const ALLOWED_EXTRA = new Set(['曜']);

describe('kanji', () => {
  const singles = KANJI.flatMap((g) => g.items);
  const words = KANJI_WORDS.flatMap((g) => g.items);

  it('todas las lecturas se pueden escribir', () => {
    for (const item of [...singles, ...words]) {
      expect(() => new RomajiMatcher(item.reading, item.altReadings, item.variants), item.text).not.toThrow();
    }
  });

  it('las palabras solo usan kanji N5', () => {
    for (const item of words) {
      for (const ch of item.text) {
        if (KANJI_CHAR.test(ch)) expect(N5_KANJI.has(ch) || ALLOWED_EXTRA.has(ch), `${ch} en ${item.text}`).toBe(true);
      }
    }
  });

  it('ids únicos', () => {
    const ids = [...singles, ...words].map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('kanji suelto acepta cualquiera de sus lecturas', () => {
    const shoku = singles.find((i) => i.text === '食')!;
    for (const input of ['shoku', 'ta']) {
      const m = new RomajiMatcher(shoku.reading, [], shoku.variants);
      for (const ch of input) m.type(ch);
      expect(m.done, input).toBe(true);
    }
    expect(shoku.notes).toBe('ショク、た(べる)');
  });
});
