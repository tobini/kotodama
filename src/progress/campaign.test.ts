import { describe, expect, it } from 'vitest';
import { groupsForIds } from '../data';
import { LEVELS } from './campaign';

describe('campaña', () => {
  it('todos los grupos de los niveles existen', () => {
    for (const level of LEVELS) {
      expect(new Set(groupsForIds(level.groups).map((g) => g.id)), level.id).toEqual(new Set(level.groups));
    }
  });

  it('ids únicos', () => {
    expect(new Set(LEVELS.map((l) => l.id)).size).toBe(LEVELS.length);
  });
});
