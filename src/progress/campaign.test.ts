import { describe, expect, it } from 'vitest';
import { groupsForIds } from '../data';
import { LEVELS, TRACKS, levelItems } from './campaign';

describe('campaña', () => {
  it('todos los grupos de los niveles existen', () => {
    for (const level of LEVELS) {
      const all = [...level.groups, ...(level.knownKana ?? [])];
      expect(new Set(groupsForIds(all).map((g) => g.id)), level.id).toEqual(new Set(all));
    }
  });

  it('ids únicos y requisitos válidos', () => {
    const ids = new Set(LEVELS.map((l) => l.id));
    expect(ids.size).toBe(LEVELS.length);
    for (const track of TRACKS) {
      for (const req of track.requires) expect(ids.has(req), `${track.id} → ${req}`).toBe(true);
    }
  });

  it('cada nivel tiene suficiente contenido para 5 oleadas', () => {
    for (const level of LEVELS) {
      expect(levelItems(level).length, level.id).toBeGreaterThanOrEqual(5);
    }
  });

  it('las primeras palabras solo usan los kana ya aprendidos', () => {
    const pal1 = LEVELS.find((l) => l.id === 'h-pal1')!;
    const words = levelItems(pal1).filter((i) => i.kind === 'word');
    expect(words.length).toBeGreaterThanOrEqual(10);
    // Kana listados uno por uno: los rangos de Unicode intercalan los que llevan dakuten (か-こ incluye が).
    for (const w of words) expect(w.reading, w.reading).toMatch(/^[あいうえおかきくけこさしすせそたちつてとなにぬねのっ]+$/);
    expect(words.map((w) => w.reading)).not.toContain('ありがとう');
  });
});
