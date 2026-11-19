import { describe, expect, it } from 'vitest';
import { HELPED_MAX_BOX, MASTERED_BOX, nextBox } from './stats';

describe('cajas de repaso', () => {
  it('la primera vez: bien → 2, con errores → 0, se escapa → 0', () => {
    expect(nextBox(undefined, 'clean')).toBe(2);
    expect(nextBox(undefined, 'errors')).toBe(0);
    expect(nextBox(undefined, 'escaped')).toBe(0);
  });

  it('un ítem nuevo queda dominado con tres aciertos seguidos', () => {
    let box = nextBox(undefined, 'clean');
    box = nextBox(box, 'clean');
    expect(box).toBeLessThan(MASTERED_BOX);
    box = nextBox(box, 'clean');
    expect(box).toBe(MASTERED_BOX);
  });

  it('no pasa de los límites', () => {
    expect(nextBox(5, 'clean')).toBe(5);
    expect(nextBox(0, 'errors')).toBe(0);
    expect(nextBox(5, 'escaped')).toBe(0);
  });
});

describe('ayuda y cajas', () => {
  it('con ayuda a la vista sube hasta la caja 3, no más', () => {
    expect(nextBox(2, 'clean', true)).toBe(HELPED_MAX_BOX);
    expect(nextBox(HELPED_MAX_BOX, 'clean', true)).toBe(HELPED_MAX_BOX);
    expect(nextBox(HELPED_MAX_BOX, 'clean', false)).toBe(MASTERED_BOX);
  });

  it('la ayuda no baja algo ya dominado', () => {
    expect(nextBox(5, 'clean', true)).toBe(5);
  });
});
